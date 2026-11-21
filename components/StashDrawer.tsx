'use client';

import React, { useState } from 'react';
import { X, Bookmark, Trash2, Download, ExternalLink, Share2, Check } from 'lucide-react';
import { StashedIdea, ArticleCategory } from '@/lib/types';
import { saveStashedIdeas } from '@/lib/storage';
import { getCategoryTheme } from '@/lib/category-styles';

interface StashDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stashedIdeas: StashedIdea[];
  onUpdate: () => void;
}

export function StashDrawer({
  isOpen,
  onClose,
  stashedIdeas,
  onUpdate,
}: StashDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen) return null;

  const categories: string[] = ['All', ...Array.from(new Set(stashedIdeas.map((s) => s.category)))];

  const filtered =
    selectedCategory === 'All'
      ? stashedIdeas
      : stashedIdeas.filter((s) => s.category === selectedCategory);

  const handleRemove = (id: string) => {
    const updated = stashedIdeas.filter((s) => s.id !== id);
    saveStashedIdeas(updated);
    onUpdate();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all stashed ideas?')) {
      saveStashedIdeas([]);
      onUpdate();
    }
  };

  const handleExportMarkdown = () => {
    if (stashedIdeas.length === 0) return;
    const md = `# My WikiStash Knowledge Collection
Generated on ${new Date().toLocaleDateString()}

${stashedIdeas
  .map(
    (item, idx) => `## ${idx + 1}. ${item.card.title}
*Category: ${item.category} | Source: ${item.article_title}*

> ${item.card.insight}

**🔑 Key Takeaway:** ${item.card.key_takeaway}

---`
  )
  .join('\n\n')}
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wikistash-export-${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = async () => {
    if (stashedIdeas.length === 0) return;
    const text = stashedIdeas
      .map(
        (item) => `💡 ${item.card.title} (${item.article_title})
${item.card.insight}
🔑 Takeaway: ${item.card.key_takeaway}`
      )
      .join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-[#0a0f1d] border-l border-slate-800 shadow-2xl h-full flex flex-col z-10 text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
            <h2 className="text-lg font-bold">My Stashed Ideas</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {stashedIdeas.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Category filters & Actions */}
        {stashedIdeas.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-900/40">
            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Export & Clear toolbar */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportMarkdown}
                  className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors"
                  title="Export as Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.MD</span>
                </button>
                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors"
                  title="Copy all text to clipboard"
                >
                  {copiedAll ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedAll ? 'Copied' : 'Copy All'}</span>
                </button>
              </div>

              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>
        )}

        {/* Stash Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {stashedIdeas.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Bookmark className="w-12 h-12 stroke-1 mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-slate-300 mb-1">
                Your Stash is Empty
              </p>
              <p className="text-xs max-w-xs text-slate-400">
                Click the &ldquo;Stash&rdquo; bookmark button on any idea card to save mental models for fast recall.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No ideas saved under category &ldquo;{selectedCategory}&rdquo;.
            </div>
          ) : (
            filtered.map((item) => {
              const theme = getCategoryTheme(item.category as ArticleCategory);
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.badgeBg}`}
                      >
                        {item.category}
                      </span>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Remove from stash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1.5">
                      {item.card.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {item.card.insight}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200">
                    <span className="font-bold text-cyan-400">🔑 Takeaway: </span>
                    {item.card.key_takeaway}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>From: {item.article_title}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
