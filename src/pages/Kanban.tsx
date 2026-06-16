import { useState, useRef } from 'react';
import { Plus, Calendar, DollarSign, MoreHorizontal, Save, GripVertical } from 'lucide-react';
import { formatCurrency, formatDate, generateId } from '../utils/helpers';
import { KanbanCard, KanbanStatus } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

const COLUMNS: { id: KanbanStatus; title: string; borderColor: string; badgeColor: string }[] = [
  { id: 'novo-lead',    title: 'Novo Lead',     borderColor: 'border-t-blue-500',   badgeColor: 'bg-blue-500/20 text-blue-400' },
  { id: 'orcamento',   title: 'Orçamento',      borderColor: 'border-t-yellow-500', badgeColor: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'em-producao', title: 'Em Produção',    borderColor: 'border-t-blue-500', badgeColor: 'bg-blue-500/20 text-blue-400' },
  { id: 'revisao',     title: 'Revisão',        borderColor: 'border-t-pink-500',   badgeColor: 'bg-pink-500/20 text-pink-400' },
  { id: 'finalizado',  title: 'Finalizado',     borderColor: 'border-t-emerald-500',badgeColor: 'bg-emerald-500/20 text-emerald-400' },
];

const emptyCard = (): Omit<KanbanCard, 'id'> => ({
  title: '',
  client: '',
  value: 0,
  status: 'novo-lead',
  dueDate: '',
});

