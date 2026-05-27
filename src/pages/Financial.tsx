import { useState, useMemo } from 'react';
import {
  Plus, ArrowUpCircle, ArrowDownCircle,
  TrendingUp, Calendar, Save, Trash2, Edit2, BarChart3,
} from 'lucide-react';
import { formatCurrency, formatDate, generateId } from '../utils/helpers';
import { FinancialEntry, ServiceType } from '../types';
import { SERVICE_LABELS } from '../types';
import { mockFinancialEntries, mockClients } from '../data/mockData';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

type EntryType = 'income' | 'expense';

const INCOME_CATEGORIES = ['Projeto', 'Sinal/Adiantamento', 'Parcela', 'Bônus', 'Outros'];
const EXPENSE_CATEGORIES = ['Anúncios', 'Ferramentas IA', 'Assinaturas', 'Freelancers', 'Servidores', 'Outros custos'];

const emptyEntry = (): Omit<FinancialEntry, 'id' | 'createdAt'> => ({
  type: 'income',
  category: 'Projeto',
  description: '',
  value: 0,
  clientId: '',
  clientName: '',
  service: undefined,
  date: new Date().toISOString().split('T')[0],
});

export function Financial() {
  const [entries, setEntries] = useState<FinancialEntry[]>(mockFinancialEntries);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [form, setForm] = useState(emptyEntry());
  const [deleteTarget, setDeleteTarget] = useState<FinancialEntry | null>(null);

  const { toasts, removeToast, success, error } = useToast();

  const filteredEntries = useMemo(() =>
    entries.filter((e) => filter === 'all' || e.type === filter),
    [entries, filter]
  );

  const totalIncome = useMemo(() => entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.value, 0), [entries]);
  const totalExpenses = useMemo(() => entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.value, 0), [entries]);
  const netProfit = totalIncome - totalExpenses;

  const expensesByCategory = useMemo(() =>
    entries.filter((e) => e.type === 'expense').reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.value;
      return acc;
    }, {} as Record<string, number>),
    [entries]
  );

  function openNew(type?: EntryType) {
    setEditingEntry(null);
    setForm({ ...emptyEntry(), type: type || 'income', category: type === 'expense' ? 'Anúncios' : 'Projeto' });
    setModalOpen(true);
  }

  function openEdit(e: FinancialEntry) {
    setEditingEntry(e);
    setForm({
      type: e.type, category: e.category, description: e.description,
      value: e.value, clientId: e.clientId || '', clientName: e.clientName || '',
      service: e.service, date: e.date,
    });
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingEntry(null); }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    if (key === 'clientId') {
      const client = mockClients.find((c) => c.id === String(value));
      setForm((prev) => ({ ...prev, clientId: String(value), clientName: client?.name || '' }));
    } else if (key === 'type') {
      const isIncome = value === 'income';
      setForm((prev) => ({ ...prev, type: value as EntryType, category: isIncome ? 'Projeto' : 'Anúncios' }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  }

  function handleSave() {
    if (!form.description.trim()) { error('Informe a descrição.'); return; }
    if (form.value <= 0) { error('Informe um valor maior que zero.'); return; }

    if (editingEntry) {
      setEntries((prev) => prev.map((e) => e.id === editingEntry.id ? { ...editingEntry, ...form } : e));
      success('Transação atualizada!');
    } else {
      setEntries((prev) => [{ id: generateId(), createdAt: new Date().toISOString(), ...form }, ...prev]);
      success('Transação adicionada!');
    }
    closeModal();
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    success('Transação removida.');
    setDeleteTarget(null);
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Financeiro</h1>
          <p className="text-gray-400 mt-1">Controle de entradas e saídas</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => openNew('income')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium rounded-xl hover:bg-emerald-500/30 transition-all">
            <ArrowUpCircle className="h-4 w-4" /> Entrada
          </button>
          <button onClick={() => openNew('expense')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-all">
            <ArrowDownCircle className="h-4 w-4" /> Saída
          </button>
          <button onClick={() => openNew()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all">
            <Plus className="h-4 w-4" /> Transação
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-emerald-500/20"><ArrowUpCircle className="h-6 w-6 text-emerald-400" /></div>
            <span className="text-emerald-400 font-medium">Total de Entradas</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalIncome)}</p>
          <p className="text-sm text-gray-500 mt-2">{entries.filter((e) => e.type === 'income').length} transações</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-red-500/20"><ArrowDownCircle className="h-6 w-6 text-red-400" /></div>
            <span className="text-red-400 font-medium">Total de Saídas</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-gray-500 mt-2">{entries.filter((e) => e.type === 'expense').length} transações</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border border-violet-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500"><TrendingUp className="h-6 w-6 text-white" /></div>
            <span className="text-violet-400 font-medium">Lucro Líquido</span>
          </div>
          <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(netProfit)}</p>
          <p className="text-sm text-gray-500 mt-2">
            {totalIncome > 0 ? `${((netProfit / totalIncome) * 100).toFixed(1)}% de margem` : '—'}
          </p>
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-violet-400" />
          <h3 className="text-lg font-semibold text-white">Despesas por Categoria</h3>
        </div>
        {Object.keys(expensesByCategory).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(expensesByCategory).map(([category, value]) => (
              <div key={category} className="rounded-xl bg-gray-800/40 border border-gray-700/30 p-4">
                <p className="text-xs text-gray-400 mb-1 truncate">{category}</p>
                <p className="text-lg font-bold text-red-400">{formatCurrency(value)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhuma despesa registrada.</p>
        )}
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 overflow-hidden">
        <div className="p-6 border-b border-gray-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">Transações</h3>
          <div className="flex gap-2">
            {(['all', 'income', 'expense'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? f === 'all' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                      : f === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}>
                {f === 'all' ? 'Todas' : f === 'income' ? 'Entradas' : 'Saídas'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50 bg-gray-800/20">
                {['Tipo','Descrição','Categoria','Cliente/Serviço','Data','Valor','Ações'].map((h) => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === 'Ações' || h === 'Valor' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${entry.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {entry.type === 'income' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                      {entry.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">{entry.description}</td>
                  <td className="px-6 py-4 text-gray-400">{entry.category}</td>
                  <td className="px-6 py-4 text-gray-400">{entry.clientName || (entry.service ? SERVICE_LABELS[entry.service] : '—')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDate(entry.date)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-semibold ${entry.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.value)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(entry)} className="p-2 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors" title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(entry)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntries.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500">Nenhuma transação encontrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editingEntry ? 'Editar Transação' : 'Nova Transação'} size="md">
        <div className="space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setField('type', 'income' as EntryType)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-medium transition-all ${form.type === 'income' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                <ArrowUpCircle className="h-5 w-5" /> Entrada
              </button>
              <button onClick={() => setField('type', 'expense' as EntryType)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-medium transition-all ${form.type === 'expense' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                <ArrowDownCircle className="h-5 w-5" /> Saída
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Descrição *</label>
            <input type="text" value={form.description} onChange={(e) => setField('description', e.target.value)}
              placeholder="Ex: Projeto site ABC / Meta Ads Janeiro"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all" />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Categoria</label>
            <select value={form.category} onChange={(e) => setField('category', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all">
              {(form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Valor (R$) *</label>
            <input type="number" min={0} step={0.01} value={form.value} onChange={(e) => setField('value', Number(e.target.value))}
              placeholder="0,00"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all" />
          </div>

          {/* Cliente (apenas para entradas) */}
          {form.type === 'income' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Cliente</label>
                <select value={form.clientId} onChange={(e) => setField('clientId', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all">
                  <option value="">Selecione o cliente</option>
                  {mockClients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Serviço</label>
                <select value={form.service || ''} onChange={(e) => setField('service', e.target.value as ServiceType || undefined)}
                  className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all">
                  <option value="">Selecione o serviço</option>
                  {Object.entries(SERVICE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Data</label>
            <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all" />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-gray-800">
          <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all">
            <Save className="h-4 w-4" />
            {editingEntry ? 'Salvar alterações' : 'Adicionar transação'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir transação" danger confirmLabel="Excluir"
        description={`Deseja excluir a transação "${deleteTarget?.description}"?`}
      />
    </div>
  );
}
