import { useState, useMemo } from 'react';
import {
  Search, Plus, Edit2, Trash2, Phone, Building,
  Calendar, FileText, AtSign, Save, User, MessageCircle, Eye,
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor, generateId } from '../utils/helpers';
import { Client, ClientStatus, ServiceType } from '../types';
import { CLIENT_STATUS_LABELS, SERVICE_LABELS } from '../types';
import { mockClients } from '../data/mockData';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ToastContainer } from '../components/Toast';
import { BudgetEditor } from '../components/BudgetEditor';
import { useToast } from '../hooks/useToast';
import { ContractManager } from '../components/ContractManager';
import { useFirestore } from '../hooks/useFirestore';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const emptyClient = (): Omit<Client, 'id' | 'createdAt'> => ({
  name: '',
  whatsapp: '',
  email: '',
  document: '',
  address: '',
  instagram: '',
  company: '',
  service: 'sites',
  projectValue: 0,
  status: 'novo-lead',
  startDate: new Date().toISOString().split('T')[0],
  deadline: '',
  observations: '',
  source: 'organico',
});

export function Clients() {
  const { data: clients, loading, addDocument, updateDocument, deleteDocument } = useFirestore<Client>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient());

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  // Budget preview
  const [budgetClient, setBudgetClient] = useState<Client | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);

  const { toasts, removeToast, success, error } = useToast();

  const filteredClients = useMemo(() =>
    clients.filter((c) => {
      const q = searchTerm.toLowerCase();
      const matchSearch = c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    }),
    [clients, searchTerm, statusFilter]
  );

  /* ---- Helpers ---- */
  function openNew() {
    setEditingClient(null);
    setForm(emptyClient());
    setModalOpen(true);
  }

  function openEdit(c: Client) {
    setEditingClient(c);
    setForm({
      name: c.name,
      whatsapp: c.whatsapp,
      email: c.email || '',
      document: c.document || '',
      address: c.address || '',
      instagram: c.instagram,
      company: c.company,
      service: c.service,
      projectValue: c.projectValue,
      status: c.status,
      startDate: c.startDate,
      deadline: c.deadline,
      observations: c.observations,
      source: c.source || 'organico',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingClient(null);
  }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { error('O nome é obrigatório.'); return; }
    if (!form.deadline) { error('Informe o prazo de entrega.'); return; }

    try {
      if (editingClient) {
        await updateDocument(editingClient.id, form);
        success('Cliente atualizado com sucesso!');
      } else {
        const newClient: Omit<Client, 'id'> = {
          createdAt: new Date().toISOString(),
          ...form,
        };
        const newClientId = await addDocument(newClient);
        success('Cliente cadastrado com sucesso!');

        // Lógica de Automação: Gerar projeto e financeiro se houver valor
        if (form.projectValue > 0) {
          try {
            // Cria Entrada Financeira
            await addDoc(collection(db, 'financial_entries'), {
              type: 'income',
              category: 'Projeto',
              description: `Projeto: ${form.company || form.name}`,
              value: form.projectValue,
              clientId: newClientId,
              clientName: form.name,
              service: form.service,
              date: form.startDate || new Date().toISOString().split('T')[0],
              createdAt: new Date().toISOString()
            });

            // Cria Projeto
            await addDoc(collection(db, 'projects'), {
              name: `Projeto ${form.service} - ${form.company || form.name}`,
              clientId: newClientId,
              clientName: form.name,
              category: form.service,
              value: form.projectValue,
              cost: 0,
              profit: form.projectValue,
              date: form.startDate || new Date().toISOString().split('T')[0],
              deadline: form.deadline,
              status: 'novo-lead',
              files: [],
              observations: '',
              createdAt: new Date().toISOString()
            });

            // Cria Kanban Card
            await addDoc(collection(db, 'kanban_cards'), {
              title: `Projeto ${form.service} - ${form.company || form.name}`,
              client: form.name,
              value: form.projectValue,
              status: 'novo-lead',
              dueDate: form.deadline,
              createdAt: new Date().toISOString()
            });

            success('Projeto, Receita e Kanban gerados automaticamente!');
          } catch (e) {
            console.error('Erro ao gerar automações:', e);
          }
        }
      }
      closeModal();
    } catch (err) {
      error('Erro ao salvar o cliente.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      success('Cliente removido.');
    } catch (err) {
      error('Erro ao remover o cliente.');
    }
    setDeleteTarget(null);
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 mt-1">Gerencie seus clientes e projetos</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-200">
          <Plus className="h-5 w-5" /> Novo Cliente
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
        >
          <option value="all">Todos os Status</option>
          {Object.entries(CLIENT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(CLIENT_STATUS_LABELS).slice(0, 4).map(([status, label]) => {
          const count = clients.filter((c) => c.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`rounded-xl border p-4 text-left transition-all ${statusFilter === status ? getStatusColor(status) + ' border-current' : 'bg-gray-900/40 border-gray-800 hover:border-gray-600'}`}
            >
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </button>
          );
        })}
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div key={client.id} className="group rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6 hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/25">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{client.name}</h3>
                  <p className="text-sm text-gray-500">{client.company}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(client.status)}`}>
                  {CLIENT_STATUS_LABELS[client.status]}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  client.source === 'anuncio' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {client.source === 'anuncio' ? 'Anúncio' : 'Orgânico'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="h-4 w-4 text-violet-400/70" />
                <button
                  onClick={() => { setBudgetClient(client); setBudgetModalOpen(true); }}
                  className="hover:text-emerald-400 hover:underline transition-colors text-left cursor-pointer"
                  title="Clique para enviar o orçamento via WhatsApp"
                >
                  {client.whatsapp}
                </button>
              </div>
              {/* WhatsApp link removed - now integrated with budget button above */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <AtSign className="h-4 w-4 text-violet-400/70" />
                <span>{client.instagram}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Building className="h-4 w-4 text-violet-400/70" />
                <span>{SERVICE_LABELS[client.service]}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
              <div>
                <p className="text-xs text-gray-500">Valor do Projeto</p>
                <p className="text-lg font-bold text-white">{formatCurrency(client.projectValue)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDetailClient(client)}
                  className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  title="Detalhes do cliente"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setBudgetClient(client); setBudgetModalOpen(true); }}
                  className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                  title="Enviar orçamento via WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openEdit(client)}
                  className="p-2 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(client)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Início: {formatDate(client.startDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>Prazo: {formatDate(client.deadline)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {!loading && filteredClients.length === 0 && (
        <div className="text-center py-20">
          <User className="h-12 w-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
          <p className="text-gray-600 text-sm mt-1">Tente ajustar os filtros ou cadastre um novo cliente.</p>
        </div>
      )}

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editingClient ? 'Editar Cliente' : 'Novo Cliente'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome completo *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Ex: João Silva"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">WhatsApp</label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => setField('whatsapp', e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="cliente@email.com"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">CPF/CNPJ</label>
            <input
              type="text"
              value={form.document || ''}
              onChange={(e) => setField('document', e.target.value)}
              placeholder="000.000.000-00"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Endereço</label>
            <input
              type="text"
              value={form.address || ''}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Rua, número, cidade/UF"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Instagram</label>
            <input
              type="text"
              value={form.instagram}
              onChange={(e) => setField('instagram', e.target.value)}
              placeholder="@usuario"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          {/* Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Empresa</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setField('company', e.target.value)}
              placeholder="Nome da empresa"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          {/* Origem */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Origem do Cliente</label>
            <select
              value={form.source || 'organico'}
              onChange={(e) => setField('source', e.target.value as 'anuncio' | 'organico')}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            >
              <option value="organico">Orgânico</option>
              <option value="anuncio">Anúncio Pago</option>
            </select>
          </div>

          {/* Serviço */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Serviço contratado</label>
            <select
              value={form.service}
              onChange={(e) => setField('service', e.target.value as ServiceType)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            >
              {Object.entries(SERVICE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Valor do projeto (R$)</label>
            <input
              type="number"
              min={0}
              value={form.projectValue}
              onChange={(e) => setField('projectValue', Number(e.target.value))}
              placeholder="0,00"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setField('status', e.target.value as ClientStatus)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            >
              {Object.entries(CLIENT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Data início */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Data de início</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Prazo de entrega *</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setField('deadline', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
            />
          </div>

          {/* Observações */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Observações</label>
            <textarea
              rows={3}
              value={form.observations}
              onChange={(e) => setField('observations', e.target.value)}
              placeholder="Informações adicionais sobre o cliente ou projeto..."
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-5 border-t border-gray-800">
          <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Save className="h-4 w-4" />
            {editingClient ? 'Salvar alterações' : 'Cadastrar cliente'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
      />

      {/* Detalhes do cliente com Contrato Digital */}
      {detailClient && (
        <Modal open={!!detailClient} onClose={() => setDetailClient(null)} title="Detalhes do Cliente" size="xl">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xl">
                {detailClient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{detailClient.name}</h2>
                <p className="text-gray-400">{detailClient.company || 'Sem empresa cadastrada'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'WhatsApp', value: detailClient.whatsapp },
                { label: 'E-mail', value: detailClient.email || 'Não informado' },
                { label: 'CPF/CNPJ', value: detailClient.document || 'Não informado' },
                { label: 'Endereço', value: detailClient.address || 'Não informado' },
                { label: 'Serviço', value: SERVICE_LABELS[detailClient.service] },
                { label: 'Valor', value: formatCurrency(detailClient.projectValue) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-gray-800/50 border border-gray-700/50 p-4">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="text-white font-medium">{item.value}</p>
                </div>
              ))}
            </div>

            <ContractManager client={detailClient} />
          </div>
        </Modal>
      )}

      {/* Budget Editor Modal */}
      <BudgetEditor
        client={budgetClient ?? undefined}
        open={budgetModalOpen}
        onClose={() => { setBudgetModalOpen(false); setBudgetClient(null); }}
      />
    </div>
  );
}
