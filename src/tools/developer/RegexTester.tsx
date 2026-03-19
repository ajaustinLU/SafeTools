import { useState, useMemo, useCallback } from 'react';
import ToolPage from '../../components/common/ToolPage';
import { Regex, AlertCircle } from 'lucide-react';

interface MatchInfo {
  match: string;
  index: number;
  groups: string[];
}

const presets = [
  { label: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { label: 'URL', pattern: 'https?:\\/\\/[^\\s]+' },
  { label: 'Phone', pattern: '\\+?[\\d\\s()-]{7,}' },
  { label: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  { label: 'IP Address', pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}' },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false });
  const [testString, setTestString] = useState('');

  const flagString = useMemo(() => {
    return Object.entries(flags)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join('');
  }, [flags]);

  const toggleFlag = useCallback((flag: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  }, []);

  const { regex, error } = useMemo(() => {
    if (!pattern) return { regex: null, error: null };
    try {
      const r = new RegExp(pattern, flagString);
      return { regex: r, error: null };
    } catch (e) {
      return { regex: null, error: (e as Error).message };
    }
  }, [pattern, flagString]);

  const matches = useMemo((): MatchInfo[] => {
    if (!regex || !testString) return [];
    const results: MatchInfo[] = [];
    if (flagString.includes('g')) {
      let m: RegExpExecArray | null;
      const r = new RegExp(regex.source, regex.flags);
      while ((m = r.exec(testString)) !== null) {
        results.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1),
        });
        if (m[0].length === 0) r.lastIndex++;
      }
    } else {
      const m = regex.exec(testString);
      if (m) {
        results.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1),
        });
      }
    }
    return results;
  }, [regex, testString, flagString]);

  const highlightedHtml = useMemo(() => {
    if (!regex || !testString || matches.length === 0) return escapeHtml(testString);
    const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    let result = '';
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.exec(testString)) !== null) {
      result += escapeHtml(testString.slice(lastIndex, m.index));
      result += `<span class="bg-cyan-500/30 rounded px-0.5">${escapeHtml(m[0])}</span>`;
      lastIndex = m.index + m[0].length;
      if (m[0].length === 0) {
        result += escapeHtml(testString[r.lastIndex - 1] || '');
        lastIndex = r.lastIndex;
      }
    }
    result += escapeHtml(testString.slice(lastIndex));
    return result;
  }, [regex, testString, matches]);

  return (
    <ToolPage
      toolId="regex-tester"
      howItWorks="Test regular expressions against sample text with real-time matching and highlighting. Toggle regex flags, view individual matches with their positions and capture groups, or use common presets to get started quickly."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Common Patterns</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setPattern(preset.pattern)}
                className="px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-600"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Pattern</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-cyan-500 focus-within:border-cyan-500">
                <span className="text-slate-500 pl-3 text-sm">/</span>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="flex-1 bg-transparent px-1 py-2 text-slate-200 text-sm focus:outline-none font-mono"
                  placeholder="Enter regex pattern"
                />
                <span className="text-slate-500 pr-3 text-sm">/{flagString}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(['g', 'i', 'm', 's'] as const).map((flag) => (
              <button
                key={flag}
                onClick={() => toggleFlag(flag)}
                className={`w-9 h-9 rounded-lg font-mono text-sm font-bold transition-colors ${
                  flags[flag]
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700/50 text-slate-500 hover:text-slate-300 border border-slate-600'
                }`}
              >
                {flag}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Test String</label>
            <textarea
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-mono resize-y"
              placeholder="Enter text to test against the regex"
            />
          </div>

          {testString && regex && (
            <div className="space-y-2">
              <label className="text-sm text-slate-400">
                Highlighted Matches ({matches.length} match{matches.length !== 1 ? 'es' : ''})
              </label>
              <div
                className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-200 font-mono whitespace-pre-wrap break-all"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            </div>
          )}
        </div>

        {matches.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              <Regex className="w-4 h-4 inline-block mr-1.5" />
              Match Details
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {matches.map((m, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Match {i + 1} at index {m.index}</span>
                    <span className="text-xs text-slate-600">length: {m.match.length}</span>
                  </div>
                  <div className="text-sm text-cyan-300 font-mono break-all">{m.match}</div>
                  {m.groups.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {m.groups.map((group, gi) => (
                        <div key={gi} className="text-xs">
                          <span className="text-slate-500">Group {gi + 1}: </span>
                          <span className="text-slate-300 font-mono">{group ?? 'undefined'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
