import { useState, useMemo, useRef, useEffect } from 'react';
import {
  MessageCircle, Copy, FileText,
  Calendar, Clock, Eye, Check,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Client, Project } from '../types';
import { SERVICE_LABELS, PROJECT_STATUS_LABELS } from '../types';
import { Modal } from '../components/Modal';

interface BudgetEditorProps {
  client?: Client;
  project?: Project;
  open: boolean;
  onClose: () => void;
}

export function BudgetEditor({ client, project, open, onClose }: BudgetEditorProps) {
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCopyFallback, setShowCopyFallback] = useState(false);
  const wasOpen = useRef(false);

  const target = client || (project ? {
    name: project.clientName,
    whatsapp: '',
    company: '',
    service: project.category,
    projectValue: project.value,
    deadline: project.deadline,
    observations: project.observations,
  } : null);

  /* ---------- Número limpo ---------- */
  const cleanPhone = useMemo(() => {
    if (!target?.whatsapp) return '';
    let p = target.whatsapp.replace(/\D/g, '');
    if (!p.startsWith('55')) p = '55' + p;
    return p;
  }, [target?.whatsapp]);

  const hasPhone = cleanPhone.length >= 12;

  /* ---------- Número do orçamento ---------- */
  const budgetNumber = useMemo(() => {
    const d = new Date();
    return `#${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  }, []);

  /* ---------- Mensagem padrão ---------- */
  const defaultMessage = useMemo(() => {
    if (!target) return '';
    const L: string[] = [];
    const sep = '━━━━━━━━━━━━━━━━━━━━━━';
    L.push(sep);
    L.push('📋 *ORÇAMENTO*');
    L.push(sep);
    L.push('');
    L.push(`🔖 *Nº:* ${budgetNumber}`);
    L.push(`📅 *Data:* ${formatDate(new Date().toISOString())}`);
    L.push('');
    L.push(sep);
    L.push('👤 *CLIENTE*');
    L.push(sep);
    L.push('');
    L.push(`• *Nome:* ${target.name}`);
    if (target.company) L.push(`• *Empresa:* ${target.company}`);
    L.push('');
    L.push(sep);
    L.push('💼 *PROJETO*');
    L.push(sep);
    L.push('');
    L.push(`• *Serviço:* ${SERVICE_LABELS[target.service as keyof typeof SERVICE_LABELS] || target.service}`);
    if (project?.name) L.push(`• *Projeto:* ${project.name}`);
    L.push(`• *Prazo:* ${formatDate(target.deadline)}`);
    L.push(`• *Valor:* *${formatCurrency(target.projectValue)}*`);
    L.push('');
    if (target.observations?.trim()) {
      L.push(sep);
      L.push('📝 *OBSERVAÇÕES*');
      L.push(sep);
      L.push('');
      L.push(target.observations.trim());
      L.push('');
    }
    L.push(sep);
    L.push('💰 *PAGAMENTO*');
    L.push(sep);
    L.push('');
    L.push('• 50% na aprovação');
    L.push('• 50% na entrega');
    L.push('');
    L.push(sep);
    L.push('✅ *VALIDADE: 7 DIAS*');
    L.push(sep);
    L.push('');
    L.push('🚀 _Qualquer dúvida estou à disposição!_');
    return L.join('\n');
  }, [target, project, budgetNumber]);

  /* Preencher ao abrir */
  useEffect(() => {
    if (open && !wasOpen.current) {
      setMessage(defaultMessage);
      setShowPreview(false);
      setCopied(false);
      setShowCopyFallback(false);
    }
    wasOpen.current = open;
  }, [open, defaultMessage]);

  if (!target) return null;

  /* ---------- URL do WhatsApp ---------- */
  // Usa wa.me com target _blank em <a> nativo — não usa window.open
  const waUrl = hasPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : '';

  /* ---------- Copiar ---------- */
  async function handleCopy() {
    if (!message.trim()) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(message);
      ok = true;
    } catch {
      // Fallback: selecionar textarea
    }
    if (ok) {
      setCopied(true);
      setShowCopyFallback(false);
      setTimeout(() => setCopied(false), 2500);
    } else {
      // Mostrar área para o usuário copiar manualmente
      setShowCopyFallback(true);
    }
  }

  function wordCount() {
    return `${message.length} caracteres`;
  }

  /* ---------- Render ---------- */
  return (
    <Modal open={open} onClose={onClose} title="💬 Enviar Orçamento via WhatsApp" size="xl">
      <div className="space-y-5">

        {/* Header info */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-violet-400/70 font-medium">Nº Orçamento</p>
              <p className="text-sm font-bold text-white">{budgetNumber}</p>
            </div>
            <div className="w-px h-6 bg-violet-500/20 hidden sm:block" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-violet-400/70 font-medium">Cliente</p>
              <p className="text-sm font-medium text-white">{target.name}</p>
            </div>
            {target.company && (
              <>
                <div className="w-px h-6 bg-violet-500/20 hidden sm:block" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-violet-400/70 font-medium">Empresa</p>
                  <p className="text-sm font-medium text-white">{target.company}</p>
                </div>
              </>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Valor</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(target.projectValue)}</p>
          </div>
        </div>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300">
            <FileText className="h-3.5 w-3.5 text-violet-400" />
            {SERVICE_LABELS[target.service as keyof typeof SERVICE_LABELS] || target.service}
          </span>
          {project && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            Prazo: {formatDate(target.deadline)}
          </span>
          {hasPhone && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
              <MessageCircle className="h-3.5 w-3.5" />
              {target.whatsapp}
            </span>
          )}
        </div>

        {/* Editable textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">
              ✏️ Edite a mensagem livremente:
            </label>
            <button
              onClick={() => { setMessage(defaultMessage); setCopied(false); setShowCopyFallback(false); }}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              ↻ Resetar
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => { setMessage(e.target.value); setCopied(false); setShowCopyFallback(false); }}
            className="w-full px-4 py-4 bg-gray-800/80 border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none font-mono text-sm leading-relaxed"
            style={{ minHeight: '300px' }}
            spellCheck={false}
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-gray-500">{wordCount()}</p>
            <p className="text-xs text-gray-500">*negrito* _itálico_</p>
          </div>
        </div>

        {/* Preview toggle */}
        <div>
          <button
            onClick={() => setShowPreview(v => !v)}
            className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? 'Ocultar preview' : 'Ver como ficará no WhatsApp'}
          </button>
          {showPreview && (
            <div className="mt-3">
              <div className="bg-[#0b141a] rounded-2xl overflow-hidden border border-gray-700/50 max-w-sm">
                <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
                    {target.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{target.name}</p>
                    <p className="text-gray-400 text-xs">online</p>
                  </div>
                </div>
                <div className="p-3 max-h-48 overflow-y-auto">
                  <div className="bg-[#005c4b] rounded-lg p-3 ml-auto max-w-[95%]">
                    <pre className="whitespace-pre-wrap text-[#e9edef] text-xs leading-relaxed font-sans break-words">
                      {message}
                    </pre>
                    <p className="text-[#ffffff80] text-[10px] text-right mt-1">
                      {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fallback copy area */}
        {showCopyFallback && (
          <div>
            <p className="text-xs text-amber-400 mb-2 font-medium">
              ⚠️ Selecione todo o texto abaixo e copie com Ctrl+C / Cmd+C:
            </p>
            <textarea
              readOnly
              value={message}
              onFocus={(e) => e.target.select()}
              className="w-full px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-gray-200 text-sm font-mono resize-none"
              style={{ minHeight: '120px' }}
            />
          </div>
        )}

        {/* No phone */}
        {!hasPhone && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <MessageCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">WhatsApp não cadastrado</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Copie a mensagem e envie manualmente pelo WhatsApp para o cliente.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-800">

          {/* Cancelar */}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 active:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>

          {/* Copiar */}
          <button
            type="button"
            onClick={handleCopy}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500'
            }`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar Mensagem'}
          </button>

          {/* Enviar WhatsApp — <a> nativo, sem window.open */}
          {hasPhone ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex-[1.5] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#20b858] active:bg-[#1da34e] text-white font-bold transition-all active:scale-95 shadow-lg shadow-[#25D366]/25 text-center no-underline"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Abrir WhatsApp
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex-[1.5] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-700 text-gray-500 font-bold cursor-not-allowed"
            >
              <MessageCircle className="h-5 w-5" />
              Sem WhatsApp
            </button>
          )}

        </div>

        {/* Instrução extra no mobile */}
        {hasPhone && (
          <p className="text-center text-xs text-gray-500">
            Ao clicar em <span className="text-[#25D366] font-medium">Abrir WhatsApp</span>, o app abrirá com a mensagem pronta para enviar.
          </p>
        )}

      </div>
    </Modal>
  );
}
