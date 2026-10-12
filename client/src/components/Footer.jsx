import React from 'react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import { getLocalizedPersonName, getDedicationTitle, getDedicationSubtitle } from '../utils/personName';

export default function Footer({ khitmahData }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const mainText = getDedicationTitle(khitmahData, i18n.language, t);
  const subText = getDedicationSubtitle(khitmahData, i18n.language, t);

  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 py-8 px-4 text-center space-y-3 bg-white/50 dark:bg-stone-900/50">
      <div className="flex justify-center">
        <Logo className="w-7 h-7 opacity-80" alt="Ikhtim logo" />
      </div>

      <div className="max-w-2xl mx-auto space-y-1">
        <p 
          dir={isAr ? 'rtl' : 'ltr'}
          className="font-arabic font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 tracking-wide"
        >
          {mainText}
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400 font-arabic">
          {subText}
        </p>
      </div>

      <div className="text-[11px] text-stone-400 dark:text-stone-500 pt-1">
        <span>{isAr ? 'مشروع اختم — ختمة مباركة جماعية للقرآن الكريم' : 'Ikhtim — Collaborative Quran Completion'}</span>
      </div>
    </footer>
  );
}
