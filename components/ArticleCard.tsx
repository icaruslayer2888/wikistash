'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  Clock,
  Bookmark,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  HelpCircle,
  Lightbulb,
  Sparkles,
  Award,
} from 'lucide-react';
import { ArticleDigest, IdeaCard } from '@/lib/types';
import { getCategoryTheme } from '@/lib/category-styles';
import { isIdeaStashed, toggleStashIdea, isQuizSolved, recordQuizSolved, incrementIdeasRead } from '@/lib/storage';

interface ArticleCardProps {
  article: ArticleDigest;
  onStashChange?: () => void;
  onIdeaRead?: () => void;
}

export function ArticleCard({ article, onStashChange, onIdeaRead }: ArticleCardProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(() => isQuizSolved(article.wikipedia_page_id));

  const theme = getCategoryTheme(article.category);
  const ideaCards = article.idea_cards || [];
  const currentCard: IdeaCard | undefined = ideaCards[currentCardIndex];

  const isCurrentStashed = currentCard
    ? isIdeaStashed(article.wikipedia_page_id, currentCard.card_number)
    : false;

  const handleNextCard = () => {
    if (currentCardIndex < ideaCards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      incrementIdeasRead();
      onIdeaRead?.();
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    }
  };

  const handleToggleStash = () => {
    if (!currentCard) return;
    toggleStashIdea({
      id: `${article.wikipedia_page_id}-${currentCard.card_number}`,
      article_id: article.wikipedia_page_id,
      article_title: article.article_title,
      category: article.category,
      card: currentCard,
    });
    onStashChange?.();
  };

  const handleCopyCard = async () => {
    if (!currentCard) return;
    const textToCopy = `💡 "${currentCard.title}" — WikiStash Micro-Learning
${currentCard.insight}

🔑 ${currentCard.key_takeaway}

Source: ${article.article_title} (${article.wikipedia_url})`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!currentCard) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${currentCard.title}. ${currentCard.insight} ${currentCard.key_takeaway}`
    );
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSelectQuizOption = (index: number) => {
    if (quizAnswered) return;
    setSelectedQuizOption(index);
    setQuizAnswered(true);
    if (index === article.quiz.correct_index) {
      recordQuizSolved(article.wikipedia_page_id);
      onIdeaRead?.();
    }
  };

  return (
    <article className="group relative rounded-2xl bg-[#0f172a]/95 border border-slate-800 hover:border-slate-700/80 transition-all duration-300 shadow-xl overflow-hidden flex flex-col">
      {/* Top Category Accent Line */}
      <div className={`h-1 w-full bg-gradient-to-r ${theme.gradient}`} />

      {/* Article Header */}
      <div className="p-5 sm:p-6 pb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Pill */}
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${theme.badgeBg}`}
            >
              {article.category}
            </span>

            {/* Read Time */}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{article.read_time_minutes} min read</span>
            </span>
          </div>

          {/* External Wikipedia Link */}
          <a
            href={article.wikipedia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
            title="Read full article on Wikipedia"
          >
            <span className="hidden sm:inline">Wikipedia</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Article Title */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-3 group-hover:text-cyan-200 transition-colors">
          {article.article_title}
        </h2>

        {/* Curiosity Hook Box */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 mb-4 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
            &ldquo;{article.hook}&rdquo;
          </p>
        </div>
      </div>

      {/* Idea Card Swiper Section */}
      {currentCard && (
        <div className="px-5 sm:px-6 pb-4 flex-1 flex flex-col">
          {/* Card Meta & Navigation Bar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Idea {currentCard.card_number} of {ideaCards.length}
            </span>

            {/* Carousel Dots */}
            <div className="flex items-center gap-1.5">
              {ideaCards.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentCardIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentCardIndex
                      ? 'w-6 bg-cyan-400'
                      : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                  }`}
                  aria-label={`Jump to idea ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Active Idea Card Content */}
          <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/90 flex-1 flex flex-col justify-between shadow-inner">
            <div>
              {/* Card Title */}
              <h3 className="text-base sm:text-lg font-bold text-slate-100 mb-2.5">
                {currentCard.title}
              </h3>

              {/* Card Insight */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                {currentCard.insight}
              </p>
            </div>

            {/* Key Takeaway / Mental Model Callout */}
            <div
              className={`p-3 rounded-lg border bg-slate-950/80 ${theme.border} ${theme.glow} shadow-sm`}
            >
              <div className="flex items-start gap-2">
                <span className="text-base">🔑</span>
                <p className="text-xs sm:text-sm font-medium text-slate-200 leading-snug">
                  {currentCard.key_takeaway}
                </p>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Audio Listen Button */}
                <button
                  onClick={handleToggleSpeech}
                  className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                    isSpeaking
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={isSpeaking ? 'Stop listening' : 'Listen to this idea'}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{isSpeaking ? 'Stop' : 'Listen'}</span>
                </button>

                {/* Copy Card Button */}
                <button
                  onClick={handleCopyCard}
                  className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex items-center gap-1"
                  title="Copy idea quote to clipboard"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
                </button>

                {/* Stash / Bookmark Button */}
                <button
                  onClick={handleToggleStash}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                    isCurrentStashed
                      ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={isCurrentStashed ? 'Remove from Stash' : 'Save to My Stash'}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      isCurrentStashed ? 'fill-cyan-400 text-cyan-400' : ''
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {isCurrentStashed ? 'Stashed' : 'Stash'}
                  </span>
                </button>
              </div>

              {/* Prev / Next Pagination Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevCard}
                  disabled={currentCardIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 transition-all"
                  aria-label="Previous idea card"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextCard}
                  disabled={currentCardIndex === ideaCards.length - 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 transition-all"
                  aria-label="Next idea card"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Toggle & Drawer Section */}
      <div className="px-5 sm:px-6 pb-5 pt-1">
        <button
          onClick={() => setShowQuiz(!showQuiz)}
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
            showQuiz
              ? 'bg-slate-800 border-slate-700 text-white'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Test Your Knowledge Quiz</span>
          </span>
          {quizAnswered && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 flex items-center gap-1">
              <Award className="w-3 h-3" /> Solved
            </span>
          )}
        </button>

        {/* Expandable Quiz Content */}
        {showQuiz && (
          <div className="mt-3 p-4 rounded-xl bg-slate-900/95 border border-slate-800 text-xs text-slate-200">
            <p className="font-semibold text-slate-100 mb-3 leading-relaxed">
              {article.quiz.question}
            </p>

            <div className="space-y-2 mb-3">
              {article.quiz.options.map((option, idx) => {
                const isSelected = selectedQuizOption === idx;
                const isCorrect = idx === article.quiz.correct_index;
                let optionStyle =
                  'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60';

                if (quizAnswered) {
                  if (isCorrect) {
                    optionStyle =
                      'bg-emerald-950/70 border-emerald-600/80 text-emerald-200 font-medium';
                  } else if (isSelected && !isCorrect) {
                    optionStyle =
                      'bg-rose-950/70 border-rose-600/80 text-rose-300 font-medium';
                  } else {
                    optionStyle = 'opacity-40 bg-slate-950 border-slate-800 text-slate-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={quizAnswered}
                    onClick={() => handleSelectQuizOption(idx)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between ${optionStyle}`}
                  >
                    <span>{option}</span>
                    {quizAnswered && isCorrect && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation reveal */}
            {quizAnswered && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 text-[11px] leading-relaxed">
                <span className="font-bold text-cyan-400">Explanation: </span>
                {article.quiz.explanation}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
