import { useState, useCallback } from 'react';
import { GitCompareArrows } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  lineNumOld?: number;
  lineNumNew?: number;
}

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

function buildDiff(a: string[], b: string[]): DiffLine[] {
  const dp = computeLCS(a, b);
  const result: DiffLine[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({
        type: 'unchanged',
        text: a[i - 1],
        lineNumOld: i,
        lineNumNew: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({
        type: 'added',
        text: b[j - 1],
        lineNumNew: j,
      });
      j--;
    } else {
      result.push({
        type: 'removed',
        text: a[i - 1],
        lineNumOld: i,
      });
      i--;
    }
  }

  return result.reverse();
}

export default function TextDiff() {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [hasCompared, setHasCompared] = useState(false);

  const handleCompare = useCallback(() => {
    const originalLines = originalText.split('\n');
    const modifiedLines = modifiedText.split('\n');
    const diff = buildDiff(originalLines, modifiedLines);
    setDiffLines(diff);
    setHasCompared(true);
  }, [originalText, modifiedText]);

  const added = diffLines.filter((l) => l.type === 'added').length;
  const removed = diffLines.filter((l) => l.type === 'removed').length;
  const unchanged = diffLines.filter((l) => l.type === 'unchanged').length;

  return (
    <ToolPage
      toolId="text-diff"
      howItWorks="Both texts are split into lines and compared using the Longest Common Subsequence (LCS) algorithm. The LCS matrix identifies matching lines between the two versions, then a backtracking pass classifies each line as added, removed, or unchanged. The result is displayed with color-coded line prefixes similar to unified diff format. Everything runs locally in your browser."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Original
            </label>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Paste original text..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600 min-h-[200px]"
            />
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Modified
            </label>
            <textarea
              value={modifiedText}
              onChange={(e) => setModifiedText(e.target.value)}
              placeholder="Paste modified text..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600 min-h-[200px]"
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleCompare}
              disabled={!originalText && !modifiedText}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <GitCompareArrows className="w-4 h-4" />
                Compare
              </span>
            </button>
            {hasCompared && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-400">+{added} added</span>
                <span className="text-red-400">-{removed} removed</span>
                <span className="text-slate-400">{unchanged} unchanged</span>
              </div>
            )}
          </div>
        </div>

        {hasCompared && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-auto max-h-[500px]">
              <pre className="text-sm font-mono">
                {diffLines.map((line, idx) => {
                  let bgClass = '';
                  let textClass = 'text-slate-300';
                  let prefix = ' ';

                  if (line.type === 'added') {
                    bgClass = 'bg-green-500/10';
                    textClass = 'text-green-300';
                    prefix = '+';
                  } else if (line.type === 'removed') {
                    bgClass = 'bg-red-500/10';
                    textClass = 'text-red-300';
                    prefix = '-';
                  }

                  const oldNum = line.lineNumOld
                    ? String(line.lineNumOld).padStart(4)
                    : '    ';
                  const newNum = line.lineNumNew
                    ? String(line.lineNumNew).padStart(4)
                    : '    ';

                  return (
                    <div
                      key={idx}
                      className={`px-4 py-0.5 ${bgClass} border-b border-slate-800/50`}
                    >
                      <span className="text-slate-600 select-none">
                        {oldNum} {newNum}{' '}
                      </span>
                      <span className={textClass}>
                        {prefix} {line.text}
                      </span>
                    </div>
                  );
                })}
                {diffLines.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-500">
                    No differences found
                  </div>
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
