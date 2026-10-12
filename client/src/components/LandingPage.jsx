import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Heart, Layers, ShieldCheck, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

// Exact Uthmani text of Surah 5:2 (Al-Ma'idah, Ayah 2) fetched directly from the app's Quran source
const VERSE_UTHMANI_TEXT = "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تُحِلُّوا۟ شَعَٰٓئِرَ ٱللَّهِ وَلَا ٱلشَّهْرَ ٱلْحَرَامَ وَلَا ٱلْهَدْىَ وَلَا ٱلْقَلَٰٓئِدَ وَلَآ ءَآمِّينَ ٱلْبَيْتَ ٱلْحَرَامَ يَبْتَغُونَ فَضْلًۭا مِّن رَّبِّهِمْ وَرِضْوَٰنًۭا ۚ وَإِذَا حَلَلْتُمْ فَٱصْطَادُوا۟ ۚ وَلَا يَجْرِمَنَّكُمْ شَنَـَٔانُ قَوْمٍ أَن صَدُّوكُمْ عَنِ ٱلْمَسْجِدِ ٱلْحَرَامِ أَن تَعْتَدُوا۟ ۘ وَتَعَاوَنُوا۟ عَلَى ٱلْبِرِّ وَٱلتَّقْوَىٰ ۖ وَلَا تَعَاوَنُوا۟ عَلَى ٱلْإِثْمِ وَٱلْعُدْوَٰنِ ۚ وَٱتَّقُوا۟ ٱللَّهَ ۖ إِنَّ ٱللَّهَ شَدِيدُ ٱلْعِقَابِ";

export default function LandingPage({ navigate }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
      setStatsError(null);
    } catch (e) {
      setStatsError(e.message);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to live WebSocket updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'BOARD_UPDATE') {
          fetchStats();
        }
      } catch {}
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  const formatNumber = (n) => {
    if (typeof n !== 'number') return '0';
    return isAr ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US');
  };

  return (
    <div className="space-y-16 sm:space-y-24 py-6 sm:py-10 max-w-4xl mx-auto">
      {/* 1. HERO SECTION */}
      <section className="text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 font-arabic">
            {t('appName')}
          </h1>
          <p className="text-base sm:text-xl text-stone-600 dark:text-stone-300 font-arabic max-w-2xl mx-auto leading-relaxed">
            {t('landingPurpose')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/new')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 border border-emerald-900 transition-colors shadow-sm font-arabic"
          >
            {t('btnCreateKhitmahForSomeone')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/general')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors font-arabic"
          >
            {t('btnJoinSharedKhitmah')}
          </button>
        </div>
      </section>

      {/* 2. QURAN VERSE BLOCK (5:2) */}
      <section className="rounded-2xl bg-amber-50/60 dark:bg-stone-900/60 border border-amber-200/80 dark:border-stone-800 p-6 sm:p-10 text-center space-y-4">
        <div className="text-stone-400 dark:text-stone-500 text-xs font-arabic select-none">
          — ﷽ —
        </div>
        <blockquote className="text-lg sm:text-2xl text-stone-900 dark:text-stone-100 font-arabic leading-loose tracking-wide selection:bg-amber-200 dark:selection:bg-stone-700">
          «{VERSE_UTHMANI_TEXT}»
        </blockquote>
        <div className="text-xs font-bold text-stone-500 dark:text-stone-400 font-arabic">
          [{t('verseSurahName')} : {t('verseAyahNumber')}]
        </div>
        {!isAr && (
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-sans italic border-t border-amber-200/50 dark:border-stone-800 pt-4 max-w-2xl mx-auto">
            "{t('verseTranslationText')}"
          </p>
        )}
      </section>

      {/* 3. "WHAT IS THIS" AND "OUR AIM" */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 text-start">
        <div className="space-y-2 border-s-2 border-emerald-700/60 ps-4">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 font-arabic">
            {t('whatIsThisTitle')}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-300 font-arabic leading-relaxed">
            {t('whatIsThisDesc')}
          </p>
        </div>

        <div className="space-y-2 border-s-2 border-amber-600/60 ps-4">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 font-arabic">
            {t('ourAimTitle')}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-300 font-arabic leading-relaxed">
            {t('ourAimDesc')}
          </p>
        </div>
      </section>

      {/* 4. "HOW IT WORKS" (Numbered list with thin dividers, no feature cards) */}
      <section className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 text-center font-arabic">
          {t('howItWorksTitle')}
        </h2>
        <div className="divide-y divide-stone-200 dark:divide-stone-800 border-y border-stone-200 dark:border-stone-800">
          <div className="py-4 sm:py-5 flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-sm border border-stone-200 dark:border-stone-700">
              {isAr ? '١' : '1'}
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-arabic">
                {t('step1Title')}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-arabic leading-relaxed">
                {t('step1Desc')}
              </p>
            </div>
          </div>

          <div className="py-4 sm:py-5 flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-sm border border-stone-200 dark:border-stone-700">
              {isAr ? '٢' : '2'}
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-arabic">
                {t('step2Title')}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-arabic leading-relaxed">
                {t('step2Desc')}
              </p>
            </div>
          </div>

          <div className="py-4 sm:py-5 flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center shrink-0 text-sm border border-stone-200 dark:border-stone-700">
              {isAr ? '٣' : '3'}
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-arabic">
                {t('step3Title')}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-arabic leading-relaxed">
                {t('step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. GLOBAL COUNTER (VISUAL CENTERPIECE) */}
      <section className="space-y-6">
        {loadingStats ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            <span className="text-xs text-stone-500 font-arabic">{t('loadingStats')}</span>
          </div>
        ) : statsError || !stats ? (
          <div className="text-center py-8 text-sm text-stone-500 space-y-2">
            <p>{t('errorStats')}</p>
            <button
              onClick={fetchStats}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {t('refreshNow')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Big Global Number Centerpiece */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 sm:p-12 text-center space-y-2">
              <div className="text-5xl sm:text-7xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight font-arabic">
                {formatNumber(stats.globalCompleted)}
              </div>
              <p className="text-sm sm:text-base font-medium text-stone-600 dark:text-stone-300 font-arabic">
                {t('landingCounterCenterpiece')}
              </p>
            </div>

            {/* Three Smaller Figures */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-center">
                <span className="text-xs text-stone-500 dark:text-stone-400 font-arabic block mb-1">
                  {t('communityMain')}
                </span>
                <span className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-arabic">
                  {formatNumber(stats.mainCompleted)}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-center">
                <span className="text-xs text-stone-500 dark:text-stone-400 font-arabic block mb-1">
                  {t('communityCustom')}
                </span>
                <span className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-arabic">
                  {formatNumber(stats.customCompleted)}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-center">
                <span className="text-xs text-stone-500 dark:text-stone-400 font-arabic block mb-1">
                  {t('communityCreated')}
                </span>
                <span className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-arabic">
                  {formatNumber(stats.khitmahsCreated)}
                </span>
              </div>
            </div>

            {/* Privacy Note */}
            <div className="flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-arabic text-center px-4">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-500 shrink-0" />
              <span>{t('privacyNoteShort')}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
