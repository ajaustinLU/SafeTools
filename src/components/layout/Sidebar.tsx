import { useState } from 'react';
import {
  FileText,
  Image,
  Archive,
  Type,
  Shield,
  Calculator,
  Code2,
  ChevronRight,
  X,
} from 'lucide-react';
import { categories } from '../../data/tools';
import type { CategoryId } from '../../types/tools';

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Image,
  Archive,
  Type,
  Shield,
  Calculator,
  Code2,
};

interface SidebarProps {
  activeTool: string | null;
  onSelectTool: (id: string) => void;
  onGoHome: () => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({
  activeTool,
  onSelectTool,
  onGoHome,
  open,
  onClose,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<CategoryId | null>(null);
  const activeCategory = activeTool
    ? categories.find((c) => c.tools.some((t) => t.id === activeTool))?.id ?? null
    : null;

  const toggleCategory = (id: CategoryId) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-10 h-screen w-72 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="font-mono font-bold text-base text-slate-100">
              SafeTools
            </span>
          </button>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-slate-800"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon] || FileText;
            const isExpanded =
              expanded === cat.id || activeCategory === cat.id;

            return (
              <div key={cat.id} className="mb-1">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-slate-800/80 text-slate-100'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${cat.color}`} />
                  <span className="flex-1 text-left">{cat.name}</span>
                  <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                    {cat.tools.length}
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-150 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-800 pl-3">
                    {cat.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          onSelectTool(tool.id);
                          onClose();
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                          activeTool === tool.id
                            ? 'bg-cyan-400/10 text-cyan-400'
                            : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                        }`}
                      >
                        {tool.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <p className="text-[10px] text-slate-600 leading-tight">
            No upload. No server. No account.
            <br />
            All processing happens on your device.
          </p>
        </div>
      </aside>
    </>
  );
}
