import { useState, useCallback } from 'react';
import { ArrowUp, ArrowDown, X } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';
import { renderPdfThumbnails } from '../../lib/pdf-thumbnails';

interface PdfFile {
  file: File;
  id: string;
  thumbnail: string | null;
}

async function loadPdfWithFallback(data: ArrayBuffer) {
  try {
    return await PDFDocument.load(data);
  } catch {
    return await PDFDocument.load(data, { ignoreEncryption: true });
  }
}

export default function MergePdf() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    setError('');
    const newFiles: PdfFile[] = [];
    for (const file of acceptedFiles) {
      let thumbnail: string | null = null;
      try {
        const buffer = await file.arrayBuffer();
        const thumbs = await renderPdfThumbnails(buffer, 240);
        thumbnail = thumbs[0] || null;
      } catch {
        thumbnail = null;
      }
      newFiles.push({ file, id: crypto.randomUUID(), thumbnail });
    }
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const moveFile = useCallback((index: number, direction: 'up' | 'down') => {
    setFiles((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }, []);

  const mergePdfs = useCallback(async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const mergedPdf = await PDFDocument.create();

      for (const { file } of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await loadPdfWithFallback(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      downloadBlob(blob, toolFileName(files[0].file.name, 'merged', '.pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge PDFs.');
    } finally {
      setProcessing(false);
    }
  }, [files]);

  return (
    <ToolPage
      toolId="merge-pdf"
      howItWorks="Upload multiple PDF files, reorder them as needed, and merge them into a single PDF document. All processing happens in your browser using pdf-lib — no files are uploaded to any server."
    >
      <div className="space-y-6">
        <DropZone accept=".pdf" multiple onFiles={handleDrop} label="Drop PDF files here or click to browse" />

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((pdfFile, index) => (
              <div
                key={pdfFile.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex items-center gap-3"
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveFile(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveFile(index, 'down')}
                    disabled={index === files.length - 1}
                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {pdfFile.thumbnail && (
                  <img
                    src={pdfFile.thumbnail}
                    alt=""
                    className="w-20 h-auto object-contain rounded border border-slate-600 bg-white flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{pdfFile.file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(pdfFile.file.size)}</p>
                </div>

                <button
                  onClick={() => removeFile(pdfFile.id)}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={mergePdfs}
          disabled={files.length < 2 || processing}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
        >
          {processing ? 'Merging...' : 'Merge PDFs'}
        </button>
      </div>
    </ToolPage>
  );
}
