import { useState, useCallback } from 'react';

import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { formatBytes } from '../../lib/download';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export default function FileSizeAnalyser() {
  const [files, setFiles] = useState<FileInfo[]>([]);

  const handleDrop = useCallback((newFiles: File[]) => {
    const mapped = newFiles.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type || 'unknown',
      lastModified: f.lastModified,
    }));
    setFiles((prev) =>
      [...prev, ...mapped].sort((a, b) => b.size - a.size)
    );
  }, []);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ToolPage
      toolId="file-size-analyser"
      howItWorks="Drop any files to instantly view their sizes, MIME types, and last modified dates. Files are sorted by size for quick analysis. Nothing is uploaded — everything stays in your browser."
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="pb-2 font-medium">File Name</th>
                    <th className="pb-2 font-medium text-right">Size</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Last Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {files.map((file, index) => (
                    <tr key={`${file.name}-${index}`}>
                      <td className="py-2 text-slate-200 truncate max-w-0">
                        <span className="block truncate">{file.name}</span>
                      </td>
                      <td className="py-2 text-slate-400 text-right whitespace-nowrap pl-4">
                        {formatBytes(file.size)}
                      </td>
                      <td className="py-2 text-slate-400 whitespace-nowrap pl-4">
                        <span className="inline-block px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300">
                          {file.type}
                        </span>
                      </td>
                      <td className="py-2 text-slate-400 text-right whitespace-nowrap pl-4">
                        {formatDate(file.lastModified)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-600">
                    <td className="pt-3 text-sm font-medium text-slate-300">
                      Total ({files.length} {files.length === 1 ? 'file' : 'files'})
                    </td>
                    <td className="pt-3 text-sm font-medium text-cyan-400 text-right">
                      {formatBytes(totalSize)}
                    </td>
                    <td />
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
