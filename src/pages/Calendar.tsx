import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle, Calendar as CalIcon, Tag } from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
  isToday, isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isOverdue, getDaysUntilDeadline, formatCurrency } from '../utils/helpers';
import { mockProjects } from '../data/mockData';
import { PROJECT_STATUS_LABELS, SERVICE_LABELS } from '../types';
import { Modal } from '../components/Modal';

export function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  function getProjectsForDay(day: Date) {
    const ds = format(day, 'yyyy-MM-dd');
    return mockProjects.filter((p) => p.deadline === ds);
  }

  const upcomingProjects = mockProjects
    .filter((p) => !isOverdue(p.deadline) && getDaysUntilDeadline(p.deadline) <= 7 && getDaysUntilDeadline(p.deadline) >= 0)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const overdueProjects = mockProjects.filter((p) => isOverdue(p.deadline));
  const todayProjects = getProjectsForDay(new Date());

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function handleDayClick(day: Date) {
    setSelectedDay(day);
    setDayModalOpen(true);
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Calendário</h1>
        <p className="text-gray-400 mt-1">Prazos, entregas e agenda semanal</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/20"><AlertCircle className="h-6 w-6 text-red-400" /></div>
          <div>
            <p className="text-2xl font-bold text-white">{overdueProjects.length}</p>
            <p className="text-sm text-red-400">Projetos Atrasados</p>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/20"><Clock className="h-6 w-6 text-amber-400" /></div>
          <div>
            <p className="text-2xl font-bold text-white">{upcomingProjects.length}</p>
            <p className="text-sm text-amber-400">Entregas em 7 dias</p>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/20"><CheckCircle className="h-6 w-6 text-emerald-400" /></div>
          <div>
            <p className="text-2xl font-bold text-white">{todayProjects.length}</p>
            <p className="text-sm text-emerald-400">Entregas Hoje</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="xl:col-span-2 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-6">
          {/* Nav */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => setCurrentMonth(new Date())}
                className="px-4 py-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors text-sm font-medium">
                Hoje
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((day) => {
              const dayProjects = getProjectsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`relative min-h-[80px] p-2 rounded-xl border text-left transition-all duration-150
                    ${today ? 'border-violet-500/60 bg-violet-500/15' : 'border-gray-800/40 bg-gray-800/20'}
                    ${!inMonth ? 'opacity-30' : ''}
                    ${isSelected ? 'ring-2 ring-violet-400' : ''}
                    hover:border-violet-500/40 hover:bg-gray-800/40`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold leading-none ${today ? 'text-violet-400' : inMonth ? 'text-white' : 'text-gray-500'}`}>
                      {format(day, 'd')}
                    </span>
                    {today && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                  </div>
                  <div className="space-y-0.5">
                    {dayProjects.slice(0, 2).map((p) => (
                      <div key={p.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium ${isOverdue(p.deadline) ? 'bg-red-500/25 text-red-400' : 'bg-violet-500/25 text-violet-400'}`}>
                        {p.name.substring(0, 12)}…
                      </div>
                    ))}
                    {dayProjects.length > 2 && (
                      <div className="text-[10px] text-gray-500 text-center">+{dayProjects.length - 2}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Overdue */}
          {overdueProjects.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <h3 className="font-semibold text-white">Atrasados</h3>
              </div>
              <div className="space-y-2">
                {overdueProjects.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="font-medium text-white text-sm">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-400">{p.clientName}</p>
                      <span className="text-xs text-red-400 font-medium">{Math.abs(getDaysUntilDeadline(p.deadline))}d atraso</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800/50 p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-violet-400" />
              <h3 className="font-semibold text-white">Próximas Entregas</h3>
            </div>
            <div className="space-y-2">
              {upcomingProjects.slice(0, 6).map((p) => {
                const days = getDaysUntilDeadline(p.deadline);
                return (
                  <div key={p.id} className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/30 hover:border-violet-500/30 transition-colors cursor-pointer"
                    onClick={() => { setSelectedDay(new Date(p.deadline + 'T00:00:00')); setDayModalOpen(true); }}>
                    <p className="font-medium text-white text-sm">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-400">{p.clientName}</p>
                      <span className={`text-xs font-medium ${days <= 2 ? 'text-amber-400' : 'text-violet-400'}`}>
                        {days === 0 ? 'Hoje!' : `em ${days}d`}
                      </span>
                    </div>
                  </div>
                );
              })}
              {upcomingProjects.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Nenhuma entrega próxima 🎉</p>
              )}
            </div>
          </div>

          {/* Today */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Entregas Hoje</h3>
            </div>
            {todayProjects.length > 0 ? (
              <div className="space-y-2">
                {todayProjects.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="font-medium text-white text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{p.clientName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-2">Sem entregas hoje</p>
            )}
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      <Modal
        open={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        title={selectedDay ? format(selectedDay, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}
        size="md"
      >
        {selectedDay && (() => {
          const dayProjects = getProjectsForDay(selectedDay);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-3 rounded-xl ${isToday(selectedDay) ? 'bg-violet-500/20' : 'bg-gray-800'}`}>
                  <CalIcon className={`h-6 w-6 ${isToday(selectedDay) ? 'text-violet-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-white font-semibold capitalize">{format(selectedDay, 'EEEE', { locale: ptBR })}</p>
                  <p className="text-gray-400 text-sm">{dayProjects.length} {dayProjects.length === 1 ? 'entrega' : 'entregas'} neste dia</p>
                </div>
              </div>

              {dayProjects.length > 0 ? (
                <div className="space-y-3">
                  {dayProjects.map((p) => (
                    <div key={p.id} className="p-4 rounded-xl bg-gray-800/60 border border-gray-700/50">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-white">{p.name}</p>
                          <p className="text-sm text-gray-400 mt-0.5">{p.clientName}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${isOverdue(p.deadline) ? 'bg-red-500/20 text-red-400' : 'bg-violet-500/20 text-violet-400'}`}>
                          {isOverdue(p.deadline) ? `${Math.abs(getDaysUntilDeadline(p.deadline))}d atraso` : 'No prazo'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Tag className="h-4 w-4 text-violet-400/70" />
                          <span>{SERVICE_LABELS[p.category]}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                          <span>{formatCurrency(p.value)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            p.status === 'finalizado' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            p.status === 'em-producao' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' :
                            'bg-gray-700 text-gray-400 border-gray-600'
                          }`}>
                            {PROJECT_STATUS_LABELS[p.status]}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalIcon className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma entrega neste dia</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-800">
                <button onClick={() => setDayModalOpen(false)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
