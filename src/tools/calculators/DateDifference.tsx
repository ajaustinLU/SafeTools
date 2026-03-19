import { useState, useMemo } from 'react';
import ToolPage from '../../components/common/ToolPage';
import { Calendar, Clock, Briefcase, Plus } from 'lucide-react';

function getDateDifference(start: Date, end: Date) {
  const [earlier, later] = start <= end ? [start, end] : [end, start];

  let years = later.getFullYear() - earlier.getFullYear();
  let months = later.getMonth() - earlier.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (later.getDate() < earlier.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  const totalMs = later.getTime() - earlier.getTime();
  const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor(totalMs / (1000 * 60));

  return { years, months, totalWeeks, totalDays, totalHours, totalMinutes };
}

function getBusinessDays(start: Date, end: Date): number {
  const [earlier, later] = start <= end ? [start, end] : [end, start];
  let count = 0;
  const current = new Date(earlier);
  while (current < later) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function DateDifference() {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [daysToAdd, setDaysToAdd] = useState('30');

  const difference = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diff = getDateDifference(start, end);
    const businessDays = getBusinessDays(start, end);
    return { ...diff, businessDays };
  }, [startDate, endDate]);

  const futureDate = useMemo(() => {
    const days = parseInt(daysToAdd);
    if (isNaN(days)) return null;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }, [daysToAdd]);

  const statCards = useMemo(() => {
    if (!difference) return [];
    return [
      { label: 'Years', value: difference.years, icon: Calendar },
      { label: 'Months', value: difference.months, icon: Calendar },
      { label: 'Weeks', value: difference.totalWeeks, icon: Clock },
      { label: 'Days', value: difference.totalDays, icon: Clock },
      { label: 'Hours', value: difference.totalHours.toLocaleString(), icon: Clock },
      { label: 'Minutes', value: difference.totalMinutes.toLocaleString(), icon: Clock },
      { label: 'Business Days', value: difference.businessDays.toLocaleString(), icon: Briefcase },
    ];
  }, [difference]);

  return (
    <ToolPage
      toolId="date-difference"
      howItWorks="Calculate the exact difference between two dates in multiple time units. Also find future or past dates by adding or subtracting days from today. Business days exclude weekends (Saturday and Sunday)."
    >
      <div className="space-y-8">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Date Difference</h3>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 space-y-2">
              <label className="text-sm text-slate-400">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm text-slate-400">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>

          {difference && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {statCards.map((card) => (
                <div key={card.label} className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <card.icon className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-slate-100 mb-1">{card.value}</div>
                  <div className="text-xs text-slate-500">{card.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            What date is X days from today?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Number of days</label>
              <input
                type="number"
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Enter number of days"
              />
              <p className="text-xs text-slate-500">Use negative numbers for past dates</p>
            </div>
            {futureDate && (
              <div className="bg-slate-900/50 rounded-lg p-4 flex-1">
                <div className="text-sm text-slate-400 mb-1">Result</div>
                <div className="text-lg font-semibold text-slate-100">{formatDate(futureDate)}</div>
                <div className="text-sm text-slate-500 mt-1">{futureDate.toISOString().split('T')[0]}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
