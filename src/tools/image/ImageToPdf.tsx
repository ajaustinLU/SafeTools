import { useState, useCallback, useRef, useEffect } from 'react';
import { X, FileText, Image as ImageIcon } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, toolFileName } from '../../lib/download';

type PageSize = 'a4' | 'letter';
type Orientation = 'portrait' | 'landscape';

interface UploadedImage {
  file: File;
  url: string;
}

const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

export default function ImageToPdf() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [generating, setGenerating] = useState(false);
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

  const handleFiles = useCallback(
    (files: File[]) => {
      const newImages = files.map((file) => ({
        file,
        url: createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...newImages]);
    },
    [createObjectURL]
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const convertToImageBytes = useCallback(
    async (
      file: File
    ): Promise<{ bytes: Uint8Array; type: 'jpeg' | 'png' }> => {
      if (file.type === 'image/jpeg') {
        const buffer = await file.arrayBuffer();
        return { bytes: new Uint8Array(buffer), type: 'jpeg' };
      }

      if (file.type === 'image/png') {
        const buffer = await file.arrayBuffer();
        return { bytes: new Uint8Array(buffer), type: 'png' };
      }

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

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          'image/png'
        );
      });

      const buffer = await blob.arrayBuffer();
      return { bytes: new Uint8Array(buffer), type: 'png' };
    },
    [createObjectURL]
  );

  const handleGenerate = useCallback(async () => {
    if (images.length === 0) return;
    setGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const dims = PAGE_DIMENSIONS[pageSize];
      const pageWidth = orientation === 'portrait' ? dims.width : dims.height;
      const pageHeight = orientation === 'portrait' ? dims.height : dims.width;
      const margin = 36;

      for (const img of images) {
        const { bytes, type } = await convertToImageBytes(img.file);
        const embedded =
          type === 'jpeg'
            ? await pdfDoc.embedJpg(bytes)
            : await pdfDoc.embedPng(bytes);

        const imgWidth = embedded.width;
        const imgHeight = embedded.height;
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;

        const scaleX = availableWidth / imgWidth;
        const scaleY = availableHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;
        const x = margin + (availableWidth - drawWidth) / 2;
        const y = margin + (availableHeight - drawHeight) / 2;

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embedded, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, toolFileName(images[0].file.name, 'to-pdf', '.pdf'));
    } finally {
      setGenerating(false);
    }
  }, [images, pageSize, orientation, convertToImageBytes]);

  return (
    <ToolPage
      toolId="image-to-pdf"
      howItWorks="Embeds one or more images into a PDF document using pdf-lib. Each image is placed on its own page, scaled to fit while maintaining aspect ratio."
    >
      <div className="space-y-6">
        <DropZone
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          onFiles={handleFiles}
        />

        {images.length > 0 && (
          <>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  {images.length} image{images.length !== 1 ? 's' : ''} selected
                </h3>
                <button
                  onClick={() => setImages([])}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img.url}
                      alt={img.file.name}
                      className="w-full aspect-square object-cover rounded-lg border border-slate-600"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-slate-900/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <p className="mt-1 text-xs text-slate-500 truncate">{img.file.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
              <h3 className="text-sm font-medium text-slate-300">PDF Options</h3>

              <div className="flex flex-wrap gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Page Size</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="pageSize"
                        checked={pageSize === 'a4'}
                        onChange={() => setPageSize('a4')}
                        className="accent-cyan-500"
                      />
                      A4
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="pageSize"
                        checked={pageSize === 'letter'}
                        onChange={() => setPageSize('letter')}
                        className="accent-cyan-500"
                      />
                      Letter
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Orientation</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="orientation"
                        checked={orientation === 'portrait'}
                        onChange={() => setOrientation('portrait')}
                        className="accent-cyan-500"
                      />
                      Portrait
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="orientation"
                        checked={orientation === 'landscape'}
                        onChange={() => setOrientation('landscape')}
                        className="accent-cyan-500"
                      />
                      Landscape
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {generating ? 'Generating PDF...' : 'Generate PDF'}
              </span>
            </button>
          </>
        )}
      </div>
    </ToolPage>
  );
}
