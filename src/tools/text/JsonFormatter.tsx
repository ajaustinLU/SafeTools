import { useState, useCallback } from 'react';
import { Copy, CheckCircle, Minimize2, Search, Sparkles } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import { copyToClipboard } from '../../lib/download';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFormat = useCallback(() => {
    setError('');
    setOutput('');
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      const lineMatch = msg.match(/position (\d+)/);
      if (lineMatch) {
        const pos = parseInt(lineMatch[1], 10);
        const lines = input.substring(0, pos).split('\n');
        const lineNum = lines.length;
        setError(`Syntax error at line ${lineNum}: ${msg}`);
      } else {
        setError(msg);
      }
    }
  }, [input]);

  const handleMinify = useCallback(() => {
    setError('');
    setOutput('');
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      const lineMatch = msg.match(/position (\d+)/);
      if (lineMatch) {
        const pos = parseInt(lineMatch[1], 10);
        const lines = input.substring(0, pos).split('\n');
        const lineNum = lines.length;
        setError(`Syntax error at line ${lineNum}: ${msg}`);
      } else {
        setError(msg);
      }
    }
  }, [input]);

  const handleValidate = useCallback(() => {
    setOutput('');
    setError('');
    try {
      JSON.parse(input);
      setOutput('Valid JSON');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON';
      const lineMatch = msg.match(/position (\d+)/);
      if (lineMatch) {
        const pos = parseInt(lineMatch[1], 10);
        const lines = input.substring(0, pos).split('\n');
        const lineNum = lines.length;
        setError(`Invalid JSON at line ${lineNum}: ${msg}`);
      } else {
        setError(`Invalid JSON: ${msg}`);
      }
    }
  }, [input]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await copyToClipboard(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  return (
    <ToolPage
      toolId="json-formatter"
      howItWorks="JSON is parsed using the browser's native JSON.parse for validation. Formatting uses JSON.stringify with 2-space indentation. Minification uses JSON.stringify with no whitespace. Error messages include approximate line numbers calculated from the character position reported by the parser. Everything runs locally in your browser."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            JSON Input
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"key": "value", "array": [1, 2, 3]}'
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600 min-h-[300px]"
          />
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleFormat}
              disabled={!input.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Format / Beautify
              </span>
            </button>
            <button
              onClick={handleMinify}
              disabled={!input.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Minimize2 className="w-4 h-4" />
                Minify
              </span>
            </button>
            <button
              onClick={handleValidate}
              disabled={!input.trim()}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Validate
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm font-mono">{error}</p>
          </div>
        )}

        {output && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-300 text-sm font-medium">
                Result
              </label>
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
            </div>
            {output === 'Valid JSON' ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-sm font-medium">
                  Valid JSON
                </span>
              </div>
            ) : (
              <pre className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono overflow-auto max-h-[400px] whitespace-pre">
                {output}
              </pre>
            )}
          </div>
        )}
      </div>
    </ToolPage>
  );
}
