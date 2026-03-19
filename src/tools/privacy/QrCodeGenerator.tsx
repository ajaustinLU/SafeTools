import { useState, useCallback, useRef, useEffect } from 'react';
import { QrCode, Download, Type } from 'lucide-react';
import QRCode from 'qrcode';
import ToolPage from '../../components/common/ToolPage';
import { downloadBlob } from '../../lib/download';

export default function QrCodeGenerator() {
  const [text, setText] = useState('');
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const generateQR = useCallback(async (value: string, qrSize: number, fg: string, bg: string) => {
    if (!canvasRef.current || !value.trim()) return;
    setError('');

    try {
      await QRCode.toCanvas(canvasRef.current, value, {
        width: qrSize,
        margin: 2,
        color: {
          dark: fg,
          light: bg,
        },
        errorCorrectionLevel: 'M',
      });
    } catch {
      setError('Failed to generate QR code. Text may be too long.');
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (text.trim()) {
        generateQR(text, size, fgColor, bgColor);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [text, size, fgColor, bgColor, generateQR]);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current || !text.trim()) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, 'qrcode.png');
      }
    }, 'image/png');
  }, [text]);

  return (
    <ToolPage
      toolId="qr-code-generator"
      howItWorks="The QR code is generated entirely in your browser using the qrcode library. Your text or URL is encoded into a QR matrix pattern rendered onto an HTML Canvas element. You can customize the size, colors, and download the result as a PNG image. No data is sent to any server."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              <span className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Text or URL
              </span>
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text or URL to encode..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Size (px)
              </label>
              <input
                type="number"
                value={size}
                onChange={(e) => {
                  const val = Math.min(1024, Math.max(128, Number(e.target.value) || 128));
                  setSize(val);
                }}
                min={128}
                max={1024}
                step={32}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
              />
              <p className="text-slate-500 text-xs mt-1">128 - 1024</p>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Foreground Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-10 h-10 rounded border border-slate-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded border border-slate-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <QrCode className="w-5 h-5 text-cyan-400" />
              Preview
            </h3>
            <button
              onClick={handleDownload}
              disabled={!text.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download PNG
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center p-4 bg-slate-900/50 rounded-lg min-h-[200px]">
            <canvas ref={canvasRef} className={text.trim() ? 'rounded' : 'hidden'} />
            {!text.trim() && (
              <div className="text-center">
                <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Enter text or URL above to generate a QR code</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
