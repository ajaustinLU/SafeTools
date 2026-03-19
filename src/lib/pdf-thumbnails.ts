import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export async function renderPdfThumbnails(
  data: ArrayBuffer,
  thumbWidth = 300
): Promise<string[]> {
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const thumbs: string[] = [];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const scale = thumbWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    thumbs.push(canvas.toDataURL('image/png'));
  }

  return thumbs;
}

export function getPageCount(data: ArrayBuffer): Promise<number> {
  return pdfjsLib.getDocument({ data }).promise.then((pdf) => pdf.numPages);
}
