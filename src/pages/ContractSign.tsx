import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Download, FileSignature, PenLine, ShieldCheck, Trash2 } from 'lucide-react';
import { Contract, CONTRACT_STATUS_LABELS } from '../types';
import { downloadContractPdf, findContractByToken, markContractViewed, signContract } from '../utils/contracts';
import { formatCurrency, formatDate } from '../utils/helpers';

export function ContractSign() {
  const { token } = useParams();
  const [contract, setContract] = useState<Contract | undefined>();
  const [accepted, setAccepted] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [signedDocument, setSignedDocument] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!token) return;
    const viewed = markContractViewed(token);
    setContract(viewed || findContractByToken(token));
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || contract?.status === 'assinado') return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 180 * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, 180);
  }, [contract?.status]);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (contract?.status === 'assinado') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setIsDrawing(true);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || contract?.status === 'assinado') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setSignatureData(canvasRef.current?.toDataURL('image/png') || '');
  }

  function stopDraw() {
    setIsDrawing(false);
    setSignatureData(canvasRef.current?.toDataURL('image/png') || '');
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, 180);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, 180);
    setSignatureData('');
  }

  function handleSign() {
    if (!token || !contract || contract.status === 'assinado') return;
    if (!accepted || !signedName.trim() || !signedDocument.trim() || !signatureData) return;
    const updated = signContract(token, { signedName, signedDocument, signatureImage: signatureData });
    setContract(updated);
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center rounded-2xl bg-gray-900 border border-gray-800 p-8">
          <FileSignature className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold">Contrato não encontrado</h1>
          <p className="text-gray-400 mt-2 text-sm">O link pode estar incorreto ou expirado.</p>
        </div>
      </div>
    );
  }

  const isSigned = contract.status === 'assinado';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(139,92,246,.18),transparent_40%)]" />
      <main className="relative max-w-5xl mx-auto px-4 py-8 md:py-12">
        <header className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-900/60 border border-gray-800 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-medium mb-4">
                <ShieldCheck className="h-4 w-4" /> Link seguro de assinatura digital
              </div>
              <h1 className="text-3xl font-bold">Contrato Digital</h1>
              <p className="text-gray-400 mt-2">{contract.serviceName} para {contract.clientName}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-500">Status</p>
              <p className={`text-xl font-bold ${isSigned ? 'text-emerald-400' : 'text-amber-400'}`}>{CONTRACT_STATUS_LABELS[contract.status]}</p>
              <p className="text-sm text-gray-500 mt-1">Valor: <span className="text-white font-semibold">{formatCurrency(contract.totalValue)}</span></p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="rounded-3xl bg-white text-gray-950 p-6 md:p-9 shadow-2xl">
            <div className="border-b pb-5 mb-6">
              <h2 className="text-2xl font-bold">Termos do contrato</h2>
              <p className="text-sm text-gray-500 mt-1">Leia atentamente antes de assinar.</p>
            </div>
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-sm md:text-base">{contract.contractText}</pre>
            {isSigned && contract.signatureImage && (
              <div className="border-t mt-8 pt-6">
                <h3 className="font-bold mb-3">Assinatura digital</h3>
                <img src={contract.signatureImage} alt="Assinatura" className="h-28 border rounded-lg bg-gray-50" />
                <p className="mt-3 text-sm"><b>{contract.signedName}</b> • {contract.signedDocument}</p>
                <p className="text-xs text-gray-500">Assinado em {contract.signedAt ? formatDate(contract.signedAt) : ''}</p>
              </div>
            )}
          </div>

          <aside className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-900/70 border border-gray-800 p-6 h-fit sticky top-6">
            {isSigned ? (
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                  <CheckCircle className="h-9 w-9 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold">Contrato assinado</h2>
                <p className="text-gray-400 text-sm mt-2">A assinatura digital foi registrada com sucesso.</p>
                <button onClick={() => downloadContractPdf(contract)} className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors">
                  <Download className="h-4 w-4" /> Baixar PDF
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2"><PenLine className="h-5 w-5 text-violet-400" /> Assinar contrato</h2>
                  <p className="text-sm text-gray-400 mt-2">Preencha seus dados e assine no campo abaixo.</p>
                </div>
                <label className="flex gap-3 items-start text-sm text-gray-300">
                  <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 accent-violet-500" />
                  <span>Li e aceito os termos do contrato.</span>
                </label>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Nome completo</label>
                  <input value={signedName} onChange={(e) => setSignedName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">CPF ou CNPJ</label>
                  <input value={signedDocument} onChange={(e) => setSignedDocument(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm text-gray-300">Assinatura</label>
                    <button onClick={clearSignature} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-400"><Trash2 className="h-3 w-3"/> Limpar</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    onPointerDown={startDraw}
                    onPointerMove={draw}
                    onPointerUp={stopDraw}
                    onPointerLeave={stopDraw}
                    className="w-full h-[180px] rounded-xl bg-white cursor-crosshair touch-none"
                  />
                </div>
                <button
                  onClick={handleSign}
                  disabled={!accepted || !signedName.trim() || !signedDocument.trim() || !signatureData}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/25 transition-all"
                >
                  Assinar contrato
                </button>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}