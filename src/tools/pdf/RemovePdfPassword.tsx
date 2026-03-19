import { useState, useCallback } from 'react';
import { Unlock, Eye, EyeOff } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';
import { renderPdfThumbnails } from '../../lib/pdf-thumbnails';

export default function RemovePdfPassword() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [unlockedBlob, setUnlockedBlob] = useState<Blob | null>(null);

  const handleFiles = useCallback((acceptedFiles: File[]) => {
    setError('');
    setSuccess(false);
    setThumbnail(null);
    setUnlockedBlob(null);
    const pdfFile = acceptedFiles[0];
    if (!pdfFile) return;
    setFile(pdfFile);
    setPassword('');
  }, []);

  const unlockPdf = useCallback(async () => {
    if (!file || !password) return;

    setProcessing(true);
    setError('');
    setSuccess(false);
    setThumbnail(null);
    setUnlockedBlob(null);

    try {
      const arrayBuffer = await file.arrayBuffer();

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer, {
          password,
        } as any);
      } catch (loadErr) {
        const msg = loadErr instanceof Error ? loadErr.message.toLowerCase() : '';
        if (msg.includes('password') || msg.includes('encrypt') || msg.includes('decrypt')) {
          setError('Incorrect password. The password you entered does not match the document. Please check for typos and try again.');
        } else if (msg.includes('invalid') || msg.includes('corrupt')) {
          setError('This PDF appears to be corrupted or uses an unsupported encryption method. Try opening it with Adobe Acrobat or another desktop PDF application.');
        } else {
          setError(loadErr instanceof Error ? loadErr.message : 'Failed to unlock PDF.');
        }
        setProcessing(false);
        return;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setUnlockedBlob(blob);
      setSuccess(true);

      try {
        const thumbs = await renderPdfThumbnails(pdfBytes.buffer as ArrayBuffer, 200);
        setThumbnail(thumbs[0] || null);
      } catch {
        setThumbnail(null);
      }

      downloadBlob(blob, toolFileName(file.name, 'unlocked'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unlock PDF.';
      setError(message);
    } finally {
      setProcessing(false);
    }
  }, [file, password]);

  const handleRedownload = useCallback(() => {
    if (!unlockedBlob || !file) return;
    downloadBlob(unlockedBlob, toolFileName(file.name, 'unlocked'));
  }, [unlockedBlob, file]);

  const reset = useCallback(() => {
    setFile(null);
    setPassword('');
    setError('');
    setSuccess(false);
    setThumbnail(null);
    setUnlockedBlob(null);
  }, []);

  return (
    <ToolPage
      toolId="remove-pdf-password"
      howItWorks="Upload a password-protected PDF and enter the password to unlock it. The tool uses pdf-lib to decrypt the document and save an unprotected copy. All processing happens in your browser — no files are uploaded to any server."
    >
      <div className="space-y-6">
        {!file ? (
          <DropZone accept=".pdf" onFiles={handleFiles} label="Drop a password-protected PDF here or click to browse" />
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Change file
              </button>
            </div>

            {!success && (
              <div className="space-y-2">
                <label className="block text-sm text-slate-300">PDF Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter the PDF password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password) unlockPdf();
                    }}
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
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
                  PDF unlocked successfully! Your download should start automatically.
                </div>

                {thumbnail && (
                  <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex flex-col items-center gap-3">
                    <p className="text-xs text-slate-400">Unlocked document preview</p>
                    <img
                      src={thumbnail}
                      alt=""
                      className="max-w-sm w-full h-auto object-contain rounded-lg border border-slate-600 bg-white"
                    />
                  </div>
                )}

                <button
                  onClick={handleRedownload}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  Download Again
                </button>
              </div>
            )}

            {!success && (
              <button
                onClick={unlockPdf}
                disabled={processing || !password}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                {processing ? 'Unlocking...' : (
                  <>
                    <Unlock className="w-4 h-4 inline mr-1" />
                    Unlock PDF
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </ToolPage>
  );
}
