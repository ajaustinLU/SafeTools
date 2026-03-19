import { useState, useCallback } from 'react';
import { Hash, Copy, Check, FileDigit, Info } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { formatBytes, copyToClipboard } from '../../lib/download';

interface FileHash {
  name: string;
  size: number;
  sha256: string;
  sha1: string;
  md5: string;
}

function md5(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;

  function toWord(n: number) {
    return n & 0xffffffff;
  }

  function addUnsigned(x: number, y: number) {
    return toWord(x + y);
  }

  function rotateLeft(val: number, bits: number) {
    return toWord((val << bits) | (val >>> (32 - bits)));
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, q), addUnsigned(x, t)), s), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  const bitLen = len * 8;
  const padLen = ((len + 8) >>> 6) + 1;
  const totalWords = padLen * 16;
  const words = new Array(totalWords).fill(0);

  for (let i = 0; i < len; i++) {
    words[i >>> 2] |= bytes[i] << ((i % 4) * 8);
  }
  words[len >>> 2] |= 0x80 << ((len % 4) * 8);
  words[totalWords - 2] = toWord(bitLen);
  words[totalWords - 1] = 0;

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let i = 0; i < totalWords; i += 16) {
    const aa = a, bb = b, cc = c, dd = d;
    const x = words.slice(i, i + 16);

    a = ff(a, b, c, d, x[0], 7, 0xd76aa478);
    d = ff(d, a, b, c, x[1], 12, 0xe8c7b756);
    c = ff(c, d, a, b, x[2], 17, 0x242070db);
    b = ff(b, c, d, a, x[3], 22, 0xc1bdceee);
    a = ff(a, b, c, d, x[4], 7, 0xf57c0faf);
    d = ff(d, a, b, c, x[5], 12, 0x4787c62a);
    c = ff(c, d, a, b, x[6], 17, 0xa8304613);
    b = ff(b, c, d, a, x[7], 22, 0xfd469501);
    a = ff(a, b, c, d, x[8], 7, 0x698098d8);
    d = ff(d, a, b, c, x[9], 12, 0x8b44f7af);
    c = ff(c, d, a, b, x[10], 17, 0xffff5bb1);
    b = ff(b, c, d, a, x[11], 22, 0x895cd7be);
    a = ff(a, b, c, d, x[12], 7, 0x6b901122);
    d = ff(d, a, b, c, x[13], 12, 0xfd987193);
    c = ff(c, d, a, b, x[14], 17, 0xa679438e);
    b = ff(b, c, d, a, x[15], 22, 0x49b40821);

    a = gg(a, b, c, d, x[1], 5, 0xf61e2562);
    d = gg(d, a, b, c, x[6], 9, 0xc040b340);
    c = gg(c, d, a, b, x[11], 14, 0x265e5a51);
    b = gg(b, c, d, a, x[0], 20, 0xe9b6c7aa);
    a = gg(a, b, c, d, x[5], 5, 0xd62f105d);
    d = gg(d, a, b, c, x[10], 9, 0x02441453);
    c = gg(c, d, a, b, x[15], 14, 0xd8a1e681);
    b = gg(b, c, d, a, x[4], 20, 0xe7d3fbc8);
    a = gg(a, b, c, d, x[9], 5, 0x21e1cde6);
    d = gg(d, a, b, c, x[14], 9, 0xc33707d6);
    c = gg(c, d, a, b, x[3], 14, 0xf4d50d87);
    b = gg(b, c, d, a, x[8], 20, 0x455a14ed);
    a = gg(a, b, c, d, x[13], 5, 0xa9e3e905);
    d = gg(d, a, b, c, x[2], 9, 0xfcefa3f8);
    c = gg(c, d, a, b, x[7], 14, 0x676f02d9);
    b = gg(b, c, d, a, x[12], 20, 0x8d2a4c8a);

    a = hh(a, b, c, d, x[5], 4, 0xfffa3942);
    d = hh(d, a, b, c, x[8], 11, 0x8771f681);
    c = hh(c, d, a, b, x[11], 16, 0x6d9d6122);
    b = hh(b, c, d, a, x[14], 23, 0xfde5380c);
    a = hh(a, b, c, d, x[1], 4, 0xa4beea44);
    d = hh(d, a, b, c, x[4], 11, 0x4bdecfa9);
    c = hh(c, d, a, b, x[7], 16, 0xf6bb4b60);
    b = hh(b, c, d, a, x[10], 23, 0xbebfbc70);
    a = hh(a, b, c, d, x[13], 4, 0x289b7ec6);
    d = hh(d, a, b, c, x[0], 11, 0xeaa127fa);
    c = hh(c, d, a, b, x[3], 16, 0xd4ef3085);
    b = hh(b, c, d, a, x[6], 23, 0x04881d05);
    a = hh(a, b, c, d, x[9], 4, 0xd9d4d039);
    d = hh(d, a, b, c, x[12], 11, 0xe6db99e5);
    c = hh(c, d, a, b, x[15], 16, 0x1fa27cf8);
    b = hh(b, c, d, a, x[2], 23, 0xc4ac5665);

    a = ii(a, b, c, d, x[0], 6, 0xf4292244);
    d = ii(d, a, b, c, x[7], 10, 0x432aff97);
    c = ii(c, d, a, b, x[14], 15, 0xab9423a7);
    b = ii(b, c, d, a, x[5], 21, 0xfc93a039);
    a = ii(a, b, c, d, x[12], 6, 0x655b59c3);
    d = ii(d, a, b, c, x[3], 10, 0x8f0ccc92);
    c = ii(c, d, a, b, x[10], 15, 0xffeff47d);
    b = ii(b, c, d, a, x[1], 21, 0x85845dd1);
    a = ii(a, b, c, d, x[8], 6, 0x6fa87e4f);
    d = ii(d, a, b, c, x[15], 10, 0xfe2ce6e0);
    c = ii(c, d, a, b, x[6], 15, 0xa3014314);
    b = ii(b, c, d, a, x[13], 21, 0x4e0811a1);
    a = ii(a, b, c, d, x[4], 6, 0xf7537e82);
    d = ii(d, a, b, c, x[11], 10, 0xbd3af235);
    c = ii(c, d, a, b, x[2], 15, 0x2ad7d2bb);
    b = ii(b, c, d, a, x[9], 21, 0xeb86d391);

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  function wordToHex(w: number) {
    let hex = '';
    for (let i = 0; i < 4; i++) {
      hex += ((w >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    }
    return hex;
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

export default function Sha256Hash() {
  const [hashes, setHashes] = useState<FileHash[]>([]);
  const [processing, setProcessing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const bufferToHex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setProcessing(true);

    try {
      const results: FileHash[] = [];

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();

        const [sha256Buf, sha1Buf] = await Promise.all([
          crypto.subtle.digest('SHA-256', arrayBuffer),
          crypto.subtle.digest('SHA-1', arrayBuffer),
        ]);

        const md5Hash = md5(arrayBuffer);

        results.push({
          name: file.name,
          size: file.size,
          sha256: bufferToHex(sha256Buf),
          sha1: bufferToHex(sha1Buf),
          md5: md5Hash,
        });
      }

      setHashes((prev) => [...prev, ...results]);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleCopy = useCallback(async (text: string, fieldId: string) => {
    await copyToClipboard(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const clearAll = useCallback(() => {
    setHashes([]);
  }, []);

  return (
    <ToolPage
      toolId="sha256-hash"
      howItWorks="Each file is read as an ArrayBuffer in your browser. SHA-256 and SHA-1 are computed using the Web Crypto API (crypto.subtle.digest). MD5 is computed using a pure JavaScript implementation. No file data ever leaves your machine. The resulting hash is a unique fingerprint of the file contents -- even a single bit change produces a completely different hash."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-medium mb-1">File Integrity Verification</h3>
              <p className="text-slate-400 text-sm">
                Generate cryptographic hashes to verify file integrity, detect tampering, and confirm
                that files have not been modified during transfer. Compare hash values to ensure the
                file you received matches the original. Supports SHA-256 (recommended), SHA-1, and
                MD5 algorithms.
              </p>
            </div>
          </div>
        </div>

        <DropZone multiple onFiles={handleFiles} />

        {processing && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-slate-300 text-sm">Computing hashes...</p>
          </div>
        )}

        {hashes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium flex items-center gap-2">
                <FileDigit className="w-5 h-5 text-cyan-400" />
                Hash Results ({hashes.length} file{hashes.length !== 1 ? 's' : ''})
              </h3>
              <button
                onClick={clearAll}
                className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
              >
                Clear All
              </button>
            </div>

            {hashes.map((file, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-cyan-400" />
                    <span className="text-white font-medium text-sm">{file.name}</span>
                  </div>
                  <span className="text-slate-500 text-xs">{formatBytes(file.size)}</span>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'SHA-256', value: file.sha256 },
                    { label: 'SHA-1', value: file.sha1 },
                    { label: 'MD5', value: file.md5 },
                  ].map(({ label, value }) => {
                    const fieldId = `${idx}-${label}`;
                    return (
                      <div key={label} className="bg-slate-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-400 text-xs font-medium">{label}</span>
                          <button
                            onClick={() => handleCopy(value, fieldId)}
                            className="text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            {copiedField === fieldId ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-cyan-300 font-mono text-xs break-all select-all">
                          {value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-200/80 text-sm">
                Standard practice for dataset integrity verification in Data Management Plans (DMPs)
              </p>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
