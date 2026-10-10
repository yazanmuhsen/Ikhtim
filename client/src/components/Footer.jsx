import React from 'react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 py-8 px-4 text-center space-y-4 bg-white/40 dark:bg-stone-900/40 backdrop-blur-sm">
      {/* Small Logo at the top of the footer */}
      <div className="flex justify-center">
        <Logo className="w-8 h-8 opacity-90 hover:opacity-100 transition-opacity" alt="Khitmah small logo" />
      </div>

      {/* Dedication in Footer of every page */}
      <div className="max-w-2xl mx-auto space-y-1">
        <p 
          dir="rtl"
          className="font-arabic font-bold text-base sm:text-lg text-amber-900 dark:text-gold-200 tracking-wide"
        >
          صدقة جارية عن روح محمد سالم العمري رحمه الله
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400 font-arabic">
          مشروع خَتْمَة (Khitmah) — ختمة مباركة جماعية للقرآن الكريم
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-stone-400 dark:text-stone-500">
        <span>تقبل الله منا ومنكم صالح الأعمال</span>
      </div>
    </footer>
  );
}
