import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  FolderOpen,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
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
import { SERVICE_COLORS } from '../types';
import { mockProjects } from '../data/mockData';

const metricCards = [
  {
    title: 'Faturamento Mensal',
    value: 24000,
    change: 12.5,
    icon: DollarSign,
    color: 'from-violet-500 to-fuchsia-500',
  },
  {
    title: 'Gastos com Anúncios',
    value: 4300,
    change: -5.2,
    icon: TrendingDown,
    color: 'from-red-500 to-orange-500',
  },
  {
    title: 'Lucro Líquido',
    value: 19700,
    change: 18.3,
    icon: TrendingUp,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Clientes Ativos',
    value: 5,
    change: 25,
    icon: Users,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Projetos em Andamento',
    value: 3,
    change: 0,
    icon: FolderOpen,
    color: 'from-amber-500 to-yellow-500',
  },
  {
    title: 'Projetos Finalizados',
    value: 2,
    change: 100,
    icon: CheckCircle,
    color: 'from-green-500 to-emerald-500',
  },
];

const monthlyData = [
  { month: 'Jan', revenue: 18500, expenses: 3200, profit: 15300 },
  { month: 'Fev', revenue: 22000, expenses: 3800, profit: 18200 },
  { month: 'Mar', revenue: 19800, expenses: 3500, profit: 16300 },
  { month: 'Abr', revenue: 25600, expenses: 4100, profit: 21500 },
  { month: 'Mai', revenue: 28900, expenses: 4500, profit: 24400 },
  { month: 'Jun', revenue: 24000, expenses: 4300, profit: 19700 },
];

const serviceData = [
  { name: 'Vídeos IA', value: 8500, color: SERVICE_COLORS['videos-ia'] },
  { name: 'Banners', value: 4200, color: SERVICE_COLORS['banners'] },
  { name: 'Fotos IA', value: 3100, color: SERVICE_COLORS['fotos-ia'] },
  { name: 'Sites', value: 13000, color: SERVICE_COLORS['sites'] },
  { name: 'Apps Web', value: 12000, color: SERVICE_COLORS['apps-web'] },
];

const profitByService = [
  { name: 'Vídeos IA', profit: 6800, color: SERVICE_COLORS['videos-ia'] },
  { name: 'Banners', profit: 3400, color: SERVICE_COLORS['banners'] },
  { name: 'Fotos IA', profit: 2500, color: SERVICE_COLORS['fotos-ia'] },
  { name: 'Sites', profit: 9500, color: SERVICE_COLORS['sites'] },
  { name: 'Apps Web', profit: 8000, color: SERVICE_COLORS['apps-web'] },
];

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
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Visão geral da sua agência</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((metric) => (
          <div
            key={metric.title}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-5 hover:border-gray-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10"
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
          <h3 className="text-lg font-semibold text-white mb-4">Faturamento vs Gastos</h3>
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
          </div>
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
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit by Service */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Lucro por Serviço</h3>
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
        </div>

        {/* Monthly Profit Trend */}
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Evolução do Lucro</h3>
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
          <h3 className="text-lg font-semibold text-white">Atividade Recente</h3>
          <a href="/projetos" className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">
            Ver todos →
          </a>
        </div>
        <div className="space-y-3">
          {mockProjects.slice(0, 5).map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 hover:border-violet-500/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${SERVICE_COLORS[project.category]}20` }}
                >
                  <FolderOpen
                    className="w-5 h-5"
                    style={{ color: SERVICE_COLORS[project.category] }}
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
          ))}
        </div>
      </div>
    </div>
  );
}
