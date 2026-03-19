import {
  Shield,
  FileText,
  Image,
  Archive,
  Type,
  Calculator,
  Code2,
  Lock,
} from 'lucide-react';
import { categories } from '../../data/tools';

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Image,
  Archive,
  Type,
  Shield,
  Calculator,
  Code2,
};

interface HomePageProps {
  onSelectTool: (id: string) => void;
}

export default function HomePage({ onSelectTool }: HomePageProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-6 pt-8">
        <div className="flex items-center justify-center gap-3">
          <Shield className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl md:text-5xl font-mono font-bold text-slate-100 tracking-tight">
            SafeTools
          </h1>
        </div>
        <p className="text-lg text-slate-400 font-light max-w-xl mx-auto">
          Private file tools. Nothing leaves your browser.
        </p>
        <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-slate-300">
            Your files never leave your device. Every tool runs entirely in your browser.
          </span>
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 md:p-8 max-w-3xl mx-auto">
        <h2 className="text-base font-semibold text-slate-300 mb-3">
          Why SafeTools exists
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Every day, professionals and researchers upload confidential files to
          third-party websites just to merge a PDF or compress an image. Those files
          pass through unknown servers, potentially violating data governance
          frameworks like <span className="text-slate-300">PIPEDA</span>,{' '}
          <span className="text-slate-300">GDPR</span>,{' '}
          <span className="text-slate-300">HIPAA</span>, and{' '}
          <span className="text-slate-300">PHIPA</span>. SafeTools replaces every one
          of those bookmarked sites with a single, trustworthy, zero-upload
          alternative. Every tool processes your files locally using your browser's
          built-in capabilities. Nothing is ever transmitted, logged, or stored.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-5 text-center">
          38 tools across 7 categories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon] || FileText;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectTool(cat.tools[0].id)}
                className="group text-left p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors">
                    <Icon className={`w-5 h-5 ${cat.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      {cat.name}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {cat.tools.length} tools
                    </span>
                  </div>
                </div>
                <ul className="space-y-1">
                  {cat.tools.slice(0, 3).map((tool) => (
                    <li
                      key={tool.id}
                      className="text-xs text-slate-500 truncate"
                    >
                      {tool.name}
                    </li>
                  ))}
                  {cat.tools.length > 3 && (
                    <li className="text-xs text-slate-600">
                      +{cat.tools.length - 3} more
                    </li>
                  )}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center pb-8">
        <p className="text-xs text-slate-600">
          No accounts. No sign-ups. No paywalls. No watermarks. No analytics. No
          tracking. No cookies.
        </p>
      </div>
    </div>
  );
}
