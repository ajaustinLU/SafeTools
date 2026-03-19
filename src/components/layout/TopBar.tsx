import { Lock, Menu, Shield } from 'lucide-react';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-md hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-cyan-400" />
          <span className="font-mono font-bold text-lg text-slate-100 tracking-tight">
            SafeTools
          </span>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400">
        <Lock className="w-3 h-3 text-emerald-400" />
        100% Local Processing
      </div>
    </header>
  );
}
