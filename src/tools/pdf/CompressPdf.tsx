import { useState, useCallback } from 'react';
import { Minimize2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';
import { renderPdfThumbnails } from '../../lib/pdf-thumbnails';

async function loadPdfWithFallback(data: ArrayBuffer) {
  try {
    return await PDFDocument.load(data);
  } catch {
    return await PDFDocument.load(data, { ignoreEncryption: true });
  }
}

export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    setError('');
    setCompressedSize(null);
    setCompressedBlob(null);
    setThumbnail(null);
    const pdfFile = acceptedFiles[0];
    if (!pdfFile) return;
    setFile(pdfFile);
    setOriginalSize(pdfFile.size);

    try {
      const buffer = await pdfFile.arrayBuffer();
      const thumbs = await renderPdfThumbnails(buffer, 200);
      setThumbnail(thumbs[0] || null);
    } catch {
      setThumbnail(null);
    }
  }, []);

  const compress = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setError('');
    setCompressedSize(null);
    setCompressedBlob(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await loadPdfWithFallback(arrayBuffer);

      const compressedBytes = await pdf.save({
        useObjectStreams: true,
      });

      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      setCompressedSize(compressedBytes.length);
      setCompressedBlob(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compress PDF.');
    } finally {
      setProcessing(false);
    }
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!compressedBlob || !file) return;
    downloadBlob(compressedBlob, toolFileName(file.name, 'compressed'));
  }, [compressedBlob, file]);

  const reset = useCallback(() => {
    setFile(null);
    setThumbnail(null);
    setOriginalSize(0);
    setCompressedSize(null);
    setCompressedBlob(null);
    setError('');
  }, []);

  const savings = compressedSize !== null ? originalSize - compressedSize : 0;
  const savingsPercent =
    compressedSize !== null && originalSize > 0
      ? ((savings / originalSize) * 100).toFixed(1)
      : null;

  return (
    <ToolPage
      toolId="compress-pdf"
      howItWorks="Upload a PDF and compress it using object streams to reduce file size. The compression is performed entirely in your browser using pdf-lib. Note that results vary depending on the PDF content — already-optimized files may see minimal reduction."
    >
      <div className="space-y-6">
        {!file ? (
          <DropZone accept=".pdf" onFiles={handleDrop} label="Drop a PDF file here or click to browse" />
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">Original size: {formatBytes(originalSize)}</p>
                </div>
                <button
                  onClick={reset}
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
                >
                  Change file
                </button>
              </div>
              {thumbnail && (
                <div className="flex justify-center">
                  <img
                    src={thumbnail}
                    alt=""
                    className="max-w-xs w-full h-auto object-contain rounded-lg border border-slate-600 bg-white"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {compressedSize !== null && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Original</p>
                    <p className="text-lg font-semibold text-slate-200">
                      {formatBytes(originalSize)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Compressed</p>
                    <p className="text-lg font-semibold text-slate-200">
                      {formatBytes(compressedSize)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Minimize2 className="w-4 h-4 text-cyan-400" />
                  <p className="text-sm text-slate-300">
                    {savings > 0
                      ? `Reduced by ${formatBytes(savings)} (${savingsPercent}%)`
                      : savings === 0
                        ? 'File size unchanged — PDF may already be optimized'
                        : `File size increased by ${formatBytes(Math.abs(savings))} — PDF was already well-optimized`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {!compressedBlob ? (
                <button
                  onClick={compress}
                  disabled={processing}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {processing ? 'Compressing...' : 'Compress'}
                </button>
              ) : (
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  Download Compressed PDF
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
