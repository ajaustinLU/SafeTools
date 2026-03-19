import { useState, useEffect, useCallback } from 'react';
import ToolPage from '../../components/common/ToolPage';
import { copyToClipboard } from '../../lib/download';
import { Clock, Copy, ArrowDown } from 'lucide-react';

export default function UnixTimestamp() {
  const [currentTimestamp, setCurrentTimestamp] = useState(Math.floor(Date.now() / 1000));
  const [timestampInput, setTimestampInput] = useState('');
  const [dateTimeInput, setDateTimeInput] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timestampToDateResults = useCallback(() => {
    const ts = parseInt(timestampInput);
    if (isNaN(ts)) return null;
    const ms = ts.toString().length > 10 ? ts : ts * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return {
      iso: d.toISOString(),
      locale: d.toLocaleString(),
      utc: d.toUTCString(),
      localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      localFull: d.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'long',
      }),
    };
  }, [timestampInput]);

  const dateToTimestampResults = useCallback(() => {
    if (!dateTimeInput) return null;
    const d = new Date(dateTimeInput);
    if (isNaN(d.getTime())) return null;
    return {
      seconds: Math.floor(d.getTime() / 1000),
      milliseconds: d.getTime(),
    };
  }, [dateTimeInput]);

  const tsResults = timestampToDateResults();
  const dtResults = dateToTimestampResults();

  const handleCopy = (text: string) => {
    copyToClipboard(text);
  };

  return (
    <ToolPage
      toolId="unix-timestamp"
      howItWorks="Convert between Unix timestamps and human-readable dates. Unix timestamps represent seconds (or milliseconds) since January 1, 1970 UTC (the Unix Epoch). All conversions happen locally in your browser."
    >
      <div className="space-y-8">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-slate-400">Current Unix Timestamp</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-slate-100">{currentTimestamp}</span>
              <button
                onClick={() => handleCopy(currentTimestamp.toString())}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-cyan-400" />
            Timestamp to Date
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Unix Timestamp (seconds or milliseconds)</label>
              <input
                type="number"
                value={timestampInput}
                onChange={(e) => setTimestampInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="e.g. 1700000000"
              />
            </div>

            {tsResults && (
              <div className="space-y-3">
                {[
                  { label: 'ISO 8601', value: tsResults.iso },
                  { label: 'Locale String', value: tsResults.locale },
                  { label: 'UTC', value: tsResults.utc },
                  { label: `Local (${tsResults.localTimezone})`, value: tsResults.localFull },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">{row.label}</div>
                      <div className="text-sm text-slate-200 font-mono">{row.value}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(row.value)}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-cyan-400 rotate-180" />
            Date to Timestamp
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Date and Time</label>
              <input
                type="datetime-local"
                value={dateTimeInput}
                onChange={(e) => setDateTimeInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            {dtResults && (
              <div className="space-y-3">
                {[
                  { label: 'Unix Timestamp (seconds)', value: dtResults.seconds.toString() },
                  { label: 'Unix Timestamp (milliseconds)', value: dtResults.milliseconds.toString() },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">{row.label}</div>
                      <div className="text-sm text-slate-200 font-mono">{row.value}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(row.value)}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
