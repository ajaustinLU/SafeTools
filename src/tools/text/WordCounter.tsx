import { useState, useMemo } from 'react';
import { Type, Clock, AlignLeft, Hash, Space, MessageSquare } from 'lucide-react';
import ToolPage from '../../components/common/ToolPage';

export default function WordCounter() {
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;
    const paragraphs = text
      .split(/\n\n|\n/)
      .filter((p) => p.trim().length > 0).length;
    const readingTime = Math.max(1, Math.ceil(words.length / 200));

    return {
      words: words.length,
      characters,
      charactersNoSpaces,
      sentences: text.trim() === '' ? 0 : sentences,
      paragraphs: text.trim() === '' ? 0 : paragraphs,
      readingTime,
    };
  }, [text]);

  const statCards = [
    { label: 'Words', value: stats.words, icon: Type },
    { label: 'Characters', value: stats.characters, icon: Hash },
    { label: 'Characters (no spaces)', value: stats.charactersNoSpaces, icon: Space },
    { label: 'Sentences', value: stats.sentences, icon: MessageSquare },
    { label: 'Paragraphs', value: stats.paragraphs, icon: AlignLeft },
    {
      label: 'Reading Time',
      value: `${stats.readingTime} min`,
      icon: Clock,
    },
  ];

  return (
    <ToolPage
      toolId="word-counter"
      howItWorks="Text is analyzed in real time as you type. Words are counted by splitting on whitespace. Sentences are detected by splitting on period, exclamation mark, and question mark delimiters. Paragraphs are separated by newlines. Reading time assumes an average of 200 words per minute. Everything runs locally in your browser."
    >
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Enter or paste your text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your text here..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-600 min-h-[200px]"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-800/50 rounded-xl border border-slate-700 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400 text-xs font-medium">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-semibold text-white font-mono">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ToolPage>
  );
}
