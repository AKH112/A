"use client";

import { useEffect, useMemo, useState } from "react";
import { getAnalyticsStats } from "@/services/analytics.api";
import { Donut } from "./Donut";
import { Segmented } from "./Segmented";
import { 
  Users, 
  UserCheck, 
  UserX, 
  UsersRound, 
  HelpCircle, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Clock, 
  Briefcase, 
  Coffee,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type AnalyticsStats = {
  students: {
    total: number;
    active: number;
    inactive: number;
    groups: number;
  };
  lessons: {
    count: number;
    minutes: number;
  };
  finances: {
    earnedTotal: number;
    paidTotal: number;
  };
  expected: {
    count: number;
    income: number;
  };
  averages?: {
    lessonsPerWeek: number;
    workDaysPerWeek: number;
    hoursPerWeek: number;
    incomePerWeek: number;
  };
};

const formatMoney = (value: number) => `${(value).toLocaleString('ru-RU')} ₽`;

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}ч ${rest}м`;
};

export function AnalyticsTab() {
  const [period, setPeriod] = useState<"week" | "month" | "year" | "all">("month");
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getAnalyticsStats();
        setStats(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  if (loading || !stats) return <div className="p-8 text-gray-500">Загрузка аналитики...</div>;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Period Selector */}
        <div className="flex items-center justify-between rounded-2xl bg-white p-2 shadow-sm">
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: "week", label: "Неделя" },
              { value: "month", label: "Месяц" },
              { value: "year", label: "Год" },
              { value: "all", label: "Все время" },
            ]}
          />
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 px-4">
            <button className="hover:text-gray-900"><ChevronLeft size={20} /></button>
            <span>01.2026</span>
            <button className="hover:text-gray-900"><ChevronRight size={20} /></button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 gap-6 rounded-3xl bg-white p-8 shadow-sm md:grid-cols-3">
          <Donut
            label="занятий проведено"
            valueText={`${stats.lessons.count}`}
            value={stats.lessons.count}
            total={Math.max(stats.lessons.count, 1)} // Prevent 0/0
          />
          <Donut
            label="занятий"
            valueText={formatDuration(stats.lessons.minutes)}
            value={100}
            total={100}
          />
          <div className="flex flex-col justify-center text-right">
            <div className="mb-1 text-sm text-gray-500 flex items-center justify-end gap-1">
              Заработано <HelpCircle size={14} />
            </div>
            <div className="text-3xl font-bold">{formatMoney(stats.finances.earnedTotal)}</div>
            <div className="mt-4 flex justify-end">
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                Графики <TrendingUp size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Student Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Ученики"
            value={stats.students.total}
            color="bg-indigo-500"
            icon={<Users className="text-white opacity-80" />}
          />
          <StatCard
            title="Активные ученики"
            value={stats.students.active}
            color="bg-pink-500"
            icon={<UserCheck className="text-white opacity-80" />}
          />
          <StatCard
            title="Группы"
            value={stats.students.groups}
            color="bg-blue-100 text-gray-900"
            textColor="text-gray-900"
            icon={<UsersRound className="text-gray-500" />}
          />
          <StatCard
            title="Неактивные ученики"
            value={stats.students.inactive}
            color="bg-lime-300 text-gray-900"
            textColor="text-gray-900"
            icon={<UserX className="text-gray-600" />}
          />
        </div>

        {/* Middle Section: Income Chart & Subscription */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">Доход по ученику</span>
              <TrendingUp size={16} className="text-gray-400" />
            </div>
            <div className="flex h-32 items-end gap-2">
               <div className="text-3xl font-bold mb-8">0 ₽</div>
            </div>
            <button className="w-full rounded-xl bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-600">
              Добавить ученика
            </button>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
               <span className="text-sm text-gray-500">Главный должник</span>
               <HelpCircle size={16} className="text-gray-400" />
            </div>
            
            <div className="mt-4 text-sm text-gray-500">Доступно в подписке "Эксперт"</div>
            <button className="mt-4 w-full rounded-xl bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-600">
              Оформить подписку
            </button>
          </div>
        </div>

        {/* Bottom Averages */}
        <div className="grid grid-cols-1 gap-4 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-6">
            <AvgItem 
              label="Среднее количество уроков в неделю" 
              value={stats.averages?.lessonsPerWeek ?? 0} 
            />
            <AvgItem 
              label="Средняя стоимость часа работы" 
              value={`${stats.averages?.incomePerWeek ?? 0} ₽`} 
            />
          </div>
          <div className="space-y-6">
            <AvgItem 
              label="Среднее количество рабочих часов в неделю" 
              value={stats.averages?.hoursPerWeek ?? 0} 
            />
            <AvgItem 
              label="Среднее количество выходных в неделю" 
              value="–" 
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full space-y-4 lg:w-80">
        {/* Calendar Widget */}
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between text-sm">
            <HelpCircle size={16} className="text-gray-400" />
            <span className="font-medium">19.01.26-25.01.26</span>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
          {/* Placeholder for calendar grid */}
          <div className="grid grid-cols-8 gap-1 text-[10px] text-gray-400">
             <div className="flex flex-col gap-1">
                <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
             </div>
             {/* Simple grid visualization */}
             {Array.from({ length: 7 }).map((_, i) => (
               <div key={i} className="flex flex-col gap-1">
                 {Array.from({ length: 7 }).map((_, j) => (
                   <div key={j} className="h-4 w-full rounded-sm bg-gray-50 border border-gray-100"></div>
                 ))}
               </div>
             ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-gray-400">
             <span>8</span><span>12</span><span>16</span><span>20</span>
          </div>
        </div>

        {/* Earnings Chart Widget */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <HelpCircle size={16} className="text-gray-400" />
               <span className="font-medium">Заработок</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
               <ChevronLeft size={16} /> 2026 <ChevronRight size={16} />
            </div>
          </div>
          <div className="h-24 flex items-center justify-center text-xs text-gray-400">
             За этот период заработка нет
          </div>
          <div className="mt-4 flex justify-between text-[10px] text-gray-400">
             <span>Янв</span><span>Май</span><span>Сен</span><span>Дек</span>
          </div>
        </div>

        {/* Scheduled & Expected */}
        <div className="rounded-3xl bg-[#d4fc46] p-6 shadow-sm">
          <div className="flex gap-2 mb-6">
             <div className="bg-black/10 rounded-xl px-3 py-1 text-xs font-medium">Неделя</div>
             <div className="bg-black text-[#d4fc46] rounded-xl px-3 py-1 text-xs font-medium">Месяц</div>
             <div className="bg-black/10 rounded-xl px-3 py-1 text-xs font-medium">Год</div>
             <div className="bg-black/10 rounded-xl px-3 py-1 text-xs font-medium text-center leading-3 pt-2">Все<br/>время</div>
          </div>

          <div className="mb-6">
             <div className="flex justify-between items-start">
                <div className="text-sm font-medium opacity-80 mb-1">Занятий в<br/>расписании</div>
                <div className="bg-white rounded-full p-1"><TrendingUp size={14} /></div>
             </div>
             <div className="text-3xl font-bold">0</div>
          </div>

          <div>
             <div className="flex justify-between items-start">
                <div className="text-sm font-medium opacity-80 mb-1">Ожидаемый доход</div>
                <HelpCircle size={16} className="opacity-60" />
             </div>
             <div className="text-3xl font-bold">{formatMoney(stats.expected.income)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, textColor = "text-white", icon }: { title: string; value: number; color: string; textColor?: string; icon: any }) {
  return (
    <div className={`rounded-2xl p-4 ${color} ${textColor} relative overflow-hidden`}>
      <div className="relative z-10">
        <div className="text-xs font-medium opacity-90 mb-2">{title}</div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
      <div className="absolute bottom-3 right-3 opacity-100">
         {/* Using HelpCircle as placeholder for the question mark circle icon */}
         <HelpCircle size={18} className="opacity-50" />
      </div>
    </div>
  );
}

function AvgItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1 max-w-[150px] leading-tight">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
