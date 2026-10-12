import React from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedPersonName, getDedicationTitle, getDedicationSubtitle } from '../utils/personName';

export default function DedicationBanner({ personName, personNameAr, personNameEn, dedication }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  
  const khitmahData = { personName, personNameAr, personNameEn, dedication };
  const hasPerson = Boolean(getLocalizedPersonName(khitmahData, i18n.language));

  const mainText = getDedicationTitle(khitmahData, i18n.language, t);
  const subText = getDedicationSubtitle(khitmahData, i18n.language, t);

  return (
    <aside 
      aria-label="إهداء وصدقة جارية"
      className="relative overflow-hidden rounded-2xl bg-amber-50/70 dark:bg-stone-900/80 border border-amber-200/80 dark:border-stone-800 p-5 sm:p-6 text-center"
    >
      <div className="flex items-center justify-center gap-2 mb-2 select-none">
        <span className="text-stone-400 dark:text-stone-600 text-xs">— ﷽ —</span>
      </div>

      <h2 
        dir={isAr ? 'rtl' : 'ltr'}
        className="font-arabic font-bold text-lg sm:text-xl md:text-2xl text-stone-900 dark:text-stone-100 tracking-wide leading-relaxed"
      >
        {mainText}
      </h2>

      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-xs text-stone-600 dark:text-stone-400 font-arabic">
          {subText}
        </span>
      </div>
    </aside>
  );
}
