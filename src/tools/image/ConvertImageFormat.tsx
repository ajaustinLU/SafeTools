import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';

type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/bmp';

const FORMAT_OPTIONS: { label: string; value: OutputFormat; ext: string }[] = [
  { label: 'PNG', value: 'image/png', ext: 'png' },
  { label: 'JPEG', value: 'image/jpeg', ext: 'jpg' },
  { label: 'WebP', value: 'image/webp', ext: 'webp' },
  { label: 'BMP', value: 'image/bmp', ext: 'bmp' },
];

export default function ConvertImageFormat() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('image/png');
  const [converting, setConverting] = useState(false);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const createObjectURL = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.push(url);
    return url;
  }, []);

  const handleFile = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const f = files[0];
      setFile(f);
      setPreviewUrl(createObjectURL(f));
      setConvertedBlob(null);
      setConvertedUrl(null);
    },
    [createObjectURL]
  );

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setConverting(true);
    try {
      const img = new Image();
      const url = createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const quality = outputFormat === 'image/png' || outputFormat === 'image/bmp' ? undefined : 0.92;
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Conversion failed'))),
          outputFormat,
          quality
        );
      });

      setConvertedBlob(blob);
      setConvertedUrl(createObjectURL(blob));
    } finally {
      setConverting(false);
    }
  }, [file, outputFormat, createObjectURL]);

  const handleDownload = useCallback(() => {
    if (!convertedBlob || !file) return;
    const fmt = FORMAT_OPTIONS.find((f) => f.value === outputFormat);
    const ext = `.${fmt?.ext || 'png'}`;
    downloadBlob(convertedBlob, toolFileName(file.name, 'converted', ext));
  }, [convertedBlob, outputFormat, file]);

  return (
    <ToolPage
      toolId="convert-image"
      howItWorks="Converts images between formats using the browser Canvas API. The image is drawn onto a canvas and exported in the selected format."
    >
      <div className="space-y-6">
        {!file && (
          <DropZone
            accept="image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp"
            onFiles={handleFile}
          />
        )}

        {file && (
          <>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Source</label>
                  <p className="text-sm text-slate-200">
                    {file.name} ({formatBytes(file.size)})
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Convert to</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => {
                      setOutputFormat(e.target.value as OutputFormat);
                      setConvertedBlob(null);
                      setConvertedUrl(null);
                    }}
                    className="block bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {FORMAT_OPTIONS.map((fmt) => (
                      <option key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleConvert}
                  disabled={converting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${converting ? 'animate-spin' : ''}`} />
                    {converting ? 'Converting...' : 'Convert'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setConvertedBlob(null);
                    setConvertedUrl(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
                <h3 className="text-sm font-medium text-slate-300">Original</h3>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Original"
                    className="w-full rounded-lg object-contain max-h-64"
                  />
                )}
                <p className="text-xs text-slate-400">
                  {file.type || 'unknown'} - {formatBytes(file.size)}
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
                <h3 className="text-sm font-medium text-slate-300">Converted</h3>
                {convertedUrl ? (
                  <>
                    <img
                      src={convertedUrl}
                      alt="Converted"
                      className="w-full rounded-lg object-contain max-h-64"
                    />
                    <p className="text-xs text-slate-400">
                      {outputFormat} - {convertedBlob && formatBytes(convertedBlob.size)}
                    </p>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
                    {converting ? 'Converting...' : 'Select format and click Convert'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ToolPage>
  );
}
