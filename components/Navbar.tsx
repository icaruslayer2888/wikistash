'use client';

import React, { useEffect, useRef } from 'react';
import { Sparkles, Flame, Bookmark, Search, Cpu, CheckCircle2 } from 'lucide-react';
import { UserStats } from '@/lib/types';

interface NavbarProps {
  stats: UserStats;
  stashedCount: number;
  onOpenStash: () => void;
  onOpenArchitecture: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeView: 'feed' | 'quick-flip' | 'archive';
  onViewChange: (view: 'feed' | 'quick-flip' | 'archive') => void;
}

export function Navbar({
  stats,
  stashedCount,
  onOpenStash,
  onOpenArchitecture,
  searchQuery,
  onSearchChange,
  activeView,
  onViewChange,
}: NavbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dailyGoalTarget = 5;
  const goalProgress = Math.min(100, Math.round((stats.ideasReadToday / dailyGoalTarget) * 100));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onViewChange('feed')}
              className="flex items-center gap-2 group text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
                    WikiStash
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                    Free Tier
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  AI Micro-Learning • $0/Month Stack
                </p>
              </div>
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search ideas, topics, mental models... (press /)"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-slate-900/90 text-sm text-slate-200 placeholder-slate-500 rounded-full pl-9 pr-10 py-1.5 border border-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Action Stats & Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* $0/Month Architecture Badge */}
            <button
              onClick={onOpenArchitecture}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/50 transition-all shadow-sm"
              title="Click to view $0/Month Architecture Architecture"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-subtle" />
              <Cpu className="w-3.5 h-3.5 hidden sm:inline" />
              <span>$0/mo Edge</span>
            </button>

            {/* Daily Streak */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/50"
              title={`Active Streak: ${stats.streak} day(s)`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{stats.streak}d</span>
            </div>

            {/* Daily Goal */}
            <div
              className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300"
              title={`Daily Habit Goal: ${stats.ideasReadToday}/${dailyGoalTarget} ideas`}
            >
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              <span className="font-mono text-[11px]">
                {stats.ideasReadToday}/{dailyGoalTarget}
              </span>
            </div>

            {/* Stash Drawer Button */}
            <button
              onClick={onOpenStash}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-all"
            >
              <Bookmark className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
              <span className="hidden sm:inline">Stashed</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 font-mono text-[11px] border border-cyan-800/50">
                {stashedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ideas, topics, mental models..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900 text-sm text-slate-200 placeholder-slate-500 rounded-full pl-9 pr-10 py-1.5 border border-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* View Mode Switcher Sub-Navbar */}
        <div className="flex items-center justify-between py-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => onViewChange('feed')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                activeView === 'feed'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Daily Feed
            </button>
            <button
              onClick={() => onViewChange('quick-flip')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                activeView === 'quick-flip'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              ⚡ Quick-Flip Deck
            </button>
            <button
              onClick={() => onViewChange('archive')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                activeView === 'archive'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              📚 Archive
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>0 Runtime DB Queries • Pre-built Edge JSON</span>
          </div>
        </div>
      </div>
    </header>
  );
}
