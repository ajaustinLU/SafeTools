import { useState, useCallback } from 'react';
import { Download, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob } from '../../lib/download';

const WIN1252_MAP: Record<number, number> = {
  0x80: 0x20AC, 0x81: 0x0081, 0x82: 0x201A, 0x83: 0x0192,
  0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039,
  0x8C: 0x0152, 0x8D: 0x008D, 0x8E: 0x017D, 0x8F: 0x008F,
  0x90: 0x0090, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
  0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
  0x9C: 0x0153, 0x9D: 0x009D, 0x9E: 0x017E, 0x9F: 0x0178,
};

const GARBLED_PATTERNS: { garbled: string; fixed: string; description: string }[] = [
  { garbled: '\u00C3\u00A9', fixed: '\u00E9', description: 'e with acute accent' },
  { garbled: '\u00C3\u00A8', fixed: '\u00E8', description: 'e with grave accent' },
  { garbled: '\u00C3\u00A0', fixed: '\u00E0', description: 'a with grave accent' },
  { garbled: '\u00C3\u00A2', fixed: '\u00E2', description: 'a with circumflex' },
  { garbled: '\u00C3\u00BC', fixed: '\u00FC', description: 'u with umlaut' },
  { garbled: '\u00C3\u00B6', fixed: '\u00F6', description: 'o with umlaut' },
  { garbled: '\u00C3\u00A4', fixed: '\u00E4', description: 'a with umlaut' },
  { garbled: '\u00C3\u00B1', fixed: '\u00F1', description: 'n with tilde' },
  { garbled: '\u00E2\u0080\u0099', fixed: '\u2019', description: 'right single quote (smart quote)' },
  { garbled: '\u00E2\u0080\u009C', fixed: '\u201C', description: 'left double quote (smart quote)' },
  { garbled: '\u00E2\u0080\u009D', fixed: '\u201D', description: 'right double quote (smart quote)' },
  { garbled: '\u00E2\u0080\u0093', fixed: '\u2013', description: 'en dash' },
  { garbled: '\u00E2\u0080\u0094', fixed: '\u2014', description: 'em dash' },
];

interface AnalysisResult {
  hasUtf8Bom: boolean;
  hasWin1252Bytes: boolean;
  hasGarbledPatterns: boolean;
  detectedPatterns: { garbled: string; fixed: string; description: string; count: number }[];
  previewLines: string[];
  garbledLineIndices: Set<number>;
  rawBytes: Uint8Array;
  decodedAsWin1252: string;
  explanation: string;
}

function decodeWin1252(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte < 0x80) {
      result += String.fromCharCode(byte);
    } else if (WIN1252_MAP[byte] !== undefined) {
      result += String.fromCharCode(WIN1252_MAP[byte]);
    } else {
      result += String.fromCharCode(byte);
    }
  }
  return result;
}

function analyzeFile(buffer: ArrayBuffer): AnalysisResult {
  const bytes = new Uint8Array(buffer);

  const hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;

  let hasWin1252Bytes = false;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] >= 0x80 && bytes[i] <= 0x9F) {
      hasWin1252Bytes = true;
      break;
    }
  }

  const textDecoder = new TextDecoder('utf-8', { fatal: false });
  const textContent = textDecoder.decode(bytes);
  const decodedAsWin1252 = decodeWin1252(bytes);

  const detectedPatterns: AnalysisResult['detectedPatterns'] = [];
  let hasGarbledPatterns = false;

  for (const pattern of GARBLED_PATTERNS) {
    const regex = new RegExp(pattern.garbled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = textContent.match(regex);
    if (matches && matches.length > 0) {
      hasGarbledPatterns = true;
      detectedPatterns.push({
        ...pattern,
        count: matches.length,
      });
    }
  }

  const allLines = textContent.split('\n');
  const previewLines = allLines.slice(0, 20);

  const garbledLineIndices = new Set<number>();
  previewLines.forEach((line, idx) => {
    for (const pattern of GARBLED_PATTERNS) {
      if (line.includes(pattern.garbled)) {
        garbledLineIndices.add(idx);
        break;
      }
    }
    for (let i = 0; i < line.length; i++) {
      const code = line.charCodeAt(i);
      if (code === 0xFFFD) {
        garbledLineIndices.add(idx);
        break;
      }
    }
  });

  let explanation = '';
  if (hasWin1252Bytes && !hasGarbledPatterns) {
    explanation =
      'This file appears to be encoded in Windows-1252 (common on older Windows systems). ' +
      'Some characters in the 0x80-0x9F range are not valid UTF-8, which can cause display issues ' +
      'when the file is opened in modern tools that expect UTF-8. ' +
      'The fixer will re-encode these characters as proper UTF-8.';
  } else if (hasGarbledPatterns) {
    explanation =
      'This file has been through a double-encoding issue. The original accented characters and special symbols ' +
      'were encoded as UTF-8, but then the file was read as if it were Windows-1252 and re-saved as UTF-8 again. ' +
      'This turned single characters like \u00E9 into garbled sequences like \u00C3\u00A9. ' +
      'The fixer will reverse this process and restore the original characters.';
  } else if (hasUtf8Bom) {
    explanation =
      'This file is valid UTF-8 with a BOM (Byte Order Mark). Some tools may not handle the BOM correctly. ' +
      'You can download a clean version without the BOM.';
  } else {
    explanation =
      'This file appears to be valid UTF-8 with no encoding issues detected.';
  }

  return {
    hasUtf8Bom,
    hasWin1252Bytes,
    hasGarbledPatterns,
    detectedPatterns,
    previewLines,
    garbledLineIndices,
    rawBytes: bytes,
    decodedAsWin1252,
    explanation,
  };
}

