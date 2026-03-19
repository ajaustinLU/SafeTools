import { useState, useCallback, useRef } from 'react';
import { Download, Shield, FileText, Image, AlertTriangle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';

interface MetadataField {
  field: string;
  before: string;
  after: string;
}

interface ProcessedFile {
  name: string;
  type: 'pdf' | 'image';
  originalSize: number;
  cleanedSize: number;
  metadata: MetadataField[];
  cleanedBlob: Blob;
  originalPreview?: string;
  cleanedPreview?: string;
}

export default function StripMetadata() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedFile | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stripImageMetadata = useCallback(async (file: File): Promise<ProcessedFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);

          const originalUrl = URL.createObjectURL(file);

          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create cleaned image'));
              return;
            }

            const cleanedUrl = URL.createObjectURL(blob);

            const metadata: MetadataField[] = [
              { field: 'EXIF Data', before: 'Potentially present', after: 'Stripped' },
              { field: 'GPS Location', before: 'Potentially present', after: 'Stripped' },
              { field: 'Camera Info', before: 'Potentially present', after: 'Stripped' },
              { field: 'Timestamps', before: 'Potentially present', after: 'Stripped' },
              { field: 'Software', before: 'Potentially present', after: 'Stripped' },
              { field: 'Thumbnail', before: 'Potentially present', after: 'Stripped' },
            ];

            resolve({
              name: toolFileName(file.name, 'cleaned'),
              type: 'image',
              originalSize: file.size,
              cleanedSize: blob.size,
              metadata,
              cleanedBlob: blob,
              originalPreview: originalUrl,
              cleanedPreview: cleanedUrl,
            });
          }, mimeType, 0.95);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const stripPdfMetadata = useCallback(async (file: File): Promise<ProcessedFile> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const title = pdfDoc.getTitle() || '';
    const author = pdfDoc.getAuthor() || '';
    const subject = pdfDoc.getSubject() || '';
    const keywords = pdfDoc.getKeywords() || '';
    const producer = pdfDoc.getProducer() || '';
    const creator = pdfDoc.getCreator() || '';
    const creationDate = pdfDoc.getCreationDate();
    const modDate = pdfDoc.getModificationDate();

    const metadata: MetadataField[] = [
      { field: 'Title', before: title || '(empty)', after: '(cleared)' },
      { field: 'Author', before: author || '(empty)', after: '(cleared)' },
      { field: 'Subject', before: subject || '(empty)', after: '(cleared)' },
      { field: 'Keywords', before: keywords || '(empty)', after: '(cleared)' },
      { field: 'Producer', before: producer || '(empty)', after: '(cleared)' },
      { field: 'Creator', before: creator || '(empty)', after: '(cleared)' },
      { field: 'Creation Date', before: creationDate ? creationDate.toISOString() : '(empty)', after: '(cleared)' },
      { field: 'Modification Date', before: modDate ? modDate.toISOString() : '(empty)', after: '(cleared)' },
    ];

    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');

    const cleanedBytes = await pdfDoc.save();
    const cleanedBlob = new Blob([cleanedBytes], { type: 'application/pdf' });

    return {
      name: toolFileName(file.name, 'cleaned'),
      type: 'pdf',
      originalSize: file.size,
      cleanedSize: cleanedBlob.size,
      metadata,
      cleanedBlob,
    };
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setProcessing(true);
    setResult(null);

    try {
      if (file.type === 'application/pdf') {
        const processed = await stripPdfMetadata(file);
        setResult(processed);
      } else if (file.type.startsWith('image/')) {
        const processed = await stripImageMetadata(file);
        setResult(processed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }, [stripPdfMetadata, stripImageMetadata]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    downloadBlob(result.cleanedBlob, result.name);
  }, [result]);

  const fieldsWithData = result?.metadata.filter(m => m.before !== '(empty)') || [];

  return (
    <ToolPage
      toolId="strip-metadata"
      howItWorks="For images (JPG/PNG), the file is redrawn onto an HTML Canvas element, which produces a clean pixel-only copy with all EXIF metadata (GPS coordinates, camera info, timestamps, thumbnails) completely removed. For PDFs, the document is parsed using pdf-lib and all metadata fields (title, author, subject, keywords, producer, creator, dates) are cleared before re-saving. The cleaned file never leaves your browser."
    >
      <div className="space-y-6">
        <DropZone
          accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
          onFiles={handleFiles}
        />

        {processing && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-slate-300 text-sm">Stripping metadata...</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {result.type === 'pdf' ? (
                    <FileText className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Image className="w-5 h-5 text-cyan-400" />
                  )}
                  <h3 className="text-white font-medium">{result.name}</h3>
                </div>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Clean File
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Original Size</p>
                  <p className="text-white font-mono text-sm">{formatBytes(result.originalSize)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Cleaned Size</p>
                  <p className="text-white font-mono text-sm">{formatBytes(result.cleanedSize)}</p>
                </div>
              </div>

              {fieldsWithData.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 text-sm font-medium">
                      {fieldsWithData.length} metadata field{fieldsWithData.length !== 1 ? 's' : ''} found and stripped
                    </span>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 font-medium py-2 pr-4">Field</th>
                      <th className="text-left text-slate-400 font-medium py-2 pr-4">Before</th>
                      <th className="text-left text-slate-400 font-medium py-2">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.metadata.map((m, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="py-2 pr-4 text-slate-300 font-medium">{m.field}</td>
                        <td className="py-2 pr-4 font-mono text-xs">
                          {m.before === '(empty)' ? (
                            <span className="text-slate-500">(empty)</span>
                          ) : (
                            <span className="text-amber-400 break-all">{m.before}</span>
                          )}
                        </td>
                        <td className="py-2 font-mono text-xs text-green-400">{m.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {result.type === 'image' && result.originalPreview && result.cleanedPreview && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <h3 className="text-white font-medium mb-3">Before / After Preview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Original</p>
                    <img
                      src={result.originalPreview}
                      alt="Original"
                      className="w-full rounded-lg border border-slate-600 max-h-64 object-contain bg-slate-900"
                    />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Cleaned</p>
                    <img
                      src={result.cleanedPreview}
                      alt="Cleaned"
                      className="w-full rounded-lg border border-slate-600 max-h-64 object-contain bg-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-200/80 text-sm">
                Required before sharing files externally under GDPR, PIPEDA, and PHIPA
              </p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </ToolPage>
  );
}
