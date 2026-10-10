import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ar: {
    translation: {
      appName: 'خَتْمَة',
      tagline: 'معاً نختم كتاب الله',
      brandSubtitle: 'مشروع الختمة الجماعية للقرآن الكريم',
      
      // Navigation
      navHome: 'الرئيسية',

      // Dashboard Header
      statsKhitmahsCompleted: 'الختمات المكتملة',
      statsCurrentKhitmah: 'الختمة الحالية',
      statsProgress: '{{completed}} من ٣٠ جزءاً',
      statsPercent: '{{percent}}٪ منجز',
      filterAll: 'الكل ({{count}})',
      filterAvailable: 'متاح للتلاوة ({{count}})',
      filterCompleted: 'مكتمل ({{count}})',

      // Juz Cards
      juzNumberLabel: 'الجزء {{number}}',
      statusAvailable: 'متاح للتلاوة',
      statusCompleted: 'تمت قراءته',
      pagesRange: 'من صفحة {{start}} إلى {{end}}',
      btnOpenJuz: 'فتح وتلاوة الجزء',
      btnViewJuz: 'عرض الجزء',

      // Reader
      readerTitle: 'مصحف المدينة النبوية',
      readerJuzLabel: '{{arabicName}}',
      pageLabel: 'صفحة {{current}} من {{total}} (المصحف: {{mushafPage}})',
      nextPage: 'الصفحة التالية',
      prevPage: 'الصفحة السابقة',
      fontSize: 'حجم الخط',
      btnRead: 'قرأت',
      btnReadCooldown: 'قرأت (انتظر {{time}})',
      cooldownNotice: 'يجب الانتظار ٤٥ دقيقة بين كل قراءة وأخرى لمنح الفرصة للجميع',
      btnBackToDashboard: 'العودة للأجزاء',
      surahHeader: 'سورة {{name}}',
      bismillah: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
      ayahsCount: '{{count}} آيات',
      revelationMeccan: 'مكية',
      revelationMedinan: 'مدنية',
      readingNotice: 'يتم عرض صفحات هذا الجزء فقط وفق مصحف المدينة',

      // Confirmations & Alerts
      confirmReadTitle: 'تأكيد إتمام الجزء',
      confirmReadDesc: 'بالضغط على "قرأت"، سيتم تسجيل الجزء كمكتمل وإغلاقه لهذه الختمة، وسيبدأ وقت انتظار مدته ٤٥ دقيقة قبل أن تتمكن من تسجيل جزء آخر.',
      confirmReadBtn: 'نعم، قرأت',
      cancelBtn: 'إلغاء',

      alreadyCompletedAlertTitle: 'سبقك به قارئ آخر',
      alreadyCompletedAlertDesc: 'هذا الجزء تم إتمامه بالفعل من قِبل قارئ آخر للتو. تقبل الله من الجميع!',

      // Celebrations
      khitmahCompletedAlertTitle: '🎉 مبارك! أتمت الأمة الختمة بنجاح',
      khitmahCompletedAlertDesc: 'الحمد لله الذي بنعمته تتم الصالحات. تم إتمام جميع الأجزاء الـ ٣٠ وبدأت ختمة جديدة مباركة!',

      // Live updates
      liveConnected: 'متصل بالبث المباشر',
      liveDisconnected: 'جاري إعادة الاتصال...',
      refreshNow: 'تحديث'
    }
  },
  en: {
    translation: {
      appName: 'KHITMAH',
      tagline: 'Together We Complete the Quran',
      brandSubtitle: 'Collaborative Community Quran Completion',

      // Navigation
      navHome: 'Home',

      // Dashboard Header
      statsKhitmahsCompleted: 'Completed Khitmahs',
      statsCurrentKhitmah: 'Current Khitmah',
      statsProgress: '{{completed}} of 30 Juz\'',
      statsPercent: '{{percent}}% completed',
      filterAll: 'All ({{count}})',
      filterAvailable: 'Available ({{count}})',
      filterCompleted: 'Completed ({{count}})',

      // Juz Cards
      juzNumberLabel: 'Juz {{number}}',
      statusAvailable: 'Available to Read',
      statusCompleted: 'Completed',
      pagesRange: 'Pages {{start}} - {{end}}',
      btnOpenJuz: 'Open & Recite',
      btnViewJuz: 'View Juz',

      // Reader
      readerTitle: 'Madani Mushaf',
      readerJuzLabel: '{{englishName}}',
      pageLabel: 'Page {{current}} of {{total}} (Mushaf page {{mushafPage}})',
      nextPage: 'Next Page',
      prevPage: 'Previous Page',
      fontSize: 'Font Size',
      btnRead: 'Read',
      btnReadCooldown: 'Read (Wait {{time}})',
      cooldownNotice: 'A 45-minute cooldown applies between submissions to give everyone a chance to participate.',
      btnBackToDashboard: 'Back to Board',
      surahHeader: 'Surah {{name}}',
      bismillah: 'In the name of Allah, the Entirely Merciful, the Especially Merciful',
      ayahsCount: '{{count}} Ayahs',
      revelationMeccan: 'Meccan',
      revelationMedinan: 'Medinan',
      readingNotice: 'Displaying pages strictly restricted to this Juz in the Madani Mushaf',

      // Confirmations & Alerts
      confirmReadTitle: 'Confirm Completion',
      confirmReadDesc: 'By clicking "Read", this Juz will be marked completed and locked for this Khitmah. A 45-minute cooldown will start before you can submit another Juz.',
      confirmReadBtn: 'Yes, I Read it',
      cancelBtn: 'Cancel',

      alreadyCompletedAlertTitle: 'Already Completed',
      alreadyCompletedAlertDesc: 'This Juz was just completed by another reader a moment earlier. May Allah accept from all!',

      // Celebrations
      khitmahCompletedAlertTitle: '🎉 Mubarak! Community Khitmah Completed!',
      khitmahCompletedAlertDesc: 'All 30 Juz have been completed! The counter has incremented and a new Khitmah has started.',

      // Live updates
      liveConnected: 'Live connected',
      liveDisconnected: 'Reconnecting...',
      refreshNow: 'Refresh'
    }
  }
};

const savedLang = localStorage.getItem('khitmah_lang') || 'ar';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    }
  });

function updateDir(lang) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

updateDir(savedLang);

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('khitmah_lang', lng);
  updateDir(lng);
});

export default i18n;
