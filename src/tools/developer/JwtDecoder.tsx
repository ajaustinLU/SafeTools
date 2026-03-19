import { useState, useMemo } from 'react';
import ToolPage from '../../components/common/ToolPage';
import { copyToClipboard } from '../../lib/download';
import { Copy, ShieldAlert, Clock, CheckCircle, XCircle, Info } from 'lucide-react';

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return atob(base64);
}

function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const signature = parts[2];
    return { header, payload, signature };
  } catch {
    return null;
  }
}

function JsonBlock({ data, label }: { data: Record<string, unknown>; label: string }) {
  const formatted = formatJson(data);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-400">{label}</h4>
        <button
          onClick={() => copyToClipboard(formatted)}
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
      <pre className="bg-slate-900/50 rounded-lg p-3 text-sm font-mono overflow-x-auto">
        {formatted.split('\n').map((line, i) => {
          const colored = line
            .replace(/"([^"]+)":/g, '<key>"$1"</key>:')
            .replace(/: "([^"]*)"(,?)$/gm, ': <str>"$1"</str>$2')
            .replace(/: (\d+\.?\d*)(,?)$/gm, ': <num>$1</num>$2')
            .replace(/: (true|false)(,?)$/gm, ': <bool>$1</bool>$2')
            .replace(/: (null)(,?)$/gm, ': <null>$1</null>$2');
          const html = colored
            .replace(/<key>/g, '<span class="text-cyan-400">')
            .replace(/<\/key>/g, '</span>')
            .replace(/<str>/g, '<span class="text-green-400">')
            .replace(/<\/str>/g, '</span>')
            .replace(/<num>/g, '<span class="text-amber-400">')
            .replace(/<\/num>/g, '</span>')
            .replace(/<bool>/g, '<span class="text-purple-400">')
            .replace(/<\/bool>/g, '</span>')
            .replace(/<null>/g, '<span class="text-slate-500">')
            .replace(/<\/null>/g, '</span>');
          return (
            <span key={i}>
              <span dangerouslySetInnerHTML={{ __html: html }} />
              {'\n'}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

export default function JwtDecoder() {
  const [token, setToken] = useState('');

  const decoded = useMemo(() => {
    if (!token.trim()) return null;
    return decodeJwt(token);
  }, [token]);

  const expInfo = useMemo(() => {
    if (!decoded?.payload.exp) return null;
    const exp = decoded.payload.exp as number;
    const expDate = new Date(exp * 1000);
    const isExpired = expDate.getTime() < Date.now();
    return { date: expDate, isExpired };
  }, [decoded]);

  const iatInfo = useMemo(() => {
    if (!decoded?.payload.iat) return null;
    const iat = decoded.payload.iat as number;
    return new Date(iat * 1000);
  }, [decoded]);

  return (
    <ToolPage
      toolId="jwt-decoder"
      howItWorks="Decode JSON Web Tokens (JWT) to inspect their header, payload, and signature. The tool splits the token by its three dot-separated parts and base64url-decodes the header and payload into readable JSON. Expiration and issued-at timestamps are displayed in human-readable format."
    >
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200/80">
            This decodes only — it does not verify the signature. Never paste production tokens into
            online tools. (This tool is fully local, making this note purely informational.)
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
          <label className="text-sm text-slate-400">JWT Token</label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 font-mono resize-y"
            placeholder="Paste your JWT token here (e.g. eyJhbGciOiJIUzI1NiIs...)"
          />
        </div>

        {token.trim() && !decoded && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">Invalid JWT token. A valid JWT has three base64url-encoded parts separated by dots.</p>
          </div>
        )}

        {decoded && (
          <div className="space-y-6">
            {(expInfo || iatInfo) && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Token Timestamps
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {iatInfo && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Issued At (iat)</div>
                      <div className="text-sm text-slate-200">{iatInfo.toLocaleString()}</div>
                    </div>
                  )}
                  {expInfo && (
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Expiration (exp)</div>
                      <div className="text-sm text-slate-200 flex items-center gap-2">
                        {expInfo.date.toLocaleString()}
                        {expInfo.isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Valid
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <JsonBlock data={decoded.header} label="Header" />
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <JsonBlock data={decoded.payload} label="Payload" />
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-400">Signature</h4>
                <button
                  onClick={() => copyToClipboard(decoded.signature)}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-sm font-mono text-slate-400 break-all">
                {decoded.signature}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
