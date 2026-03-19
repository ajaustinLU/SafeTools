import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';

interface MetadataItem {
  label: string;
  value: string;
  category: 'gps' | 'camera' | 'datetime' | 'software' | 'other';
}

/** Extract readable metadata from JPEG EXIF APP1 segment. */
function parseExifMetadata(buffer: ArrayBuffer): MetadataItem[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const items: MetadataItem[] = [];

  if (view.byteLength < 4) return items;
  // Verify JPEG SOI marker
  if (view.getUint16(0) !== 0xffd8) return items;

  // Find all APP1 (0xFFE1) segments
  let offset = 2;
  const exifSegments: { start: number; length: number }[] = [];

  while (offset < view.byteLength - 1) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break;
    if (offset + 2 >= view.byteLength) break;
    const segmentLength = view.getUint16(offset + 2);

    if (marker === 0xffe1) {
      exifSegments.push({ start: offset, length: segmentLength + 2 });
    }

    // Stop at SOS marker (start of image data)
    if (marker === 0xffda) break;

    offset += 2 + segmentLength;
  }

  if (exifSegments.length === 0) return items;

  // Decode the EXIF segment(s) as text and search for readable strings
  for (const seg of exifSegments) {
    const segBytes = bytes.slice(seg.start, seg.start + seg.length);
    const segText = decodeExifBytesAsText(segBytes);

    // Detect GPS data: look for GPS IFD pointer or GPS-related ASCII
    if (hasGpsData(segBytes, segText)) {
      items.push({
        label: 'GPS Location',
        value: extractGpsHint(segBytes, segText),
        category: 'gps',
      });
    }

    // Detect camera make
    const make = extractAsciiTag(segBytes, segText, /\b(Canon|Nikon|Sony|Apple|Samsung|Google|Fujifilm|Olympus|Panasonic|Leica|Hasselblad|DJI|GoPro|OnePlus|Xiaomi|Huawei|LG|Motorola|RICOH|Pentax|Sigma)\b/i);
    if (make) {
      items.push({ label: 'Camera Make', value: make, category: 'camera' });
    }

    // Detect camera model: look for common model string patterns
    const model = extractModelString(segText);
    if (model && model !== make) {
      items.push({ label: 'Camera Model', value: model, category: 'camera' });
    }

    // Detect datetime strings (YYYY:MM:DD HH:MM:SS format used in EXIF)
    const dates = extractDates(segText);
    if (dates.length > 0) {
      // Deduplicate dates
      const unique = [...new Set(dates)];
      unique.forEach((d, i) => {
        const label = i === 0 ? 'Date/Time Original' : i === 1 ? 'Date/Time Digitized' : `Date/Time (${i + 1})`;
        items.push({ label, value: d, category: 'datetime' });
      });
    }

    // Detect software
    const software = extractSoftware(segText);
    if (software) {
      items.push({ label: 'Software', value: software, category: 'software' });
    }

    // Detect image description or user comment
    const desc = extractDescription(segText);
    if (desc) {
      items.push({ label: 'Description/Comment', value: desc, category: 'other' });
    }
  }

  // Check for XMP data (APP1 with XMP namespace)
  if (hasXmpData(bytes)) {
    items.push({ label: 'XMP Metadata', value: 'XMP packet detected', category: 'other' });
  }

  // Check for IPTC data (APP13 marker 0xFFED)
  if (hasIptcData(bytes)) {
    items.push({ label: 'IPTC Metadata', value: 'IPTC data detected', category: 'other' });
  }

  // If we found an EXIF segment but no specific items, note that EXIF is present
  if (items.length === 0 && exifSegments.length > 0) {
    items.push({ label: 'EXIF Data', value: 'EXIF header present (details could not be parsed)', category: 'other' });
  }

  return items;
}

function decodeExifBytesAsText(segBytes: Uint8Array): string {
  // Decode as latin-1 to preserve all byte values as characters
  let text = '';
  for (let i = 0; i < segBytes.length; i++) {
    const c = segBytes[i];
    text += (c >= 32 && c <= 126) ? String.fromCharCode(c) : ' ';
  }
  return text;
}

function hasGpsData(segBytes: Uint8Array, _segText: string): boolean {
  // GPS IFD uses tag 0x8825. Also look for "GPS" in the decoded text.
  // Search for GPS tag bytes in TIFF structure
  for (let i = 0; i < segBytes.length - 3; i++) {
    // GPS IFD pointer tag: 0x8825 (big-endian) or 0x2588 (little-endian)
    if ((segBytes[i] === 0x88 && segBytes[i + 1] === 0x25) ||
        (segBytes[i] === 0x25 && segBytes[i + 1] === 0x88)) {
      // Check if the value (4 bytes later) is non-zero, meaning GPS IFD exists
      if (i + 5 < segBytes.length) {
        const hasOffset = segBytes[i + 4] !== 0 || segBytes[i + 5] !== 0 ||
                          (i + 7 < segBytes.length && (segBytes[i + 6] !== 0 || segBytes[i + 7] !== 0));
        if (hasOffset) return true;
      }
    }
  }
  return false;
}

