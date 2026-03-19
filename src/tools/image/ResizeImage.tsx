import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';

type ResizeMode = 'pixels' | 'percentage';

export default function ResizeImage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [targetWidth, setTargetWidth] = useState(0);
  const [targetHeight, setTargetHeight] = useState(0);
  const [percentage, setPercentage] = useState(100);
  const [mode, setMode] = useState<ResizeMode>('pixels');
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [resizing, setResizing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);
  const aspectRatioRef = useRef(1);

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
      setResultBlob(null);
      setResultUrl(null);

      const img = new Image();
      const url = createObjectURL(f);
      img.onload = () => {
        setOriginalWidth(img.naturalWidth);
        setOriginalHeight(img.naturalHeight);
        setTargetWidth(img.naturalWidth);
        setTargetHeight(img.naturalHeight);
        aspectRatioRef.current = img.naturalWidth / img.naturalHeight;
      };
      img.src = url;
      setPreviewUrl(url);
    },
    [createObjectURL]
  );

  const handleWidthChange = useCallback(
    (w: number) => {
      setTargetWidth(w);
      if (maintainAspect && w > 0) {
        setTargetHeight(Math.round(w / aspectRatioRef.current));
      }
    },
    [maintainAspect]
  );

  const handleHeightChange = useCallback(
    (h: number) => {
      setTargetHeight(h);
      if (maintainAspect && h > 0) {
        setTargetWidth(Math.round(h * aspectRatioRef.current));
      }
    },
    [maintainAspect]
  );

  const handlePercentageChange = useCallback(
    (pct: number) => {
      setPercentage(pct);
      setTargetWidth(Math.round(originalWidth * (pct / 100)));
      setTargetHeight(Math.round(originalHeight * (pct / 100)));
    },
    [originalWidth, originalHeight]
  );

  const handleResize = useCallback(async () => {
    if (!file) return;
    setResizing(true);
    try {
      const img = new Image();
      const url = createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });

      const finalWidth = mode === 'percentage' ? Math.round(originalWidth * (percentage / 100)) : targetWidth;
      const finalHeight = mode === 'percentage' ? Math.round(originalHeight * (percentage / 100)) : targetHeight;

      const canvas = document.createElement('canvas');
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Resize failed'))),
          mimeType,
          0.92
        );
      });

      setResultBlob(blob);
      setResultUrl(createObjectURL(blob));
    } finally {
      setResizing(false);
    }
  }, [file, mode, percentage, targetWidth, targetHeight, originalWidth, originalHeight, createObjectURL]);

  const handleDownload = useCallback(() => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, toolFileName(file.name, 'resized'));
  }, [resultBlob, file]);

  return (
    <ToolPage
      toolId="resize-image"
      howItWorks="Resizes images using the browser Canvas API. You can specify exact pixel dimensions or a percentage scale, with optional aspect ratio locking."
    >
      <div className="space-y-6">
        {!file && (
          <DropZone accept="image/*" onFiles={handleFile} />
        )}

        {file && (
          <>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Maximize2 className="w-4 h-4 text-cyan-400" />
                <span>
                  Original: {originalWidth} x {originalHeight} ({formatBytes(file.size)})
                </span>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="resizeMode"
                    checked={mode === 'pixels'}
                    onChange={() => setMode('pixels')}
                    className="accent-cyan-500"
                  />
                  Pixels
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="resizeMode"
                    checked={mode === 'percentage'}
                    onChange={() => setMode('percentage')}
                    className="accent-cyan-500"
                  />
                  Percentage
                </label>
              </div>

              {mode === 'pixels' ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintainAspect}
                      onChange={(e) => setMaintainAspect(e.target.checked)}
                      className="accent-cyan-500"
                    />
                    Maintain aspect ratio
                  </label>
                  <div className="flex gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Width (px)</label>
                      <input
                        type="number"
                        min={1}
                        value={targetWidth}
                        onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                        className="block w-32 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Height (px)</label>
                      <input
                        type="number"
                        min={1}
                        value={targetHeight}
                        onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                        className="block w-32 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400">Scale</label>
                    <span className="text-sm font-mono text-cyan-400">{percentage}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={500}
                    step={1}
                    value={percentage}
                    onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <p className="text-xs text-slate-500">
                    Result: {Math.round(originalWidth * (percentage / 100))} x{' '}
                    {Math.round(originalHeight * (percentage / 100))}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleResize}
                  disabled={resizing}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {resizing ? 'Resizing...' : 'Resize'}
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setResultBlob(null);
                    setResultUrl(null);
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
              </div>

              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
                <h3 className="text-sm font-medium text-slate-300">Resized</h3>
                {resultUrl ? (
                  <>
                    <img
                      src={resultUrl}
                      alt="Resized"
                      className="w-full rounded-lg object-contain max-h-64"
                    />
                    <p className="text-xs text-slate-400">
                      {resultBlob && formatBytes(resultBlob.size)}
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
                    {resizing ? 'Resizing...' : 'Set dimensions and click Resize'}
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
