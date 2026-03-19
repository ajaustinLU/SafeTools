import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { X, Download } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, formatBytes, toolFileName } from '../../lib/download';

export default function CreateZip() {
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  const handleDrop = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const createZip = useCallback(async () => {
    if (files.length === 0) return;
    setCreating(true);
    try {
      const zip = new JSZip();
      for (const file of files) {
        zip.file(file.name, file);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, toolFileName(files[0].name, 'archive', '.zip'));
    } finally {
      setCreating(false);
    }
  }, [files]);

  return (
    <ToolPage
      toolId="create-zip"
      howItWorks="Add multiple files, then bundle them into a single ZIP archive that downloads directly to your device. All processing happens in your browser — nothing is uploaded."
    >
      <div className="space-y-6">
        <DropZone
          onFiles={handleDrop}
          multiple
          label="Drop files here or click to browse"
          sublabel="Any file type accepted"
        />

        {files.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </h3>
              <span className="text-xs text-slate-400">
                Total: {formatBytes(totalSize)}
              </span>
            </div>

            <div className="divide-y divide-slate-700">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between py-2 gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{file.name}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={createZip}
          disabled={files.length === 0 || creating}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            {creating ? 'Creating...' : 'Create ZIP'}
          </span>
        </button>
      </div>
    </ToolPage>
  );
}
