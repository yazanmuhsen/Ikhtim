import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import { Moon, Sun, Globe } from 'lucide-react';

export default function Navbar({ isWsConnected, onGoHome, onGoGeneral, globalCompleted }) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  const formatBadgeNumber = (n) => {
    if (typeof n !== 'number') return null;
    return i18n.language === 'ar' ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-stone-900/90 border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <button 
          onClick={onGoHome}
          className="flex items-center gap-3 group text-start focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
            <Logo className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-stone-900 dark:text-stone-100 font-arabic">
                {t('appName')}
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-stone-800 dark:text-amber-200 border border-amber-200/60 dark:border-stone-700">
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
          
          {/* General Khitmah navigation link */}
          {onGoGeneral && (
            <button
              type="button"
              onClick={onGoGeneral}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-arabic"
            >
              {t('navGeneral')}
            </button>
          )}

          {/* Global Counter Badge linking to home / */}
          {typeof globalCompleted === 'number' && (
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
              title={t('landingCounterCenterpiece')}
            >
              <span className="hidden sm:inline font-arabic">{t('communityBadge')}</span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-extrabold font-arabic">
                {formatBadgeNumber(globalCompleted)}
              </span>
            </button>
          )}
          
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
