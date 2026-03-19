import { Lock } from 'lucide-react';

export default function PrivacyNotice() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-400">
      <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <span>
        This tool runs entirely in your browser. Your files are never uploaded,
        transmitted, or stored anywhere.
      </span>
    </div>
  );
}
