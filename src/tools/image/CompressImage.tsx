import { useState, useCallback, useRef, useEffect } from 'react';
import { Download } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';

interface ImageInfo {
  file: File;
  url: string;
  width: number;
  height: number;
}

export default function CompressImage() {
  const [original, setOriginal] = useState<ImageInfo | null>(null);
  const [compressed, setCompressed] = useState<ImageInfo | null>(null);
  const [quality, setQuality] = useState(0.7);
  const [compressing, setCompressing] = useState(false);
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

  const getImageDimensions = useCallback(
    (file: File): Promise<{ width: number; height: number }> => {
      return new Promise((resolve) => {
        const img = new Image();
        const url = createObjectURL(file);
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = url;
      });
    },
    [createObjectURL]
  );

  const handleFile = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const file = files[0];
      const dims = await getImageDimensions(file);
      setOriginal({
        file,
        url: createObjectURL(file),
        width: dims.width,
        height: dims.height,
      });
      setCompressed(null);
    },
    [createObjectURL, getImageDimensions]
  );

  const handleCompress = useCallback(async () => {
    if (!original) return;
    setCompressing(true);
    try {
      const originalSizeMB = original.file.size / (1024 * 1024);

      // Use maxSizeMB as the primary compression lever.
      // Map quality slider to a target file size relative to original.
      // quality 1.0 = re-encode without aggressive compression
      // quality 0.5 = target 50% of original size
      // quality 0.1 = target 10% of original size
      const targetSizeMB = quality >= 1.0
        ? Math.max(originalSizeMB, 1)
        : Math.max(originalSizeMB * quality, 0.01);

      // For lower quality settings, also constrain dimensions
      let maxWidthOrHeight: number | undefined = undefined;
      if (quality < 0.3) {
        maxWidthOrHeight = 1600;
      } else if (quality < 0.5) {
        maxWidthOrHeight = 2048;
      }

      const options: Parameters<typeof imageCompression>[1] = {
        maxSizeMB: targetSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
        fileType: original.file.type as string,
      };

      const result = await imageCompression(original.file, options);
      const dims = await getImageDimensions(result as File);
      setCompressed({
        file: result as File,
        url: createObjectURL(result),
        width: dims.width,
        height: dims.height,
      });
    } finally {
      setCompressing(false);
    }
  }, [original, quality, createObjectURL, getImageDimensions]);

  const handleDownload = useCallback(() => {
    if (!compressed || !original) return;
    downloadBlob(compressed.file, toolFileName(original.file.name, 'compressed'));
  }, [compressed, original]);

  return (
    <ToolPage
      toolId="compress-image"
      howItWorks="Reduces image file size by re-encoding with adjustable quality. Lower quality means smaller files but more compression artifacts."
    >
      <div className="space-y-6">
        {!original && (
          <DropZone
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onFiles={handleFile}
          />
        )}

        {original && (
          <>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-300">Quality</h3>
                <span className="text-sm font-mono text-cyan-400">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Smaller file</span>
                <span>Higher quality</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCompress}
                  disabled={compressing}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {compressing ? 'Compressing...' : 'Compress'}
                </button>
                <button
                  onClick={() => {
                    setOriginal(null);
                    setCompressed(null);
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
                <img
                  src={original.url}
                  alt="Original"
                  className="w-full rounded-lg object-contain max-h-64"
                />
                <div className="text-xs text-slate-400 space-y-1">
                  <p>Size: {formatBytes(original.file.size)}</p>
                  <p>
                    Dimensions: {original.width} x {original.height}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
                <h3 className="text-sm font-medium text-slate-300">Compressed</h3>
                {compressed ? (
                  <>
                    <img
                      src={compressed.url}
                      alt="Compressed"
                      className="w-full rounded-lg object-contain max-h-64"
                    />
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>Size: {formatBytes(compressed.file.size)}</p>
                      <p>
                        Dimensions: {compressed.width} x {compressed.height}
                      </p>
                      <p className="text-cyan-400">
                        Saved:{' '}
                        {formatBytes(original.file.size - compressed.file.size)} (
                        {Math.round(
                          ((original.file.size - compressed.file.size) /
                            original.file.size) *
                            100
                        )}
                        %)
                      </p>
                    </div>
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
                    {compressing ? 'Compressing...' : 'Adjust quality and click Compress'}
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