export function Kanban() {
  const { data: cards, addDocument, updateDocument, deleteDocument } = useFirestore<KanbanCard>('kanban_cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [form, setForm] = useState(emptyCard());
  const [deleteTarget, setDeleteTarget] = useState<KanbanCard | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Drag state
  const dragCardId = useRef<string | null>(null);
  const dragOverCol = useRef<KanbanStatus | null>(null);
  const [dragOverColState, setDragOverColState] = useState<KanbanStatus | null>(null);

  const { toasts, removeToast, success } = useToast();

  function getCardsByStatus(status: KanbanStatus) {
    return cards.filter((c) => c.status === status);
  }

  function openNew(status?: KanbanStatus) {
    setEditingCard(null);
    setForm({ ...emptyCard(), status: status || 'novo-lead' });
    setModalOpen(true);
  }

  function openEdit(card: KanbanCard) {
    setEditingCard(card);
    setForm({ title: card.title, client: card.client, value: card.value, status: card.status, dueDate: card.dueDate });
    setModalOpen(true);
    setOpenMenuId(null);
  }

  function closeModal() { setModalOpen(false); setEditingCard(null); }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    if (editingCard) {
      await updateDocument(editingCard.id, form);
      success('Card atualizado!');
    } else {
      const newCard: Omit<KanbanCard, 'id'> = { createdAt: new Date().toISOString(), ...form };
      await addDocument(newCard);
      success('Card criado!');
    }
    closeModal();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteDocument(deleteTarget.id);
    success('Card removido.');
    setDeleteTarget(null);
  }

  async function moveCard(cardId: string, targetStatus: KanbanStatus) {
    await updateDocument(cardId, { status: targetStatus });
    success('Card movido!');
  }

  // Drag handlers
  function onDragStart(e: React.DragEvent, cardId: string) {
    dragCardId.current = cardId;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOverColumn(e: React.DragEvent, colId: KanbanStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverCol.current = colId;
    setDragOverColState(colId);
  }

  function onDragLeaveColumn() {
    setDragOverColState(null);
  }

  function onDropColumn(e: React.DragEvent, colId: KanbanStatus) {
    e.preventDefault();
    if (dragCardId.current && dragCardId.current !== '') {
      const card = cards.find((c) => c.id === dragCardId.current);
      if (card && card.status !== colId) {
        moveCard(dragCardId.current, colId);
      }
    }
    dragCardId.current = null;
    dragOverCol.current = null;
    setDragOverColState(null);
  }

  function onDragEnd() {
    dragCardId.current = null;
    setDragOverColState(null);
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Kanban</h1>
          <p className="text-gray-400 mt-1">Arraste os cards entre colunas para atualizar o status</p>
        </div>
        <button onClick={() => openNew()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all">
          <Plus className="h-5 w-5" /> Novo Card
        </button>
      </div>

      {/* Board */}
      <div className="flex gap-5 overflow-x-auto pb-6" onClick={() => setOpenMenuId(null)}>
        {COLUMNS.map((col) => {
          const colCards = getCardsByStatus(col.id);
          const colValue = colCards.reduce((s, c) => s + c.value, 0);
          const isOver = dragOverColState === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => onDragOverColumn(e, col.id)}
              onDragLeave={onDragLeaveColumn}
              onDrop={(e) => onDropColumn(e, col.id)}
              className={`flex-shrink-0 w-72 rounded-2xl border border-gray-800/50 flex flex-col transition-all duration-200
                ${isOver ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'bg-gradient-to-br from-gray-900 to-gray-900/50'}`}
            >
              {/* Column header */}
              <div className={`p-4 border-b border-gray-800/50 border-t-4 ${col.borderColor} rounded-t-2xl`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{col.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${col.badgeColor}`}>{colCards.length}</span>
                    <button onClick={(e) => { e.stopPropagation(); openNew(col.id); }}
                      className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors" title="Adicionar card nesta coluna">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(colValue)}</p>
              </div>

              {/* Cards list */}
              <div className={`flex-1 p-3 space-y-3 overflow-y-auto min-h-[300px] transition-colors duration-200 ${isOver ? 'bg-blue-500/5' : ''}`}>
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, card.id)}
                    onDragEnd={onDragEnd}
                    className="group relative rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 cursor-grab active:cursor-grabbing active:opacity-70 active:scale-95"
                  >
                    {/* Drag handle visual */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </div>

                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-white text-sm leading-snug pr-2 group-hover:text-blue-300 transition-colors">
                        {card.title}
                      </h4>
                      <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === card.id ? null : card.id)}
                          className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenuId === card.id && (
                          <div className="absolute right-0 top-8 z-20 w-40 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                            <button onClick={() => openEdit(card)} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">Editar</button>
                            {COLUMNS.filter((c) => c.id !== card.status).map((c) => (
                              <button key={c.id} onClick={() => { moveCard(card.id, c.id); setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                                → {c.title}
                              </button>
                            ))}
                            <button onClick={() => { setDeleteTarget(card); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {card.client.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{card.client}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-sm">
                        <DollarSign className="h-4 w-4 flex-shrink-0" />
                        <span>{formatCurrency(card.value)}</span>
                      </div>
                      {card.dueDate && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>{formatDate(card.dueDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {colCards.length === 0 && (
                  <button onClick={() => openNew(col.id)}
                    className={`w-full text-center py-10 border-2 border-dashed rounded-xl transition-colors text-sm ${isOver ? 'border-blue-500/60 text-blue-400' : 'border-gray-700/50 text-gray-600 hover:border-gray-600 hover:text-gray-500'}`}>
                    {isOver ? 'Soltar aqui' : '+ Adicionar card'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editingCard ? 'Editar Card' : 'Novo Card'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Título *</label>
            <input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)}
              placeholder="Ex: Site Institucional ABC"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Cliente</label>
            <input type="text" value={form.client} onChange={(e) => setField('client', e.target.value)}
              placeholder="Nome do cliente"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Valor (R$)</label>
            <input type="number" min={0} value={form.value} onChange={(e) => setField('value', Number(e.target.value))}
              placeholder="0,00"
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Coluna / Status</label>
            <select value={form.status} onChange={(e) => setField('status', e.target.value as KanbanStatus)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all">
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Prazo</label>
            <input type="date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all" />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-gray-800">
          <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all">
            <Save className="h-4 w-4" />
            {editingCard ? 'Salvar' : 'Criar card'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Excluir card" danger confirmLabel="Excluir"
        description={`Deseja excluir o card "${deleteTarget?.title}"?`}
      />
    </div>
  );
}
