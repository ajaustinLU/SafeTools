import { useState, useCallback } from 'react';
import { FileSearch, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { formatBytes } from '../../lib/download';

interface Signature {
  name: string;
  extensions: string[];
  check: (bytes: Uint8Array) => boolean;
}

interface TextSignature {
  name: string;
  extensions: string[];
  detect: (ext: string, bytes: Uint8Array, text: string) => boolean;
}

// --- Binary signatures (checked first by magic bytes) ---
const signatures: Signature[] = [
  // Documents
  {
    name: 'PDF',
    extensions: ['pdf'],
    check: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },

  // Images
  {
    name: 'JPEG',
    extensions: ['jpg', 'jpeg'],
    check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    name: 'PNG',
    extensions: ['png'],
    check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    name: 'GIF',
    extensions: ['gif'],
    check: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  },
  {
    name: 'BMP',
    extensions: ['bmp'],
    check: (b) => b[0] === 0x42 && b[1] === 0x4d,
  },
  {
    name: 'WEBP',
    extensions: ['webp'],
    check: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  {
    name: 'ICO',
    extensions: ['ico'],
    check: (b) => b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00,
  },
  {
    name: 'TIFF (Little-Endian)',
    extensions: ['tif', 'tiff'],
    check: (b) => b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00,
  },
  {
    name: 'TIFF (Big-Endian)',
    extensions: ['tif', 'tiff'],
    check: (b) => b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a,
  },
  {
    name: 'PSD (Photoshop)',
    extensions: ['psd'],
    check: (b) => b[0] === 0x38 && b[1] === 0x42 && b[2] === 0x50 && b[3] === 0x53,
  },
  {
    name: 'AVIF',
    extensions: ['avif'],
    check: (b) =>
      b[4] === 0x66 &&
      b[5] === 0x74 &&
      b[6] === 0x79 &&
      b[7] === 0x70 &&
      ((b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66) ||
       (b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x73)),
  },

  // Audio
  {
    name: 'WAV',
    extensions: ['wav'],
    check: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x41 &&
      b[10] === 0x56 &&
      b[11] === 0x45,
  },
  {
    name: 'FLAC',
    extensions: ['flac'],
    check: (b) => b[0] === 0x66 && b[1] === 0x4c && b[2] === 0x61 && b[3] === 0x43,
  },
  {
    name: 'OGG',
    extensions: ['ogg', 'oga', 'ogv', 'opus'],
    check: (b) => b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53,
  },
  {
    name: 'MP3 (ID3)',
    extensions: ['mp3'],
    check: (b) => b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33,
  },
  {
    name: 'MP3 (Sync)',
    extensions: ['mp3'],
    check: (b) =>
      b[0] === 0xff && (b[1] === 0xfb || b[1] === 0xf3 || b[1] === 0xf2),
  },

  // Video / Container
  {
    name: 'MP4',
    extensions: ['mp4', 'm4a', 'm4v'],
    check: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  },

  // Archives
  {
    name: 'ZIP/DOCX/XLSX',
    extensions: ['zip', 'docx', 'xlsx', 'pptx', 'jar', 'apk'],
    check: (b) => b[0] === 0x50 && b[1] === 0x4b,
  },
  {
    name: 'GZIP',
    extensions: ['gz', 'tgz'],
    check: (b) => b[0] === 0x1f && b[1] === 0x8b,
  },
  {
    name: '7-Zip',
    extensions: ['7z'],
    check: (b) => b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf,
  },
  {
    name: 'RAR',
    extensions: ['rar'],
    check: (b) => b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21,
  },

  // Executables / binaries
  {
    name: 'EXE/DLL (PE)',
    extensions: ['exe', 'dll', 'sys', 'scr'],
    check: (b) => b[0] === 0x4d && b[1] === 0x5a,
  },
  {
    name: 'ELF (Linux)',
    extensions: ['elf', 'so', 'o', 'bin'],
    check: (b) => b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46,
  },
  {
    name: 'Mach-O (macOS)',
    extensions: ['dylib', 'app', 'bundle'],
    check: (b) =>
      (b[0] === 0xcf && b[1] === 0xfa && b[2] === 0xed && b[3] === 0xfe) ||
      (b[0] === 0xfe && b[1] === 0xed && b[2] === 0xfa && b[3] === 0xcf),
  },
  {
    name: 'WebAssembly',
    extensions: ['wasm'],
    check: (b) => b[0] === 0x00 && b[1] === 0x61 && b[2] === 0x73 && b[3] === 0x6d,
  },

  // Databases
  {
    name: 'SQLite',
    extensions: ['sqlite', 'db', 'sqlite3'],
    check: (b) =>
      b[0] === 0x53 &&
      b[1] === 0x51 &&
      b[2] === 0x4c &&
      b[3] === 0x69 &&
      b[4] === 0x74 &&
      b[5] === 0x65,
  },
];

// TAR needs special handling: "ustar" at offset 257
function checkTar(fullBytes: Uint8Array): boolean {
  if (fullBytes.length < 263) return false;
  return (
    fullBytes[257] === 0x75 && // u
    fullBytes[258] === 0x73 && // s
    fullBytes[259] === 0x74 && // t
    fullBytes[260] === 0x61 && // a
    fullBytes[261] === 0x72    // r
  );
}

// --- Text/extension-based signatures (checked when no binary match) ---
const textSignatures: TextSignature[] = [
  {
    name: 'SVG',
    extensions: ['svg'],
    detect: (_ext, _bytes, text) =>
      text.trimStart().startsWith('<svg') ||
      text.includes('xmlns="http://www.w3.org/2000/svg"') ||
      text.includes("xmlns='http://www.w3.org/2000/svg'"),
  },
  {
    name: 'HTML',
    extensions: ['html', 'htm'],
    detect: (ext, _bytes, text) => {
      const trimmed = text.trimStart().toLowerCase();
      return (
        trimmed.startsWith('<!doctype html') ||
        trimmed.startsWith('<html') ||
        (['html', 'htm'].includes(ext) && trimmed.startsWith('<'))
      );
    },
  },
  {
    name: 'XML',
    extensions: ['xml', 'xsl', 'xsd', 'xhtml', 'plist'],
    detect: (_ext, _bytes, text) => {
      const trimmed = text.trimStart();
      return trimmed.startsWith('<?xml');
    },
  },
  {
    name: 'JSON',
    extensions: ['json', 'geojson', 'topojson'],
    detect: (ext, _bytes, text) => {
      const trimmed = text.trimStart();
      return (
        (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
        ['json', 'geojson', 'topojson'].includes(ext)
      );
    },
  },
  {
    name: 'Jupyter Notebook',
    extensions: ['ipynb'],
    detect: (ext, _bytes, text) => {
      const trimmed = text.trimStart();
      return ext === 'ipynb' && trimmed.startsWith('{');
    },
  },
  {
    name: 'Markdown',
    extensions: ['md', 'mdx', 'markdown'],
    detect: (ext, _bytes, _text) =>
      ['md', 'mdx', 'markdown'].includes(ext),
  },
  {
    name: 'CSV',
    extensions: ['csv', 'tsv'],
    detect: (ext, _bytes, _text) =>
      ['csv', 'tsv'].includes(ext),
  },
  {
    name: 'Python',
    extensions: ['py', 'pyw', 'pyi'],
    detect: (ext, _bytes, _text) =>
      ['py', 'pyw', 'pyi'].includes(ext),
  },
  {
    name: 'JavaScript',
    extensions: ['js', 'mjs', 'cjs'],
    detect: (ext, _bytes, _text) =>
      ['js', 'mjs', 'cjs'].includes(ext),
  },
  {
    name: 'TypeScript',
    extensions: ['ts', 'tsx', 'mts', 'cts'],
    detect: (ext, _bytes, _text) =>
      ['ts', 'tsx', 'mts', 'cts'].includes(ext),
  },
];

/** Check if bytes appear to be valid UTF-8/ASCII text content */
function isLikelyText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  let printable = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    // Common text bytes: tab, newline, carriage return, printable ASCII
    if (b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e)) {
      printable++;
    } else if (b >= 0x80) {
      // Possible UTF-8 multi-byte, allow it
      printable++;
    } else if (b === 0x00) {
      // Null byte = not text (unless BOM edge case)
      return false;
    }
  }
  return printable / bytes.length > 0.85;
}

