import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

function toArabicNum(num, isArabic) {
  if (!isArabic) return num;
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/\d/g, d => easternDigits[d]);
}

export default function JuzCard({ juz, onOpen }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const juzTitle = isAr ? juz.arabicName : juz.englishName;
  const pagesText = isAr
    ? `الصفحات ${toArabicNum(juz.startPage, true)} - ${toArabicNum(juz.endPage, true)}`
    : `Pages ${juz.startPage} - ${juz.endPage}`;

  const isCompleted = juz.status === 'completed';

  return (
    <div
      onClick={() => onOpen(juz)}
      className={`group relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer ${
        isCompleted
          ? 'bg-gradient-to-br from-khitmah-50/70 via-white to-khitmah-100/40 dark:from-khitmah-950/40 dark:via-stone-900 dark:to-khitmah-900/30 border-khitmah-300/80 dark:border-khitmah-700/60 shadow-sm hover:shadow-md'
          : 'bg-white dark:bg-stone-900 border-stone-200/90 dark:border-stone-800 hover:border-khitmah-500 dark:hover:border-khitmah-600 hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {/* Top Header Card */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          
          {/* Juz Number Badge */}
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-sm shadow-sm transition-colors ${
              isCompleted
                ? 'bg-khitmah-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 group-hover:bg-khitmah-100 group-hover:text-khitmah-800 dark:group-hover:bg-khitmah-900 dark:group-hover:text-khitmah-200'
            }`}>
              {toArabicNum(juz.juz_number, isAr)}
            </span>
            <span className="text-xs text-stone-400 dark:text-stone-500 font-medium">
              {pagesText}
            </span>
          </div>

          {/* Status Indicator Pill */}
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-khitmah-100 dark:bg-khitmah-900/80 text-khitmah-800 dark:text-khitmah-300 border border-khitmah-300 dark:border-khitmah-700">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{t('statusCompleted')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('statusAvailable')}</span>
            </span>
          )}

        </div>

        {/* Title */}
        <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white font-arabic tracking-tight leading-snug group-hover:text-khitmah-700 dark:group-hover:text-khitmah-300 transition-colors">
          {juzTitle}
        </h3>

        {/* Subtext description */}
        <p className="mt-2 text-xs text-stone-400 dark:text-stone-500 font-arabic">
          {isCompleted 
            ? (isAr ? 'تمت قراءته في هذه الختمة، متاح للعرض والتلاوة' : 'Completed in this Khitmah. Open to review.') 
            : (isAr ? 'متاح لأي قارئ الآن — انقر للفتح والتلاوة' : 'Available for anyone to open and recite.')}
        </p>
      </div>

      {/* Bottom Actions Bar */}
      <div className="p-3 sm:p-4 bg-stone-50/50 dark:bg-stone-900/60 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
        <span className="text-xs font-bold text-khitmah-700 dark:text-khitmah-300 flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{isCompleted ? t('btnViewJuz') : t('btnOpenJuz')}</span>
        </span>
        <span className="text-stone-400 group-hover:text-khitmah-600 transition-colors">
          {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </span>
      </div>
    </div>
  );
}
