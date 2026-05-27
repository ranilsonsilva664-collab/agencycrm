import { useState, useMemo } from 'react';
import {
  Search, Plus, Edit2, Trash2, FolderOpen,
  Calendar, Save, Folder, Upload, Link2, Eye,
  MessageCircle,
} from 'lucide-react';
import {
  formatCurrency, formatDate, getStatusColor,
  isOverdue, getDaysUntilDeadline, generateId,
} from '../utils/helpers';
import { Project, ServiceType, ProjectStatus, FileUpload } from '../types';
import { PROJECT_STATUS_LABELS, SERVICE_LABELS, SERVICE_COLORS, Client } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { BudgetEditor } from '../components/BudgetEditor';
import { ContractManager } from '../components/ContractManager';

const emptyProject = (): Omit<Project, 'id' | 'createdAt' | 'profit'> => ({
  name: '',
  clientId: '',
  clientName: '',
  category: 'sites',
  value: 0,
  cost: 0,
  date: new Date().toISOString().split('T')[0],
  deadline: '',
  status: 'novo-lead',
  files: [],
  observations: '',
});

export function Projects() {
  const { data: projects, loading, addDocument, updateDocument, deleteDocument } = useFirestore<Project>('projects');
  const { data: clients } = useFirestore<Client>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyProject());
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [budgetProject, setBudgetProject] = useState<Project | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  const { toasts, removeToast, success, error } = useToast();

  const filteredProjects = useMemo(() =>
    projects.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchSearch = p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    }),
    [projects, searchTerm, categoryFilter, statusFilter]
  );

  function openNew() {
    setEditingProject(null);
    setForm(emptyProject());
    setModalOpen(true);
  }

  function openEdit(p: Project) {
    setEditingProject(p);
    setForm({
      name: p.name, clientId: p.clientId, clientName: p.clientName,
      category: p.category, value: p.value, cost: p.cost,
      date: p.date, deadline: p.deadline, status: p.status,
      files: p.files, observations: p.observations,
    });
    setModalOpen(true);
  }

  function openView(p: Project) {
    setViewingProject(p);
    setDetailOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingProject(null); }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    if (key === 'clientId') {
      const client = clients.find((c) => c.id === String(value));
      setForm((prev) => ({ ...prev, clientId: String(value), clientName: client?.name || '' }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { error('Nome do projeto é obrigatório.'); return; }
    if (!form.deadline) { error('Informe o prazo de entrega.'); return; }
    const profit = form.value - form.cost;

    try {
      if (editingProject) {
        await updateDocument(editingProject.id, { ...form, profit });
        success('Projeto atualizado!');
      } else {
        const newProject: Omit<Project, 'id'> = { createdAt: new Date().toISOString(), ...form, profit };
        await addDocument(newProject);
        success('Projeto cadastrado!');
      }
      closeModal();
    } catch (err) {
      error('Erro ao salvar projeto.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      success('Projeto removido.');
    } catch (err) {
      error('Erro ao remover projeto.');
    }
    setDeleteTarget(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newFiles: FileUpload[] = Array.from(files).map((f) => ({
      id: generateId(),
      name: f.name,
      type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'pdf',
      url: URL.createObjectURL(f),
      uploadedAt: new Date().toISOString(),
    }));
    setField('files', [...form.files, ...newFiles]);
  }

  function removeFile(id: string) {
    setField('files', form.files.filter((f) => f.id !== id));
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Projetos</h1>
          <p className="text-gray-400 mt-1">Gerencie todos os seus projetos</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-200">
          <Plus className="h-5 w-5" /> Novo Projeto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input type="text" placeholder="Buscar projetos..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-violet-500/50 transition-all">
          <option value="all">Todas Categorias</option>
          {Object.entries(SERVICE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-violet-500/50 transition-all">
          <option value="all">Todos Status</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Projects Table */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50 bg-gray-800/20">
                {['Projeto','Cliente','Categoria','Valor','Custo','Lucro','Status','Prazo','Ações'].map((h) => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === 'Ações' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-violet-500"></div>
                    </div>
                    Carregando projetos...
                  </td>
                </tr>
              ) : filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${SERVICE_COLORS[project.category]}25` }}>
                        <FolderOpen className="w-5 h-5" style={{ color: SERVICE_COLORS[project.category] }} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{project.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(project.date)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{project.clientName || '—'}</td>
                  <td className="px-6 py-4 text-gray-300 text-sm">{SERVICE_LABELS[project.category]}</td>
                  <td className="px-6 py-4 text-white font-medium">{formatCurrency(project.value)}</td>
                  <td className="px-6 py-4 text-red-400">{formatCurrency(project.cost)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${project.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(project.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className={isOverdue(project.deadline) ? 'text-red-400 text-sm' : 'text-gray-300 text-sm'}>
                        {formatDate(project.deadline)}
                      </span>
                      {isOverdue(project.deadline) && (
                        <span className="text-xs text-red-400 whitespace-nowrap">
                          ({Math.abs(getDaysUntilDeadline(project.deadline))}d)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setBudgetProject(project); setBudgetModalOpen(true); }} className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Enviar orçamento via WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button onClick={() => openView(project)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </button>
                      {['em-producao', 'finalizado'].includes(project.status) && <ContractManager project={project} compact />}
                      <button onClick={() => openEdit(project)} className="p-2 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors" title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(project)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <Folder className="h-12 w-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum projeto encontrado</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editingProject ? 'Editar Projeto' : 'Novo Projeto'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome do projeto *</label>
            <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)}
              placeholder="Ex: Site Institucional ABC"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all" />
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Cliente</label>
            <select value={form.clientId} onChange={(e) => setField('clientId', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all">
              <option value="">Selecione o cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Categoria</label>
            <select value={form.category} onChange={(e) => setField('category', e.target.value as ServiceType)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all">
              {Object.entries(SERVICE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Valor do projeto (R$)</label>
            <input type="number" min={0} value={form.value} onChange={(e) => setField('value', Number(e.target.value))}
              placeholder="0,00"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all" />
          </div>

          {/* Custo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Custo (R$)</label>
            <input type="number" min={0} value={form.cost} onChange={(e) => setField('cost', Number(e.target.value))}
              placeholder="0,00"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all" />
          </div>

          {/* Lucro automático */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm text-emerald-400 font-medium">Lucro calculado automaticamente</span>
              <span className="text-xl font-bold text-emerald-400">{formatCurrency(form.value - form.cost)}</span>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => setField('status', e.target.value as ProjectStatus)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all">
              {Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Data de início</label>
            <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all" />
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Prazo de entrega *</label>
            <input type="date" value={form.deadline} onChange={(e) => setField('deadline', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all" />
          </div>

          {/* Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Arquivos do projeto</label>
            <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group">
              <Upload className="h-5 w-5 text-gray-500 group-hover:text-violet-400" />
              <span className="text-sm text-gray-500 group-hover:text-gray-300">Clique para fazer upload (imagens, vídeos, PDFs)</span>
              <input type="file" multiple accept="image/*,video/*,.pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            {form.files.length > 0 && (
              <div className="mt-3 space-y-2">
                {form.files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-violet-400" />
                      <span className="text-sm text-gray-300 truncate max-w-[200px]">{f.name}</span>
                    </div>
                    <button onClick={() => removeFile(f.id)} className="text-gray-500 hover:text-red-400 transition-colors text-xs">remover</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Observações</label>
            <textarea rows={3} value={form.observations} onChange={(e) => setField('observations', e.target.value)}
              placeholder="Detalhes, referências, requisitos especiais..."
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-gray-800">
          <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all">
            <Save className="h-4 w-4" />
            {editingProject ? 'Salvar alterações' : 'Cadastrar projeto'}
          </button>
        </div>
      </Modal>

      {/* Detail Modal */}
      {viewingProject && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Detalhes do Projeto" size="lg">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${SERVICE_COLORS[viewingProject.category]}25` }}>
                <FolderOpen className="w-8 h-8" style={{ color: SERVICE_COLORS[viewingProject.category] }} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{viewingProject.name}</h3>
                <p className="text-gray-400">{SERVICE_LABELS[viewingProject.category]}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Cliente', value: viewingProject.clientName || '—' },
                { label: 'Status', value: PROJECT_STATUS_LABELS[viewingProject.status] },
                { label: 'Início', value: formatDate(viewingProject.date) },
                { label: 'Prazo', value: formatDate(viewingProject.deadline) },
                { label: 'Valor', value: formatCurrency(viewingProject.value) },
                { label: 'Custo', value: formatCurrency(viewingProject.cost) },
              ].map((item) => (
                <div key={item.label} className="px-4 py-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="text-white font-medium">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="px-4 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <span className="text-emerald-400 font-medium">Lucro líquido</span>
              <span className="text-2xl font-bold text-emerald-400">{formatCurrency(viewingProject.profit)}</span>
            </div>

            {viewingProject.observations && (
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">Observações</p>
                <p className="text-gray-300 text-sm leading-relaxed bg-gray-800/40 px-4 py-3 rounded-xl border border-gray-700/30">{viewingProject.observations}</p>
              </div>
            )}

            {viewingProject.files.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">Arquivos ({viewingProject.files.length})</p>
                <div className="space-y-2">
                  {viewingProject.files.map((f) => (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-violet-500/40 transition-colors">
                      <Link2 className="h-4 w-4 text-violet-400" />
                      <span className="text-sm text-gray-300">{f.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <ContractManager project={viewingProject} />

            <div className="flex gap-3 pt-4 border-t border-gray-800">
              <button onClick={() => { setDetailOpen(false); openEdit(viewingProject); }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors font-medium">
                <Edit2 className="h-4 w-4" /> Editar projeto
              </button>
              <button onClick={() => setDetailOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors font-medium">
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir projeto" danger confirmLabel="Excluir"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
      />

      {/* Budget Editor Modal */}
      <BudgetEditor
        project={budgetProject ?? undefined}
        open={budgetModalOpen}
        onClose={() => { setBudgetModalOpen(false); setBudgetProject(null); }}
      />
    </div>
  );
}
