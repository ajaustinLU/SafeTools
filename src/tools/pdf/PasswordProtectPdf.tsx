import { useState, useCallback } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';
import { renderPdfThumbnails } from '../../lib/pdf-thumbnails';

async function loadPdfWithFallback(data: ArrayBuffer) {
  try {
    return await PDFDocument.load(data);
  } catch {
    return await PDFDocument.load(data, { ignoreEncryption: true });
  }
}

export default function PasswordProtectPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(async (acceptedFiles: File[]) => {
    setError('');
    setThumbnail(null);
    const pdfFile = acceptedFiles[0];
    if (!pdfFile) return;
    setFile(pdfFile);

    try {
      const buffer = await pdfFile.arrayBuffer();
      const thumbs = await renderPdfThumbnails(buffer, 200);
      setThumbnail(thumbs[0] || null);
    } catch {
      setThumbnail(null);
    }
  }, []);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const protectPdf = useCallback(async () => {
    if (!file || !passwordsMatch) return;

    setProcessing(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await loadPdfWithFallback(arrayBuffer);

      pdfDoc.setTitle(pdfDoc.getTitle() || file.name.replace('.pdf', ''));
      pdfDoc.setSubject('Protected document');
      pdfDoc.setProducer('SafeTools');
      pdfDoc.setKeywords(['protected']);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, toolFileName(file.name, 'protected'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDF.');
    } finally {
      setProcessing(false);
    }
  }, [file, password, passwordsMatch]);

  const reset = useCallback(() => {
    setFile(null);
    setThumbnail(null);
    setPassword('');
    setConfirmPassword('');
    setError('');
  }, []);

  return (
    <ToolPage
      toolId="password-protect-pdf"
      howItWorks="Upload a PDF and set a password. The tool adds metadata protection markers to your document. All processing happens in your browser — no files are uploaded to any server."
    >
      <div className="space-y-6">
        {!file ? (
          <DropZone accept=".pdf" onFiles={handleFiles} label="Drop a PDF file here or click to browse" />
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={reset}
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
                >
                  Change file
                </button>
              </div>
              {thumbnail && (
                <div className="flex justify-center">
                  <img
                    src={thumbnail}
                    alt=""
                    className="max-w-xs w-full h-auto object-contain rounded-lg border border-slate-600 bg-white"
                  />
                </div>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-300 space-y-2">
                <p className="font-medium">Browser limitation</p>
                <p className="text-amber-400/80">
                  Browser-based JavaScript cannot create standards-compliant PDF encryption. The PDF specification requires RC4 or AES encryption at the document level, which pdf-lib does not implement. This tool adds metadata protection markers but does not apply real password encryption. For production use requiring actual password protection, use a desktop PDF application such as Adobe Acrobat, LibreOffice, or a server-side tool like qpdf.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-slate-300">Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-sm text-red-400">Passwords do not match.</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={protectPdf}
              disabled={processing || !passwordsMatch}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {processing ? 'Processing...' : (
                <>
                  <Lock className="w-4 h-4 inline mr-1" />
                  Add Protection Markers
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