function extractGpsHint(segBytes: Uint8Array, _segText: string): string {
  // Try to find GPS coordinate references (N/S/E/W markers)
  for (let i = 0; i < segBytes.length - 1; i++) {
    // GPS latitude ref is typically 'N' or 'S', longitude ref 'E' or 'W'
    // These appear as single ASCII chars followed by null
    if ((segBytes[i] === 0x4E || segBytes[i] === 0x53) && segBytes[i + 1] === 0x00) {
      // Found N or S, check if E or W is nearby
      for (let j = i + 2; j < Math.min(i + 40, segBytes.length - 1); j++) {
        if ((segBytes[j] === 0x45 || segBytes[j] === 0x57) && segBytes[j + 1] === 0x00) {
          const latRef = String.fromCharCode(segBytes[i]);
          const lonRef = String.fromCharCode(segBytes[j]);
          return `GPS coordinates present (${latRef}/${lonRef})`;
        }
      }
    }
  }
  return 'GPS IFD present (coordinates embedded)';
}

function extractAsciiTag(_segBytes: Uint8Array, segText: string, pattern: RegExp): string | null {
  const match = segText.match(pattern);
  return match ? match[0] : null;
}

function extractModelString(segText: string): string | null {
  // Look for common camera model patterns
  const patterns = [
    /iPhone \d+[\w ]*(?:Pro|Max|Plus|Mini)?/i,
    /Pixel \d+[\w ]*(?:Pro|a|XL)?/i,
    /Galaxy S\d+[\w ]*/i,
    /Galaxy Note\d+[\w ]*/i,
    /Canon EOS[\w\- ]+/i,
    /NIKON [DZ]\d+[\w ]*/i,
    /ILCE-\d+[\w ]*/i,
    /DSC-[\w]+/i,
    /SM-[\w]+/i,
    /FC\d{4}/i,
    /HERO\d+/i,
    /FinePix[\w ]+/i,
    /E-M\d+[\w ]*/i,
    /DMC-[\w]+/i,
    /X-T\d+/i,
    /X100[\w]*/i,
    /GR III[\w ]*/i,
  ];
  for (const p of patterns) {
    const match = segText.match(p);
    if (match) return match[0].trim();
  }
  return null;
}

function extractDates(segText: string): string[] {
  // EXIF dates are in format YYYY:MM:DD HH:MM:SS
  const datePattern = /\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/g;
  const matches = segText.match(datePattern);
  return matches || [];
}

function extractSoftware(segText: string): string | null {
  const patterns = [
    /Adobe Photoshop[\w .]+/i,
    /Adobe Lightroom[\w .]+/i,
    /GIMP[\w .]+/i,
    /Snapseed[\w .]*/i,
    /Photos \d+\.\d+/i,
    /Windows Photo[\w .]*/i,
    /Ver\.\d+\.\d+/i,
    /HDR[+ ]\d+[\w .]*/i,
  ];
  for (const p of patterns) {
    const match = segText.match(p);
    if (match) return match[0].trim();
  }
  // Generic: look for version-like strings after common software keywords
  const generic = segText.match(/(?:Software|Editor|Processed)[\s:]+([A-Za-z][\w .]{2,30})/i);
  if (generic) return generic[1].trim();
  return null;
}

