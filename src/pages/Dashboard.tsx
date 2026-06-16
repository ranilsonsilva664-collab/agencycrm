import { useMemo, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  FolderOpen,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { formatCurrency } from '../utils/helpers';
import { SERVICE_COLORS, SERVICE_LABELS, Client, Project, FinancialEntry, TrafficCampaign } from '../types';
import { useFirestore } from '../hooks/useFirestore';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-xl">
        <p className="text-gray-300 text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white font-medium" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('month');
  const { data: clients } = useFirestore<Client>('clients');
  const { data: projects } = useFirestore<Project>('projects');
  const { data: financials } = useFirestore<FinancialEntry>('financial_entries');
  const { data: campaigns } = useFirestore<TrafficCampaign>('traffic_campaigns');

  const { metricCards, monthlyData, serviceData, profitByService, recentProjects } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const filterDate = dateFilter === 'today' ? startOfToday : dateFilter === 'week' ? startOfWeek : startOfMonth;
    const titleSuffix = dateFilter === 'today' ? 'de Hoje' : dateFilter === 'week' ? 'da Semana' : 'do Mês';

    let faturamento = 0;
    let gastos = 0;

    financials.forEach(f => {
      if (!f.date) return;
      const date = new Date(f.date);
      if (date >= filterDate) {
        if (f.type === 'income') faturamento += (Number(f.value) || 0);
        if (f.type === 'expense') gastos += (Number(f.value) || 0);
      }
    });

    const lucro = faturamento - gastos;

    let faturamentoAds = 0;
    campaigns.forEach(c => {
      if (!c.date) return;
      const date = new Date(c.date);
      if (date >= filterDate) {
        faturamentoAds += (Number(c.revenueGenerated) || 0);
      }
    });

    const faturamentoOrganico = Math.max(0, faturamento - faturamentoAds);

    const clientesAtivos = clients.length;
    const projetosEmAndamento = projects.filter(p => p.status !== 'finalizado' && p.status !== 'cancelado').length;
    const projetosFinalizados = projects.filter(p => p.status === 'finalizado').length;

    const cards = [
      {
        title: `Faturamento ${titleSuffix}`,
        value: faturamento,
        change: 0,
        icon: DollarSign,
        color: 'from-blue-500 to-cyan-500',
      },
      {
        title: `Gastos ${titleSuffix}`,
        value: gastos,
        change: 0,
        icon: TrendingDown,
        color: 'from-red-500 to-orange-500',
      },
      {
        title: `Lucro Líquido ${titleSuffix}`,
        value: lucro,
        change: 0,
        icon: TrendingUp,
        color: 'from-emerald-500 to-teal-500',
      },
      {
        title: `Fat. via Anúncios ${titleSuffix}`,
        value: faturamentoAds,
        change: 0,
        icon: Target,
        color: 'from-pink-500 to-rose-500',
      },
      {
        title: `Fat. Orgânico ${titleSuffix}`,
        value: faturamentoOrganico,
        change: 0,
        icon: DollarSign,
        color: 'from-blue-500 to-cyan-500',
      },
      {
        title: 'Total de Clientes',
        value: clientesAtivos,
        change: 0,
        icon: Users,
        color: 'from-blue-500 to-cyan-500',
      },
      {
        title: 'Projetos em Andamento',
        value: projetosEmAndamento,
        change: 0,
        icon: FolderOpen,
        color: 'from-amber-500 to-yellow-500',
      },
      {
        title: 'Projetos Finalizados',
        value: projetosFinalizados,
        change: 0,
        icon: CheckCircle,
        color: 'from-green-500 to-emerald-500',
      },
    ];

    // Calcular Receita e Lucro por Serviço
    const srvData: Record<string, number> = {};
    const profitSrv: Record<string, number> = {};
    
    projects.forEach(p => {
      if (!srvData[p.category]) srvData[p.category] = 0;
      srvData[p.category] += (Number(p.value) || 0);

      if (!profitSrv[p.category]) profitSrv[p.category] = 0;
      profitSrv[p.category] += (Number(p.profit) || 0);
    });

    const parsedServiceData = Object.keys(srvData).map(k => ({
      name: SERVICE_LABELS[k as keyof typeof SERVICE_LABELS] || k,
      value: srvData[k],
      color: SERVICE_COLORS[k as keyof typeof SERVICE_COLORS] || '#8B5CF6'
    }));

    const parsedProfitByService = Object.keys(profitSrv).map(k => ({
      name: SERVICE_LABELS[k as keyof typeof SERVICE_LABELS] || k,
      profit: profitSrv[k],
      color: SERVICE_COLORS[k as keyof typeof SERVICE_COLORS] || '#8B5CF6'
    }));

    // Evolução Mensal (Últimos 6 meses)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlySummary: Record<string, any> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = monthNames[d.getMonth()];
      monthlySummary[`${d.getFullYear()}-${d.getMonth()}`] = {
        month: label,
        revenue: 0,
        expenses: 0,
        profit: 0
      };
    }

    financials.forEach(f => {
      if (!f.date) return;
      const d = new Date(f.date);
      if (isNaN(d.getTime())) return;
      
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlySummary[key]) {
        if (f.type === 'income') monthlySummary[key].revenue += (Number(f.value) || 0);
        if (f.type === 'expense') monthlySummary[key].expenses += (Number(f.value) || 0);
        monthlySummary[key].profit = monthlySummary[key].revenue - monthlySummary[key].expenses;
      }
    });

    const parsedMonthlyData = Object.values(monthlySummary);

    // Projetos recentes (últimos 5)
    const sortedProjects = [...projects].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);

    return {
      metricCards: cards,
      monthlyData: parsedMonthlyData,
      serviceData: parsedServiceData,
      profitByService: parsedProfitByService,
      recentProjects: sortedProjects
    };

  }, [clients, projects, financials, campaigns, dateFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Visão geral da sua agência</p>
        </div>
        <div className="flex items-center bg-gray-900/50 border border-gray-800 rounded-xl p-1">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              dateFilter === 'today' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              dateFilter === 'week' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              dateFilter === 'month' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            Mês
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {metricCards.map((metric) => (
          <div
            key={metric.title}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-5 hover:border-gray-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${metric.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color} bg-opacity-20`}>
                  <metric.icon className="h-5 w-5 text-white" />
                </div>
                {metric.change !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      metric.change > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {metric.change > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(metric.change)}%
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-white">
                  {metric.title.includes('Clientes') || metric.title.includes('Projetos')
                    ? metric.value
                    : formatCurrency(metric.value)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{metric.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Expenses Chart */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Faturamento vs Gastos (Últimos 6 Meses)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `R$${v / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Faturamento"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpenses)"
                  name="Gastos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Service */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Faturamento por Serviço</h3>
          {serviceData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {serviceData.map((service) => (
                <div key={service.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  <span className="text-xs text-gray-400">{service.name}</span>
                </div>
              ))}
            </div>
          </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <p>Nenhum dado de projeto disponível.</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit by Service */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Lucro por Serviço</h3>
          {profitByService.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitByService} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `R$${v / 1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                  {profitByService.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <p>Nenhum dado de lucro disponível.</p>
            </div>
          )}
        </div>

        {/* Monthly Profit Trend */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Evolução do Lucro (Últimos 6 Meses)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `R$${v / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name="Lucro"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Atividade Recente (Últimos Projetos)</h3>
          <a href="/projetos" className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Ver todos →
          </a>
        </div>
        <div className="space-y-3">
          {recentProjects.length > 0 ? recentProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 hover:border-blue-500/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${SERVICE_COLORS[project.category as keyof typeof SERVICE_COLORS]}20` }}
                >
                  <FolderOpen
                    className="w-5 h-5"
                    style={{ color: SERVICE_COLORS[project.category as keyof typeof SERVICE_COLORS] }}
                  />
                </div>
                <div>
                  <p className="font-medium text-white">{project.name}</p>
                  <p className="text-sm text-gray-500">{project.clientName}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-semibold text-white">{formatCurrency(project.value)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{project.status}</p>
              </div>
            </div>
          )) : (
            <p className="text-gray-500 py-4">Nenhum projeto cadastrado recentemente.</p>
          )}
        </div>
      </div>
    </div>
  );
}
