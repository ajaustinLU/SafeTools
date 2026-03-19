import { useState, useCallback } from 'react';
import { Images, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface ExtractedImage {
  dataUrl: string;
  pageNumber: number;
  blob: Blob;
}

export default function ExtractImagesPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  const handleFiles = useCallback((acceptedFiles: File[]) => {
    setError('');
    setImages([]);
    const pdfFile = acceptedFiles[0];
    if (!pdfFile) return;
    setFile(pdfFile);
  }, []);

  const extractImages = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setError('');
    setImages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      setProgress({ current: 0, total: totalPages });

      const extracted: ExtractedImage[] = [];
      const scale = 2;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context.');

        await page.render({ canvasContext: context, viewport }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Failed to create image blob.'))),
            'image/png'
          );
        });

        const dataUrl = canvas.toDataURL('image/png');

        extracted.push({
          dataUrl,
          pageNumber: i,
          blob,
        });

        setProgress({ current: i, total: totalPages });
      }

      setImages(extracted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract images from PDF.');
    } finally {
      setProcessing(false);
    }
  }, [file]);

  const downloadAll = useCallback(async () => {
    if (images.length === 0) return;

    try {
      const zip = new JSZip();

      images.forEach((img) => {
        zip.file(`page-${img.pageNumber}.png`, img.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, toolFileName(file!.name, 'images', '.zip'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ZIP file.');
    }
  }, [images]);

  const reset = useCallback(() => {
    setFile(null);
    setImages([]);
    setError('');
    setProgress({ current: 0, total: 0 });
  }, []);

  return (
    <ToolPage
      toolId="extract-images-pdf"
      howItWorks="Upload a PDF and each page is rendered as a high-resolution PNG image using pdf.js. The pages are rendered at 2x scale for crisp output. All extracted images are bundled into a ZIP file for download. Everything runs in your browser — no files are uploaded to any server."
    >
      <div className="space-y-6">
        {!file ? (
          <DropZone accept=".pdf" onFiles={handleFiles} label="Drop a PDF file here or click to browse" />
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Change file
              </button>
            </div>

            {images.length === 0 && !processing && (
              <button
                onClick={extractImages}
                disabled={processing}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                <Images className="w-4 h-4 inline mr-1" />
                Extract Images
              </button>
            )}

            {processing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Rendering pages...</span>
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {images.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-300">
                    {images.length} page{images.length !== 1 ? 's' : ''} extracted
                  </p>
                  <button
                    onClick={downloadAll}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    Download ZIP
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((img) => (
                    <div
                      key={img.pageNumber}
                      className="bg-slate-800/50 rounded-xl border border-slate-700 p-2 space-y-2"
                    >
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNumber}`}
                        className="w-full rounded-lg border border-slate-600"
                      />
                      <p className="text-xs text-slate-400 text-center">Page {img.pageNumber}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPage>
  );
}
