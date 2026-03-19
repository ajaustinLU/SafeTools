import { ReactNode } from 'react';
import { Info } from 'lucide-react';
import PrivacyNotice from './PrivacyNotice';
import { findCategory, findTool } from '../../data/tools';

interface ToolPageProps {
  toolId: string;
  children: ReactNode;
  howItWorks?: string;
}

export default function ToolPage({ toolId, children, howItWorks }: ToolPageProps) {
  const tool = findTool(toolId);
  const category = tool ? findCategory(tool.category) : null;

  if (!tool) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 font-mono">
            {tool.name}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{tool.description}</p>
        </div>
        {category && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700 ${category.color} whitespace-nowrap`}
          >
            {category.name}
          </span>
        )}
      </div>

      {howItWorks && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400 leading-relaxed">
            {howItWorks}
          </p>
        </div>
      )}

      <PrivacyNotice />

      <div>{children}</div>
    </div>
  );
}
