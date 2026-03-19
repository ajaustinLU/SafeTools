import { useState, useCallback } from 'react';
import { ListFilter, Copy, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import { copyToClipboard } from '../../lib/download';

export default function RemoveDuplicates() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRemove = useCallback(() => {
    if (!inputText) return;

    const lines = inputText.split('\n');
    const seen = new Set<string>();
    const unique: string[] = [];
    let removed = 0;

    for (const line of lines) {
      let key = line;
      if (trimWhitespace) key = key.trim();
      if (!caseSensitive) key = key.toLowerCase();

      if (seen.has(key)) {
        removed++;
      } else {
        seen.add(key);
        unique.push(line);
      }
    }

    setOutputText(unique.join('\n'));
    setDuplicatesRemoved(removed);
  }, [inputText, caseSensitive, trimWhitespace]);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;
    await copyToClipboard(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [outputText]);

  return (
    <ToolPage
      toolId="remove-duplicates"
      howItWorks="Text is split into individual lines. Each line is checked against a Set of previously seen lines to identify duplicates. When case-insensitive mode is enabled, lines are compared in lowercase. When trim whitespace is enabled, leading and trailing whitespace is ignored during comparison but preserved in the output. The first occurrence of each line is always kept. Everything runs locally in your browser."
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
              placeholder="Paste your text with duplicate lines..."
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
              placeholder="Deduplicated text will appear here..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600 min-h-[200px]"
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
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
              onClick={() => setTrimWhitespace(!trimWhitespace)}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              {trimWhitespace ? (
                <ToggleRight className="w-5 h-5 text-cyan-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-slate-500" />
              )}
              Trim whitespace
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRemove}
              disabled={!inputText}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <ListFilter className="w-4 h-4" />
                Remove Duplicates
              </span>
            </button>
            {duplicatesRemoved !== null && (
              <span className="text-slate-400 text-sm">
                {duplicatesRemoved} duplicate{duplicatesRemoved !== 1 ? 's' : ''} removed
              </span>
            )}
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
