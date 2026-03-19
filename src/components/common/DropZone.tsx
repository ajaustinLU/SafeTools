import { useCallback, useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  maxSizeMB?: number;
}

export default function DropZone({
  onFiles,
  accept,
  multiple = false,
  label = 'Drag files here or click to browse',
  sublabel,
  maxSizeMB,
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList);
      if (maxSizeMB) {
        const maxBytes = maxSizeMB * 1024 * 1024;
        const valid = files.filter((f) => f.size <= maxBytes);
        if (valid.length < files.length) {
          alert(`Some files exceed the ${maxSizeMB}MB limit and were skipped.`);
        }
        onFiles(valid);
      } else {
        onFiles(files);
      }
    },
    [onFiles, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
        dragging
          ? 'border-cyan-400 bg-cyan-400/5 scale-[1.01]'
          : 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
      }`}
    >
      <div
        className={`p-3 rounded-full transition-colors ${
          dragging ? 'bg-cyan-400/10' : 'bg-slate-700/50'
        }`}
      >
        <Upload
          className={`w-6 h-6 ${dragging ? 'text-cyan-400' : 'text-slate-400'}`}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        {sublabel && (
          <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
        )}
        {accept && (
          <p className="text-xs text-slate-600 mt-1">
            Accepted: {accept}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
