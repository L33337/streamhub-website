import { pluralForms } from '../../i18n-core';
import type { UiLex } from '../types';

// Arabic — Modern Standard Arabic, streaming register (بث/ستريمر as commonly
// used). Plurals via Intl.PluralRules (Arabic has zero/one/two/few/many).
// Interpolated Latin names/numbers render correctly inside RTL prose via the
// Unicode bidi algorithm; the page applies dir="rtl" on prose blocks only.
const streamsN = (n: number) =>
  pluralForms('ar', n, {
    zero: 'لا توجد بثوث',
    one: 'بث واحد',
    two: 'بثان',
    few: `${n} بثوث`,
    many: `${n} بثًا`,
    other: `${n} بث`,
  });

export const ar: UiLex = {
  breadcrumb: {
    home: 'الرئيسية',
    streamers: 'الستريمرز',
  },
  hero: {
    featured: 'مميز',
    nowStreaming: 'يبث الآن:',
    avatarAlt: (name) => `الصورة الرمزية لـ ${name}`,
    showMore: 'عرض المزيد',
    showLess: 'عرض أقل',
  },
  promo: {
    valueProps: [
      'احفظ الستريمرز المفضلين لديك',
      'استلم إشعارًا لحظة بدء البث',
      'أضف أي ستريمر جديد خلال ثوانٍ',
    ],
    qrAria: 'رمز QR — امسحه بهاتفك لتحميل تطبيق Streamer Times',
    getApp: 'حمّل التطبيق',
  },
  lastStream: {
    heading: 'آخر بث',
    pastStream: 'بث سابق',
    watchVod: 'مشاهدة VOD ←',
    watchAria: (name, title) => `مشاهدة آخر بث لـ ${name}: ${title}`,
  },
  recent: {
    heading: 'البثوث الأخيرة',
    vodAria: (title) => `مشاهدة VOD: ${title}`,
  },
  channelStats: {
    heading: 'إحصاءات القناة',
    followers: 'المتابعون',
    subscribers: 'المشتركون',
    avgViewers: 'متوسط المشاهدين',
    medianDetail: 'وسيط 28 يومًا',
    peakViewers: 'ذروة المشاهدين',
    hoursStreamed: 'ساعات البث',
    lastNDays: (n) => `آخر ${n} يومًا`,
  },
  streamerRankings: {
    heading: 'التصنيفات',
    intro: (name) => `ترتيب ${name} في تصنيفات المذيعين لدينا.`,
    ofTotal: (total) => `من ${total}`,
    metric: {
      'most-followed': 'الأكثر متابعة',
      'most-watched': 'الأكثر مشاهدة',
      'most-active': 'الأكثر نشاطاً',
      'most-reliable': 'الأكثر التزاماً بالمواعيد',
      'fastest-growing': 'الأسرع نمواً',
    },
    rowAria: (rank, total, label) => `المرتبة ${rank} من ${total} في ${label}`,
    trendUp: (p) => `ارتفع ${p} مراكز منذ الأسبوع الماضي`,
    trendDown: (p) => `انخفض ${p} مراكز منذ الأسبوع الماضي`,
    byCategory: 'حسب الفئة',
    summary: (name, parts) => `${name} في ${parts.join(' و ')} على Streamer Times.`,
  },
  stats: {
    heading: (name) => `متى يبث ${name}؟`,
    // `tz` already contains "توقيت …" (cityTime) — no extra بتوقيت prefix,
    // which would double the word ("بتوقيت توقيت برلين").
    caption: (name, tz) =>
      `أوقات البث المعتادة لـ ${name} حسب يوم الأسبوع، معروضة حسب ${tz}`,
    colDay: 'اليوم',
    colTime: 'الوقت المعتاد',
    colDuration: 'المدة',
    usuallyNoStream: 'عادةً لا يوجد بث',
    streamsPerWeek: 'بثوث في الأسبوع',
    typicalLength: 'المدة المعتادة للبث',
    topCategories: 'أكثر الفئات بثًا',
    basedOn: (n, d) => `استنادًا إلى ${n} بثًا خلال آخر ${d} يومًا.`,
    allTimesIn: (tz) => `جميع الأوقات معروضة حسب ${tz}`,
    cityTime: (city) => `توقيت ${city}`,
    tzToggleYour: 'بتوقيتك',
    tzToggleAria: 'عرض الأوقات بـ',
    leadSentence: (name, days, times) => {
      const dayWord = pluralForms('ar', days, {
        one: 'يوم واحد',
        two: 'يومين',
        few: `${days} أيام`,
        many: `${days} يومًا`,
        other: `${days} يوم`,
      });
      const base = `يبث ${name} عادةً ${dayWord} في الأسبوع`;
      return times
        ? `${base}، غالبًا بين ${times.start} و${times.end} (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'الأسئلة الشائعة',
    qIsLive: (name) => `هل ${name} يبث الآن؟`,
    aIsLiveCat: (name, cat, platforms) =>
      `نعم — ${name} يبث الآن ${cat} على ${platforms}.`,
    aIsLive: (name, platforms) => `نعم — ${name} يبث مباشرة الآن على ${platforms}.`,
    qUsually: (name) => `متى يبث ${name} عادةً؟`,
    typicallyLast: (duration) => `تستمر البثوث عادةً نحو ${duration}.`,
    qSchedule: (name) => `ما جدول بث ${name}؟`,
    aScheduleLead: (name, n) => `لدى ${name} ${streamsN(n)} في الجدول للأيام السبعة القادمة.`,
    nextUp: (entry) => `التالي: ${entry}.`,
    afterThat: (list) => `بعد ذلك: ${list}.`,
    plusMore: (n) => `بالإضافة إلى ${n} أخرى — انظر الجدول الكامل أعلاه.`,
    // `tz` already contains "توقيت …" (cityTime) — no extra بتوقيت prefix.
    allTimesNote: (tz) => `جميع الأوقات معروضة حسب ${tz}.`,
    predictedNote:
      'الأوقات الموسومة كتوقعات مُقدّرة بالذكاء الاصطناعي من أنماط البث السابقة.',
    outsideDates: (name, time, tz) =>
      `خارج هذه المواعيد، يبدأ ${name} البث عادةً حوالي ${time} (${tz}) — انظر أوقات البث المعتادة أعلاه.`,
    predictedMarker: 'متوقع',
    qGames: (name) => `ما الألعاب التي يبثها ${name}؟`,
    aGamesOne: (name, cat) =>
      `${name} يبث ${cat} حاليًا. تصفح الجدول أعلاه لمعرفة البثوث القادمة.`,
    aGamesMany: (name, list) =>
      `${name} يبث ${list}. تصفح الجدول أعلاه لمعرفة ما هو قادم.`,
    qHowOften: (name) => `كم مرة يبث ${name}؟`,
    aAlwaysOn: (name, platforms) =>
      `${name} يبث على مدار الساعة — القناة دائمًا مباشرة على ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      `يبث ${name} في المتوسط نحو ${perWeek} مرات في الأسبوع، استنادًا إلى بثوث آخر ${windowDays} يومًا.`,
    aScheduleCount: (name, n, daysList) => {
      const base = `لدى ${name} ${streamsN(n)} في الجدول للأيام السبعة القادمة`;
      return daysList ? `${base}، في أيام ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `أين يمكنني مشاهدة ${name}؟`,
    aWhere: (name, platforms) =>
      `${name} يبث مباشرة على ${platforms}. أضف ${name} على Streamer Times لتتابع حالة البث والبثوث القادمة في مكان واحد.`,
    qTimezone: (name) => `في أي منطقة زمنية يبث ${name}؟`,
    aTimezone: (name, tzCity) =>
      `يقيم ${name} في المنطقة الزمنية ${tzCity}. يعرض الجدول في هذه الصفحة كل بث بتوقيتك المحلي وبالتوقيت المحلي لـ ${name}.`,
    qPredicted: (name) => `هل أوقات بث ${name} متوقعة أم مؤكدة؟`,
    aAllPredicted: (name) =>
      `أوقات البث القادمة لـ ${name} توقعات ذكاء اصطناعي مبنية على أنماط البث السابقة، وتُعرض كل منها باحتمالية مرتفعة أو متوسطة أو منخفضة. تظهر الأوقات المؤكدة هنا فور الإعلان عنها.`,
    aMixed: (name, predicted, total) =>
      `يجمع جدول ${name} بين توقعات الذكاء الاصطناعي والبثوث المؤكدة. ${predicted} من أصل ${total} من الأوقات القادمة متوقعة من الأنماط السابقة وتُعرض مع مستوى الاحتمالية.`,
  },
  empty: {
    heading: 'لا توجد بثوث مجدولة',
    body: (name, platforms) =>
      `نتابع بثوث ${name} المباشرة على ${platforms}. ستظهر توقعات الذكاء الاصطناعي والجداول المؤكدة هنا بعد جمع سجل كافٍ.`,
    browseAll: 'تصفح كل الستريمرز',
  },
  related: {
    heading: 'ستريمرز مشابهون',
    liveNowSr: '(يبث الآن)',
  },
  games: {
    heading: 'الألعاب',
    navAria: 'الألعاب التي يلعبها هذا الستريمر',
  },
  wiki: {
    teaserTitle: 'ويكي وحقائق',
    teaserSub: (name) => `العمر والثروة والمسيرة — الملف التعريفي لـ${name}`,
    breadcrumb: 'ويكي',
    heading: (name) => `${name} — ويكي`,
    metaTitle: (name, year) => `${name} ويكي ${year}: العمر والثروة وحقائق`,
    updated: (date) => `آخر تحديث: ${date}`,
    factsHeading: 'حقائق سريعة',
    factLabel: {
      real_name: 'الاسم الحقيقي',
      birth_date: 'تاريخ الميلاد',
      birthplace: 'مكان الميلاد',
      residence: 'محل الإقامة',
      nationality: 'الجنسية',
      relationship_status: 'الحالة العاطفية',
      net_worth_usd: 'صافي الثروة (تقديري)',
      est_income_monthly_usd: 'الدخل الشهري (تقديري)',
      career_start: 'يبث منذ',
      teams: 'الفرق والمنظمات',
      height_cm: 'الطول',
    },
    relationship: {
      single: 'أعزب/عزباء',
      in_relationship: 'في علاقة',
      engaged: 'مخطوب/مخطوبة',
      married: 'متزوج/متزوجة',
      divorced: 'مطلّق/مطلّقة',
      widowed: 'أرمل/أرملة',
    },
    ageSuffix: (age) => `العمر ${age} عامًا`,
    estimate: 'تقدير',
    asOf: (when) => `حتى ${when}`,
    sectionCareer: 'المسيرة',
    sectionPersonalLife: 'الحياة الشخصية',
    sectionEarnings: 'الأرباح والثروة',
    aboutHeading: (name) => `عن ${name}`,
    nextStreamHeading: 'البث القادم',
    fullSchedule: (name) => `جدول بث ${name} الكامل`,
    sourcesHeading: 'المصادر',
    minorNote: 'بالنسبة إلى الستريمرز دون 18 عامًا، ننشر معلومات المسيرة المهنية فقط.',
    disclaimerHeading: 'عن هذه الصفحة',
    disclaimer: (name) =>
      `جُمع هذا الملف التعريفي من مصادر متاحة للعامة. الأرقام مثل الثروة والدخل تقديرات من جهات خارجية وليست قيمًا مؤكدة؛ وتعكس المعلومات الشخصية ما أعلنه ${name} أو وسائل إعلام موثوقة.`,
    disclaimerContact: 'هل أنت هذا الستريمر وتريد تصحيح شيء أو إزالته؟ راسلنا:',
  },
};
