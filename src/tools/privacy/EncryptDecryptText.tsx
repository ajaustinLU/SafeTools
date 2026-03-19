import { useState, useCallback } from 'react';
import { Lock, Unlock, Copy, Check, Shield, Eye, EyeOff } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';
import { copyToClipboard } from '../../lib/download';

type Mode = 'encrypt' | 'decrypt';

export default function EncryptDecryptText() {
  const [mode, setMode] = useState<Mode>('encrypt');
  const [inputText, setInputText] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

  const deriveKey = async (passphrase: string, salt: Uint8Array) => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const handleEncrypt = useCallback(async () => {
    if (!inputText.trim() || !passphrase) return;
    setProcessing(true);
    setError('');
    setOutputText('');

    try {
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(passphrase, salt);

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(inputText)
      );

      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      const base64 = btoa(String.fromCharCode(...combined));
      setOutputText(base64);
    } catch (err) {
      setError('Encryption failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }, [inputText, passphrase]);

  const handleDecrypt = useCallback(async () => {
    if (!inputText.trim() || !passphrase) return;
    setProcessing(true);
    setError('');
    setOutputText('');

    try {
      const binaryStr = atob(inputText.trim());
      const combined = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        combined[i] = binaryStr.charCodeAt(i);
      }

      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const ciphertext = combined.slice(28);

      const key = await deriveKey(passphrase, salt);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      setOutputText(decoder.decode(decrypted));
    } catch {
      setError('Decryption failed. Check your passphrase and encrypted text.');
    } finally {
      setProcessing(false);
    }
  }, [inputText, passphrase]);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;
    await copyToClipboard(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [outputText]);

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode);
    setInputText('');
    setOutputText('');
    setError('');
    setPassphrase('');
  }, []);

  return (
    <ToolPage
      toolId="encrypt-decrypt-text"
      howItWorks="Your passphrase is used to derive a 256-bit AES key via PBKDF2 with 100,000 iterations and SHA-256. Encryption uses AES-GCM with a random 16-byte salt and 12-byte IV, both prepended to the ciphertext and encoded as Base64. Decryption reverses the process: extracting salt and IV, re-deriving the key from your passphrase, and decrypting. Everything runs locally in your browser."
    >
      <div className="space-y-6">
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          <button
            onClick={() => switchMode('encrypt')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === 'encrypt'
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Lock className="w-4 h-4" />
            Encrypt
          </button>
          <button
            onClick={() => switchMode('decrypt')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === 'decrypt'
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Unlock className="w-4 h-4" />
            Decrypt
          </button>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              {mode === 'encrypt' ? 'Plain Text' : 'Encrypted Text (Base64)'}
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                mode === 'encrypt'
                  ? 'Enter text to encrypt...'
                  : 'Paste encrypted Base64 text here...'
              }
              className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Passphrase</label>
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter a strong passphrase..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showPassphrase ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
            disabled={!inputText.trim() || !passphrase || processing}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Processing...
              </span>
            ) : mode === 'encrypt' ? (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Encrypt
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Unlock className="w-4 h-4" />
                Decrypt
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {outputText && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 text-sm font-medium">
                {mode === 'encrypt' ? 'Encrypted Output (Base64)' : 'Decrypted Text'}
              </label>
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
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
              <p className="text-cyan-300 font-mono text-sm break-all select-all whitespace-pre-wrap">
                {outputText}
              </p>
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-slate-400 text-sm">
            This uses AES-256-GCM encryption. Only someone with your passphrase can decrypt this.
          </p>
        </div>
      </div>
    </ToolPage>
  );
}
