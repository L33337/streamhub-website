import { pluralForms } from '@/lib/i18n-core';
import type { HubLex } from './types';

/** "3 ستريمرز يبثون" — counted streamers, Arabic plural categories. */
const nStreamersLive = (n: number): string =>
  pluralForms('ar', n, {
    zero: 'لا يوجد ستريمرز يبثون',
    one: 'يبث ستريمر واحد',
    two: 'يبث ستريمران',
    few: `يبث ${n} ستريمرز`,
    many: `يبث ${n} ستريمرًا`,
    other: `يبث ${n} ستريمر`,
  });

/** "20 بثًا" — counted broadcasts for the Streamer Wiki stats line. */
const nStreams = (n: number): string =>
  pluralForms('ar', n, {
    zero: 'لا بثوث',
    one: 'بث واحد',
    two: 'بثان',
    few: `${n} بثوث`,
    many: `${n} بثًا`,
    other: `${n} بث`,
  });

/** "3 فئات" — counted categories. */
const nCategories = (n: number): string =>
  pluralForms('ar', n, {
    one: 'فئة واحدة',
    two: 'فئتين',
    few: `${n} فئات`,
    many: `${n} فئة`,
    other: `${n} فئة`,
  });

export const ar: HubLex = {
  crumbs: {
    aria: 'مسار التنقل',
    home: 'الرئيسية',
    liveNow: 'مباشر الآن',
    games: 'الألعاب',
    streamers: 'الستريمرز',
    rankings: 'التصنيفات',
    pageN: (n) => `الصفحة ${n}`,
  },
  common: {
    browseStreamersAZ: 'تصفّح كل الستريمرز من A إلى Z',
    allGamesCategories: 'كل الألعاب والفئات',
  },
  home: {
    browseAllGames: 'تصفّح كل الألعاب والفئات ←',
    seeLiveNow: 'شاهد كل من يبث مباشرة الآن ←',
  },
  homeFeed: {
    ticker: (liveCount, soonCount, soonHours) => {
      const live = liveCount > 0 ? `${liveCount} من الستريمرز في بث مباشر الآن` : '';
      const soon =
        soonCount > 0 ? `${soonCount} سيبدؤون خلال ${soonHours} ساعات القادمة` : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'الأكثر مشاهدة الآن',
    liveFilterCategory: 'الفئة',
    liveFilterLanguage: 'اللغة',
    liveFilterAllCategories: 'كل الفئات',
    liveFilterAllLanguages: 'كل اللغات',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `${count} بث مباشر`,
    liveFilterReset: 'إعادة تعيين',
    liveFilterEmpty: 'لا يوجد بث مباشر يطابق هذه الفلاتر الآن.',
    liveFilterNote: (top, total) =>
      `أفضل ${top} حسب عدد المشاهدين — تبحث الفلاتر في كل البث المباشر (${total})`,
    upNextTitle: 'برنامج اليوم',
    upNextLink: 'مباشر وسيبدأ قريبًا ←',
    lineupFilterTime: 'الوقت',
    lineupFilterAllTimes: 'أي وقت',
    lineupFilterFrom: (time) => `من ${time}`,
    lineupFilterMatches: (count) => `${count} بث`,
    lineupFilterEmpty: 'لا يوجد بث يطابق هذه الفلاتر.',
    chipAll: 'الكل',
    chipFavorites: 'مفضلاتي',
    lineupShowAll: (n) => `عرض كل البثوث (${n})`,
    lineupShowMore: (n) => `عرض ${n} إضافية`,
    lineupShowLess: 'عرض أقل',
    bellAria: (name) => `تلقَّ إشعارًا عندما يبدأ ${name} البث`,
    upsell: {
      bellTitle: 'لا تفوّت أي بث',
      bellBody:
        'احصل على إشعار فوري قبيل بداية البث — مع تطبيق Streamer Times المجاني.',
      favoritesTitle: 'مفضلاتك على بُعد لمسة',
      favoritesBody:
        'تابع الستريمرز وصفِّ هذه الصفحة إلى برنامجك الخاص — مجانًا، في التطبيق أو هنا في المتصفح مباشرة.',
      appCta: 'حمّل التطبيق',
      loginCta: 'سجّل الدخول مجانًا',
      close: 'ربما لاحقًا',
    },
    interrupt: {
      title: 'هذه الصفحة — بستريمرزك أنت فقط.',
      body: 'تابع الستريمرز المفضلين لديك ليتحوّل الدليل إلى خلاصتك الشخصية: برنامجك، إشعارات فورية قبيل بدء البث، وأبرز لحظات أسبوعهم.',
      note: 'يستغرق 30 ثانية · مجانًا',
      appCta: 'حمّل التطبيق',
      loginCta: 'سجّل الدخول عبر الويب',
    },
    clipsTitle: 'مقاطع الأسبوع',
    clipsFilterMatches: (count) => `${count} مقطع`,
    clipsFilterEmpty: 'لا توجد مقاطع تطابق هذه الفلاتر.',
    quickFactsTitle: 'حقائق سريعة',
    quickFactsSub: 'من آخر 7 أيام من البثوث المتتبَّعة',
    factPredictionLabel: 'فحص التوقعات',
    factPrediction: (hits, total) =>
      `في ${hits} من أصل ${total} توقعًا مرتفع الاحتمالية بدأ البث في غضون ساعتين من الموعد المتوقع.`,
    factPeakLabel: 'ذروة الأسبوع',
    factPeak: (name) => `حقق ${name} أعلى عدد مشاهدين متزامنين هذا الأسبوع.`,
    factReliableLabel: 'في الموعد تمامًا',
    factReliable: (name, hits, total) =>
      `بدأ ${name} في الموعد ${hits} من آخر ${total} بثًا معلنًا.`,
    factPauseLabel: 'في استراحة',
    factPause: (name) => `${name} في استراحة حتى هذا التاريخ.`,
    risersTitle: 'صاعدو الأسبوع',
    risersLink: 'كل التصنيفات ←',
    risersGained: (delta) => `${delta} متابعًا في 7 أيام`,
    mostStreamedTitle: 'الأكثر بثًا هذا الأسبوع',
    weekHours: (value) => `${value} ساعة بث · 7 أيام`,
    weekStreams: (n) => `${n} بثًا`,
    mostWatchedTitle: 'الأكثر مشاهدة',
    topStreamersCol: 'أفضل 5 ستريمرز',
    topCategoriesCol: 'أفضل 5 فئات',
    medianViewers: (value) => `${value} مشاهدًا (الوسيط)`,
    hoursStreamed: (value) => `${value} ساعة بث · 28 يومًا`,
    followers: (value) => `${value} متابعًا`,
    missingStreamer: 'ستريمرك غير موجود؟ ابحث عنه وأضفه ←',
    endcap: {
      title: 'خذ برنامجك معك.',
      bullets: [
        'تابع ستريمرزك المفضلين',
        'اعرف من يبث ومتى',
        'إحصائيات ومقاطع وأكثر!',
      ],
      webLead: 'تفضّل المتصفح؟',
      webLink: 'أنشئ حسابًا مجانيًا',
      webTail: '— خلاصتك في انتظارك.',
    },
    sessionBanner: {
      text: 'مرحبًا بعودتك — خلاصتك الشخصية جاهزة.',
      cta: 'إلى خلاصتي ←',
    },
    sectionNav: {
      aria: 'الانتقال إلى قسم',
      live: 'مباشر',
      lineup: 'اليوم',
      trending: 'الرائج',
      clips: 'مقاطع',
      stats: 'أرقام',
      discover: 'الستريمرز',
    },
  },
  hero: {
    claim: 'جدول البث. المقاطع. الإحصائيات. كل ذلك في مكان واحد.',
    ctaLogin: 'سجّل الدخول',
    ctaMid: ' أو ',
    ctaApp: 'حمّل التطبيق',
    ctaTail: ' لمتابعة صانعي المحتوى المفضّلين لديك.',
    ctaAppOnlyLink: 'حمّل التطبيق',
    ctaAppOnlyTail: ' لمتابعة صانعي المحتوى المفضّلين لديك.',
    kicker: 'دليل البث المباشر',
    badgeNew: 'جديد',
    badgeLive: 'متوفر الآن على iOS وAndroid',
    titleLead: 'جدول البث المباشر على ',
    titleTail: '',
    subtitle: 'دليل التلفزيون الخاص بالستريمرز.',
    bodyLead:
      'خلاصة واحدة لـ Twitch وYouTube. حالة البث في الوقت الفعلي، ومواعيد قادمة يتنبأ بها الذكاء الاصطناعي، وصفر ضجيج. مجانًا وبدون حساب —',
    bodyLink: 'حمّل التطبيق',
    bodyTail: 'لتصلك تنبيهات البث.',
    appStoreSub: 'تنزيل من',
    playSub: 'احصل عليه من',
    phoneAlt: 'ستريمرة تتصفح برنامج الليلة على هاتفها',
    phoneCaption: 'نتفقد برنامج الليلة',
    statBothLabel: 'منصتان، دليل واحد',
    statFavoritesValue: 'مفضلاتك',
    statFavoritesLabel: 'أضف أي قناة في ثوانٍ',
    statApiValue: 'واجهة API عامة',
    statApiLabel: 'قريبًا · انضم إلى قائمة الانتظار',
  },
  upcoming: {
    heading: 'التالي في البرنامج',
    aria: 'البثوث القادمة',
    empty: 'لا شيء مجدولًا الآن — عد قريبًا.',
  },
  trending: {
    heading: 'الرائج على Twitch',
    subtitle: 'ما يشاهده Twitch كله الآن.',
    aria: 'الألعاب الرائجة على Twitch',
    rankOnTwitch: (rank) => `المركز ${rank}# على Twitch`,
    sortAria: 'ترتيب الألعاب',
    sortTwitch: 'Twitch',
    sortHours: 'ساعات',
    sortViewers: 'مشاهدون',
    sortStreamers: 'ستريمرز',
    liveViewers: (value) => `${value} يشاهدون الآن`,
    streamerCount: (value, count) =>
      pluralForms('ar', count, {
        one: 'ستريمر واحد',
        two: 'ستريمران',
        few: `${value} ستريمرز`,
        many: `${value} ستريمرًا`,
        other: `${value} ستريمر`,
      }),
  },
  popular: {
    heading: 'ستريمرز مشهورون',
    viewAll: 'عرض كل الستريمرز ←',
  },
  streamerWiki: {
    // Brand term — stays untranslated in every locale, like "Streamer Times".
    heading: 'Streamer Wiki',
    subline: 'من هم، وماذا يلعبون، ومتى يبدأون البث.',
    viewAll: 'تصفح كل الستريمرز ←',
    followers: (value) => `≈${value} متابعًا`,
    streams28d: (count) => `${nStreams(count)} خلال 28 يومًا`,
    liveNow: 'يبث الآن',
    nextPrefix: 'التالي',
  },
  apiPromo: {
    heading: 'واجهة API للمطورين',
    comingSoon: 'قريبًا',
    eyebrow: 'للمطورين',
    headlineLead: 'ابنِ على البيانات نفسها —',
    headlineKey: 'قريبًا، عبر واجهة API الخاصة بنا.',
    body: 'نستقبل حاليًا الشركاء التجريبيين الأوائل. انضم إلى قائمة الانتظار وسنراسلك فور فتح الوصول العام — مع خطة مجانية لمطوري الإندي.',
    bullets: [
      'حالة البث وأعداد المشاهدين في الوقت الفعلي',
      'مواعيد قادمة يتنبأ بها الذكاء الاصطناعي مع مستوى ثقة',
      'Webhooks لأحداث «بدأ البث»',
      'مواصفة OpenAPI مضمّنة',
    ],
    cta: 'انضم إلى قائمة الانتظار',
  },
  live: {
    h1: 'مباشر الآن على Twitch وYouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `${nStreamersLive(liveCount)} الآن` +
      (categoryCount > 0 ? ` عبر ${nCategories(categoryCount)} من الألعاب والفئات` : '') +
      '.' +
      (soonCount > 0
        ? ` ومن المقرر أن ${soonCount === 1 ? 'يبدأ ستريمر آخر' : `يبدأ ${soonCount} آخرون`} خلال الساعات الـ${soonHours} القادمة.`
        : ''),
    introEmpty: 'لا أحد يبث مباشرة الآن — إليك من سيبدأ قريبًا.',
    error: 'حالة البث غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.',
    otherCategory: 'أخرى',
    categoryLiveAria: (name) => `${name} — مباشر الآن`,
    nLive: (n) => `${n} مباشر`,
    jumpToGame: 'الانتقال إلى لعبة',
    startingSoon: 'يبدأ قريبًا',
    nextNHours: (n) => `الساعات الـ${n} القادمة`,
    emptyAll:
      'لا شيء مباشرًا الآن ولا شيء على وشك البدء. تصفّح دليل الستريمرز الكامل أو استكشف الألعاب لتجد بثك التالي.',
    itemListName: 'ستريمرز يبثون مباشرة الآن على Twitch وYouTube',
  },
  streamers: {
    h1: 'كل ستريمرز Twitch وYouTube من A إلى Z',
    intro:
      'كل ستريمر نتتبعه على Streamer Times — شاهد من يبث الآن وما الذي سيبثونه لاحقًا. تصفّح القائمة الكاملة صفحة بصفحة.',
    pageOf: (page, totalPages) => `الصفحة ${page} من ${totalPages}.`,
    error: 'الستريمرز غير متاحين مؤقتًا. حاول مرة أخرى بعد قليل.',
    paginationAria: 'ترقيم الصفحات',
    prev: '→ السابق',
    next: 'التالي ←',
  },
  games: {
    liveRightNow: 'مباشر الآن',
    liveAria: 'ألعاب فيها بث مباشر',
    error: 'الألعاب غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.',
    aboutHeading: 'عن هذه الألعاب',
    updatedAt: (stamp) => `آخر تحديث ${stamp}.`,
    relatedAria: 'صفحات ذات صلة',
  },
  gamesRoot: {
    h1: 'أشهر الألعاب على Twitch وYouTube',
    methodologyNote:
      'مرتبة حسب عدد الستريمرز الذين نتتبعهم في كل فئة خلال آخر 28 يومًا.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `نتتبع ${gameCount} لعبة وفئة على Twitch وYouTube.`;
      const note = 'مرتبة حسب عدد الستريمرز الذين نتتبعهم في كل فئة خلال آخر 28 يومًا.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `${nStreamersLive(liveStreamerCount)} الآن`;
      const across = liveGameCount > 0 ? ` في ${nCategories(liveGameCount)}` : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'ما أشهر لعبة على Twitch وYouTube؟',
    faqPopularA: (top, second) =>
      `${top.category} لديها أكبر عدد من الستريمرز الذين نتتبعهم — بثتها ${pluralForms('ar', top.count, {
        one: 'قناة واحدة',
        two: 'قناتان',
        few: `${top.count} قنوات`,
        many: `${top.count} قناة`,
        other: `${top.count} قناة`,
      })} خلال آخر 28 يومًا${second ? `، متقدمةً على ${second.category} برصيد ${second.count}` : ''}.`,
    faqWhoQ: 'من يبث الآن؟',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `${nStreamersLive(liveStreamerCount)} في ${nCategories(liveGameCount)}. افتح أي فئة لترى القنوات المباشرة وبثوثها القادمة.`,
    faqRankedQ: 'كيف تُرتَّب هذه الألعاب؟',
    faqRankedA: (gameCount) =>
      `مرتبة حسب عدد الستريمرز الذين نتتبعهم في كل فئة خلال آخر 28 يومًا. تأتي الأرقام من تجميع ليلي للبثوث المنتهية عبر ${gameCount} لعبة؛ وتتحدث الأرقام المباشرة كل بضع دقائق.`,
    faqHoursQ: 'هل تعني «ساعات البث» وقت المشاهدة؟',
    faqHoursA:
      'لا. ساعات البث هي مدة بقاء الستريمرز على الهواء في فئة ما. نحن لا نسجل وقت مشاهدة الجمهور؛ وأعداد المشاهدين المباشرين على البطاقات عينة لحظية، وليست مجموعًا.',
  },
  rankings: {
    h1: 'تصنيفات الستريمرز',
    intro: (n) =>
      `من هم الستريمرز الأكبر والأسرع نموًا والأكثر نشاطًا والأكثر انضباطًا على Twitch وYouTube؟ ${n} قوائم تصنيف تغطي كل ستريمر نتتبعه — تُحدَّث يوميًا من بيانات بث حقيقية.`,
    dataRefreshed: (label) => ` تم تحديث البيانات في ${label}.`,
    statStreamersTracked: 'ستريمر نتتبعهم',
    statLiveNow: 'مباشر الآن',
    statGamesCategories: 'لعبة وفئة',
    seeFullRanking: 'عرض التصنيف الكامل ←',
    warmingUp: 'قوائم التصنيف ما زالت تُجهَّز — عد قريبًا.',
    byGameHeading: 'التصنيفات حسب اللعبة',
    byGameSubtitle: 'الستريمرز الأكثر متابعة في كل لعبة وفئة.',
    byGameAria: 'تصنيفات الألعاب الشائعة',
    topGameStreamers: (category) => `أفضل ستريمرز ${category}`,
    whoIsLive: 'من يبث مباشرة الآن؟',
    climbersThisWeek: 'أكبر الصاعدين هذا الأسبوع',
    metricH1: {
      'most-followed': 'الستريمرز الأكثر متابعة',
      'fastest-growing': 'الستريمرز الأسرع نموًا',
      'most-watched': 'الستريمرز الأكثر مشاهدة',
      'most-active': 'الستريمرز الأكثر نشاطًا',
      'most-reliable': 'الستريمرز الأكثر التزامًا بالمواعيد',
    },
    metricNote: {
      'most-followed':
        'يُحدَّث يوميًا. تُحدَّث أعداد المتابعين والمشتركين بانتظام وقد تتأخر عن الأرقام الحية على المنصات.',
      'fastest-growing':
        'الزيادة في متابعي القناة (Twitch) أو المشتركين (YouTube) خلال آخر 7 أيام، من لقطات يومية لكل قناة نتتبعها. تدخل التصنيف القنوات ذات النمو الإيجابي فقط. يُحدَّث يوميًا.',
      'most-watched':
        'وسيط المشاهدين المتزامنين للبث المباشر خلال آخر 28 يومًا (عينات كل ساعة). يُحدَّث يوميًا.',
      'most-active':
        'إجمالي ساعات البث المباشر خلال آخر 28 يومًا. يُحسب كل بث مرة واحدة؛ وتُستبعد قنوات البث الدائم 24/7. يُحدَّث يوميًا.',
      'most-reliable':
        'نسبة البثوث المعلنة على Twitch التي بدأت فعلًا في حدود ±30 دقيقة، على آخر 20 بثًا معلنًا خلال 90 يومًا (بحد أدنى 10 بثوث مقيَّمة). يُحدَّث يوميًا.',
    },
  },
};
