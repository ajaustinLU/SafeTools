import { useState, useCallback } from 'react';
import { Replace, Copy, Check, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import { copyToClipboard } from '../../lib/download';

export default function FindReplace() {
  const [inputText, setInputText] = useState('');
  const [findStr, setFindStr] = useState('');
  const [replaceStr, setReplaceStr] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regexMode, setRegexMode] = useState(false);
  const [outputText, setOutputText] = useState('');
  const [replaceCount, setReplaceCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [regexError, setRegexError] = useState('');

  const handleReplace = useCallback(() => {
    if (!findStr || !inputText) return;
    setRegexError('');

    try {
      let count = 0;
      let result: string;

      if (regexMode) {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(findStr, flags);
        result = inputText.replace(regex, () => {
          count++;
          return replaceStr;
        });
      } else {
        const escaped = findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(escaped, flags);
        result = inputText.replace(regex, () => {
          count++;
          return replaceStr;
        });
      }

      setOutputText(result);
      setReplaceCount(count);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setRegexError(err.message);
      } else {
        setRegexError('Invalid regular expression');
      }
      setOutputText('');
      setReplaceCount(null);
    }
  }, [inputText, findStr, replaceStr, caseSensitive, regexMode]);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;
    await copyToClipboard(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [outputText]);

  return (
    <ToolPage
      toolId="find-replace"
      howItWorks="Text is searched using either literal string matching or regular expressions. In literal mode, special regex characters are escaped automatically. The replace operation uses JavaScript's native String.replace with the global flag to replace all occurrences. Case sensitivity can be toggled independently. Everything runs locally in your browser."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Input Text
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your text here..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600 min-h-[200px]"
            />
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 text-sm font-medium">
                Result
              </label>
              {outputText && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              value={outputText}
              readOnly
              placeholder="Result will appear here..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600 min-h-[200px]"
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Find
              </label>
              <input
                type="text"
                value={findStr}
                onChange={(e) => setFindStr(e.target.value)}
                placeholder={regexMode ? 'Regular expression...' : 'Text to find...'}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Replace with
              </label>
              <input
                type="text"
                value={replaceStr}
                onChange={(e) => setReplaceStr(e.target.value)}
                placeholder="Replacement text..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              {caseSensitive ? (
                <ToggleRight className="w-5 h-5 text-cyan-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-slate-500" />
              )}
              Case sensitive
            </button>
            <button
              onClick={() => setRegexMode(!regexMode)}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              {regexMode ? (
                <ToggleRight className="w-5 h-5 text-cyan-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-slate-500" />
              )}
              Regex mode
            </button>
          </div>

          {regexError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{regexError}</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleReplace}
              disabled={!findStr || !inputText}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <Replace className="w-4 h-4" />
                Replace All
              </span>
            </button>
            {replaceCount !== null && (
              <span className="text-slate-400 text-sm">
                {replaceCount} replacement{replaceCount !== 1 ? 's' : ''} made
              </span>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
