'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Clock, ExternalLink, ChevronRight, BookOpen } from 'lucide-react';
import { ArticleCategory } from '@/lib/types';
import { getCategoryTheme } from '@/lib/category-styles';

interface ArchiveIndexEntry {
  wikipedia_page_id: number;
  published_date: string;
  article_title: string;
  category: ArticleCategory;
  read_time_minutes: number;
  hook: string;
  thumbnail_url: string | null;
  idea_cards_count: number;
}

interface ArchiveViewProps {
  onSelectArticle: (pageId: number) => void;
}

export function ArchiveView({ onSelectArticle }: ArchiveViewProps) {
  const [archive, setArchive] = useState<ArchiveIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    async function loadArchive() {
      try {
        const res = await fetch('/data/archive-index.json');
        if (res.ok) {
          const data = await res.json();
          setArchive(data);
        }
      } catch (err) {
        console.error('Failed to load archive index:', err);
      } finally {
        setLoading(false);
      }
    }
    loadArchive();
  }, []);

  const categories = ['All', 'Science & Tech', 'History & Culture', 'Psychology & Philosophy', 'Biography', 'Nature & Space', 'Society & Economics'];

  const filtered = archive.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !search ||
      item.article_title.toLowerCase().includes(search.toLowerCase()) ||
      item.hook.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by published_date
  const groupedByDate: Record<string, ArchiveIndexEntry[]> = {};
  filtered.forEach((item) => {
    const date = item.published_date || 'Earlier';
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(item);
  });

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-8 px-4">
      {/* Archive Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase font-bold tracking-wider mb-2">
          <BookOpen className="w-4 h-4" />
          <span>Knowledge Archive</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          Historical Daily Digests
        </h1>
        <p className="text-sm text-slate-400">
          Browse all daily curated Wikipedia mental models preserved indefinitely on Cloudflare D1 with zero inactivity pausing.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search archive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Archive Groups */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Loading historical digests from static edge...
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          No articles found matching your criteria.
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800/80">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Published Drop: {date}</span>
                <span className="text-[11px] font-mono text-slate-500">
                  ({groupedByDate[date].length} topics)
                </span>
              </div>

              {/* Grid of articles for this date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedByDate[date].map((art) => {
                  const theme = getCategoryTheme(art.category);
                  return (
                    <div
                      key={art.wikipedia_page_id}
                      onClick={() => onSelectArticle(art.wikipedia_page_id)}
                      className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.badgeBg}`}
                          >
                            {art.category}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>{art.read_time_minutes}m</span>
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors mb-1.5">
                          {art.article_title}
                        </h3>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                          {art.hook}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400 font-medium">
                        <span>{art.idea_cards_count} Micro-Ideas</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
