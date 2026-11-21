'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Volume2,
  VolumeX,
  Share2,
  Check,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ArticleDigest, IdeaCard } from '@/lib/types';
import { getCategoryTheme } from '@/lib/category-styles';
import { isIdeaStashed, toggleStashIdea, incrementIdeasRead } from '@/lib/storage';

interface DeckItem {
  article: ArticleDigest;
  card: IdeaCard;
}

interface QuickFlipDeckProps {
  articles: ArticleDigest[];
  onClose: () => void;
  onStashChange?: () => void;
}

export function QuickFlipDeck({ articles, onClose, onStashChange }: QuickFlipDeckProps) {
  // Flatten all cards from articles
  const deck: DeckItem[] = React.useMemo(() => {
    const list: DeckItem[] = [];
    articles.forEach((art) => {
      art.idea_cards.forEach((c) => {
        list.push({ article: art, card: c });
      });
    });
    return list;
  }, [articles]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentItem = deck[currentIndex];

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      incrementIdeasRead();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key.toLowerCase() === 's' && currentItem) {
        toggleStash();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, deck.length, currentItem]);

  const toggleStash = () => {
    if (!currentItem) return;
    toggleStashIdea({
      id: `${currentItem.article.wikipedia_page_id}-${currentItem.card.card_number}`,
      article_id: currentItem.article.wikipedia_page_id,
      article_title: currentItem.article.article_title,
      category: currentItem.article.category,
      card: currentItem.card,
    });
    onStashChange?.();
  };

  const handleCopy = async () => {
    if (!currentItem) return;
    const text = `💡 "${currentItem.card.title}" — WikiStash
${currentItem.card.insight}

🔑 ${currentItem.card.key_takeaway}

Source: ${currentItem.article.article_title} (${currentItem.article.wikipedia_url})`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!currentItem) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${currentItem.card.title}. ${currentItem.card.insight} ${currentItem.card.key_takeaway}`
    );
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!currentItem) {
    return (
      <div className="py-20 text-center text-slate-400">
        No idea cards available in current view.
      </div>
    );
  }

  const theme = getCategoryTheme(currentItem.article.category);
  const isStashed = isIdeaStashed(
    currentItem.article.wikipedia_page_id,
    currentItem.card.card_number
  );

  return (
    <div className="w-full max-w-2xl mx-auto py-6 sm:py-10 px-4">
      {/* Top Deck Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-widest text-cyan-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Quick-Flip Deck
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {currentIndex + 1} / {deck.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Exit Flip Mode</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-800 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-cyan-400 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Flashcard Body */}
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-[#0e1628] to-slate-950 border border-slate-700/80 p-6 sm:p-10 shadow-2xl min-h-[420px] flex flex-col justify-between">
        {/* Top Meta */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${theme.badgeBg}`}
            >
              {currentItem.article.category}
            </span>

            <a
              href={currentItem.article.wikipedia_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <span>{currentItem.article.article_title}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 leading-tight">
            {currentItem.card.title}
          </h2>

          {/* Insight */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
            {currentItem.card.insight}
          </p>
        </div>

        {/* Takeaway / Mental Model */}
        <div className="space-y-6">
          <div
            className={`p-4 rounded-xl border bg-slate-950/90 ${theme.border} ${theme.glow} shadow-md`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">🔑</span>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-400 block mb-1">
                  Key Mental Model / Takeaway
                </span>
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  {currentItem.card.key_takeaway}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Card Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleStash}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isStashed
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
                title="Press 'S' on keyboard"
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${isStashed ? 'fill-cyan-400 text-cyan-400' : ''}`}
                />
                <span>{isStashed ? 'Stashed' : 'Stash Idea'}</span>
              </button>

              <button
                onClick={handleSpeech}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSpeaking
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
                title="Listen audio"
              >
                {isSpeaking ? (
                  <VolumeX className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={handleCopy}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-700 text-xs transition-all"
                title="Copy quote"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Navigation arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 transition-all"
                title="Previous card (Left Arrow)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === deck.length - 1}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all flex items-center gap-1 shadow-lg shadow-cyan-500/20"
                title="Next card (Right Arrow / Space)"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
        <span>← / → Flip Cards</span>
        <span>•</span>
        <span>'S' Stash</span>
        <span>•</span>
        <span>'Esc' Exit</span>
      </div>
    </div>
  );
}
