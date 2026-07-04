
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Droplets, ChevronLeft, ChevronRight, Filter, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import JarLoader from './JarLoader';
import { getTransactionsByDateRange, getCustomers } from '../services/db';
import { Transaction, Customer } from '../types';

// --- SVG CHART COMPONENTS ---

const SimpleBarChart = ({
  data,
  colorClass = 'text-brand-500',
  formatValue = (v: number) => `₹${v.toLocaleString()}`,
  emptyMessage = 'No data for this period',
}: {
  data: { label: string; value: number }[];
  colorClass?: string;
  formatValue?: (v: number) => string;
  emptyMessage?: string;
}) => {
  const hasData = data.some(d => d.value > 0);
  if (!hasData) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300 text-sm italic">
        {emptyMessage}
      </div>
    );
  }
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-1 h-full w-full pt-6 pb-2">
      {data.map((d, i) => {
        const barHeight = (d.value / maxValue) * 100;
        return (
          <div key={i} className="flex flex-col items-center flex-1 group relative h-full">
            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-[10px] px-2 py-1 rounded pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-lg">
              {d.label}: {formatValue(d.value)}
            </div>
            <div className="flex-1 w-full flex items-end justify-center">
              <div
                className={`w-full max-w-[12px] md:max-w-[20px] rounded-t-sm transition-all duration-500 ${colorClass} bg-current opacity-80 group-hover:opacity-100`}
                style={{ height: `${Math.max(barHeight, d.value > 0 ? 3 : 0)}%` }}
              />
            </div>
            <span className="text-[8px] md:text-[9px] text-gray-400 mt-1 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const SimpleLineChart = ({
  data,
  emptyMessage = 'No data for this period',
}: {
  data: { label: string; v1: number; v2: number }[];
  emptyMessage?: string;
}) => {
  const hasData = data.some(d => d.v1 > 0 || d.v2 > 0);
  if (!hasData) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300 text-sm italic">
        {emptyMessage}
      </div>
    );
  }

  const max = Math.max(...data.map(d => Math.max(d.v1, d.v2)), 1);
  const len = data.length;

  const points1 = data.map((d, i) => {
    const x = len > 1 ? (i / (len - 1)) * 100 : 50;
    const y = 100 - (d.v1 / max) * 100;
    return `${x},${y}`;
  }).join(' ');

  const points2 = data.map((d, i) => {
    const x = len > 1 ? (i / (len - 1)) * 100 : 50;
    const y = 100 - (d.v2 / max) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative w-full h-full pt-8 pb-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <line x1="0" y1="25" x2="100" y2="25" stroke="#f3f4f6" strokeWidth="0.5" strokeDasharray="2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="0.5" strokeDasharray="2" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#f3f4f6" strokeWidth="0.5" strokeDasharray="2" />
        <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="1" />
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" points={points1} vectorEffect="non-scaling-stroke" />
        <polyline fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" points={points2} vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const x = len > 1 ? (i / (len - 1)) * 100 : 50;
          const y1 = 100 - (d.v1 / max) * 100;
          const y2 = 100 - (d.v2 / max) * 100;
          return (
            <g key={i} className="opacity-0 hover:opacity-100 transition-opacity">
              <circle cx={x} cy={y1} r="2" fill="#3b82f6" />
              <circle cx={x} cy={y2} r="2" fill="#f97316" />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-0 w-full flex justify-between text-[8px] md:text-[10px] text-gray-400">
        <span>{data[0]?.label}</span>
        {len > 2 && <span>{data[Math.floor(len / 2)]?.label}</span>}
        <span>{data[len - 1]?.label}</span>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

type ViewMode = 'daily' | 'monthly' | 'yearly';

const toYMD = (d: Date) => d.toISOString().split('T')[0];

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prevRevenue, setPrevRevenue] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterArea, setFilterArea] = useState<string>('All');

  // Load customers once — areas come from this
  useEffect(() => {
    getCustomers().then(setCustomers);
  }, []);

  // Reload transactions whenever view period changes + fetch prev period for growth badge
  useEffect(() => {
    setLoading(true);
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();

    let startDate: string, endDate: string;
    let prevStart: string, prevEnd: string;

    if (viewMode === 'daily') {
      // Current: 14-day window ending at selectedDate
      const s = new Date(selectedDate); s.setDate(s.getDate() - 13);
      const e = new Date(selectedDate); e.setDate(e.getDate() + 1);
      startDate = toYMD(s); endDate = toYMD(e);
      // Previous: 14-day window before current
      const ps = new Date(selectedDate); ps.setDate(ps.getDate() - 27);
      const pe = new Date(selectedDate); pe.setDate(pe.getDate() - 13);
      prevStart = toYMD(ps); prevEnd = toYMD(pe);
    } else if (viewMode === 'monthly') {
      startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      endDate   = m === 11 ? `${y + 1}-01-01` : `${y}-${String(m + 2).padStart(2, '0')}-01`;
      // Previous: same month last year for cleaner comparison (or last month)
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      prevStart = `${py}-${String(pm + 1).padStart(2, '0')}-01`;
      prevEnd   = startDate;
    } else {
      startDate = `${y}-01-01`;
      endDate   = `${y + 1}-01-01`;
      prevStart = `${y - 1}-01-01`;
      prevEnd   = startDate;
    }

    Promise.all([
      getTransactionsByDateRange(startDate, endDate),
      getTransactionsByDateRange(prevStart, prevEnd),
    ]).then(([curr, prev]) => {
      setTransactions(curr);
      setPrevRevenue(prev.reduce((s, t) => s + (t.paymentAmount || 0), 0));
      setLoading(false);
    });
  }, [viewMode, selectedDate]);

  // O(1) customer lookup map — built once, used everywhere
  const custMap = useMemo(
    () => Object.fromEntries(customers.map(c => [c.id, c])),
    [customers]
  );

  const areas = useMemo(
    () => ['All', ...Array.from(new Set(customers.map(c => c.area))).sort()],
    [customers]
  );

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    if (viewMode === 'daily')   d.setDate(d.getDate() + direction);
    if (viewMode === 'monthly') d.setMonth(d.getMonth() + direction);
    if (viewMode === 'yearly')  d.setFullYear(d.getFullYear() + direction);
    setSelectedDate(d);
  };

  const getPeriodLabel = () => {
    if (viewMode === 'daily')   return selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (viewMode === 'monthly') return selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return selectedDate.getFullYear().toString();
  };

  // Transactions for the selected period, filtered by area — O(N) with custMap
  const periodTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterArea !== 'All') {
        const cust = custMap[t.customerId];
        if (!cust || cust.area !== filterArea) return false;
      }
      if (viewMode === 'daily') {
        return t.date === toYMD(selectedDate);
      }
      if (viewMode === 'monthly') {
        const d = new Date(t.date);
        return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
      }
      // yearly — all fetched data is already for the year
      return true;
    });
  }, [transactions, custMap, viewMode, selectedDate, filterArea]);

  // Summary totals for the selected period
  const totals = useMemo(() => periodTransactions.reduce((acc, t) => ({
    revenue:        acc.revenue        + (t.paymentAmount    || 0),
    jars:           acc.jars           + (t.jarsDelivered    || 0),
    thermos:        acc.thermos        + (t.thermosDelivered || 0),
    jarsReturned:   acc.jarsReturned   + (t.jarsReturned     || 0),
    thermosReturned:acc.thermosReturned+ (t.thermosReturned  || 0),
  }), { revenue: 0, jars: 0, thermos: 0, jarsReturned: 0, thermosReturned: 0 }),
  [periodTransactions]);

  // Growth % vs previous period
  const growth = prevRevenue !== null && prevRevenue > 0
    ? Math.round(((totals.revenue - prevRevenue) / prevRevenue) * 100)
    : null;

  // Chart data — O(N) with custMap
  const chartData = useMemo(() => {
    const areaFilter = (t: Transaction) =>
      filterArea === 'All' || custMap[t.customerId]?.area === filterArea;

    if (viewMode === 'daily') {
      return Array.from({ length: 14 }, (_, i) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - (13 - i));
        const dateStr = toYMD(d);
        const dayTxs = transactions.filter(t => t.date === dateStr && areaFilter(t));
        return {
          label: d.getDate().toString(),
          value: dayTxs.reduce((s, t) => s + (t.paymentAmount   || 0), 0),
          v1:    dayTxs.reduce((s, t) => s + (t.jarsDelivered   || 0), 0),
          v2:    dayTxs.reduce((s, t) => s + (t.thermosDelivered|| 0), 0),
        };
      });
    }

    if (viewMode === 'monthly') {
      const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTxs = periodTransactions.filter(t => t.date === dateStr);
        return {
          label: day.toString(),
          value: dayTxs.reduce((s, t) => s + (t.paymentAmount   || 0), 0),
          v1:    dayTxs.reduce((s, t) => s + (t.jarsDelivered   || 0), 0),
          v2:    dayTxs.reduce((s, t) => s + (t.thermosDelivered|| 0), 0),
        };
      });
    }

    // yearly — 12 months
    return Array.from({ length: 12 }, (_, i) => {
      const monthTxs = periodTransactions.filter(t => new Date(t.date).getMonth() === i);
      return {
        label: new Date(2000, i, 1).toLocaleString('default', { month: 'short' }),
        value: monthTxs.reduce((s, t) => s + (t.paymentAmount   || 0), 0),
        v1:    monthTxs.reduce((s, t) => s + (t.jarsDelivered   || 0), 0),
        v2:    monthTxs.reduce((s, t) => s + (t.thermosDelivered|| 0), 0),
      };
    });
  }, [viewMode, selectedDate, periodTransactions, transactions, filterArea, custMap]);

  // Area breakdown — O(N) with custMap
  const areaStats = useMemo(() => {
    const stats: Record<string, { revenue: number; jars: number; thermos: number; jarsReturned: number }> = {};
    periodTransactions.forEach(t => {
      const areaName = custMap[t.customerId]?.area || 'Unknown';
      if (!stats[areaName]) stats[areaName] = { revenue: 0, jars: 0, thermos: 0, jarsReturned: 0 };
      stats[areaName].revenue      += (t.paymentAmount    || 0);
      stats[areaName].jars         += (t.jarsDelivered    || 0);
      stats[areaName].thermos      += (t.thermosDelivered || 0);
      stats[areaName].jarsReturned += (t.jarsReturned     || 0);
    });
    return Object.entries(stats).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [periodTransactions, custMap]);

  if (loading) return <JarLoader message="Loading analytics…" />;

  const GrowthBadge = () => {
    if (growth === null) return null;
    if (growth > 0) return (
      <span className="flex items-center gap-0.5 text-green-500 text-xs font-bold">
        <ArrowUpRight size={13} /> +{growth}%
      </span>
    );
    if (growth < 0) return (
      <span className="flex items-center gap-0.5 text-red-400 text-xs font-bold">
        <ArrowDownRight size={13} /> {growth}%
      </span>
    );
    return (
      <span className="flex items-center gap-0.5 text-gray-400 text-xs font-bold">
        <Minus size={13} /> 0%
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-brand-600" /> Analytics Center
          </h1>
          <p className="text-sm text-gray-500">Performance trends, revenue, and area breakdowns.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['daily', 'monthly', 'yearly'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                  viewMode === mode ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Period navigation */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button onClick={() => navigateDate(-1)} className="p-1.5 hover:bg-white hover:text-brand-600 rounded-md transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 font-bold text-gray-700 min-w-[140px] text-center text-sm">{getPeriodLabel()}</div>
            <button onClick={() => navigateDate(1)} className="p-1.5 hover:bg-white hover:text-brand-600 rounded-md transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Area filter */}
          <div className="relative">
            <select
              value={filterArea}
              onChange={e => setFilterArea(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none cursor-pointer"
            >
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <Filter size={14} className="absolute left-3 top-3 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-6 text-white shadow-lg shadow-brand-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 opacity-90">
              <div className="p-1.5 bg-white/20 rounded-lg"><DollarSign size={18} /></div>
              <span className="text-xs font-semibold uppercase tracking-wider">Revenue</span>
            </div>
            <GrowthBadge />
          </div>
          <div className="text-3xl font-bold">₹{totals.revenue.toLocaleString()}</div>
          <p className="text-xs opacity-60 mt-1">
            {prevRevenue !== null ? `vs ₹${prevRevenue.toLocaleString()} prev` : getPeriodLabel()}
          </p>
        </div>

        {/* Jars Delivered */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg"><Droplets size={18} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">Jars Delivered</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">{totals.jars.toLocaleString()}</div>
          {totals.jarsReturned > 0 && (
            <p className="text-xs text-gray-400 mt-1">{totals.jarsReturned.toLocaleString()} returned · {totals.jars - totals.jarsReturned} net out</p>
          )}
        </div>

        {/* Thermos Delivered */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg"><Package size={18} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">Thermos Delivered</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">{totals.thermos.toLocaleString()}</div>
          {totals.thermosReturned > 0 && (
            <p className="text-xs text-gray-400 mt-1">{totals.thermosReturned.toLocaleString()} returned</p>
          )}
        </div>

        {/* Returns Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-gray-500">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider">Return Rate</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {totals.jars > 0 ? Math.round((totals.jarsReturned / totals.jars) * 100) : 0}%
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {totals.jarsReturned} of {totals.jars} jars returned
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-80 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-500" /> Revenue Trend
            </h3>
            {viewMode === 'daily' && (
              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md">14-day window</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <SimpleBarChart
              data={chartData.map(d => ({ label: d.label, value: d.value }))}
              formatValue={v => `₹${v.toLocaleString()}`}
            />
          </div>
        </div>

        {/* Supply Volume */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-80 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Package size={18} className="text-orange-500" /> Supply Volume
            </h3>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter">
              <div className="flex items-center gap-1.5 text-blue-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Jars</div>
              <div className="flex items-center gap-1.5 text-orange-600"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Thermos</div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <SimpleLineChart data={chartData} />
          </div>
        </div>
      </div>

      {/* Area Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-700">Area Performance Breakdown</h3>
          <span className="text-xs text-gray-400">{getPeriodLabel()}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-white text-gray-400 border-b border-gray-100">
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Area</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">Jars Out</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">Returned</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-center">Thermos</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-right">Revenue</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {areaStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400 italic">
                    No supply data recorded for this period.
                  </td>
                </tr>
              ) : (
                areaStats.map(([area, stat]) => (
                  <tr key={area} className="hover:bg-brand-50/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700">{area}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{stat.jars}</td>
                    <td className={`px-6 py-4 text-center font-medium ${stat.jarsReturned > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                      {stat.jarsReturned || '—'}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{stat.thermos}</td>
                    <td className="px-6 py-4 text-right font-bold text-brand-600">₹{stat.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 bg-gray-100 rounded-full w-16 overflow-hidden">
                          <div
                            className="h-full bg-brand-400 rounded-full"
                            style={{ width: `${totals.revenue > 0 ? Math.round((stat.revenue / totals.revenue) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-gray-400 font-mono text-xs w-8 text-right">
                          {totals.revenue > 0 ? Math.round((stat.revenue / totals.revenue) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {areaStats.length > 1 && (
              <tfoot className="border-t-2 border-gray-100 bg-gray-50">
                <tr>
                  <td className="px-6 py-3 font-bold text-gray-600 text-xs uppercase">Totals</td>
                  <td className="px-6 py-3 text-center font-bold text-gray-700">{totals.jars}</td>
                  <td className="px-6 py-3 text-center font-bold text-orange-500">{totals.jarsReturned || '—'}</td>
                  <td className="px-6 py-3 text-center font-bold text-gray-700">{totals.thermos}</td>
                  <td className="px-6 py-3 text-right font-bold text-brand-600">₹{totals.revenue.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right text-xs text-gray-400 font-mono">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
