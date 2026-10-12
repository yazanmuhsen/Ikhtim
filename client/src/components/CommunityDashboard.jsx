import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, BookOpen, Heart, Layers, ShieldCheck, Loader2 } from 'lucide-react';

export default function CommunityDashboard({ onGoHome, onCreateClick }) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket for BOARD_UPDATE to refresh instantly
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'BOARD_UPDATE') {
          fetchStats();
        }
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {};
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  const formatNumber = (n) => {
    if (typeof n !== 'number') return '0';
    return i18n.language === 'ar' ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US');
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-khitmah-600 animate-spin" />
        <p className="text-sm text-stone-500 font-arabic">{t('loadingStats')}</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-full text-red-600 dark:text-red-400">
          <Sparkles className="w-8 h-8" />
        </div>
        <p className="text-stone-700 dark:text-stone-300 font-medium">{t('errorStats')}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-khitmah-700 text-white rounded-xl text-sm font-bold hover:bg-khitmah-800 transition-colors"
        >
          {t('refreshNow')}
        </button>
      </div>
    );
  }

  const { globalCompleted, mainCompleted, customCompleted, khitmahsCreated } = stats;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 px-2 sm:px-4">
      {/* Hero Global Stat */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-khitmah-900 to-khitmah-950 text-white p-8 sm:p-12 text-center shadow-xl border border-khitmah-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-khitmah-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/20 text-gold-300 border border-gold-400/30 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('communityTitle')}</span>
          </div>

          <div className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white font-arabic">
            {formatNumber(globalCompleted)}
          </div>

          <p className="text-lg sm:text-xl text-emerald-100/90 font-medium font-arabic max-w-lg mx-auto">
            {t('communityGlobal')}
          </p>
        </div>
      </div>

      {/* 3 Detail Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Main Board */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 font-arabic">
            {t('communityMain')}
          </span>
          <span className="text-3xl font-extrabold text-stone-900 dark:text-white mt-2 font-arabic">
            {formatNumber(mainCompleted)}
          </span>
        </div>

        {/* Custom Memorial Pages */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-gold-50 dark:bg-gold-950/50 text-gold-600 dark:text-gold-400 flex items-center justify-center mb-3">
            <Heart className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 font-arabic">
            {t('communityCustom')}
          </span>
          <span className="text-3xl font-extrabold text-stone-900 dark:text-white mt-2 font-arabic">
            {formatNumber(customCompleted)}
          </span>
        </div>

        {/* Memorial Pages Created */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 font-arabic">
            {t('communityCreated')}
          </span>
          <span className="text-3xl font-extrabold text-stone-900 dark:text-white mt-2 font-arabic">
            {formatNumber(khitmahsCreated)}
          </span>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 dark:text-emerald-200 text-sm font-arabic">
        <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="flex-1 text-xs sm:text-sm">
          {t('communityNote')}
        </p>
      </div>

      {/* Quick Navigation Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onGoHome}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-khitmah-700 hover:bg-khitmah-800 transition-colors font-arabic shadow-sm"
        >
          {t('navHome')}
        </button>
        {onCreateClick && (
          <button
            type="button"
            onClick={onCreateClick}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-khitmah-800 dark:text-khitmah-200 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors font-arabic"
          >
            {t('createKhitmah')}
          </button>
        )}
      </div>
    </div>
  );
}
