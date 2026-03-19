import { useState, useCallback } from 'react';
import { KeyRound, RefreshCw, Copy, Check, Shield, Plus, Minus } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import { copyToClipboard } from '../../lib/download';

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

interface GeneratedPassword {
  value: string;
  copied: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

function generatePassword(options: PasswordOptions): string {
  let charset = '';
  if (options.uppercase) charset += UPPERCASE;
  if (options.lowercase) charset += LOWERCASE;
  if (options.numbers) charset += NUMBERS;
  if (options.symbols) charset += SYMBOLS;

  if (charset.length === 0) return '';

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < options.length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}

function getStrength(password: string, options: PasswordOptions): { label: string; color: string; width: string; bgColor: string } {
  let score = 0;
  const len = password.length;

  if (len >= 8) score++;
  if (len >= 12) score++;
  if (len >= 16) score++;
  if (len >= 24) score++;

  let varietyCount = 0;
  if (options.uppercase) varietyCount++;
  if (options.lowercase) varietyCount++;
  if (options.numbers) varietyCount++;
  if (options.symbols) varietyCount++;

  score += varietyCount;

  if (score <= 2) return { label: 'Weak', color: 'text-red-400', width: 'w-1/5', bgColor: 'bg-red-400' };
  if (score <= 4) return { label: 'Fair', color: 'text-orange-400', width: 'w-2/5', bgColor: 'bg-orange-400' };
  if (score <= 5) return { label: 'Good', color: 'text-yellow-400', width: 'w-3/5', bgColor: 'bg-yellow-400' };
  if (score <= 6) return { label: 'Strong', color: 'text-green-400', width: 'w-4/5', bgColor: 'bg-green-400' };
  return { label: 'Very Strong', color: 'text-emerald-400', width: 'w-full', bgColor: 'bg-emerald-400' };
}

export default function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [passwords, setPasswords] = useState<GeneratedPassword[]>([]);
  const [batchCount, setBatchCount] = useState(1);
  const [mainCopied, setMainCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    const hasCharset = options.uppercase || options.lowercase || options.numbers || options.symbols;
    if (!hasCharset) return;

    const count = Math.max(1, Math.min(20, batchCount));
    const generated: GeneratedPassword[] = [];
    for (let i = 0; i < count; i++) {
      generated.push({ value: generatePassword(options), copied: false });
    }
    setPasswords(generated);
    setMainCopied(false);
  }, [options, batchCount]);

  const handleCopyOne = useCallback(async (index: number) => {
    const pw = passwords[index];
    if (!pw) return;
    await copyToClipboard(pw.value);
    setPasswords((prev) =>
      prev.map((p, i) => (i === index ? { ...p, copied: true } : p))
    );
    setTimeout(() => {
      setPasswords((prev) =>
        prev.map((p, i) => (i === index ? { ...p, copied: false } : p))
      );
    }, 2000);
  }, [passwords]);

  const handleCopyMain = useCallback(async () => {
    if (passwords.length === 0) return;
    await copyToClipboard(passwords[0].value);
    setMainCopied(true);
    setTimeout(() => setMainCopied(false), 2000);
  }, [passwords]);

  const updateOption = useCallback((key: keyof PasswordOptions, value: boolean | number) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hasCharset = options.uppercase || options.lowercase || options.numbers || options.symbols;
  const mainPassword = passwords.length > 0 ? passwords[0] : null;
  const strength = mainPassword ? getStrength(mainPassword.value, options) : null;

  return (
    <ToolPage
      toolId="password-generator"
      howItWorks="Passwords are generated using crypto.getRandomValues(), a cryptographically secure random number generator built into your browser. Each character is selected independently from the chosen character set with uniform distribution. No passwords are stored, transmitted, or logged. Everything happens locally in your browser."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 text-sm font-medium">
                Length: {options.length}
              </label>
              <span className="text-slate-500 text-xs">8 - 64</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={options.length}
              onChange={(e) => updateOption('length', Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'uppercase' as const, label: 'Uppercase (A-Z)', sample: 'ABC' },
              { key: 'lowercase' as const, label: 'Lowercase (a-z)', sample: 'abc' },
              { key: 'numbers' as const, label: 'Numbers (0-9)', sample: '123' },
              { key: 'symbols' as const, label: 'Symbols (!@#)', sample: '!@#' },
            ].map(({ key, label }) => (
              <label
                key={key}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  options[key]
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900/50 border-slate-700 text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => updateOption(key, e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    options[key] ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'
                  }`}
                >
                  {options[key] && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs font-medium">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-slate-300 text-sm font-medium">Batch:</label>
              <div className="flex items-center">
                <button
                  onClick={() => setBatchCount((c) => Math.max(1, c - 1))}
                  className="p-1.5 rounded-l-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-12 bg-slate-900 border-y border-slate-700 text-center text-white text-sm py-1.5 focus:outline-none"
                />
                <button
                  onClick={() => setBatchCount((c) => Math.min(20, c + 1))}
                  className="p-1.5 rounded-r-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-slate-500 text-xs">(1-20)</span>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!hasCharset}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Generate
              </span>
            </button>
          </div>

          {!hasCharset && (
            <p className="text-red-400 text-sm">Select at least one character type.</p>
          )}
        </div>

        {mainPassword && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
            <div className="bg-slate-900 rounded-lg p-4">
              <p className="text-cyan-300 font-mono text-lg sm:text-xl break-all select-all text-center leading-relaxed">
                {mainPassword.value}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                {strength && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-xs">Strength</span>
                      <span className={`text-xs font-medium ${strength.color}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.bgColor} ${strength.width}`}
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleCopyMain}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {mainCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

        {passwords.length > 1 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-cyan-400" />
              Batch Results ({passwords.length} passwords)
            </h3>
            <div className="space-y-2">
              {passwords.map((pw, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2"
                >
                  <span className="text-slate-500 text-xs font-mono w-6 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-cyan-300 font-mono text-sm break-all flex-1 select-all">
                    {pw.value}
                  </span>
                  <button
                    onClick={() => handleCopyOne(i)}
                    className="text-slate-400 hover:text-cyan-400 transition-colors shrink-0 p-1"
                  >
                    {pw.copied ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-slate-400 text-sm">
            All passwords are generated using your browser's cryptographically secure random number
            generator (crypto.getRandomValues). No passwords are ever transmitted, stored, or logged.
          </p>
        </div>
      </div>
    </ToolPage>
  );
}
