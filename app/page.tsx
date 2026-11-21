'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  TrendingUp,
  RotateCcw,
  BookMarked,
  Filter,
  CheckCircle,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { ArticleDigest, ArticleCategory, UserStats, StashedIdea } from '@/lib/types';
import { loadStashedIdeas, loadUserStats } from '@/lib/storage';
import { Navbar } from '@/components/Navbar';
import { ArticleCard } from '@/components/ArticleCard';
import { QuickFlipDeck } from '@/components/QuickFlipDeck';
import { StashDrawer } from '@/components/StashDrawer';
import { ArchiveView } from '@/components/ArchiveView';
import { ArchitectureModal } from '@/components/ArchitectureModal';

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeView, setActiveView] = useState<'feed' | 'quick-flip' | 'archive'>('feed');

  const [stashedIdeas, setStashedIdeas] = useState<StashedIdea[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    streak: 1,
    lastReadDate: '',
    ideasReadToday: 0,
    quizzesSolved: 0,
    totalIdeasRead: 0,
  });

  const [isStashOpen, setIsStashOpen] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);

  // Load static JSON feed from Cloudflare Pages static CDN (/data/latest.json)
  useEffect(() => {
    async function fetchLatestFeed() {
      try {
        const res = await fetch('/data/latest.json');
        if (res.ok) {
          const data: ArticleDigest[] = await res.json();
          setArticles(data);
        }
      } catch (err) {
        console.warn('Using local pre-seeded articles feed fallback:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestFeed();
    setStashedIdeas(loadStashedIdeas());
    setUserStats(loadUserStats());
  }, []);

  const refreshStash = () => {
    setStashedIdeas(loadStashedIdeas());
  };

  const refreshStats = () => {
    setUserStats(loadUserStats());
  };

  const categories = [
    'All',
    'Science & Tech',
    'History & Culture',
    'Psychology & Philosophy',
    'Biography',
    'Nature & Space',
    'Society & Economics',
  ];

  // Filter articles based on search & category
  const filteredArticles = articles.filter((art) => {
    const matchesCat = selectedCategory === 'All' || art.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      art.article_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.hook.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.idea_cards.some(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.key_takeaway.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCat && matchesSearch;
  });

  const handleSelectArchiveArticle = (pageId: number) => {
    setActiveView('feed');
    setSelectedCategory('All');
    setSearchQuery('');
    setTimeout(() => {
      const el = document.getElementById(`article-${pageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100">
      {/* Sticky Navigation Header */}
      <Navbar
        stats={userStats}
        stashedCount={stashedIdeas.length}
        onOpenStash={() => setIsStashOpen(true)}
        onOpenArchitecture={() => setIsArchModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* VIEW 1: Quick-Flip Flashcard Mode */}
        {activeView === 'quick-flip' && (
          <QuickFlipDeck
            articles={filteredArticles}
            onClose={() => setActiveView('feed')}
            onStashChange={refreshStash}
          />
        )}

        {/* VIEW 2: Historical Archive */}
        {activeView === 'archive' && (
          <ArchiveView onSelectArticle={handleSelectArchiveArticle} />
        )}

        {/* VIEW 3: Standard Card Feed */}
        {activeView === 'feed' && (
          <>
            {/* Hero / Daily Motivation Banner */}
            <div className="relative rounded-3xl p-6 sm:p-8 mb-8 bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/40 border border-cyan-800/30 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    Daily Wikipedia Drops • Curated by Gemini
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                    Micro-learning made effortless.
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Transform dense Wikipedia articles into bite-sized mental models in 3 minutes.
                    Engineered to run forever at <strong className="text-emerald-400 font-semibold">$0/month</strong> with zero runtime DB queries.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setActiveView('quick-flip')}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>Start 3-Min Session</span>
                  </button>
                  <button
                    onClick={() => setIsArchModalOpen(true)}
                    className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Why $0/Month?</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center justify-between gap-3 mb-6 pb-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all font-medium ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {selectedCategory !== 'All' && (
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Articles Grid */}
            {loading ? (
              <div className="text-center py-20 text-slate-400 text-sm">
                Loading today&apos;s curated micro-learning drops...
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="rounded-2xl p-12 text-center bg-slate-900/50 border border-slate-800 text-slate-400">
                <Filter className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-300" />
                <p className="text-base font-semibold text-slate-200 mb-1">
                  No ideas match your filter
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Try adjusting your search query or selecting a different category.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-cyan-400 hover:bg-slate-700"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {filteredArticles.map((article) => (
                  <div key={article.wikipedia_page_id} id={`article-${article.wikipedia_page_id}`}>
                    <ArticleCard
                      article={article}
                      onStashChange={refreshStash}
                      onIdeaRead={refreshStats}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#060910] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">WikiStash</span>
            <span>— Free Tier Architecture: GitHub Actions • Gemini 2.5 • Cloudflare D1 • Cloudflare Pages</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsArchModalOpen(true)}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              Architecture Specs
            </button>
            <a
              href="https://en.wikipedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200"
            >
              Wikipedia REST API
            </a>
            <a
              href="https://ai.google.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200"
            >
              Google AI Studio
            </a>
          </div>
        </div>
      </footer>

      {/* Stash Drawer Modal */}
      <StashDrawer
        isOpen={isStashOpen}
        onClose={() => setIsStashOpen(false)}
        stashedIdeas={stashedIdeas}
        onUpdate={refreshStash}
      />

      {/* Architecture Explainer Modal */}
      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />
    </div>
  );
}
