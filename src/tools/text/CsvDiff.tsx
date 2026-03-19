import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, ArrowRight } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';

interface CsvRow {
  [key: string]: string;
}

interface DiffResult {
  headers: string[];
  addedRows: CsvRow[];
  removedRows: CsvRow[];
  changedRows: { rowKey: string; old: CsvRow; new: CsvRow; changedCols: string[] }[];
  unchangedRows: CsvRow[];
}

function parseCSV(text: string): { headers: string[]; rows: CsvRow[] } {
  const result: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(current);
        current = '';
        result.push(row);
        row = [];
        i++;
      } else if (ch === '\n') {
        row.push(current);
        current = '';
        result.push(row);
        row = [];
      } else {
        current += ch;
      }
    }
  }

  if (current || row.length > 0) {
    row.push(current);
    result.push(row);
  }

  const filtered = result.filter((r) => r.some((cell) => cell.trim() !== ''));

  if (filtered.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = filtered[0];
  const rows: CsvRow[] = filtered.slice(1).map((r) => {
    const obj: CsvRow = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? '';
    });
    return obj;
  });

  return { headers, rows };
}

function rowKey(row: CsvRow, headers: string[]): string {
  return headers.map((h) => row[h] ?? '').join('\x00');
}

function computeDiff(
  headersA: string[],
  rowsA: CsvRow[],
  headersB: string[],
  rowsB: CsvRow[]
): DiffResult {
  const headers = Array.from(new Set([...headersA, ...headersB]));
  const keyCol = headers[0];

  const useKeyCol =
    keyCol &&
    new Set(rowsA.map((r) => r[keyCol])).size === rowsA.length &&
    new Set(rowsB.map((r) => r[keyCol])).size === rowsB.length;

  const getKey = useKeyCol
    ? (row: CsvRow) => row[keyCol] ?? ''
    : (row: CsvRow) => rowKey(row, headers);

  const mapA = new Map<string, CsvRow>();
  const mapB = new Map<string, CsvRow>();

  rowsA.forEach((r) => mapA.set(getKey(r), r));
  rowsB.forEach((r) => mapB.set(getKey(r), r));

  const addedRows: CsvRow[] = [];
  const removedRows: CsvRow[] = [];
  const changedRows: DiffResult['changedRows'] = [];
  const unchangedRows: CsvRow[] = [];

  mapA.forEach((rowA, key) => {
    const rowB = mapB.get(key);
    if (!rowB) {
      removedRows.push(rowA);
    } else {
      const changedCols = headers.filter(
        (h) => (rowA[h] ?? '') !== (rowB[h] ?? '')
      );
      if (changedCols.length > 0) {
        changedRows.push({ rowKey: key, old: rowA, new: rowB, changedCols });
      } else {
        unchangedRows.push(rowA);
      }
    }
  });

  mapB.forEach((rowB, key) => {
    if (!mapA.has(key)) {
      addedRows.push(rowB);
    }
  });

  return { headers, addedRows, removedRows, changedRows, unchangedRows };
}