function extractDescription(segText: string): string | null {
  // Look for readable multi-word strings that might be descriptions
  // This is a heuristic - look for longer readable strings
  const descMatch = segText.match(/(?:Description|Comment|Title)[\s:]+([A-Za-z][\w .,!?'-]{5,80})/i);
  if (descMatch) return descMatch[1].trim();
  return null;
}

function hasXmpData(bytes: Uint8Array): boolean {
  // XMP data is in APP1 with "http://ns.adobe.com/xap/1.0/" identifier
  const xmpSig = 'http://ns.adobe.com/xap';
  const text = decodeExifBytesAsText(bytes.slice(0, Math.min(bytes.length, 65536)));
  return text.includes(xmpSig);
}

function hasIptcData(bytes: Uint8Array): boolean {
  // IPTC is in APP13 (0xFFED)
  let offset = 2;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset < view.byteLength - 1) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break;
    if (marker === 0xffed) return true;
    if (marker === 0xffda) break;
    if (offset + 2 >= view.byteLength) break;
    const segmentLength = view.getUint16(offset + 2);
    offset += 2 + segmentLength;
  }
  return false;
}

const CATEGORY_COLORS: Record<MetadataItem['category'], string> = {
  gps: 'text-red-400',
  camera: 'text-blue-400',
  datetime: 'text-amber-400',
  software: 'text-purple-400',
  other: 'text-slate-400',
};

const CATEGORY_LABELS: Record<MetadataItem['category'], string> = {
  gps: 'Location',
  camera: 'Device',
  datetime: 'Date/Time',
  software: 'Software',
  other: 'Other',
};

export default function StripExif() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [exifDetected, setExifDetected] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cleanBlob, setCleanBlob] = useState<Blob | null>(null);
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [stripped, setStripped] = useState(false);
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
    async (files: File[]) => {
      if (files.length === 0) return;
      const f = files[0];
      setFile(f);
      setPreviewUrl(createObjectURL(f));
      setCleanBlob(null);
      setCleanUrl(null);
      setStripped(false);

      // Parse EXIF metadata
      const buffer = await f.arrayBuffer();
      const items = parseExifMetadata(buffer);
      setMetadata(items);
      setExifDetected(items.length > 0);
    },
    [createObjectURL]
  );

  const handleStrip = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
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

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Strip failed'))),
          mimeType,
          0.95
        );
      });

      setCleanBlob(blob);
      setCleanUrl(createObjectURL(blob));
      setStripped(true);
    } finally {
      setProcessing(false);
    }
  }, [file, createObjectURL]);

  const handleDownload = useCallback(() => {
    if (!cleanBlob || !file) return;
    downloadBlob(cleanBlob, toolFileName(file.name, 'clean'));
  }, [cleanBlob, file]);

  return (
    <ToolPage
      toolId="strip-exif"
      howItWorks="Removes all metadata from images by re-drawing them through the Canvas API. This strips EXIF data including GPS coordinates, camera info, and timestamps."
    >
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-medium">Privacy Notice</p>
            <p className="mt-1 text-amber-200/80">
              Photos taken with smartphones and cameras often contain hidden GPS coordinates,
              device information, and timestamps in their EXIF metadata. Stripping this data
              before sharing images online helps protect your location privacy.
            </p>
          </div>
        </div>

        {!file && (
          <DropZone
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            onFiles={handleFile}
          />
        )}

        {file && (
          <>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-sm text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                </div>
              </div>

              {/* Metadata Found Table */}
              {exifDetected !== null && (
                <div className="space-y-2">
                  {metadata.length > 0 ? (
                    <div className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
                      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-300">
                          Metadata Found ({metadata.length} item{metadata.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-left px-3 py-1.5 text-xs text-slate-500 font-medium">Category</th>
                            <th className="text-left px-3 py-1.5 text-xs text-slate-500 font-medium">Field</th>
                            <th className="text-left px-3 py-1.5 text-xs text-slate-500 font-medium">
                              {stripped ? 'Status' : 'Value'}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {metadata.map((item, i) => (
                            <tr key={i} className="border-b border-slate-700/30 last:border-0">
                              <td className="px-3 py-1.5">
                                <span className={`text-xs font-medium ${CATEGORY_COLORS[item.category]}`}>
                                  {CATEGORY_LABELS[item.category]}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-xs text-slate-300">{item.label}</td>
                              <td className="px-3 py-1.5 text-xs">
                                {stripped ? (
                                  <span className="flex items-center gap-1 text-green-400">
                                    <CheckCircle className="w-3 h-3" />
                                    Removed
                                  </span>
                                ) : (
                                  <span className={`font-mono ${item.category === 'gps' ? 'text-red-300' : 'text-slate-400'}`}>
                                    {item.value}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm px-3 py-2 rounded-lg bg-slate-700/50 text-slate-400 border border-slate-600">
                      No EXIF metadata found in this image
                    </div>
                  )}
                </div>
              )}

              {/* Stripped confirmation banner */}
              {stripped && metadata.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">
                    All {metadata.length} metadata item{metadata.length !== 1 ? 's' : ''} successfully removed
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleStrip}
                  disabled={processing}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {processing ? 'Stripping metadata...' : 'Strip Metadata'}
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setExifDetected(null);
                    setMetadata([]);
                    setCleanBlob(null);
                    setCleanUrl(null);
                    setStripped(false);
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
                <p className="text-xs text-slate-400">Size: {formatBytes(file.size)}</p>
              </div>

              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
                <h3 className="text-sm font-medium text-slate-300">Clean</h3>
                {cleanUrl ? (
                  <>
                    <img
                      src={cleanUrl}
                      alt="Clean"
                      className="w-full rounded-lg object-contain max-h-64"
                    />
                    <p className="text-xs text-slate-400">
                      Size: {cleanBlob && formatBytes(cleanBlob.size)}
                    </p>
                    {cleanBlob && (
                      <p className="text-xs text-cyan-400">
                        {file.size > cleanBlob.size
                          ? `Reduced by ${formatBytes(file.size - cleanBlob.size)}`
                          : `Size changed by +${formatBytes(cleanBlob.size - file.size)}`}
                      </p>
                    )}
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download Clean Image
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
                    {processing ? 'Processing...' : 'Click Strip Metadata to clean image'}
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
