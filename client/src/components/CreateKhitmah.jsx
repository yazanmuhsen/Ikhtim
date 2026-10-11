import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { manageStorageKey } from '../utils/manageToken';
import {
  BookOpen,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  ShieldAlert
} from 'lucide-react';

export default function CreateKhitmah({ onGoHome, onGoToKhitmah }) {
  const { t } = useTranslation();

  const [personName, setPersonName] = useState('');
  const [dedication, setDedication] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  function validate() {
    const name = personName.trim();
    const ded = dedication.trim();
    if (name.length < 1) return t('nameRequired');
    if (name.length > 80) return t('nameTooLong');
    if (ded.length > 300) return t('dedicationTooLong');
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/k', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          personName: personName.trim(),
          dedication: dedication.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || t('createFailed'));
      }

      localStorage.setItem(manageStorageKey(data.slug), data.manageToken);
      setCreated({
        slug: data.slug,
        manageToken: data.manageToken,
        shareUrl: `${origin}/k/${data.slug}`,
        manageUrl: `${origin}/k/${data.slug}?manage=${encodeURIComponent(data.manageToken)}`
      });
    } catch (err) {
      setError(err.message || t('createFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text, which) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setError(t('copyFailed'));
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-16">
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-khitmah-50 dark:bg-khitmah-950/50 text-khitmah-700 dark:text-khitmah-300 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-arabic text-khitmah-900 dark:text-khitmah-100">
              {t('createKhitmahTitle')}
            </h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400 font-arabic leading-relaxed">
              {t('createKhitmahDesc')}
            </p>
          </div>
        </div>

        {!created ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {t('personNameLabel')}
              </span>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                maxLength={80}
                placeholder={t('personNamePlaceholder')}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-khitmah-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {t('dedicationLabel')}
              </span>
              <textarea
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder={t('dedicationPlaceholder')}
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-khitmah-500 resize-y"
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onGoHome}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                {t('goHome')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-khitmah-700 to-khitmah-900 hover:from-khitmah-800 hover:to-black shadow-md disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? t('creating') : t('createBtn')}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>{t('khitmahCreated')}</span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">{t('shareLinkLabel')}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={created.shareUrl}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700"
                />
                <button
                  type="button"
                  onClick={() => copyText(created.shareUrl, 'share')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied === 'share' ? t('linkCopied') : t('copyLink')}
                </button>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${t('whatsAppShareText', { name: personName.trim() })} ${created.shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                <Share2 className="w-3.5 h-3.5" />
                {t('shareWhatsApp')}
              </a>
            </div>

            <div className="space-y-2 rounded-2xl border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 p-4">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                {t('manageLinkLabel')}
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-200 font-arabic leading-relaxed">
                {t('manageLinkWarning')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={created.manageUrl}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-950 border border-amber-200 dark:border-amber-800"
                />
                <button
                  type="button"
                  onClick={() => copyText(created.manageUrl, 'manage')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-900/50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied === 'manage' ? t('linkCopied') : t('copyLink')}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onGoToKhitmah(created.slug)}
              className="w-full px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-khitmah-700 hover:bg-khitmah-800"
            >
              {t('goToKhitmah')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

