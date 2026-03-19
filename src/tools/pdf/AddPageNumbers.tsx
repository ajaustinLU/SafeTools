import { useState, useCallback } from 'react';
import { Hash } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';
import { renderPdfThumbnails } from '../../lib/pdf-thumbnails';

type Position = 'bottom-center' | 'bottom-right' | 'top-right';

async function loadPdfWithFallback(data: ArrayBuffer) {
  try {
    return await PDFDocument.load(data);
  } catch {
    return await PDFDocument.load(data, { ignoreEncryption: true });
  }
}

export default function AddPageNumbers() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [position, setPosition] = useState<Position>('bottom-center');
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(async (acceptedFiles: File[]) => {
    setError('');
    setThumbnails([]);
    const pdfFile = acceptedFiles[0];
    if (!pdfFile) return;

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await loadPdfWithFallback(arrayBuffer);
      setFile(pdfFile);
      setPageCount(pdf.getPageCount());

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

  const addPageNumbers = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await loadPdfWithFallback(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      pages.forEach((page, index) => {
        const { width, height } = page.getSize();
        const pageNum = String(startNumber + index);
        const textWidth = font.widthOfTextAtSize(pageNum, fontSize);

        let x: number;
        let y: number;

        switch (position) {
          case 'bottom-center':
            x = width / 2 - textWidth / 2;
            y = 30;
            break;
          case 'bottom-right':
            x = width - 50;
            y = 30;
            break;
          case 'top-right':
            x = width - 50;
            y = height - 30;
            break;
        }

        page.drawText(pageNum, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, toolFileName(file.name, 'numbered'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add page numbers.');
    } finally {
      setProcessing(false);
    }
  }, [file, position, startNumber, fontSize]);

  const reset = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setThumbnails([]);
    setError('');
  }, []);

  return (
    <ToolPage
      toolId="add-page-numbers"
      howItWorks="Upload a PDF and configure the position, starting number, and font size for page numbers. The tool uses pdf-lib to embed text directly onto each page. All processing happens in your browser — no files are uploaded to any server."
    >
      <div className="space-y-6">
        {!file ? (
          <DropZone accept=".pdf" onFiles={handleFiles} label="Drop a PDF file here or click to browse" />
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
                  {thumbnails.map((thumb, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="rounded-lg border border-slate-600 overflow-hidden bg-white">
                        <img
                          src={thumb}
                          alt={`Page ${i + 1}`}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">Page {i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm text-slate-300">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as Position)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-slate-300">Starting number</label>
                <input
                  type="number"
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
                  min={1}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-slate-300">Font size</label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 12)}
                  min={6}
                  max={72}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={addPageNumbers}
              disabled={processing}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {processing ? 'Adding Numbers...' : (
                <>
                  <Hash className="w-4 h-4 inline mr-1" />
                  Add Page Numbers
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
