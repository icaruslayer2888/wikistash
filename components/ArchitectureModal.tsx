'use client';

import React from 'react';
import { X, CheckCircle, ShieldCheck, Zap, Database, Globe, Bot, DollarSign } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArchitectureModal({ isOpen, onClose }: ArchitectureModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-[#0d1424] border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 z-10 my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              The $0/Month Architecture Blueprint
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Zero database pausing • Unlimited traffic • 100% Free Tiers
            </p>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Pillar 1 */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm mb-1">
              <Bot className="w-4 h-4" />
              <span>1. GitHub Actions (Daily Cron)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              Triggers daily at <code className="text-cyan-300 font-mono">0 0 * * *</code> to fetch 50 quality-filtered Wikipedia articles (min 450 words, non-disambiguation).
            </p>
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Cost: $0 (Uses ~300 of 2,000 free runner mins/mo)
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm mb-1">
              <Zap className="w-4 h-4" />
              <span>2. Google Gemini 2.5 Flash</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              Summarizes dense articles into 3-5 punchy IdeaCards and a quiz. Uses strict 2-request batches with 4s delays to respect the 15 RPM free-tier limit.
            </p>
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Cost: $0 (Google AI Studio Free Tier)
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-1">
              <Database className="w-4 h-4" />
              <span>3. Cloudflare D1 (Zero-Pausing SQLite)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              Unlike Supabase or Neon which pause databases after 7 days of inactivity, D1 is serverless SQLite on Cloudflare edge and <strong>NEVER pauses or sleeps</strong>.
            </p>
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Cost: $0 (1,500/mo writes vs 100k free; 5GB storage)
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
              <Globe className="w-4 h-4" />
              <span>4. Cloudflare Pages & Static CDN</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              Next.js static export (<code className="text-emerald-300 font-mono">output: 'export'</code>) bakes feeds into pre-rendered static JSON on Cloudflare's edge CDN.
            </p>
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Cost: $0 (0 DB queries per visitor; unlimited bandwidth)
            </div>
          </div>
        </div>

        {/* Cost Comparison Table */}
        <div className="rounded-xl overflow-hidden border border-slate-800 mb-6 bg-slate-950/60">
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Architecture Cost Comparison</span>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 border-b border-slate-800/80 bg-slate-900/40">
              <tr>
                <th className="p-3">Component</th>
                <th className="p-3">Traditional AI Stack</th>
                <th className="p-3 text-emerald-400">WikiStash Stack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="p-3 font-medium">Database</td>
                <td className="p-3 text-rose-400">Supabase ($25/mo or pauses after 7d)</td>
                <td className="p-3 text-emerald-300 font-semibold">Cloudflare D1 ($0/mo, 0 pausing)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">AI Model</td>
                <td className="p-3 text-rose-400">OpenAI GPT-4o-mini ($15–$30/mo)</td>
                <td className="p-3 text-emerald-300 font-semibold">Gemini 2.5 Flash Free Tier ($0/mo)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Visitor Queries</td>
                <td className="p-3 text-rose-400">1 DB query per visitor = hits connection limits</td>
                <td className="p-3 text-emerald-300 font-semibold">0 DB queries (Pre-built static CDN JSON)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Hosting / Edge</td>
                <td className="p-3 text-slate-400">Vercel Pro ($20/mo)</td>
                <td className="p-3 text-emerald-300 font-semibold">Cloudflare Pages ($0/mo unlimited)</td>
              </tr>
              <tr className="bg-emerald-950/20 font-bold">
                <td className="p-3 text-white">Monthly Total</td>
                <td className="p-3 text-rose-400">$60 – $100 / month</td>
                <td className="p-3 text-emerald-400 text-sm">$0.00 / month FOREVER</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>Deduplication key: <code className="text-cyan-300 font-mono">wikipedia_page_id</code></span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
