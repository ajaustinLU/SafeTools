import { useState, useCallback, useMemo } from 'react';
import { Scissors } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';
import { renderPdfThumbnails } from '../../lib/pdf-thumbnails';

type SplitMode = 'range' | 'all';

function parsePageRange(input: string, maxPages: number): number[] {
  const pages: Set<number> = new Set();
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
        pages.add(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        pages.add(num);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

async function loadPdfWithFallback(data: ArrayBuffer) {
  try {
    return await PDFDocument.load(data);
  } catch {
    return await PDFDocument.load(data, { ignoreEncryption: true });
  }
}

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [mode, setMode] = useState<SplitMode>('range');
  const [rangeInput, setRangeInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const selectedPages = useMemo(
    () => (rangeInput.trim() ? parsePageRange(rangeInput, pageCount) : []),
    [rangeInput, pageCount]
  );

  const selectedSet = useMemo(() => new Set(selectedPages), [selectedPages]);

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    setError('');
    const pdfFile = acceptedFiles[0];
    if (!pdfFile) return;

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await loadPdfWithFallback(arrayBuffer);
      setFile(pdfFile);
      setPageCount(pdf.getPageCount());
      setRangeInput('');

      try {
        const thumbs = await renderPdfThumbnails(arrayBuffer, 240);
        setThumbnails(thumbs);
      } catch {
        setThumbnails([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF.');
    }
  }, []);

  const splitByRange = useCallback(async () => {
    if (!file) return;

    const pages = parsePageRange(rangeInput, pageCount);
    if (pages.length === 0) {
      setError('No valid pages specified. Use format like "1-3, 5, 7-9".');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await loadPdfWithFallback(arrayBuffer);
      const newPdf = await PDFDocument.create();
      const indices = pages.map((p) => p - 1);
      const copiedPages = await newPdf.copyPages(sourcePdf, indices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, toolFileName(file.name, 'split', '.pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF.');
    } finally {
      setProcessing(false);
    }
  }, [file, rangeInput, pageCount]);

  const splitAll = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await loadPdfWithFallback(arrayBuffer);
      const zip = new JSZip();

      for (let i = 0; i < sourcePdf.getPageCount(); i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        zip.file(`page-${i + 1}.pdf`, pdfBytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, toolFileName(file.name, 'split-pages', '.zip'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF.');
    } finally {
      setProcessing(false);
    }
  }, [file]);

  const handleSplit = useCallback(() => {
    if (mode === 'range') {
      splitByRange();
    } else {
      splitAll();
    }
  }, [mode, splitByRange, splitAll]);

  const reset = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setThumbnails([]);
    setRangeInput('');
    setError('');
  }, []);

  return (
    <ToolPage
      toolId="split-pdf"
      howItWorks="Upload a PDF and either extract specific pages by range or split every page into individual PDF files bundled in a ZIP. All processing happens in your browser — no files leave your device."
    >
      <div className="space-y-6">
        {!file ? (
          <DropZone accept=".pdf" onFiles={handleDrop} label="Drop a PDF file here or click to browse" />
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {formatBytes(file.size)} &middot; {pageCount} page{pageCount !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Change file
              </button>
            </div>

            {thumbnails.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <p className="text-xs text-slate-400 mb-3">Page previews</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {thumbnails.map((thumb, i) => {
                    const pageNum = i + 1;
                    const isSelected = mode === 'range' && selectedSet.has(pageNum);
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <div className={`rounded-lg border-2 overflow-hidden bg-white transition-all ${
                          isSelected ? 'border-cyan-400 shadow-lg shadow-cyan-400/20 ring-1 ring-cyan-400/30' : 'border-slate-600'
                        }`}>
                          <img
                            src={thumb}
                            alt={`Page ${pageNum}`}
                            className="w-full h-auto object-contain"
                          />
                        </div>
                        <span className={`text-xs font-medium ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}>
                          Page {pageNum}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setMode('range')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'range'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Page Range
              </button>
              <button
                onClick={() => setMode('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'all'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Split All
              </button>
            </div>

            {mode === 'range' && (
              <div className="space-y-2">
                <label className="block text-sm text-slate-300">
                  Page range (e.g. 1-3, 5, 7-9)
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="1-3, 5, 7-9"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {selectedPages.length > 0 && (
                  <p className="text-xs text-slate-400">
                    {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {mode === 'all' && (
              <p className="text-sm text-slate-400">
                Each page will be saved as an individual PDF and bundled into a ZIP file.
              </p>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSplit}
              disabled={processing || (mode === 'range' && !rangeInput.trim())}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {processing ? 'Splitting...' : (
                <>
                  <Scissors className="w-4 h-4 inline mr-1" />
                  {mode === 'range' ? 'Extract Pages' : 'Split All Pages'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
