import { useMemo, useState } from 'react';
import { CheckCircle, Edit2, FileText, Plus, Search, Trash2 } from 'lucide-react';
import { Quote, QUOTE_STATUS_LABELS, QuoteStatus, ServiceType } from '../types';
import { formatCurrency, formatDate, generateId, getStatusColor } from '../utils/helpers';
import { SERVICE_LABELS } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { ContractManager } from '../components/ContractManager';

const emptyQuote = (): Omit<Quote, 'id' | 'createdAt'> => ({
  clientId: '',
  clientName: '',
  clientWhatsapp: '',
  clientEmail: '',
  clientDocument: '',
  clientAddress: '',
  company: '',
  service: 'sites',
  title: '',
  description: '',
  totalValue: 0,
  paymentMethod: '50% na aprovação e 50% na entrega final',
  entryValue: 0,
  installments: 2,
  deadline: '',
  revisionsIncluded: 2,
  observations: '',
  status: 'rascunho',
});

export function Quotes() {
  const { data: quotes, loading, addDocument, updateDocument, deleteDocument } = useFirestore<Quote>('quotes');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [form, setForm] = useState(emptyQuote());
  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null);
  const { toasts, removeToast, success, error } = useToast();

  const filtered = useMemo(() => quotes.filter((q) => {
    const search = `${q.title} ${q.clientName} ${q.company}`.toLowerCase();
    return search.includes(query.toLowerCase()) && (statusFilter === 'all' || q.status === statusFilter);
  }), [quotes, query, statusFilter]);

  const totalClosed = quotes.filter((q) => ['aprovado', 'fechado'].includes(q.status)).reduce((s, q) => s + q.totalValue, 0);

  function openNew() { setEditing(null); setForm(emptyQuote()); setModalOpen(true); }
  function openEdit(q: Quote) { setEditing(q); setForm({ ...q }); setModalOpen(true); }
  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((p) => ({ ...p, [key]: value })); }
  async function save() {
    if (!form.title.trim() || !form.clientName.trim()) { error('Informe cliente e título do orçamento.'); return; }
    try {
      if (editing) {
        await updateDocument(editing.id, form);
        success('Orçamento atualizado!');
      } else {
        const newQuote: Omit<Quote, 'id'> = { createdAt: new Date().toISOString(), ...form };
        await addDocument(newQuote);
        success('Orçamento criado!');
      }
      setModalOpen(false);
    } catch (err) {
      error('Erro ao salvar orçamento.');
    }
  }
  async function remove() {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      success('Orçamento removido.');
    } catch (err) {
      error('Erro ao remover orçamento.');
    }
    setDeleteTarget(null);
  }
  async function markClosed(q: Quote) {
    try {
      await updateDocument(q.id, { status: 'fechado' });
      success('Orçamento marcado como fechado.');
      
      // Lógica de Vínculo
      try {
        // Cria Cliente automaticamente
        const clientRef = await addDoc(collection(db, 'clients'), {
          name: q.clientName,
          whatsapp: q.clientWhatsapp,
          email: q.clientEmail,
          document: q.clientDocument,
          address: q.clientAddress,
          company: q.company,
          instagram: '',
          service: q.service,
          projectValue: q.totalValue,
          status: 'novo-lead',
          startDate: new Date().toISOString().split('T')[0],
          deadline: q.deadline,
          observations: q.observations,
          createdAt: new Date().toISOString()
        });

        // Cria Entrada Financeira
        await addDoc(collection(db, 'financial_entries'), {
          type: 'income',
          category: 'Projeto',
          description: `Projeto: ${q.company || q.clientName}`,
          value: q.totalValue,
          clientId: clientRef.id,
          clientName: q.clientName,
          service: q.service,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });

        // Cria Projeto
        await addDoc(collection(db, 'projects'), {
          name: q.title,
          clientId: clientRef.id,
          clientName: q.clientName,
          category: q.service,
          value: q.totalValue,
          cost: 0,
          profit: q.totalValue,
          date: new Date().toISOString().split('T')[0],
          deadline: q.deadline,
          status: 'novo-lead',
          files: [],
          observations: q.description,
          createdAt: new Date().toISOString()
        });

        // Cria Kanban Card
        await addDoc(collection(db, 'kanban_cards'), {
          title: q.title,
          client: q.clientName,
          value: q.totalValue,
          status: 'novo-lead',
          dueDate: q.deadline,
          createdAt: new Date().toISOString()
        });

        success('Cliente, Projeto, Receita e Kanban gerados com sucesso!');
      } catch (e) {
        console.error('Erro ao gerar automações de orçamento aprovado:', e);
      }

    } catch (err) {
      error('Erro ao atualizar orçamento.');
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Orçamentos</h1>
          <p className="text-gray-400 mt-1">Crie orçamentos e gere contratos digitais quando forem aprovados.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all">
          <Plus className="h-5 w-5" /> Novo Orçamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5"><p className="text-sm text-gray-500">Total em orçamento</p><p className="text-2xl font-bold text-white">{formatCurrency(quotes.reduce((s, q) => s + q.totalValue, 0))}</p></div>
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5"><p className="text-sm text-emerald-400">Aprovados/Fechados</p><p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalClosed)}</p></div>
        <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-5"><p className="text-sm text-violet-400">Conversão</p><p className="text-2xl font-bold text-white">{quotes.length ? Math.round((quotes.filter(q => ['aprovado', 'fechado'].includes(q.status)).length / quotes.length) * 100) : 0}%</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar orçamento..." className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-violet-500/50">
          <option value="all">Todos status</option>
          {Object.entries(QUOTE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
        </div>
      ) : (
      <div className="space-y-4">
        {filtered.map((q) => (
          <div key={q.id} className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-5">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(q.status === 'fechado' || q.status === 'aprovado' ? 'finalizado' : 'orcamento')}`}>{QUOTE_STATUS_LABELS[q.status]}</span>
                  <span className="text-xs text-gray-500">{formatDate(q.createdAt)}</span>
                </div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="h-5 w-5 text-violet-400" />{q.title}</h3>
                <p className="text-gray-400 mt-1 line-clamp-2">{q.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                  <div><p className="text-gray-500">Cliente</p><p className="text-white font-medium">{q.clientName}</p></div>
                  <div><p className="text-gray-500">Serviço</p><p className="text-white font-medium">{SERVICE_LABELS[q.service]}</p></div>
                  <div><p className="text-gray-500">Valor</p><p className="text-emerald-400 font-bold">{formatCurrency(q.totalValue)}</p></div>
                  <div><p className="text-gray-500">Prazo</p><p className="text-white font-medium">{formatDate(q.deadline)}</p></div>
                </div>
              </div>
              <div className="flex flex-col gap-3 min-w-[280px]">
                <div className="flex flex-wrap justify-end gap-2">
                  {!['aprovado', 'fechado'].includes(q.status) && <button onClick={() => markClosed(q)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-sm"><CheckCircle className="h-4 w-4"/> Marcar fechado</button>}
                  <button onClick={() => openEdit(q)} className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-violet-400"><Edit2 className="h-4 w-4"/></button>
                  <button onClick={() => setDeleteTarget(q)} className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
                </div>
                {['aprovado', 'fechado'].includes(q.status) && <ContractManager quote={q} compact />}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500">Nenhum orçamento encontrado.</div>
        )}
      </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Orçamento' : 'Novo Orçamento'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={form.clientName} onChange={(e) => setField('clientName', e.target.value)} placeholder="Nome do cliente" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input value={form.clientWhatsapp} onChange={(e) => setField('clientWhatsapp', e.target.value)} placeholder="WhatsApp" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input value={form.clientEmail || ''} onChange={(e) => setField('clientEmail', e.target.value)} placeholder="E-mail" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input value={form.clientDocument || ''} onChange={(e) => setField('clientDocument', e.target.value)} placeholder="CPF/CNPJ" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input value={form.company || ''} onChange={(e) => setField('company', e.target.value)} placeholder="Empresa" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input value={form.clientAddress || ''} onChange={(e) => setField('clientAddress', e.target.value)} placeholder="Endereço" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <select value={form.service} onChange={(e) => setField('service', e.target.value as ServiceType)} className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white">
            {Object.entries(SERVICE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={form.status} onChange={(e) => setField('status', e.target.value as QuoteStatus)} className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white">
            {Object.entries(QUOTE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Título do orçamento" className="md:col-span-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Descrição do pedido" rows={3} className="md:col-span-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none" />
          <input type="number" value={form.totalValue || ''} onChange={(e) => setField('totalValue', Number(e.target.value))} placeholder="Valor total" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)} placeholder="Forma de pagamento" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input type="number" value={form.entryValue || ''} onChange={(e) => setField('entryValue', Number(e.target.value))} placeholder="Entrada" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input type="number" value={form.installments || ''} onChange={(e) => setField('installments', Number(e.target.value))} placeholder="Parcelas" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input type="date" value={form.deadline} onChange={(e) => setField('deadline', e.target.value)} className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <input type="number" value={form.revisionsIncluded || ''} onChange={(e) => setField('revisionsIncluded', Number(e.target.value))} placeholder="Revisões incluídas" className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white" />
          <textarea value={form.observations} onChange={(e) => setField('observations', e.target.value)} placeholder="Observações" rows={2} className="md:col-span-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none" />
        </div>
        <div className="flex gap-3 mt-6 pt-5 border-t border-gray-800">
          <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700">Cancelar</button>
          <button onClick={save} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold">Salvar orçamento</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="Excluir orçamento" description={`Deseja excluir "${deleteTarget?.title}"?`} danger confirmLabel="Excluir" />
    </div>
  );
}