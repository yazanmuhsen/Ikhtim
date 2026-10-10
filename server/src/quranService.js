const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Ensure IPv4 is prioritized for external requests in Node
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const CACHE_DIR = path.join(__dirname, '../cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Memory cache
const memoryCache = new Map();

// Standard 604-page Madani Mushaf Juz' page ranges & metadata
const JUZ_METADATA = {
  1: { start: 1, end: 21, arabicName: "الجزء الأول (الم)", englishName: "Juz 1" },
  2: { start: 22, end: 41, arabicName: "الجزء الثاني (سيقول)", englishName: "Juz 2" },
  3: { start: 42, end: 62, arabicName: "الجزء الثالث (تلك الرسل)", englishName: "Juz 3" },
  4: { start: 62, end: 81, arabicName: "الجزء الرابع (لن تنالوا)", englishName: "Juz 4" },
  5: { start: 82, end: 101, arabicName: "الجزء الخامس (والمحصنات)", englishName: "Juz 5" },
  6: { start: 102, end: 121, arabicName: "الجزء السادس (لا يحب الله)", englishName: "Juz 6" },
  7: { start: 121, end: 141, arabicName: "الجزء السابع (وإذا سمعوا)", englishName: "Juz 7" },
  8: { start: 142, end: 161, arabicName: "الجزء الثامن (ولو أننا)", englishName: "Juz 8" },
  9: { start: 162, end: 181, arabicName: "الجزء التاسع (قال الملأ)", englishName: "Juz 9" },
  10: { start: 182, end: 201, arabicName: "الجزء العاشر (واعلموا)", englishName: "Juz 10" },
  11: { start: 201, end: 221, arabicName: "الجزء الحادي عشر (يعتذرون)", englishName: "Juz 11" },
  12: { start: 222, end: 241, arabicName: "الجزء الثاني عشر (وما من دابة)", englishName: "Juz 12" },
  13: { start: 242, end: 261, arabicName: "الجزء الثالث عشر (وما أبرئ)", englishName: "Juz 13" },
  14: { start: 262, end: 281, arabicName: "الجزء الرابع عشر (ربما)", englishName: "Juz 14" },
  15: { start: 282, end: 301, arabicName: "الجزء الخامس عشر (سبحان الذي)", englishName: "Juz 15" },
  16: { start: 302, end: 321, arabicName: "الجزء السادس عشر (قال ألم)", englishName: "Juz 16" },
  17: { start: 322, end: 341, arabicName: "الجزء السابع عشر (اقترب للناس)", englishName: "Juz 17" },
  18: { start: 342, end: 361, arabicName: "الجزء الثامن عشر (قد أفلح)", englishName: "Juz 18" },
  19: { start: 362, end: 381, arabicName: "الجزء التاسع عشر (وقال الذين)", englishName: "Juz 19" },
  20: { start: 382, end: 401, arabicName: "الجزء العشرون (أمن خلق)", englishName: "Juz 20" },
  21: { start: 402, end: 421, arabicName: "الجزء الحادي والعشرون (اتل ما أوحي)", englishName: "Juz 21" },
  22: { start: 422, end: 441, arabicName: "الجزء الثاني والعشرون (ومن يقنت)", englishName: "Juz 22" },
  23: { start: 442, end: 461, arabicName: "الجزء الثالث والعشرون (وما أنزلنا)", englishName: "Juz 23" },
  24: { start: 462, end: 481, arabicName: "الجزء الرابع والعشرون (فمن أظلم)", englishName: "Juz 24" },
  25: { start: 482, end: 502, arabicName: "الجزء الخامس والعشرون (إليه يرد)", englishName: "Juz 25" },
  26: { start: 502, end: 521, arabicName: "الجزء السادس والعشرون (حم)", englishName: "Juz 26" },
  27: { start: 522, end: 541, arabicName: "الجزء السابع والعشرون (قال فما خطبكم)", englishName: "Juz 27" },
  28: { start: 542, end: 561, arabicName: "الجزء الثامن والعشرون (قد سمع)", englishName: "Juz 28" },
  29: { start: 562, end: 581, arabicName: "الجزء التاسع والعشرون (تبارك)", englishName: "Juz 29" },
  30: { start: 582, end: 604, arabicName: "الجزء الثلاثون (عم يتساءلون)", englishName: "Juz 30" }
};

/**
 * Clean and normalize text if needed (e.g. handle Bismillah prefix removal for non-Fatiha surahs)
 */
function cleanAyahText(ayah) {
  let text = ayah.text;
  const bismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
  // In api.alquran.cloud uthmani edition, ayah 1 of surahs (except Surah 1 & 9) often prefixes bismillah
  if (ayah.surah.number !== 1 && ayah.surah.number !== 9 && ayah.numberInSurah === 1) {
    if (text.startsWith(bismillah)) {
      text = text.substring(bismillah.length).trim();
    }
  }
  return text;
}

/**
 * Fetch and process a Juz' pages
 */
async function getJuzPages(juzNumber) {
  const num = parseInt(juzNumber, 10);
  if (isNaN(num) || num < 1 || num > 30) {
    throw new Error('Invalid Juz number. Must be between 1 and 30.');
  }

  // 1. Check memory cache
  if (memoryCache.has(num)) {
    return memoryCache.get(num);
  }

  // 2. Check disk cache
  const cacheFile = path.join(CACHE_DIR, `juz_${num}.json`);
  if (fs.existsSync(cacheFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      memoryCache.set(num, data);
      return data;
    } catch (e) {
      console.error(`Error reading cache for Juz ${num}, refetching:`, e.message);
    }
  }

  // 3. Fetch from API
  console.log(`Fetching Juz ${num} from Quran API...`);
  const response = await fetch(`https://api.alquran.cloud/v1/juz/${num}/quran-uthmani`, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Quran data: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.code !== 200 || !json.data || !json.data.ayahs) {
    throw new Error('Invalid response structure from Quran API');
  }

  const ayahs = json.data.ayahs;
  const meta = JUZ_METADATA[num] || { start: ayahs[0].page, end: ayahs[ayahs.length - 1].page };

  // Group ayahs by page
  const pagesMap = new Map();

  for (const rawAyah of ayahs) {
    const pageNum = rawAyah.page;
    if (!pagesMap.has(pageNum)) {
      pagesMap.set(pageNum, {
        pageNumber: pageNum,
        relativePage: 0, // will calculate below
        surahs: [],
        ayahs: []
      });
    }

    const pageObj = pagesMap.get(pageNum);
    const surahExists = pageObj.surahs.some(s => s.number === rawAyah.surah.number);
    if (!surahExists) {
      pageObj.surahs.push({
        number: rawAyah.surah.number,
        name: rawAyah.surah.name,
        englishName: rawAyah.surah.englishName,
        revelationType: rawAyah.surah.revelationType,
        numberOfAyahs: rawAyah.surah.numberOfAyahs
      });
    }

    pageObj.ayahs.push({
      number: rawAyah.number,
      numberInSurah: rawAyah.numberInSurah,
      text: cleanAyahText(rawAyah),
      isFirstAyahInSurah: rawAyah.numberInSurah === 1,
      surah: {
        number: rawAyah.surah.number,
        name: rawAyah.surah.name,
        englishName: rawAyah.surah.englishName
      }
    });
  }

  // Sort pages and assign relative page numbers
  const pages = Array.from(pagesMap.values()).sort((a, b) => a.pageNumber - b.pageNumber);
  pages.forEach((page, index) => {
    page.relativePage = index + 1;
    page.totalJuzPages = pages.length;
  });

  const result = {
    juzNumber: num,
    arabicName: meta.arabicName,
    englishName: meta.englishName,
    startPage: pages[0]?.pageNumber || meta.start,
    endPage: pages[pages.length - 1]?.pageNumber || meta.end,
    totalPages: pages.length,
    pages
  };

  // Cache to disk and memory
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), 'utf8');
  } catch (err) {
    console.warn(`Could not save disk cache for Juz ${num}:`, err.message);
  }
  memoryCache.set(num, result);

  return result;
}

function getJuzMetadata(juzNumber) {
  return JUZ_METADATA[juzNumber] || null;
}

function getAllJuzMetadata() {
  return JUZ_METADATA;
}

module.exports = {
  getJuzPages,
  getJuzMetadata,
  getAllJuzMetadata
};
