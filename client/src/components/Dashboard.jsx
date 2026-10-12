import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import JuzCard from './JuzCard';
import DedicationBanner from './DedicationBanner';
import { 
  Trophy, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  Filter, 
  Flame,
  Clock
} from 'lucide-react';

function toArabicNum(num, isArabic) {
  if (!isArabic) return num;
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/\d/g, d => easternDigits[d]);
}

function formatCountdown(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function Dashboard({
  juzList = [],
  counter = { totalCompleted: 0, currentProgress: 0, availableCount: 30, totalJuz: 30 },
  cooldownRemaining = 0,
  onOpenReader,
  personName,
  personNameAr,
  personNameEn,
  dedication,
  apiBase: _apiBase,
  showCreateButton = false,
  onCreateClick,
  canManage = false,
  onDelete
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'available', 'completed'

  const progressPercent = Math.round((counter.currentProgress / 30) * 100);

  // Filter list
  const filteredJuzList = juzList.filter(juz => {
    if (activeFilter === 'available') return juz.status === 'available';
    if (activeFilter === 'completed') return juz.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      
      {/* Dedication Banner directly under the navbar */}
      <DedicationBanner 
        personName={personName} 
        personNameAr={personNameAr} 
        personNameEn={personNameEn} 
        dedication={dedication} 
      />

      {showCreateButton && (
        <div className="flex justify-center -mt-2">
          <button
            type="button"
            onClick={onCreateClick}
            className="text-xs font-bold px-3 py-1.5 rounded-xl text-khitmah-800 dark:text-khitmah-200 bg-khitmah-50 dark:bg-khitmah-950/40 border border-khitmah-200/80 dark:border-khitmah-800 hover:bg-khitmah-100 dark:hover:bg-khitmah-900/50 transition-colors"
          >
            {t('createKhitmah')}
          </button>
        </div>
      )}

      {canManage && onDelete && (
        <div className="flex justify-center -mt-2">
          <button
            type="button"
            onClick={onDelete}
            className="text-xs font-bold px-3 py-1.5 rounded-xl text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
          >
            {t('deleteKhitmah')}
          </button>
        </div>
      )}

      {/* Hero & Statistics Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-khitmah-900 via-khitmah-800 to-khitmah-950 text-white p-6 sm:p-8 md:p-10 shadow-xl border border-khitmah-700/50">
        
        {/* Background Decorative Radial Gradients */}
        <div className="absolute -top-24 -end-24 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -start-24 w-96 h-96 rounded-full bg-khitmah-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Title & Description */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-gold-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('brandSubtitle')}</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-arabic leading-tight">
              {isAr ? 'خَتْمَة القرآن الكريم الجماعية' : 'Community Quran Khitmah'}
            </h1>
            
            <p className="text-stone-300 text-sm sm:text-base max-w-xl font-arabic leading-relaxed">
              {isAr 
                ? 'شارك مجتمع القراء في ختم كتاب الله، افتح أي جزء متاح واقرأه بحرية. عند إتمام القراءة، اضغط زر "قرأت" لتوثيق إتمامه للجميع.'
                : 'Join the community in reciting the Holy Quran together. Open any available Juz and read freely. When you finish, press "Read" to complete it for everyone.'}
            </p>

            {/* Active Cooldown Banner (if user recently read a juz) */}
            {cooldownRemaining > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium">
                <Clock className="w-4 h-4 text-amber-300 animate-spin-slow" />
                <span>
                  {isAr 
                    ? `وقت الانتظار النشط: ${formatCountdown(cooldownRemaining)} متبقية (يمكنك مواصلة التلاوة بحرية)`
                    : `Active Cooldown: ${formatCountdown(cooldownRemaining)} remaining (you can still read freely)`}
                </span>
              </div>
            )}
          </div>

          {/* Stats Badges */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            
            {/* Total Completed Khitmahs */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-gold-300 mb-2">
                <span className="text-xs font-semibold">{t('statsKhitmahsCompleted')}</span>
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-arabic">
                  {toArabicNum(counter.totalCompleted, isAr)}
                </span>
                <span className="text-xs text-stone-300 ms-1.5 font-arabic">
                  {isAr ? 'ختمة تامة' : 'khitmahs'}
                </span>
              </div>
            </div>

            {/* Current Khitmah Counter */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-300 mb-2">
                <span className="text-xs font-semibold">{t('statsCurrentKhitmah')}</span>
                <Flame className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-arabic">
                  {t('statsProgress', { completed: toArabicNum(counter.currentProgress, isAr) })}
                </div>
                <span className="text-xs text-gold-300 font-medium">
                  {t('statsPercent', { percent: toArabicNum(progressPercent, isAr) })}
                </span>
              </div>
            </div>

            {/* Progress Bar (Span 2) */}
            <div className="col-span-2 bg-black/20 rounded-2xl p-4 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-khitmah-400" />
                  <span>{t('filterCompleted', { count: toArabicNum(counter.currentProgress, isAr) })}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('filterAvailable', { count: toArabicNum(counter.availableCount, isAr) })}</span>
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-khitmah-400 to-gold-400 transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(progressPercent, 4)}%` }}
                />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Grid Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
          <Filter className="w-4 h-4 text-khitmah-600" />
          <span>{isAr ? 'أجزاء القرآن الكريم (٣٠ جزءاً)' : 'Quran 30 Juz\' Grid'}</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: t('filterAll', { count: toArabicNum(30, isAr) }) },
            { id: 'available', label: t('filterAvailable', { count: toArabicNum(counter.availableCount, isAr) }) },
            { id: 'completed', label: t('filterCompleted', { count: toArabicNum(counter.currentProgress, isAr) }) },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-khitmah-700 text-white shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 30 Juz' Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredJuzList.map(juz => (
          <JuzCard
            key={juz.juz_number}
            juz={juz}
            onOpen={onOpenReader}
          />
        ))}
      </div>

    </div>
  );
}
