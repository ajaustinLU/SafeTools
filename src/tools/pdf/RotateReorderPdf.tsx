import { useState, useCallback, useRef } from 'react';
import { RotateCw, ArrowUp, ArrowDown } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';
import { renderPdfThumbnails } from '../../lib/pdf-thumbnails';

interface PageInfo {
  originalIndex: number;
  rotation: number;
  thumbnail: string | null;
}

export default function RotateReorderPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError('');
      const pdfFile = acceptedFiles[0];
      if (!pdfFile) return;

      setLoading(true);

      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const thumbnails = await renderPdfThumbnails(arrayBuffer, 280);

        const pageInfos: PageInfo[] = thumbnails.map((thumb, i) => ({
          originalIndex: i,
          rotation: 0,
          thumbnail: thumb,
        }));

        setFile(pdfFile);
        setPdfData(arrayBuffer);
        setPages(pageInfos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const rotatePage = useCallback((index: number) => {
    setPages((prev) =>
      prev.map((page, i) =>
        i === index ? { ...page, rotation: (page.rotation + 90) % 360 } : page
      )
    );
  }, []);

  const movePage = useCallback((index: number, direction: 'up' | 'down') => {
    setPages((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }, []);

  const applyChanges = useCallback(async () => {
    if (!pdfData) return;

    setProcessing(true);
    setError('');

    try {
      const sourcePdf = await PDFDocument.load(pdfData);
      const newPdf = await PDFDocument.create();

      const indices = pages.map((p) => p.originalIndex);
      const copiedPages = await newPdf.copyPages(sourcePdf, indices);

      copiedPages.forEach((copiedPage, i) => {
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees(currentRotation + pages[i].rotation));
        newPdf.addPage(copiedPage);
      });

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, toolFileName(file!.name, 'reordered'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes.');
    } finally {
      setProcessing(false);
    }
  }, [pdfData, pages]);

  const reset = useCallback(() => {
    setFile(null);
    setPdfData(null);
    setPages([]);
    setError('');
  }, []);

  return (
    <ToolPage
      toolId="rotate-reorder-pdf"
      howItWorks="Upload a PDF to see page thumbnails. Rotate individual pages in 90-degree increments and reorder them by moving pages up or down. Apply your changes to generate a new PDF. All processing is done locally in your browser using pdf-lib and pdfjs-dist."
    >
      <div className="space-y-6">
        {!file ? (
          <>
            <DropZone accept=".pdf" onFiles={handleDrop} label="Drop a PDF file here or click to browse" />
            {loading && (
              <p className="text-sm text-slate-400 text-center">Loading PDF and generating thumbnails...</p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {formatBytes(file.size)} &middot; {pages.length} page{pages.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Change file
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {pages.map((page, index) => (
                <div
                  key={`${page.originalIndex}-${index}`}
                  className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex flex-col items-center gap-3"
                >
                  <div className="relative w-full flex justify-center overflow-hidden rounded-lg">
                    {page.thumbnail && (
                      <img
                        src={page.thumbnail}
                        alt={`Page ${index + 1}`}
                        className="w-full h-auto rounded-lg border border-slate-600 bg-white"
                        style={{
                          transform: `rotate(${page.rotation}deg)`,
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    )}
                  </div>
                  <p className="text-sm text-slate-300 font-medium">Page {index + 1}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => movePage(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => movePage(index, 'down')}
                      disabled={index === pages.length - 1}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => rotatePage(index)}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                  {page.rotation > 0 && (
                    <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">{page.rotation}°</span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={applyChanges}
              disabled={processing}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {processing ? 'Applying...' : 'Apply Changes'}
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </ToolPage>
  );
}
