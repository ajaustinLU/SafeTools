import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { FileArchive, Download } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes } from '../../lib/download';

interface ZipEntry {
  name: string;
  size: number;
}

export default function ExtractZip() {
  const [zip, setZip] = useState<JSZip | null>(null);
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    try {
      const loaded = await JSZip.loadAsync(file);
      setZip(loaded);
      setFileName(file.name);

      const items: ZipEntry[] = [];
      loaded.forEach((relativePath, entry) => {
        if (!entry.dir) {
          items.push({
            name: relativePath,
            size: (entry as any)._data?.uncompressedSize ?? 0,
          });
        }
      });
      setEntries(items);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadSingle = useCallback(
    async (entryName: string) => {
      if (!zip) return;
      const file = zip.file(entryName);
      if (!file) return;
      const blob = await file.async('blob');
      const baseName = entryName.split('/').pop() || entryName;
      downloadBlob(blob, baseName);
    },
    [zip]
  );

  const downloadAll = useCallback(async () => {
    if (!zip) return;
    const newZip = new JSZip();
    for (const entry of entries) {
      const file = zip.file(entry.name);
      if (file) {
        const data = await file.async('uint8array');
        const baseName = entry.name.split('/').pop() || entry.name;
        newZip.file(baseName, data);
      }
    }
    const blob = await newZip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'extracted.zip');
  }, [zip, entries]);

  return (
    <ToolPage
      toolId="extract-zip"
      howItWorks="Upload a ZIP archive to inspect its contents. You can download individual files or re-download everything as a flat ZIP. All extraction happens locally in your browser."
    >
      <div className="space-y-6">
        <DropZone
          onFiles={handleDrop}
          accept=".zip,application/zip"
          label={loading ? 'Reading ZIP...' : 'Drop a ZIP file here or click to browse'}
          sublabel=".zip files only"
        />

        {entries.length > 0 && (
          <>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300">
                  <FileArchive className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                  {fileName}
                </h3>
                <span className="text-xs text-slate-400">
                  {entries.length} {entries.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium text-right">Size</th>
                    <th className="pb-2 font-medium text-right w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {entries.map((entry) => (
                    <tr key={entry.name}>
                      <td className="py-2 text-slate-200 truncate max-w-0">
                        <span className="block truncate">{entry.name}</span>
                      </td>
                      <td className="py-2 text-slate-400 text-right whitespace-nowrap pl-4">
                        {formatBytes(entry.size)}
                      </td>
                      <td className="py-2 text-right pl-4">
                        <button
                          onClick={() => downloadSingle(entry.name)}
                          className="text-cyan-500 hover:text-cyan-400 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={downloadAll}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download All
              </span>
            </button>
          </>
        )}
      </div>
    </ToolPage>
  );
}
