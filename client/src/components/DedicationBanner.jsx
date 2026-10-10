import React from 'react';

export default function DedicationBanner() {
  return (
    <aside 
      aria-label="إهداء وصدقة جارية"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gold-500/10 via-amber-500/15 to-gold-500/10 dark:from-gold-950/40 dark:via-amber-950/50 dark:to-gold-950/40 border border-gold-300/80 dark:border-gold-700/60 p-4 sm:p-5 shadow-sm text-center"
    >
      {/* Subtle corner ornamental accents */}
      <div className="absolute top-0 start-0 w-8 h-8 border-t-2 border-s-2 border-gold-400/60 dark:border-gold-500/40 rounded-tl-xl pointer-events-none" />
      <div className="absolute top-0 end-0 w-8 h-8 border-t-2 border-e-2 border-gold-400/60 dark:border-gold-500/40 rounded-tr-xl pointer-events-none" />
      <div className="absolute bottom-0 start-0 w-8 h-8 border-b-2 border-s-2 border-gold-400/60 dark:border-gold-500/40 rounded-bl-xl pointer-events-none" />
      <div className="absolute bottom-0 end-0 w-8 h-8 border-b-2 border-e-2 border-gold-400/60 dark:border-gold-500/40 rounded-br-xl pointer-events-none" />

      {/* Decorative Top Divider */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent via-gold-400 to-transparent dark:via-gold-500" />
        <span className="text-gold-600 dark:text-gold-400 text-xs select-none">✦ ﷽ ✦</span>
        <div className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent via-gold-400 to-transparent dark:via-gold-500" />
      </div>

      {/* Primary Dedication Text (Arabic, large, centered, Amiri font) */}
      <h2 
        dir="rtl"
        className="font-arabic font-bold text-lg sm:text-xl md:text-2xl text-amber-950 dark:text-gold-100 tracking-wide leading-relaxed selection:bg-gold-500 selection:text-white"
      >
        صدقة جارية عن روح محمد سالم العمري رحمه الله
      </h2>

      {/* Decorative Bottom Divider */}
      <div className="flex items-center justify-center gap-2 mt-2">
        <div className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent via-gold-400/60 to-transparent dark:via-gold-500/60" />
        <span className="text-[10px] text-gold-700/80 dark:text-gold-300/80 font-arabic">
          اللهم اغفر له وارحمه واجعل القرآن له نوراً وشفيعاً
        </span>
        <div className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent via-gold-400/60 to-transparent dark:via-gold-500/60" />
      </div>
    </aside>
  );
}