interface CheckResult {
  fileName: string;
  fileSize: number;
  fileExtension: string;
  detectedType: string | null;
  detectedExtensions: string[];
  hexDump: string[];
  rawBytes: number[];
  match: 'match' | 'mismatch' | 'unknown';
  isTextFile: boolean;
}

export default function MagicByteChecker() {
  const [result, setResult] = useState<CheckResult | null>(null);

  const getExtension = (name: string): string => {
    const parts = name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];

    // Read more bytes for TAR detection (needs offset 257+)
    const readSize = Math.min(file.size, 512);
    const buffer = await file.slice(0, readSize).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Hex dump of first 32 bytes
    const displayBytes = bytes.slice(0, 32);
    const hexDump: string[] = [];
    const rawBytes: number[] = [];
    for (let i = 0; i < displayBytes.length; i++) {
      hexDump.push(displayBytes[i].toString(16).padStart(2, '0').toUpperCase());
      rawBytes.push(displayBytes[i]);
    }

    const ext = getExtension(file.name);
    let detectedType: string | null = null;
    let detectedExtensions: string[] = [];
    let isTextFile = false;

    // 1. Check binary signatures
    for (const sig of signatures) {
      if (sig.check(bytes)) {
        detectedType = sig.name;
        detectedExtensions = sig.extensions;
        break;
      }
    }

    // 2. Check TAR (special offset)
    if (!detectedType && checkTar(bytes)) {
      detectedType = 'TAR Archive';
      detectedExtensions = ['tar'];
    }

    // 3. If no binary match, check if it looks like text and try text signatures
    if (!detectedType) {
      const textCheck = isLikelyText(displayBytes);
      if (textCheck) {
        isTextFile = true;
        // Decode first chunk as text for content-based detection
        const textBuffer = await file.slice(0, Math.min(file.size, 4096)).arrayBuffer();
        const textBytes = new Uint8Array(textBuffer);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const text = decoder.decode(textBytes);

        for (const tsig of textSignatures) {
          if (tsig.detect(ext, textBytes, text)) {
            detectedType = tsig.name;
            detectedExtensions = tsig.extensions;
            break;
          }
        }

        // If still no match but clearly text, label as plain text
        if (!detectedType) {
          detectedType = 'Plain Text';
          detectedExtensions = ['txt', 'text', 'log'];
        }
      }
    }

    let match: 'match' | 'mismatch' | 'unknown' = 'unknown';
    if (detectedType) {
      match = detectedExtensions.includes(ext) ? 'match' : 'mismatch';
    }

    setResult({
      fileName: file.name,
      fileSize: file.size,
      fileExtension: ext || '(none)',
      detectedType,
      detectedExtensions,
      hexDump,
      rawBytes,
      match,
      isTextFile,
    });
  }, []);

  return (
    <ToolPage
      toolId="magic-byte-checker"
      howItWorks="Every file type has a unique 'magic byte' signature at the start of the file. This tool reads the first bytes of your file and compares them against a database of known file signatures. This reveals the true file type regardless of the file extension, which can be easily renamed or faked. For text-based files without magic bytes, the tool uses extension and content heuristics. The check runs entirely in your browser."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-medium mb-1">Why Check Magic Bytes?</h3>
              <p className="text-slate-400 text-sm">
                File extensions can be faked. This checks what a file actually is at the binary level.
                A file named "document.pdf" could actually be an executable or image. Magic bytes
                reveal the true file type by examining the raw binary header.
              </p>
            </div>
          </div>
        </div>

        <DropZone onFiles={handleFiles} />

        {result && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileSearch className="w-5 h-5 text-cyan-400" />
                <h3 className="text-white font-medium">Analysis Result</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">File Name</p>
                  <p className="text-white text-sm font-medium break-all">{result.fileName}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">File Size</p>
                  <p className="text-white text-sm font-mono">{formatBytes(result.fileSize)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">File Extension</p>
                  <p className="text-white text-sm font-mono">.{result.fileExtension}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Detected Type (Magic Bytes)</p>
                  <p className="text-white text-sm font-medium">
                    {result.detectedType || 'Unknown / Not in database'}
                  </p>
                  {result.isTextFile && result.detectedType && (
                    <p className="text-cyan-500 text-xs mt-1">
                      Detected via content/extension heuristics (text file)
                    </p>
                  )}
                  {result.detectedExtensions.length > 0 && (
                    <p className="text-slate-500 text-xs mt-1">
                      Expected extensions: {result.detectedExtensions.map((e) => `.${e}`).join(', ')}
                    </p>
                  )}
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Verdict</p>
                  <div className="flex items-center gap-2">
                    {result.match === 'match' && (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-medium text-sm">
                          Extension matches file type
                        </span>
                      </>
                    )}
                    {result.match === 'mismatch' && (
                      <>
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 font-medium text-sm">
                          Extension does NOT match file type
                        </span>
                      </>
                    )}
                    {result.match === 'unknown' && (
                      <>
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <span className="text-amber-400 font-medium text-sm">
                          File type not recognized
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {result.match === 'mismatch' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-200/80 text-sm">
                      This file's extension (.{result.fileExtension}) does not match its actual
                      type ({result.detectedType}). The file may have been intentionally renamed
                      to disguise its true format.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-slate-400 text-xs mb-2">Hex Dump (first 32 bytes)</p>
                <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                  <div className="font-mono text-xs leading-relaxed">
                    {/* Hex rows: 16 bytes per row */}
                    {[0, 16].map((rowStart) => {
                      const rowHex = result.hexDump.slice(rowStart, rowStart + 16);
                      const rowRaw = result.rawBytes.slice(rowStart, rowStart + 16);
                      if (rowHex.length === 0) return null;
                      return (
                        <div key={rowStart} className="flex items-start gap-4 mb-1">
                          {/* Offset */}
                          <span className="text-slate-600 w-8 shrink-0">
                            {rowStart.toString(16).padStart(4, '0')}
                          </span>
                          {/* Hex bytes */}
                          <div className="flex gap-x-2 gap-y-0.5 flex-wrap min-w-0" style={{ width: '24rem' }}>
                            {rowHex.map((byte, i) => (
                              <span
                                key={i}
                                className={
                                  rowStart + i < 4
                                    ? 'text-cyan-400 font-bold'
                                    : 'text-slate-400'
                                }
                              >
                                {byte}
                              </span>
                            ))}
                          </div>
                          {/* ASCII dump */}
                          <span className="text-slate-500 shrink-0">|</span>
                          <span className="text-slate-300 whitespace-pre">
                            {rowRaw
                              .map((b) =>
                                b >= 32 && b <= 126
                                  ? String.fromCharCode(b)
                                  : '.'
                              )
                              .join('')}
                          </span>
                          <span className="text-slate-500 shrink-0">|</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
