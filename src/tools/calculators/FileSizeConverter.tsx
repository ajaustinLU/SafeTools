import { useState, useMemo } from 'react';
import ToolPage from '../../components/common/ToolPage';
import { HardDrive, Calculator } from 'lucide-react';

const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;
type SizeUnit = (typeof units)[number];

const unitFactors: Record<SizeUnit, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
  PB: 1024 ** 5,
};

function formatValue(bytes: number, unit: SizeUnit): string {
  const val = bytes / unitFactors[unit];
  if (val === 0) return '0';
  if (val >= 1) return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return val.toExponential(4);
}

export default function FileSizeConverter() {
  const [value, setValue] = useState('1');
  const [unit, setUnit] = useState<SizeUnit>('GB');
  const [fileSize, setFileSize] = useState('4.7');
  const [fileUnit, setFileUnit] = useState<SizeUnit>('GB');
  const [storageSize, setStorageSize] = useState('1');
  const [storageUnit, setStorageUnit] = useState<SizeUnit>('TB');

  const bytes = useMemo(() => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return 0;
    return num * unitFactors[unit];
  }, [value, unit]);

  const conversions = useMemo(() => {
    return units.map((u) => ({
      unit: u,
      value: formatValue(bytes, u),
    }));
  }, [bytes]);

  const fileCount = useMemo(() => {
    const fSize = parseFloat(fileSize);
    const sSize = parseFloat(storageSize);
    if (isNaN(fSize) || isNaN(sSize) || fSize <= 0 || sSize <= 0) return null;
    const fileSizeBytes = fSize * unitFactors[fileUnit];
    const storageSizeBytes = sSize * unitFactors[storageUnit];
    return Math.floor(storageSizeBytes / fileSizeBytes);
  }, [fileSize, fileUnit, storageSize, storageUnit]);

  return (
    <ToolPage
      toolId="file-size-converter"
      howItWorks="Convert file sizes between different units using base-1024 (binary) conversion. Enter a value and see its equivalent in all common file size units. Also calculate how many files of a given size fit in a storage capacity."
    >
      <div className="space-y-8">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            File Size Converter
          </h3>
          <div className="flex gap-3 mb-6">
            <div className="flex-1 space-y-2">
              <label className="text-sm text-slate-400">Value</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Enter value"
              />
            </div>
            <div className="w-32 space-y-2">
              <label className="text-sm text-slate-400">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as SizeUnit)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              >
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {conversions.map((c) => (
              <div
                key={c.unit}
                className={`bg-slate-900/50 rounded-lg p-3 ${c.unit === unit ? 'ring-1 ring-cyan-500/50' : ''}`}
              >
                <div className="text-xs text-slate-500 mb-1">{c.unit}</div>
                <div className="text-sm text-slate-200 font-mono break-all">{c.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            How many files fit?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm text-slate-400">File Size</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  min="0"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="File size"
                />
                <select
                  value={fileUnit}
                  onChange={(e) => setFileUnit(e.target.value as SizeUnit)}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-slate-400">Storage Capacity</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={storageSize}
                  onChange={(e) => setStorageSize(e.target.value)}
                  min="0"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Storage size"
                />
                <select
                  value={storageUnit}
                  onChange={(e) => setStorageUnit(e.target.value as SizeUnit)}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {fileCount !== null && (
            <div className="mt-6 bg-slate-900/50 rounded-lg p-4 text-center">
              <div className="text-sm text-slate-400 mb-1">Result</div>
              <div className="text-3xl font-bold text-cyan-400">
                {fileCount.toLocaleString()}
              </div>
              <div className="text-sm text-slate-500 mt-1">
                approximately {fileCount.toLocaleString()} files
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
