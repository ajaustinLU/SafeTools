import { useState, useCallback } from 'react';
import ToolPage from '../../components/common/ToolPage';
import { copyToClipboard } from '../../lib/download';
import { Copy, Palette } from 'lucide-react';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function hexToRgb(hex: string): RGB | null {
  const cleaned = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export default function ColorPicker() {
  const [rgb, setRgb] = useState<RGB>({ r: 0, g: 163, b: 255 });

  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);

  const updateFromHex = useCallback((value: string) => {
    const parsed = hexToRgb(value);
    if (parsed) setRgb(parsed);
  }, []);

  const updateFromRgb = useCallback((channel: 'r' | 'g' | 'b', value: string) => {
    const num = parseInt(value);
    if (isNaN(num)) return;
    setRgb((prev) => ({ ...prev, [channel]: clamp(num, 0, 255) }));
  }, []);

  const updateFromHsl = useCallback((channel: 'h' | 's' | 'l', value: string) => {
    const num = parseInt(value);
    if (isNaN(num)) return;
    const max = channel === 'h' ? 360 : 100;
    const newHsl = { ...hsl, [channel]: clamp(num, 0, max) };
    setRgb(hslToRgb(newHsl));
  }, [hsl]);

  const updateFromColorPicker = useCallback((value: string) => {
    const parsed = hexToRgb(value);
    if (parsed) setRgb(parsed);
  }, []);

  const hexString = hex.toUpperCase();
  const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslString = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  return (
    <ToolPage
      toolId="color-picker"
      howItWorks="Pick a color using the native color picker or enter values in HEX, RGB, or HSL format. All formats are synchronized in real time using standard color conversion formulas. Copy any format to your clipboard with one click."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-40 h-40 rounded-xl border-2 border-slate-600 shadow-lg"
                style={{ backgroundColor: hex }}
              />
              <input
                type="color"
                value={hex}
                onChange={(e) => updateFromColorPicker(e.target.value)}
                className="w-40 h-10 rounded-lg cursor-pointer bg-transparent border-0"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400 flex items-center gap-1.5">
                    <Palette className="w-4 h-4" />
                    HEX
                  </label>
                  <button
                    onClick={() => copyToClipboard(hexString)}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={hexString}
                  onChange={(e) => updateFromHex(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
                  placeholder="#000000"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400">RGB</label>
                  <button
                    onClick={() => copyToClipboard(rgbString)}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['r', 'g', 'b'] as const).map((ch) => (
                    <div key={ch} className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase">{ch}</span>
                      <input
                        type="number"
                        min={0}
                        max={255}
                        value={rgb[ch]}
                        onChange={(e) => updateFromRgb(ch, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400">HSL</label>
                  <button
                    onClick={() => copyToClipboard(hslString)}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'h' as const, label: 'H', max: 360, suffix: '\u00B0' },
                    { key: 's' as const, label: 'S', max: 100, suffix: '%' },
                    { key: 'l' as const, label: 'L', max: 100, suffix: '%' },
                  ]).map((item) => (
                    <div key={item.key} className="space-y-1">
                      <span className="text-xs text-slate-500">{item.label}{item.suffix}</span>
                      <input
                        type="number"
                        min={0}
                        max={item.max}
                        value={hsl[item.key]}
                        onChange={(e) => updateFromHsl(item.key, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">All Formats</h3>
          <div className="space-y-2">
            {[
              { label: 'HEX', value: hexString },
              { label: 'RGB', value: rgbString },
              { label: 'HSL', value: hslString },
            ].map((fmt) => (
              <div key={fmt.label} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                <div>
                  <span className="text-xs text-slate-500 mr-3">{fmt.label}</span>
                  <span className="text-sm text-slate-200 font-mono">{fmt.value}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(fmt.value)}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
