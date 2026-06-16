import { useState, useMemo } from 'react';
import {
  Plus, TrendingUp, Target, Users, DollarSign,
  ArrowUpRight, ArrowDownRight, Save, Edit2, Trash2,
  Zap, BarChart2, Percent, AlertCircle, Wand2
} from 'lucide-react';
import {
  formatCurrency, formatDate,
  calculateROI, calculateCPL, calculateCPC,
  getPlatformColor, generateId,
} from '../utils/helpers';
import { TrafficCampaign, TrafficPlatform } from '../types';
import { TRAFFIC_PLATFORM_LABELS } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { parseAIReport } from '../utils/aiParser';

const emptyCampaign = (): Omit<TrafficCampaign, 'id' | 'createdAt'> => ({
  date: new Date().toISOString().split('T')[0],
  platform: 'meta-ads',
  campaignName: '',
  objective: '',
  investedValue: 0,
  leadsGenerated: 0,
  clientsClosed: 0,
  revenueGenerated: 0,
  observations: '',
});

/* Barra de progresso genérica */
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* Badge de ROI colorido */
function RoiBadge({ roi }: { roi: number }) {
  const isPos = roi >= 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${
      isPos ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
    }`}>
      {isPos ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {roi.toFixed(1)}%
    </span>
  );
}

export function Traffic() {
  const { data: campaigns, loading, addDocument, updateDocument, deleteDocument } = useFirestore<TrafficCampaign>('traffic_campaigns');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<TrafficCampaign | null>(null);
  const [form, setForm] = useState(emptyCampaign());
  const [deleteTarget, setDeleteTarget] = useState<TrafficCampaign | null>(null);
  const [inputMode, setInputMode] = useState<'manual' | 'ai'>('manual');
  const [aiText, setAiText] = useState('');
  const { toasts, removeToast, success, error } = useToast();

  /* ─── Totais globais ─── */
  const totalInvested  = useMemo(() => campaigns.reduce((s, c) => s + c.investedValue, 0), [campaigns]);
  const totalLeads     = useMemo(() => campaigns.reduce((s, c) => s + c.leadsGenerated, 0), [campaigns]);
  const totalClients   = useMemo(() => campaigns.reduce((s, c) => s + c.clientsClosed, 0), [campaigns]);
  const totalRevenue   = useMemo(() => campaigns.reduce((s, c) => s + c.revenueGenerated, 0), [campaigns]);
  const totalProfit    = totalRevenue - totalInvested;
  const overallROI     = calculateROI(totalInvested, totalRevenue);
  const avgCPL         = calculateCPL(totalInvested, totalLeads);
  const avgCPC         = calculateCPC(totalInvested, totalClients);
  const conversionRate = totalLeads > 0 ? (totalClients / totalLeads) * 100 : 0;

  /* ─── Cálculos em tempo real do formulário ─── */
  const formROI    = calculateROI(form.investedValue, form.revenueGenerated);
  const formCPL    = calculateCPL(form.investedValue, form.leadsGenerated);
  const formCPC    = calculateCPC(form.investedValue, form.clientsClosed);
  const formProfit = form.revenueGenerated - form.investedValue;

  /* ─── Maior campanha (para barra relativa) ─── */
  const maxRevenue  = useMemo(() => Math.max(...campaigns.map(c => c.revenueGenerated), 1), [campaigns]);
  const maxInvested = useMemo(() => Math.max(...campaigns.map(c => c.investedValue), 1), [campaigns]);

  /* ─── Handlers ─── */
  function openNew()  { 
    setEditingCampaign(null); 
    setForm(emptyCampaign()); 
    setInputMode('manual');
    setAiText('');
    setModalOpen(true); 
  }

  function openEdit(c: TrafficCampaign) {
    setEditingCampaign(c);
    setForm({
      date: c.date, platform: c.platform, campaignName: c.campaignName,
      objective: c.objective, investedValue: c.investedValue,
      leadsGenerated: c.leadsGenerated, clientsClosed: c.clientsClosed,
      revenueGenerated: c.revenueGenerated, observations: c.observations,
    });
    setInputMode('manual');
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingCampaign(null); }

  function handleAiParse() {
    if (!aiText.trim()) return;
    const result = parseAIReport(aiText);
    setForm(prev => ({
      ...prev,
      campaignName: result.campaignName || prev.campaignName,
      investedValue: result.investedValue || prev.investedValue,
      revenueGenerated: result.revenueGenerated || prev.revenueGenerated,
      leadsGenerated: result.leadsGenerated || prev.leadsGenerated,
      clientsClosed: result.clientsClosed || prev.clientsClosed,
    }));
    setInputMode('manual');
    success('Dados importados com sucesso! Revise antes de salvar.');
  }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.campaignName.trim()) { error('Informe o nome da campanha.'); return; }
    if (form.investedValue <= 0)   { error('Informe o valor investido.'); return; }
    try {
      if (editingCampaign) {
        await updateDocument(editingCampaign.id, form);
        success('Campanha atualizada!');
      } else {
        const newCampaign: Omit<TrafficCampaign, 'id'> = { createdAt: new Date().toISOString(), ...form };
        await addDocument(newCampaign);
        success('Campanha cadastrada!');
      }
      closeModal();
    } catch (err) {
      error('Erro ao salvar campanha.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      success('Campanha removida.');
    } catch (err) {
      error('Erro ao remover campanha.');
    }
    setDeleteTarget(null);
  }

  /* ─── Render ─── */
  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Tráfego Pago</h1>
          <p className="text-gray-400 mt-1">Gestão de campanhas, investimento e retorno</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all">
          <Plus className="h-5 w-5" /> Nova Campanha
        </button>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Investido */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/60 border border-gray-800/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2.5 rounded-xl bg-red-500/20"><DollarSign className="h-5 w-5 text-red-400" /></div>
            <span className="text-sm text-gray-400 font-medium">Total Investido</span>
          </div>
          <p className="text-2xl font-bold text-white truncate" title={formatCurrency(totalInvested)}>{formatCurrency(totalInvested)}</p>
          <p className="text-xs text-gray-500 mt-1 truncate">{campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}</p>
          <ProgressBar value={totalInvested} max={totalRevenue} color="bg-red-500" />
        </div>

        {/* Faturamento */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/60 border border-gray-800/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20"><BarChart2 className="h-5 w-5 text-emerald-400" /></div>
            <span className="text-sm text-gray-400 font-medium">Faturamento</span>
          </div>
          <p className="text-2xl font-bold text-white truncate" title={formatCurrency(totalRevenue)}>{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1 truncate" title="receita gerada pelos anúncios">receita gerada pelos anúncios</p>
          <ProgressBar value={totalRevenue} max={totalRevenue} color="bg-emerald-500" />
        </div>

        {/* Lucro líquido */}
        <div className={`rounded-2xl border p-5 ${
          totalProfit >= 0
            ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/25'
            : 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/25'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-2.5 rounded-xl ${totalProfit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <TrendingUp className={`h-5 w-5 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <span className="text-sm text-gray-400 font-medium">Lucro Líquido</span>
          </div>
          <p className={`text-2xl font-bold truncate ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} title={formatCurrency(totalProfit)}>
            {formatCurrency(totalProfit)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <RoiBadge roi={overallROI} />
            <span className="text-xs text-gray-500 ml-1">ROI</span>
          </div>
        </div>

        {/* Leads e clientes */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/60 border border-gray-800/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20"><Users className="h-5 w-5 text-blue-400" /></div>
            <span className="text-sm text-gray-400 font-medium">Conversões</span>
          </div>
          <div className="flex items-end gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-white truncate">{totalLeads}</p>
              <p className="text-xs text-gray-500 truncate">leads</p>
            </div>
            <div className="pb-0.5 min-w-0 flex-1">
              <p className="text-xl font-bold text-blue-400 truncate">{totalClients}</p>
              <p className="text-xs text-gray-500 truncate">clientes</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Taxa de conversão:</span>
            <span className="text-xs font-bold text-blue-400">{conversionRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ── Métricas secundárias ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'CPL Médio', value: formatCurrency(avgCPL), desc: 'custo por lead', icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
          { label: 'CPC Médio', value: formatCurrency(avgCPC), desc: 'custo por cliente', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          { label: 'ROI Geral', value: `${overallROI.toFixed(1)}%`, desc: overallROI >= 0 ? 'retorno positivo' : 'retorno negativo', icon: Percent, color: overallROI >= 0 ? 'text-emerald-400' : 'text-red-400', bg: overallROI >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20' },
          { label: 'Ticket Médio', value: totalClients > 0 ? formatCurrency(totalRevenue / totalClients) : 'R$ 0', desc: 'por cliente fechado', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map((m) => (
          <div key={m.label} className={`rounded-xl border p-4 ${m.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`h-4 w-4 flex-shrink-0 ${m.color}`} />
              <span className="text-xs text-gray-400 font-medium truncate" title={m.label}>{m.label}</span>
            </div>
            <p className={`text-xl font-bold truncate ${m.color}`} title={m.value}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate" title={m.desc}>{m.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Tabela de campanhas ── */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Campanhas</h3>
          <span className="text-xs text-gray-500">{campaigns.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50 bg-gray-800/20">
                {['Plataforma', 'Campanha', 'Investido', 'Faturamento', 'Lucro', 'ROI', 'Leads', 'Clientes', 'CPL', 'CPC', 'Data', 'Ações'].map(h => (
                  <th key={h} className={`px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${h === 'Ações' ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-gray-500">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                    Carregando campanhas...
                  </td>
                </tr>
              ) : campaigns.map(campaign => {
                const roi     = calculateROI(campaign.investedValue, campaign.revenueGenerated);
                const cpl     = calculateCPL(campaign.investedValue, campaign.leadsGenerated);
                const cpc     = calculateCPC(campaign.investedValue, campaign.clientsClosed);
                const profit  = campaign.revenueGenerated - campaign.investedValue;
                const isPos   = profit >= 0;

                return (
                  <tr key={campaign.id} className="hover:bg-gray-800/30 transition-colors group">
                    {/* Plataforma */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getPlatformColor(campaign.platform)}`} />
                        <span className="text-white text-sm font-medium whitespace-nowrap">
                          {TRAFFIC_PLATFORM_LABELS[campaign.platform]}
                        </span>
                      </div>
                    </td>

                    {/* Campanha */}
                    <td className="px-4 py-4 max-w-[160px]">
                      <p className="font-medium text-white text-sm truncate">{campaign.campaignName}</p>
                      {campaign.objective && (
                        <p className="text-xs text-gray-500 truncate">{campaign.objective}</p>
                      )}
                    </td>

                    {/* Investido */}
                    <td className="px-4 py-4">
                      <p className="text-red-400 font-semibold text-sm whitespace-nowrap">
                        {formatCurrency(campaign.investedValue)}
                      </p>
                      <ProgressBar value={campaign.investedValue} max={maxInvested} color="bg-red-500/60" />
                    </td>

                    {/* Faturamento */}
                    <td className="px-4 py-4">
                      <p className="text-emerald-400 font-semibold text-sm whitespace-nowrap">
                        {formatCurrency(campaign.revenueGenerated)}
                      </p>
                      <ProgressBar value={campaign.revenueGenerated} max={maxRevenue} color="bg-emerald-500/60" />
                    </td>

                    {/* Lucro — destaque visual */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold whitespace-nowrap ${
                        isPos ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {isPos ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {formatCurrency(profit)}
                      </span>
                    </td>

                    {/* ROI */}
                    <td className="px-4 py-4">
                      <RoiBadge roi={roi} />
                    </td>

                    {/* Leads */}
                    <td className="px-4 py-4 text-white text-sm font-medium">{campaign.leadsGenerated}</td>

                    {/* Clientes */}
                    <td className="px-4 py-4 text-blue-400 text-sm font-bold">{campaign.clientsClosed}</td>

                    {/* CPL */}
                    <td className="px-4 py-4 text-gray-300 text-sm whitespace-nowrap">{formatCurrency(cpl)}</td>

                    {/* CPC */}
                    <td className="px-4 py-4 text-gray-300 text-sm whitespace-nowrap">{formatCurrency(cpc)}</td>

                    {/* Data */}
                    <td className="px-4 py-4 text-gray-400 text-sm whitespace-nowrap">{formatDate(campaign.date)}</td>

                    {/* Ações */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(campaign)}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(campaign)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totais na última linha */}
            {campaigns.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-gray-700 bg-gray-800/40">
                  <td className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider" colSpan={2}>
                    TOTAL GERAL
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-red-400">{formatCurrency(totalInvested)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-emerald-400">{formatCurrency(totalRevenue)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${
                      totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {totalProfit >= 0 ? <ArrowUpRight className="h-3.5 w-3.5"/> : <ArrowDownRight className="h-3.5 w-3.5"/>}
                      {formatCurrency(totalProfit)}
                    </span>
                  </td>
                  <td className="px-4 py-3"><RoiBadge roi={overallROI} /></td>
                  <td className="px-4 py-3 text-sm font-bold text-white">{totalLeads}</td>
                  <td className="px-4 py-3 text-sm font-bold text-blue-400">{totalClients}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatCurrency(avgCPL)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{formatCurrency(avgCPC)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>

          {!loading && campaigns.length === 0 && (
            <div className="text-center py-16">
              <BarChart2 className="h-12 w-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma campanha cadastrada.</p>
              <p className="text-gray-600 text-sm mt-1">Clique em "Nova Campanha" para começar.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Nova / Editar Campanha ── */}
      <Modal open={modalOpen} onClose={closeModal} title={editingCampaign ? 'Editar Campanha' : 'Nova Campanha'} size="xl">
        {!editingCampaign && (
          <div className="flex bg-gray-800/50 p-1 rounded-xl mb-6 border border-gray-700/50">
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                inputMode === 'manual' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Preenchimento Manual
            </button>
            <button
              onClick={() => setInputMode('ai')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                inputMode === 'ai' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Wand2 className="h-4 w-4" /> Importar de IA
            </button>
          </div>
        )}

        {inputMode === 'ai' ? (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-400 mb-4">
              Cole abaixo o relatório gerado pela Inteligência Artificial. O sistema irá extrair automaticamente os valores de investimento, faturamento, leads e clientes fechados.
            </div>
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Cole o texto do relatório aqui..."
              className="w-full h-64 px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all resize-none"
            />
            <div className="flex gap-3 pt-4 border-t border-gray-800">
              <button onClick={() => setInputMode('manual')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleAiParse}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                <Wand2 className="h-4 w-4" />
                Extrair Dados
              </button>
            </div>
          </div>
        ) : (
        <>
        <div className="space-y-6">

          {/* Linha 1 — Plataforma + Data + Nome */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Plataforma</label>
              <select value={form.platform} onChange={e => setField('platform', e.target.value as TrafficPlatform)}
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all">
                {Object.entries(TRAFFIC_PLATFORM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Data</label>
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Objetivo</label>
              <input type="text" value={form.objective} onChange={e => setField('objective', e.target.value)}
                placeholder="Ex: Leads, Conversão, Alcance"
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
          </div>

          {/* Nome campanha */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome da campanha *</label>
            <input type="text" value={form.campaignName} onChange={e => setField('campaignName', e.target.value)}
              placeholder="Ex: Leads Sites Janeiro"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all" />
          </div>

          {/* Linha financeira */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                💸 Valor Investido (R$) *
              </label>
              <input type="number" min={0} step={0.01} value={form.investedValue || ''}
                onChange={e => setField('investedValue', Number(e.target.value))}
                placeholder="0,00"
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-red-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                💰 Faturamento Gerado (R$)
              </label>
              <input type="number" min={0} step={0.01} value={form.revenueGenerated || ''}
                onChange={e => setField('revenueGenerated', Number(e.target.value))}
                placeholder="0,00"
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-emerald-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
            </div>
          </div>

          {/* ── Resultado financeiro calculado em tempo real ── */}
          <div className={`rounded-2xl border p-5 ${
            formProfit >= 0
              ? 'bg-emerald-500/8 border-emerald-500/30'
              : 'bg-red-500/8 border-red-500/30'
          }`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              📊 Resultado calculado automaticamente
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Lucro */}
              <div className="col-span-2 md:col-span-1">
                <p className="text-xs text-gray-500 mb-1">Lucro líquido</p>
                <p className={`text-2xl font-bold ${formProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(formProfit)}
                </p>
                {form.investedValue > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {formProfit >= 0
                      ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400"/>
                      : <ArrowDownRight className="h-3.5 w-3.5 text-red-400"/>}
                    <span className={`text-xs font-medium ${formProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      faturamento - investido
                    </span>
                  </div>
                )}
              </div>
              {/* ROI */}
              <div>
                <p className="text-xs text-gray-500 mb-1">ROI</p>
                <p className={`text-2xl font-bold ${formROI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {form.investedValue > 0 ? `${formROI.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-gray-600 mt-1">retorno s/ investimento</p>
              </div>
              {/* CPL */}
              <div>
                <p className="text-xs text-gray-500 mb-1">CPL</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {form.leadsGenerated > 0 ? formatCurrency(formCPL) : '—'}
                </p>
                <p className="text-xs text-gray-600 mt-1">custo por lead</p>
              </div>
              {/* CPC */}
              <div>
                <p className="text-xs text-gray-500 mb-1">CPC</p>
                <p className="text-2xl font-bold text-purple-400">
                  {form.clientsClosed > 0 ? formatCurrency(formCPC) : '—'}
                </p>
                <p className="text-xs text-gray-600 mt-1">custo por cliente</p>
              </div>
            </div>

            {/* Barra visual investido vs faturamento */}
            {form.investedValue > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Investido</span>
                  <span>Faturamento</span>
                </div>
                <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-red-500/70 rounded-full transition-all duration-500"
                    style={{ width: '100%' }}
                  />
                  <div
                    className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: form.revenueGenerated > 0
                        ? `${Math.min((form.revenueGenerated / Math.max(form.investedValue, form.revenueGenerated)) * 100, 100)}%`
                        : '0%'
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5">
                  <span className="text-red-400 font-medium">{formatCurrency(form.investedValue)}</span>
                  <span className={`font-medium ${formProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(form.revenueGenerated)}
                  </span>
                </div>
              </div>
            )}

            {/* Alerta prejuízo */}
            {form.investedValue > 0 && formProfit < 0 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">
                  Campanha com prejuízo de {formatCurrency(Math.abs(formProfit))}. Faturamento abaixo do investido.
                </p>
              </div>
            )}
          </div>

          {/* Leads e clientes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">👥 Leads Gerados</label>
              <input type="number" min={0} value={form.leadsGenerated || ''}
                onChange={e => setField('leadsGenerated', Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">🤝 Clientes Fechados</label>
              <input type="number" min={0} value={form.clientsClosed || ''}
                onChange={e => setField('clientsClosed', Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Observações</label>
            <textarea rows={2} value={form.observations}
              onChange={e => setField('observations', e.target.value)}
              placeholder="Notas sobre esta campanha..."
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-gray-800">
          <button onClick={closeModal}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all">
            <Save className="h-4 w-4" />
            {editingCampaign ? 'Salvar alterações' : 'Cadastrar campanha'}
          </button>
        </div>
        </>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir campanha" danger confirmLabel="Excluir"
        description={`Deseja excluir a campanha "${deleteTarget?.campaignName}"?`}
      />
    </div>
  );
}
