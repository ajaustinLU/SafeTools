import { useState, useCallback } from 'react';
import { Lock, Unlock, Copy, CheckCircle, Download, FileUp } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import DropZone from '../../components/common/DropZone';
import { downloadBlob, copyToClipboard } from '../../lib/download';

type Direction = 'encode' | 'decode';
type InputMode = 'text' | 'file';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function Base64Tool() {
  const [direction, setDirection] = useState<Direction>('encode');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [textInput, setTextInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('');
  const [decodedBuffer, setDecodedBuffer] = useState<ArrayBuffer | null>(null);

  const reset = useCallback(() => {
    setTextInput('');
    setOutput('');
    setError('');
    setFileName('');
    setCopied(false);
    setDecodedBuffer(null);
  }, []);

  const handleDirectionSwitch = useCallback(
    (newDir: Direction) => {
      if (newDir !== direction) {
        setDirection(newDir);
        reset();
      }
    },
    [direction, reset]
  );

  const handleInputModeSwitch = useCallback(
    (newMode: InputMode) => {
      if (newMode !== inputMode) {
        setInputMode(newMode);
        reset();
      }
    },
    [inputMode, reset]
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const file = files[0];
      setFileName(file.name);
      setError('');
      setOutput('');
      setDecodedBuffer(null);

      file.arrayBuffer().then((buffer) => {
        const base64 = arrayBufferToBase64(buffer);
        setOutput(base64);
      });
    },
    []
  );

  const handleProcess = useCallback(() => {
    setError('');
    setOutput('');
    setDecodedBuffer(null);

    if (direction === 'encode') {
      try {
        const encoded = btoa(unescape(encodeURIComponent(textInput)));
        setOutput(encoded);
      } catch {
        setError('Failed to encode text. Please check the input.');
      }
    } else {
      try {
        const cleaned = textInput.replace(/\s/g, '');
        const decoded = decodeURIComponent(escape(atob(cleaned)));
        setOutput(decoded);
      } catch {
        try {
          const cleaned = textInput.replace(/\s/g, '');
          const buffer = base64ToArrayBuffer(cleaned);
          setDecodedBuffer(buffer);
          setOutput(`[Binary data: ${buffer.byteLength} bytes. Use the download button to save.]`);
        } catch {
          setError('Failed to decode. The input does not appear to be valid Base64.');
        }
      }
    }
  }, [direction, textInput]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await copyToClipboard(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleDownload = useCallback(() => {
    if (decodedBuffer) {
      const blob = new Blob([decodedBuffer]);
      downloadBlob(blob, 'decoded-file');
      return;
    }
    if (!output) return;
    if (direction === 'encode') {
      const blob = new Blob([output], { type: 'text/plain' });
      downloadBlob(blob, 'encoded.txt');
    } else {
      const blob = new Blob([output], { type: 'text/plain' });
      downloadBlob(blob, 'decoded.txt');
    }
  }, [output, direction, decodedBuffer]);

  return (
    <ToolPage
      toolId="base64"
      howItWorks="Encoding converts text to Base64 using btoa with UTF-8 support via encodeURIComponent. Decoding reverses the process using atob with decodeURIComponent for UTF-8. File mode reads the file as an ArrayBuffer and converts each byte to a Base64 character using btoa. Binary decoded data can be downloaded directly. Everything runs locally in your browser."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-1 inline-flex">
            <button
              onClick={() => handleDirectionSwitch('encode')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                direction === 'encode'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Encode
              </span>
            </button>
            <button
              onClick={() => handleDirectionSwitch('decode')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                direction === 'decode'
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Unlock className="w-4 h-4" />
                Decode
              </span>
            </button>
          </div>

          {direction === 'encode' && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-1 inline-flex">
              <button
                onClick={() => handleInputModeSwitch('text')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === 'text'
                    ? 'bg-cyan-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => handleInputModeSwitch('file')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === 'file'
                    ? 'bg-cyan-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  File
                </span>
              </button>
            </div>
          )}
        </div>

        {direction === 'encode' && inputMode === 'file' ? (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Upload File
            </label>
            <DropZone
              onFiles={handleFiles}
              label="Drop any file here or click to browse"
              sublabel={fileName ? `Loaded: ${fileName}` : undefined}
            />
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              {direction === 'encode' ? 'Text to Encode' : 'Base64 to Decode'}
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                direction === 'encode'
                  ? 'Enter text to encode to Base64...'
                  : 'Paste Base64 string to decode...'
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600 min-h-[200px]"
            />
            <div className="mt-3">
              <button
                onClick={handleProcess}
                disabled={!textInput.trim()}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                {direction === 'encode' ? 'Encode' : 'Decode'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {output && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-300 text-sm font-medium">
                Result
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    {copied ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </span>
                </button>
                {(direction === 'decode' || (direction === 'encode' && inputMode === 'file')) && (
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </span>
                  </button>
                )}
              </div>
            </div>
            <pre className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono overflow-auto max-h-[400px] whitespace-pre-wrap break-all">
              {output}
            </pre>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
