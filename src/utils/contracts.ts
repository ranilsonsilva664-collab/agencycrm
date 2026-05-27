import jsPDF from 'jspdf';
import { Client, CompanyProfile, Contract, ContractStatus, Project, Quote, ServiceType } from '../types';
import { SERVICE_LABELS } from '../types';
import { companyProfile } from '../data/company';
import { generateId, formatCurrency, formatDate } from './helpers';

const STORAGE_KEY = 'agencycrm_contracts';

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  'nao-gerado': 'bg-gray-500/15 text-gray-400 border-gray-500/25',
  'gerado': 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  'enviado': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'visualizado': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'assinado': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'cancelado': 'bg-red-500/15 text-red-400 border-red-500/25',
};

export function getContracts(): Contract[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveContracts(contracts: Contract[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
  window.dispatchEvent(new Event('contracts-updated'));
}

export function upsertContract(contract: Contract) {
  const contracts = getContracts();
  const index = contracts.findIndex((c) => c.id === contract.id);
  if (index >= 0) contracts[index] = contract;
  else contracts.unshift(contract);
  saveContracts(contracts);
  return contract;
}

export function findContractBySource(source: { projectId?: string; quoteId?: string; clientId?: string }) {
  return getContracts().find((c) =>
    (source.projectId && c.projectId === source.projectId) ||
    (source.quoteId && c.quoteId === source.quoteId) ||
    (source.clientId && !source.projectId && !source.quoteId && c.clientId === source.clientId)
  );
}

export function findContractByToken(token: string) {
  return getContracts().find((c) => c.publicToken === token);
}

export function markContractViewed(token: string) {
  const contract = findContractByToken(token);
  if (!contract || contract.status === 'assinado') return contract;
  const updated: Contract = {
    ...contract,
    status: 'visualizado',
    viewedAt: contract.viewedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  upsertContract(updated);
  return updated;
}

export function signContract(token: string, data: { signedName: string; signedDocument: string; signatureImage: string }) {
  const contract = findContractByToken(token);
  if (!contract || contract.status === 'assinado') return contract;
  const updated: Contract = {
    ...contract,
    status: 'assinado',
    signedName: data.signedName,
    signedDocument: data.signedDocument,
    signatureImage: data.signatureImage,
    signedAt: new Date().toISOString(),
    viewedAt: contract.viewedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  upsertContract(updated);
  return updated;
}

export function generatePublicToken() {
  const random = crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(4)) : undefined;
  if (random) return Array.from(random).map((n) => n.toString(36)).join('');
  return `${generateId()}${Date.now().toString(36)}${generateId()}`;
}

export function getContractPublicLink(contract: Contract) {
  return `${window.location.origin}/contrato/assinar/${contract.publicToken}`;
}

export function buildWhatsappHref(phone: string, message: string) {
  let clean = phone.replace(/\D/g, '');
  if (clean && !clean.startsWith('55')) clean = `55${clean}`;
  return `https://web.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`;
}

export function buildContractWhatsappMessage(contract: Contract) {
  return `Olá, ${contract.clientName}! Tudo certo?\n\nSegue o contrato digital referente ao serviço: ${contract.serviceName}.\n\nVocê pode visualizar e assinar pelo link abaixo:\n\n${getContractPublicLink(contract)}\n\nAssim que assinar, eu recebo a confirmação automaticamente.`;
}

export type ContractSource = {
  client?: Client;
  project?: Project;
  quote?: Quote;
};

export function createContractFromSource(source: ContractSource): Contract {
  const now = new Date().toISOString();
  const client = source.client;
  const project = source.project;
  const quote = source.quote;
  const clientName = quote?.clientName || project?.clientName || client?.name || 'Cliente';
  const clientId = quote?.clientId || project?.clientId || client?.id || 'client-manual';
  const serviceKey = (quote?.service || project?.category || client?.service || 'sites') as ServiceType;
  const serviceName = SERVICE_LABELS[serviceKey];
  const totalValue = quote?.totalValue || project?.value || client?.projectValue || 0;
  const deadline = quote?.deadline || project?.deadline || client?.deadline || now.split('T')[0];
  const description = quote?.description || project?.observations || client?.observations || `Prestação de serviço de ${serviceName}.`;
  const paymentMethod = quote?.paymentMethod || '50% na aprovação e 50% na entrega final';
  const revisions = quote?.revisionsIncluded ?? 2;
  const contractBase: Omit<Contract, 'contractText'> = {
    id: `ctr_${generateId()}`,
    clientId,
    projectId: project?.id,
    quoteId: quote?.id,
    clientName,
    clientDocument: quote?.clientDocument || client?.document || '',
    clientWhatsapp: quote?.clientWhatsapp || client?.whatsapp || '',
    clientEmail: quote?.clientEmail || client?.email || '',
    clientAddress: quote?.clientAddress || client?.address || '',
    clientCompany: quote?.company || client?.company || '',
    serviceName,
    serviceDescription: description,
    totalValue,
    paymentMethod,
    entryValue: quote?.entryValue,
    installments: quote?.installments,
    deadline,
    revisionsIncluded: revisions,
    status: 'gerado',
    publicToken: generatePublicToken(),
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...contractBase,
    contractText: buildContractTemplate(contractBase, companyProfile),
  };
}

export function buildContractTemplate(contract: Omit<Contract, 'contractText'>, company: CompanyProfile) {
  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DIGITAIS

Pelo presente instrumento particular, de um lado ${company.name}, inscrita sob o documento ${company.document}, com contato pelo WhatsApp ${company.whatsapp} e e-mail ${company.email}, situada em ${company.address}, doravante denominada CONTRATADA.

De outro lado, ${contract.clientName}${contract.clientCompany ? `, empresa ${contract.clientCompany}` : ''}, inscrito(a) sob o documento ${contract.clientDocument || 'não informado'}, com contato pelo WhatsApp ${contract.clientWhatsapp || 'não informado'} e e-mail ${contract.clientEmail || 'não informado'}, doravante denominado(a) CONTRATANTE.

1. OBJETO DO CONTRATO
A CONTRATADA prestará ao CONTRATANTE o serviço de ${contract.serviceName}, conforme descrição abaixo:
${contract.serviceDescription}

2. VALOR E FORMA DE PAGAMENTO
O valor total do serviço será de ${formatCurrency(contract.totalValue)}.
Forma de pagamento: ${contract.paymentMethod}.
${contract.entryValue ? `Entrada prevista: ${formatCurrency(contract.entryValue)}.` : ''}
${contract.installments ? `Quantidade de parcelas: ${contract.installments}.` : ''}

3. PRAZO DE ENTREGA
O prazo estimado de entrega será até ${formatDate(contract.deadline)}, contando a partir da confirmação do pagamento inicial e do recebimento das informações necessárias pelo CONTRATANTE.

4. REVISÕES INCLUÍDAS
Estão incluídas ${contract.revisionsIncluded} revisão(ões) dentro do escopo contratado. Revisões adicionais, alterações fora do escopo ou mudanças estruturais poderão gerar custos extras.

5. RESPONSABILIDADES DO CONTRATANTE
O CONTRATANTE deverá fornecer briefing, materiais, referências, acessos, aprovações e informações necessárias em tempo hábil. Atrasos no envio desses itens poderão impactar o prazo final de entrega.

6. RESPONSABILIDADES DA CONTRATADA
A CONTRATADA se compromete a executar o serviço com zelo profissional, respeitando o escopo aprovado, os prazos combinados e as boas práticas de criação digital, design, tecnologia e marketing.

7. POLÍTICA DE CANCELAMENTO
Em caso de cancelamento após o início do projeto, valores já pagos poderão ser retidos proporcionalmente ao trabalho executado, custos operacionais, ferramentas, horas técnicas e recursos envolvidos.

8. DIREITOS DE USO
Após a quitação integral do contrato, o CONTRATANTE terá direito de uso dos materiais finais entregues. Arquivos editáveis, códigos-fonte específicos, prompts, processos internos e materiais brutos somente serão entregues quando expressamente contratados.

9. APROVAÇÃO E ACEITE DIGITAL
A assinatura digital realizada por link único, com nome completo, CPF/CNPJ, data, hora e assinatura desenhada em tela, será considerada aceite válido dos termos deste contrato.

10. CONDIÇÕES GERAIS
Este contrato representa o acordo completo entre as partes para o serviço descrito. Alterações deverão ser registradas por escrito ou em novo orçamento aprovado.

${company.name}
${company.document}`;
}

export function downloadContractPdf(contract: Contract, company: CompanyProfile = companyProfile) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const addLine = (text: string, size = 10, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || ' ', pageWidth - margin * 2);
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size + 6;
    });
  };

  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 86, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Contrato Digital', margin, 36);
  doc.setFontSize(10);
  doc.text(`${company.name} • ${contract.status === 'assinado' ? 'Contrato assinado digitalmente' : 'Aguardando assinatura'}`, margin, 58);

  y = 116;
  doc.setTextColor(20, 20, 20);
  addLine(`Status: ${contract.status.toUpperCase()}`, 11, true);
  addLine(`Cliente: ${contract.clientName} ${contract.clientDocument ? `(${contract.clientDocument})` : ''}`, 10);
  addLine(`Serviço: ${contract.serviceName} • Valor: ${formatCurrency(contract.totalValue)}`, 10);
  addLine('', 10);
  contract.contractText.split('\n').forEach((line) => addLine(line, line.startsWith('CONTRATO') ? 14 : 10, line.match(/^\d+\./) !== null));

  y += 20;
  addLine('ASSINATURA DIGITAL', 12, true);
  if (contract.signatureImage) {
    try {
      doc.addImage(contract.signatureImage, 'PNG', margin, y, 220, 90);
      y += 100;
    } catch {
      addLine('Imagem da assinatura indisponível.', 10);
    }
  }
  addLine(`Nome: ${contract.signedName || 'Aguardando assinatura'}`, 10);
  addLine(`CPF/CNPJ: ${contract.signedDocument || 'Aguardando assinatura'}`, 10);
  addLine(`Data/Hora: ${contract.signedAt ? formatDate(contract.signedAt) : 'Aguardando assinatura'}`, 10);

  doc.save(`contrato-${contract.clientName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}