function fixEncoding(analysis: AnalysisResult): string {
  const { rawBytes, hasWin1252Bytes, hasGarbledPatterns, hasUtf8Bom } = analysis;

  if (hasGarbledPatterns) {
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    let text = textDecoder.decode(rawBytes);
    for (const pattern of GARBLED_PATTERNS) {
      const regex = new RegExp(pattern.garbled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      text = text.replace(regex, pattern.fixed);
    }
    return text;
  }

  if (hasWin1252Bytes) {
    return analysis.decodedAsWin1252;
  }

  if (hasUtf8Bom) {
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const text = textDecoder.decode(rawBytes);
    return text.replace(/^\uFEFF/, '');
  }

  const textDecoder = new TextDecoder('utf-8', { fatal: false });
  return textDecoder.decode(rawBytes);
}

export default function CsvEncodingFixer() {
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fixedContent, setFixedContent] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setFileName(file.name);
    setProcessing(true);
    setAnalysis(null);
    setFixedContent('');

    file.arrayBuffer().then((buffer) => {
      const result = analyzeFile(buffer);
      setAnalysis(result);
      const fixed = fixEncoding(result);
      setFixedContent(fixed);
      setProcessing(false);
    });
  }, []);

  const handleDownload = useCallback(() => {
    if (!fixedContent) return;
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const encoder = new TextEncoder();
    const content = encoder.encode(fixedContent);
    const blob = new Blob([bom, content], { type: 'text/csv;charset=utf-8' });
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, '') : 'fixed';
    downloadBlob(blob, `${baseName}_utf8.csv`);
  }, [fixedContent, fileName]);

  const hasIssues = analysis && (analysis.hasWin1252Bytes || analysis.hasGarbledPatterns || analysis.hasUtf8Bom);

  return (
    <ToolPage
      toolId="csv-encoding-fixer"
      howItWorks="The file is read as raw bytes (ArrayBuffer) and inspected for encoding markers. UTF-8 BOM (EF BB BF) is detected at the start of the file. Windows-1252 encoding is identified by bytes in the 0x80-0x9F range that are invalid in UTF-8. Double-encoding (mojibake) is detected by scanning for known garbled byte patterns like C3 A9 (which should be a single e-acute). The fixer applies the correct decoding: for Windows-1252 files, each byte is mapped to its proper Unicode codepoint; for double-encoded files, the garbled sequences are replaced with the correct characters. The result is saved as clean UTF-8 with a BOM for maximum compatibility. Everything runs locally in your browser."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <label className="block text-slate-300 text-sm font-medium mb-3">
            Upload CSV File
          </label>
          <DropZone
            onFiles={handleFiles}
            accept=".csv,text/csv,.txt"
            label="Drop a CSV file here or click to browse"
            sublabel={fileName ? `Loaded: ${fileName}` : 'Supports .csv and .txt files'}
          />
        </div>

        {processing && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-center">
            <p className="text-slate-300 text-sm">Analyzing file encoding...</p>
          </div>
        )}

        {analysis && (
          <>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="flex items-start gap-3">
                {hasIssues ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="text-slate-200 text-sm font-medium mb-1">
                    {hasIssues ? 'Encoding Issues Detected' : 'No Issues Found'}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {analysis.explanation}
                  </p>
                </div>
              </div>

              {analysis.detectedPatterns.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-slate-300 text-xs font-medium">
                    Garbled patterns found:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.detectedPatterns.map((pattern, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 text-xs"
                      >
                        <span className="text-red-400 font-mono">
                          {pattern.garbled}
                        </span>
                        <span className="text-slate-500">-&gt;</span>
                        <span className="text-green-400 font-mono">
                          {pattern.fixed}
                        </span>
                        <span className="text-slate-500">
                          ({pattern.description}) x{pattern.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className={`px-2 py-1 rounded ${analysis.hasUtf8Bom ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700 text-slate-400'}`}>
                  UTF-8 BOM: {analysis.hasUtf8Bom ? 'Present' : 'Not found'}
                </span>
                <span className={`px-2 py-1 rounded ${analysis.hasWin1252Bytes ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}`}>
                  Windows-1252 bytes: {analysis.hasWin1252Bytes ? 'Detected' : 'None'}
                </span>
                <span className={`px-2 py-1 rounded ${analysis.hasGarbledPatterns ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-400'}`}>
                  Double-encoding: {analysis.hasGarbledPatterns ? 'Detected' : 'None'}
                </span>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <label className="block text-slate-300 text-sm font-medium mb-2">
                File Preview (first 20 lines)
              </label>
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-auto max-h-[300px]">
                <pre className="text-sm font-mono p-3">
                  {analysis.previewLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`py-0.5 ${
                        analysis.garbledLineIndices.has(idx)
                          ? 'bg-amber-500/10'
                          : ''
                      }`}
                    >
                      <span className="text-slate-600 select-none mr-3">
                        {String(idx + 1).padStart(3)}
                      </span>
                      <span
                        className={
                          analysis.garbledLineIndices.has(idx)
                            ? 'text-amber-300'
                            : 'text-slate-300'
                        }
                      >
                        {line}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>

            {hasIssues && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-slate-200 text-sm font-medium">
                      Download Fixed File
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Clean UTF-8 encoded CSV with BOM for maximum compatibility
                    </p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download UTF-8 CSV
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-slate-400 text-xs leading-relaxed">
                  Prevents silent data corruption when sharing datasets across institutions.
                  Encoding mismatches are one of the most common causes of garbled text in CSV files,
                  especially when files are created on Windows and opened on macOS or Linux.
                  This tool detects and fixes these issues so your data stays clean and readable.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </ToolPage>
  );
}
