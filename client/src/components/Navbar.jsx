import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import { Moon, Sun, Globe } from 'lucide-react';

export default function Navbar({ isWsConnected, onGoHome }) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-stone-900/90 border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <button 
          onClick={onGoHome}
          className="flex items-center gap-3 group text-start focus:outline-none"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center p-1 shadow-sm group-hover:scale-105 transition-transform">
            <Logo className="w-9 h-9" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-khitmah-900 dark:text-khitmah-100 font-arabic">
                {t('appName')}
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-100 text-gold-800 dark:bg-gold-950/70 dark:text-gold-300 border border-gold-300/40">
                {t('brandSubtitle')}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-arabic hidden md:block">
              {t('tagline')}
            </p>
          </div>
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Live WS Status */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60"
            title={isWsConnected ? t('liveConnected') : t('liveDisconnected')}
          >
            <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="hidden lg:inline text-[11px]">
              {isWsConnected ? t('liveConnected') : t('liveDisconnected')}
            </span>
          </div>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="p-2 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 text-xs font-medium border border-transparent hover:border-stone-200 dark:border-stone-700"
            title="Change language"
          >
            <Globe className="w-4 h-4 text-khitmah-600 dark:text-khitmah-400" />
            <span className="font-bold">{i18n.language === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-200 dark:border-stone-700"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-gold-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-stone-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

        </div>
      </div>
    </header>
  );
}
