import { useState, useCallback } from 'react';
import { ArrowLeftRight, Copy, CheckCircle, Download } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, copyToClipboard } from '../../lib/download';

type Mode = 'csv-to-json' | 'json-to-csv';

interface CsvRow {
  [key: string]: string;
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

function csvEscapeField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

function jsonToCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const headerLine = headers.map(csvEscapeField).join(',');
  const rows = data.map((row) =>
    headers.map((h) => csvEscapeField(String(row[h] ?? ''))).join(',')
  );
  return [headerLine, ...rows].join('\n');
}

export default function CsvJsonConverter() {
  const [mode, setMode] = useState<Mode>('csv-to-json');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('');

  const reset = useCallback(() => {
    setInput('');
    setOutput('');
    setError('');
    setFileName('');
    setCopied(false);
  }, []);

  const handleModeSwitch = useCallback(
    (newMode: Mode) => {
      if (newMode !== mode) {
        setMode(newMode);
        reset();
      }
    },
    [mode, reset]
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const file = files[0];
      setFileName(file.name);
      setError('');
      setOutput('');
      file.text().then((text) => {
        setInput(text);
      });
    },
    []
  );

  const handleConvert = useCallback(() => {
    setError('');
    setOutput('');

    if (mode === 'csv-to-json') {
      try {
        const { headers, rows } = parseCSV(input);
        if (headers.length === 0) {
          setError('CSV appears to be empty or invalid.');
          return;
        }
        setOutput(JSON.stringify(rows, null, 2));
      } catch {
        setError('Failed to parse CSV. Please check the format.');
      }
    } else {
      try {
        const parsed = JSON.parse(input);
        if (!Array.isArray(parsed)) {
          setError('JSON must be an array of objects.');
          return;
        }
        if (parsed.length === 0) {
          setError('JSON array is empty.');
          return;
        }
        if (typeof parsed[0] !== 'object' || parsed[0] === null) {
          setError('JSON must be an array of objects.');
          return;
        }
        setOutput(jsonToCsv(parsed));
      } catch {
        setError('Failed to parse JSON. Please check the format.');
      }
    }
  }, [mode, input]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await copyToClipboard(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleDownload = useCallback(() => {
    if (!output) return;
    if (mode === 'csv-to-json') {
      const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'converted';
      const blob = new Blob([output], { type: 'application/json' });
      downloadBlob(blob, `${baseName}.json`);
    } else {
      const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'converted';
      const blob = new Blob([output], { type: 'text/csv' });
      downloadBlob(blob, `${baseName}.csv`);
    }
  }, [output, mode, fileName]);

  const acceptTypes = mode === 'csv-to-json' ? '.csv,text/csv,.txt' : '.json,application/json';

  return (
    <ToolPage
      toolId="csv-json-converter"
      howItWorks="CSV is parsed using a custom state-machine parser that correctly handles quoted fields, commas within quoted values, escaped double quotes, and newlines inside quotes. The first row is used as column headers. JSON-to-CSV conversion extracts keys from the first object as headers and properly quotes fields that contain commas, quotes, or newlines. Everything runs locally in your browser."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-1 inline-flex">
          <button
            onClick={() => handleModeSwitch('csv-to-json')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'csv-to-json'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CSV to JSON
          </button>
          <button
            onClick={() => handleModeSwitch('json-to-csv')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'json-to-csv'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON to CSV
          </button>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <label className="block text-slate-300 text-sm font-medium mb-3">
            Upload File
          </label>
          <DropZone
            onFiles={handleFiles}
            accept={acceptTypes}
            label={
              mode === 'csv-to-json'
                ? 'Drop a CSV file here or click to browse'
                : 'Drop a JSON file here or click to browse'
            }
            sublabel={fileName ? `Loaded: ${fileName}` : undefined}
          />
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            {mode === 'csv-to-json' ? 'CSV Input' : 'JSON Input'}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'csv-to-json'
                ? 'name,email,age\nAlice,alice@example.com,30\nBob,bob@example.com,25'
                : '[{"name": "Alice", "email": "alice@example.com", "age": 30}]'
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600 min-h-[200px]"
          />
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <button
            onClick={handleConvert}
            disabled={!input.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              Convert
            </span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {output && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-300 text-sm font-medium">
                {mode === 'csv-to-json' ? 'JSON Output' : 'CSV Output'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    {copied ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download {mode === 'csv-to-json' ? '.json' : '.csv'}
                  </span>
                </button>
              </div>
            </div>
            <pre className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono overflow-auto max-h-[400px] whitespace-pre">
              {output}
            </pre>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
