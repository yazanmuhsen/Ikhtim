// Helper for language-aware person name and dedication resolution
export function getLocalizedPersonName(khitmahData, lang = 'ar') {
  if (!khitmahData) return '';
  const { personNameAr, personNameEn, personName } = khitmahData;

  if (lang === 'ar') {
    return (personNameAr && personNameAr.trim()) ||
           (personName && personName.trim()) ||
           (personNameEn && personNameEn.trim()) ||
           '';
  } else {
    return (personNameEn && personNameEn.trim()) ||
           (personName && personName.trim()) ||
           (personNameAr && personNameAr.trim()) ||
           '';
  }
}

export function getDedicationTitle(khitmahData, lang = 'ar', t = (k) => k) {
  const name = getLocalizedPersonName(khitmahData, lang);
  if (!name) {
    return lang === 'ar'
      ? 'صدقة جارية عن روح محمد سالم العمري رحمه الله'
      : 'In loving memory of Muhammad Salem Al-Omari';
  }
  return t('customKhitmahFor', { name });
}

export function getDedicationSubtitle(khitmahData, lang = 'ar', t = (k) => k) {
  const name = getLocalizedPersonName(khitmahData, lang);
  const customDedication = khitmahData?.dedication && khitmahData.dedication.trim();
  if (customDedication) {
    return customDedication;
  }
  if (!name) {
    return lang === 'ar'
      ? 'اللهم اغفر له وارحمه واجعل القرآن له نوراً وشفيعاً'
      : 'May Allah forgive him, have mercy on him, and grant him paradise';
  }
  return t('customDedicationDefault');
}
