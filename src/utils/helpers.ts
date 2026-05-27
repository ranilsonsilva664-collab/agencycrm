import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return dateString;
  }
}

export function getMonthName(dateString: string): string {
  try {
    return format(parseISO(dateString), 'MMMM', { locale: ptBR });
  } catch {
    return dateString;
  }
}

export function isOverdue(dateString: string): boolean {
  try {
    return isPast(parseISO(dateString)) && !isToday(parseISO(dateString));
  } catch {
    return false;
  }
}

export function getDaysUntilDeadline(dateString: string): number {
  try {
    return differenceInDays(parseISO(dateString), new Date());
  } catch {
    return 0;
  }
}

export function calculateROI(invested: number, revenue: number): number {
  if (invested === 0) return 0;
  return ((revenue - invested) / invested) * 100;
}

export function calculateCPL(invested: number, leads: number): number {
  if (leads === 0) return 0;
  return invested / leads;
}

export function calculateCPC(invested: number, clients: number): number {
  if (clients === 0) return 0;
  return invested / clients;
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'novo-lead': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'em-negociacao': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'em-producao': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'aguardando-cliente': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'orcamento': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'revisao': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'finalizado': 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    'meta-ads': 'bg-blue-600',
    'google-ads': 'bg-red-500',
    'tiktok-ads': 'bg-pink-500',
    'outros': 'bg-gray-500',
  };
  return colors[platform] || 'bg-gray-500';
}

export function getPlatformColorClass(platform: string): string {
  const colors: Record<string, string> = {
    'meta-ads': 'bg-blue-600',
    'google-ads': 'bg-red-500',
    'tiktok-ads': 'bg-pink-500',
    'outros': 'bg-gray-500',
  };
  return colors[platform] || 'bg-gray-500';
}
