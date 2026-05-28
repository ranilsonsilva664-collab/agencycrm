export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  document?: string;
  address?: string;
  instagram: string;
  company: string;
  service: ServiceType;
  projectValue: number;
  status: ClientStatus;
  startDate: string;
  deadline: string;
  observations: string;
  source?: 'anuncio' | 'organico';
  createdAt: string;
}

export interface Quote {
  id: string;
  clientId: string;
  clientName: string;
  clientWhatsapp: string;
  clientEmail?: string;
  clientDocument?: string;
  clientAddress?: string;
  company?: string;
  service: ServiceType;
  title: string;
  description: string;
  totalValue: number;
  paymentMethod: string;
  entryValue?: number;
  installments?: number;
  deadline: string;
  revisionsIncluded: number;
  observations: string;
  status: QuoteStatus;
  createdAt: string;
}

export interface Contract {
  id: string;
  clientId: string;
  projectId?: string;
  quoteId?: string;
  clientName: string;
  clientDocument?: string;
  clientWhatsapp: string;
  clientEmail?: string;
  clientAddress?: string;
  clientCompany?: string;
  serviceName: string;
  serviceDescription: string;
  totalValue: number;
  paymentMethod: string;
  entryValue?: number;
  installments?: number;
  deadline: string;
  revisionsIncluded: number;
  contractText: string;
  status: ContractStatus;
  publicToken: string;
  signatureImage?: string;
  signedName?: string;
  signedDocument?: string;
  signedAt?: string;
  viewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  name: string;
  document: string;
  whatsapp: string;
  email: string;
  address: string;
  logo?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  category: ServiceType;
  value: number;
  cost: number;
  profit: number;
  date: string;
  deadline: string;
  status: ProjectStatus;
  files: FileUpload[];
  observations: string;
  createdAt: string;
}

export interface FileUpload {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'link';
  url: string;
  uploadedAt: string;
}

export interface FinancialEntry {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  value: number;
  clientId?: string;
  clientName?: string;
  service?: ServiceType;
  date: string;
  createdAt: string;
}

export interface TrafficCampaign {
  id: string;
  date: string;
  platform: TrafficPlatform;
  campaignName: string;
  objective: string;
  investedValue: number;
  leadsGenerated: number;
  clientsClosed: number;
  revenueGenerated: number;
  observations: string;
  createdAt: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  client: string;
  value: number;
  status: KanbanStatus;
  dueDate: string;
}

export type ServiceType = 
  | 'videos-ia'
  | 'banners'
  | 'fotos-ia'
  | 'sites'
  | 'apps-web';

export type ClientStatus = 
  | 'novo-lead'
  | 'em-negociacao'
  | 'em-producao'
  | 'aguardando-cliente'
  | 'finalizado';

export type QuoteStatus =
  | 'rascunho'
  | 'enviado'
  | 'em-negociacao'
  | 'aprovado'
  | 'fechado'
  | 'recusado';

export type ContractStatus =
  | 'nao-gerado'
  | 'gerado'
  | 'enviado'
  | 'visualizado'
  | 'assinado'
  | 'cancelado';

export type ProjectStatus = 
  | 'novo-lead'
  | 'orcamento'
  | 'em-producao'
  | 'revisao'
  | 'finalizado';

export type KanbanStatus = 
  | 'novo-lead'
  | 'orcamento'
  | 'em-producao'
  | 'revisao'
  | 'finalizado';

export type TrafficPlatform = 
  | 'meta-ads'
  | 'google-ads'
  | 'tiktok-ads'
  | 'outros';

export interface DashboardMetrics {
  totalRevenue: number;
  totalAdsExpense: number;
  netProfit: number;
  activeClients: number;
  projectsInProgress: number;
  projectsCompleted: number;
  revenueByService: Record<ServiceType, number>;
  monthlyRevenue: { month: string; value: number }[];
  monthlyExpenses: { month: string; value: number }[];
  profitByService: Record<ServiceType, number>;
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  'videos-ia': 'Vídeos com IA',
  'banners': 'Banners Profissionais',
  'fotos-ia': 'Fotos Profissionais',
  'sites': 'Sites',
  'apps-web': 'Apps Web',
};

export const SERVICE_COLORS: Record<ServiceType, string> = {
  'videos-ia': '#8B5CF6',
  'banners': '#EC4899',
  'fotos-ia': '#06B6D4',
  'sites': '#10B981',
  'apps-web': '#F59E0B',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  'novo-lead': 'Novo Lead',
  'em-negociacao': 'Em Negociação',
  'em-producao': 'Em Produção',
  'aguardando-cliente': 'Aguardando Cliente',
  'finalizado': 'Finalizado',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  'rascunho': 'Rascunho',
  'enviado': 'Enviado',
  'em-negociacao': 'Em Negociação',
  'aprovado': 'Aprovado',
  'fechado': 'Fechado',
  'recusado': 'Recusado',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  'nao-gerado': 'Não gerado',
  'gerado': 'Gerado',
  'enviado': 'Enviado',
  'visualizado': 'Visualizado',
  'assinado': 'Assinado',
  'cancelado': 'Cancelado',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  'novo-lead': 'Novo Lead',
  'orcamento': 'Orçamento',
  'em-producao': 'Em Produção',
  'revisao': 'Revisão',
  'finalizado': 'Finalizado',
};

export const TRAFFIC_PLATFORM_LABELS: Record<TrafficPlatform, string> = {
  'meta-ads': 'Meta Ads',
  'google-ads': 'Google Ads',
  'tiktok-ads': 'TikTok Ads',
  'outros': 'Outros',
};
