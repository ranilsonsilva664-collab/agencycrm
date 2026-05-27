import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Eye, FileSignature, PenLine, RefreshCw, Send } from 'lucide-react';
import { Client, Contract, CONTRACT_STATUS_LABELS, Project, Quote } from '../types';
import { Modal } from './Modal';
import { ToastContainer } from './Toast';
import { useToast } from '../hooks/useToast';
import {
  buildContractWhatsappMessage,
  buildWhatsappHref,
  CONTRACT_STATUS_COLORS,
  createContractFromSource,
  downloadContractPdf,
  findContractBySource,
  getContractPublicLink,
  upsertContract,
} from '../utils/contracts';
import { formatCurrency, formatDate } from '../utils/helpers';

interface ContractManagerProps {
  client?: Client;
  project?: Project;
  quote?: Quote;
  compact?: boolean;
}

export function ContractManager({ client, project, quote, compact = false }: ContractManagerProps) {
  const [contract, setContract] = useState<Contract | undefined>(() => findContractBySource({ projectId: project?.id, quoteId: quote?.id, clientId: client?.id }));
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [contractText, setContractText] = useState(contract?.contractText || '');
  const { toasts, removeToast, success, error } = useToast();

  const sourceStatus = quote?.status || project?.status || client?.status;
  const canGenerate = quote ? ['aprovado', 'fechado'].includes(quote.status)
    : project ? ['finalizado', 'em-producao'].includes(project.status)
    : client ? ['finalizado', 'em-producao'].includes(client.status)
    : false;

  useEffect(() => {
    const refresh = () => setContract(findContractBySource({ projectId: project?.id, quoteId: quote?.id, clientId: client?.id }));
    refresh();
    window.addEventListener('contracts-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('contracts-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [client?.id, project?.id, quote?.id]);

  const link = contract ? getContractPublicLink(contract) : '';
  const whatsappHref = useMemo(() => contract ? buildWhatsappHref(contract.clientWhatsapp, buildContractWhatsappMessage(contract)) : '', [contract]);

  function generateContract() {
    const created = createContractFromSource({ client, project, quote });
    upsertContract(created);
    setContract(created);
    setContractText(created.contractText);
    setEditOpen(true);
    success('Contrato digital gerado! Revise antes de enviar.');
  }

  function saveText() {
    if (!contract) return;
    if (contract.status === 'assinado') {
      error('Contrato assinado não pode ser editado.');
      return;
    }
    const updated = { ...contract, contractText, updatedAt: new Date().toISOString() };
    upsertContract(updated);
    setContract(updated);
    setEditOpen(false);
    success('Contrato atualizado.');
  }

  async function copyLink() {
    if (!contract) return;
    try {
      await navigator.clipboard.writeText(link);
      success('Link copiado!');
    } catch {
      error('Não foi possível copiar automaticamente.');
    }
  }

  function markSent() {
    if (!contract || contract.status === 'assinado') return;
    const updated: Contract = { ...contract, status: 'enviado', updatedAt: new Date().toISOString() };
    upsertContract(updated);
    setContract(updated);
  }

  if (!canGenerate && !contract) {
    return compact ? null : (
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
        <p className="text-sm text-gray-500">Contrato disponível quando o orçamento estiver Aprovado/Fechado ou o projeto estiver em produção/finalizado.</p>
        <p className="text-xs text-gray-600 mt-1">Status atual: {String(sourceStatus || 'sem status')}</p>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'rounded-2xl border border-gray-800/60 bg-gray-900/50 p-5'}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {!compact && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Contrato Digital</h3>
            <p className="text-sm text-gray-500">Gere, envie e acompanhe a assinatura online.</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${contract ? CONTRACT_STATUS_COLORS[contract.status] : CONTRACT_STATUS_COLORS['nao-gerado']}`}>
            {contract ? CONTRACT_STATUS_LABELS[contract.status] : CONTRACT_STATUS_LABELS['nao-gerado']}
          </span>
        </div>
      )}

      {!contract ? (
        <button
          onClick={generateContract}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/20 transition-all"
        >
          <FileSignature className="h-4 w-4" />
          Gerar Contrato Digital
        </button>
      ) : (
        <div className="space-y-3">
          {compact && (
            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${CONTRACT_STATUS_COLORS[contract.status]}`}>
              {CONTRACT_STATUS_LABELS[contract.status]}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setViewOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors text-sm">
              <Eye className="h-4 w-4" /> Visualizar contrato
            </button>
            {contract.status !== 'assinado' && (
              <button onClick={() => { setContractText(contract.contractText); setEditOpen(true); }} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors text-sm">
                <PenLine className="h-4 w-4" /> Editar contrato
              </button>
            )}
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={markSent} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm font-semibold no-underline">
              <Send className="h-4 w-4" /> Enviar pelo WhatsApp
            </a>
            <button onClick={copyLink} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors text-sm">
              <Copy className="h-4 w-4" /> Copiar link
            </button>
            <button onClick={() => downloadContractPdf(contract)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors text-sm">
              <Download className="h-4 w-4" /> Baixar PDF
            </button>
            <button onClick={() => setContract(findContractBySource({ projectId: project?.id, quoteId: quote?.id, clientId: client?.id }))} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors text-sm">
              <RefreshCw className="h-4 w-4" /> Ver status da assinatura
            </button>
          </div>
          {!compact && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-xl bg-gray-800/50 border border-gray-700/40 p-3">
                <p className="text-xs text-gray-500">Cliente</p><p className="text-white font-medium">{contract.clientName}</p>
              </div>
              <div className="rounded-xl bg-gray-800/50 border border-gray-700/40 p-3">
                <p className="text-xs text-gray-500">Valor</p><p className="text-emerald-400 font-bold">{formatCurrency(contract.totalValue)}</p>
              </div>
              <div className="rounded-xl bg-gray-800/50 border border-gray-700/40 p-3">
                <p className="text-xs text-gray-500">Prazo</p><p className="text-white font-medium">{formatDate(contract.deadline)}</p>
              </div>
              <div className="rounded-xl bg-gray-800/50 border border-gray-700/40 p-3">
                <p className="text-xs text-gray-500">Assinado em</p><p className="text-white font-medium">{contract.signedAt ? formatDate(contract.signedAt) : 'Aguardando'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Contrato Digital" size="xl">
        <textarea
          value={contractText}
          onChange={(e) => setContractText(e.target.value)}
          disabled={contract?.status === 'assinado'}
          className="w-full min-h-[520px] bg-gray-800/70 border border-gray-700 rounded-xl text-gray-100 p-4 font-mono text-sm leading-relaxed focus:outline-none focus:border-violet-500 resize-y disabled:opacity-60"
        />
        <div className="flex gap-3 mt-5 pt-4 border-t border-gray-800">
          <button onClick={() => setEditOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={saveText} disabled={contract?.status === 'assinado'} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold disabled:opacity-50">Salvar contrato</button>
        </div>
      </Modal>

      {contract && (
        <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Visualizar Contrato" size="xl">
          <div className="bg-white text-gray-900 rounded-xl p-8 max-h-[70vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-4 mb-5">
              <div>
                <h2 className="text-2xl font-bold">Contrato Digital</h2>
                <p className="text-sm text-gray-500">{contract.serviceName} • {contract.clientName}</p>
              </div>
              <span className="text-xs uppercase tracking-wider border rounded-full px-3 py-1">{CONTRACT_STATUS_LABELS[contract.status]}</span>
            </div>
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-sm">{contract.contractText}</pre>
            {contract.signatureImage && (
              <div className="mt-8 border-t pt-4">
                <p className="font-bold mb-2">Assinatura digital</p>
                <img src={contract.signatureImage} alt="Assinatura" className="h-24 border rounded bg-gray-50" />
                <p className="text-sm mt-2">{contract.signedName} • {contract.signedDocument}</p>
                <p className="text-xs text-gray-500">Assinado em {contract.signedAt ? formatDate(contract.signedAt) : ''}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}