export default function CsvDiff() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFileA = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileA(file);
    setDiff(null);
    setError('');
  }, []);

  const handleFileB = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileB(file);
    setDiff(null);
    setError('');
  }, []);

  const handleCompare = useCallback(async () => {
    if (!fileA || !fileB) return;
    setProcessing(true);
    setError('');
    setDiff(null);

    try {
      const [textA, textB] = await Promise.all([
        fileA.text(),
        fileB.text(),
      ]);

      const csvA = parseCSV(textA);
      const csvB = parseCSV(textB);

      if (csvA.headers.length === 0 || csvB.headers.length === 0) {
        setError('One or both CSV files appear to be empty or invalid.');
        return;
      }

      const result = computeDiff(csvA.headers, csvA.rows, csvB.headers, csvB.rows);
      setDiff(result);
    } catch {
      setError('Failed to parse CSV files. Please check the file format.');
    } finally {
      setProcessing(false);
    }
  }, [fileA, fileB]);

  const totalChangedCells = diff
    ? diff.changedRows.reduce((sum, r) => sum + r.changedCols.length, 0)
    : 0;

  return (
    <ToolPage
      toolId="csv-diff"
      howItWorks="Both CSV files are parsed client-side with a custom parser that handles quoted fields, commas within quotes, escaped quotes, and newlines inside quoted fields. Rows are matched using the first column as a key if its values are unique in both files, otherwise all columns are combined as a composite key. This prevents row reordering from triggering false positives. Differences are classified as added rows, removed rows, or changed cells. Everything runs locally in your browser."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Version A
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50 cursor-pointer transition-all">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-300">
                {fileA ? fileA.name : 'Choose CSV file'}
              </span>
              {fileA && (
                <span className="text-xs text-slate-500">
                  {(fileA.size / 1024).toFixed(1)} KB
                </span>
              )}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileA}
                className="hidden"
              />
            </label>
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Version B
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50 cursor-pointer transition-all">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-300">
                {fileB ? fileB.name : 'Choose CSV file'}
              </span>
              {fileB && (
                <span className="text-xs text-slate-500">
                  {(fileB.size / 1024).toFixed(1)} KB
                </span>
              )}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileB}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <button
            onClick={handleCompare}
            disabled={!fileA || !fileB || processing}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {processing ? 'Comparing...' : 'Compare CSVs'}
            </span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {diff && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
                <p className="text-2xl font-semibold text-green-400 font-mono">
                  {diff.addedRows.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">Rows added</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
                <p className="text-2xl font-semibold text-red-400 font-mono">
                  {diff.removedRows.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">Rows removed</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
                <p className="text-2xl font-semibold text-amber-400 font-mono">
                  {totalChangedCells}
                </p>
                <p className="text-xs text-slate-400 mt-1">Cells changed</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
                <p className="text-2xl font-semibold text-slate-300 font-mono">
                  {diff.unchangedRows.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">Rows unchanged</p>
              </div>
            </div>

            {(diff.addedRows.length > 0 ||
              diff.removedRows.length > 0 ||
              diff.changedRows.length > 0) && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-auto max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 bg-slate-800 sticky top-0">
                          Status
                        </th>
                        {diff.headers.map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-xs font-medium text-slate-400 bg-slate-800 sticky top-0 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {diff.removedRows.map((row, idx) => (
                        <tr
                          key={`removed-${idx}`}
                          className="bg-red-500/10 border-b border-slate-800"
                        >
                          <td className="px-3 py-1.5 text-red-400 text-xs font-medium whitespace-nowrap">
                            Removed
                          </td>
                          {diff.headers.map((h) => (
                            <td
                              key={h}
                              className="px-3 py-1.5 text-red-300 text-xs font-mono whitespace-nowrap"
                            >
                              {row[h] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {diff.addedRows.map((row, idx) => (
                        <tr
                          key={`added-${idx}`}
                          className="bg-green-500/10 border-b border-slate-800"
                        >
                          <td className="px-3 py-1.5 text-green-400 text-xs font-medium whitespace-nowrap">
                            Added
                          </td>
                          {diff.headers.map((h) => (
                            <td
                              key={h}
                              className="px-3 py-1.5 text-green-300 text-xs font-mono whitespace-nowrap"
                            >
                              {row[h] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {diff.changedRows.map((change, idx) => (
                        <tr
                          key={`changed-${idx}`}
                          className="border-b border-slate-800"
                        >
                          <td className="px-3 py-1.5 text-amber-400 text-xs font-medium whitespace-nowrap">
                            Changed
                          </td>
                          {diff.headers.map((h) => {
                            const isChanged = change.changedCols.includes(h);
                            return (
                              <td
                                key={h}
                                className={`px-3 py-1.5 text-xs font-mono whitespace-nowrap ${
                                  isChanged
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'text-slate-300'
                                }`}
                              >
                                {isChanged ? (
                                  <span className="flex items-center gap-1">
                                    <span className="line-through text-red-400/70">
                                      {change.old[h] ?? ''}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span>{change.new[h] ?? ''}</span>
                                  </span>
                                ) : (
                                  change.new[h] ?? ''
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {diff.addedRows.length === 0 &&
              diff.removedRows.length === 0 &&
              diff.changedRows.length === 0 && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
                  <p className="text-slate-400 text-sm">
                    No differences found between the two CSV files.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </ToolPage>
  );
}
