import { listConjunction, pluralForms } from '@/lib/i18n-core';
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

/** "16 يومًا" — counted days (quick fact: comeback of the week). */
const nDays = (n: number): string =>
  pluralForms('ar', n, {
    one: 'يوم واحد',
    two: 'يومين',
    few: `${n} أيام`,
    many: `${n} يومًا`,
    other: `${n} يوم`,
  });

/** "3 ستريمرز" — counted streamers (quick fact: category of the week). */
const nStreamers = (n: number): string =>
  pluralForms('ar', n, {
    one: 'ستريمر واحد',
    two: 'ستريمرين',
    few: `${n} ستريمرز`,
    many: `${n} ستريمرًا`,
    other: `${n} ستريمر`,
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
    quickFactsSub: 'أرقام من البثوث التي نتتبعها',
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
    factMarathonLabel: 'ماراثون الأسبوع',
    factMarathon: (name) => `هذه المدة التي بقي فيها ${name} على الهواء دفعة واحدة.`,
    factComebackLabel: 'عودة الأسبوع',
    factComeback: (name, days) => `عاد ${name} بعد ${nDays(days)} بلا بث.`,
    factPrimeTimeLabel: 'وقت الذروة',
    factPrimeTime: (total) =>
      `في هذه الساعة يبدأ أكبر عدد من البثوث، من إجمالي ${total} بث خلال 4 أسابيع.`,
    factBusiestDayLabel: 'أكثر أيام الأسبوع ازدحامًا',
    factBusiestDay: (total) =>
      `اليوم الذي يبدأ فيه أكبر عدد من البثوث، من إجمالي ${total} بث خلال 4 أسابيع.`,
    factLocalTimeNote: 'توقيتك المحلي',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'فئة الأسبوع',
    factTopCategory: (category, streamers) =>
      `بثوث ${category} في آخر 7 أيام، من ${nStreamers(streamers)}.`,
    factCompetitionLabel: 'مستوى المنافسة',
    factCompetition: (category) =>
      `هذا متوسط عدد القنوات المتتبَّعة التي تبث في ${category} في الوقت نفسه — أكثر فئة ازدحامًا لدينا.`,
    factRoomLabel: 'فرصة متاحة',
    factRoom: (category, channels) =>
      `مشاهدون لكل قناة في ${category}، مع ${channels} قنوات متتبَّعة فقط على الهواء في الوقت نفسه.`,
    factRoomSlotLabel: 'أفضل وقت',
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
  gameChips: {
    aria: (category) => `إحصاءات ${category}`,
    streamersLabel: (n) =>
      pluralForms('ar', n, {
        zero: 'ستريمر',
        one: 'ستريمر',
        two: 'ستريمر',
        few: 'ستريمرز',
        many: 'ستريمر',
        other: 'ستريمر',
      }),
    liveNowLabel: 'يبثون الآن',
    watchingLabel: 'يشاهدون',
    streamedLabel: 'من البث · 28 يومًا',
    streamsLabel: (n) =>
      pluralForms('ar', n, {
        zero: 'بثوث · 28 يومًا',
        one: 'بث · 28 يومًا',
        two: 'بثان · 28 يومًا',
        few: 'بثوث · 28 يومًا',
        many: 'بثًا · 28 يومًا',
        other: 'بث · 28 يومًا',
      }),
    peakLead: 'ذروة ',
    peakTail: ' مشاهدًا · 28 يومًا',
    trendTail: ' هذا الأسبوع',
    trendTitle: 'تغيّر عدد الستريمرز النشطين مقارنة بالأسبوع الماضي',
  },
  game: {
    notFoundTitle: 'اللعبة غير موجودة — StreamerTimes',
    metaTitle: (category) => `ستريمرز ${category} — البث المباشر والتصنيفات والمواعيد`,
    metaDescription: (category, names) => {
      const tail = `من يبث الآن، البثوث القادمة والمواعيد المتوقعة بالذكاء الاصطناعي على Twitch وYouTube.`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'ar')} في صدارة تصنيف ${category}. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'ar')} في صدارة تصنيف ${category}. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `ستريمرز ${category} الأكثر متابعة. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `ستريمرز ${category} — البث المباشر والتصنيفات والمواعيد`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${listConjunction(names, 'ar')} —` : ':';
      return `ستريمرز ${category} الأكثر متابعة${ogNames} حالة البث ومواعيد البثوث على Twitch وYouTube.`;
    },
    h1: (category) => `ستريمرز ${category} — البث المباشر والمواعيد`,
    intro: (shown, category, liveCount, upcomingCount, superlative) => {
      const lead = pluralForms('ar', shown, {
        zero: `لا يوجد ستريمرز لديهم بثوث ${category} هذا الأسبوع على Twitch وYouTube. `,
        one: `ستريمر واحد لديه بثوث ${category} مباشرة أو مجدولة هذا الأسبوع على Twitch وYouTube. `,
        two: `ستريمران لديهما بثوث ${category} مباشرة أو مجدولة هذا الأسبوع على Twitch وYouTube. `,
        few: `${shown} ستريمرز لديهم بثوث ${category} مباشرة أو مجدولة هذا الأسبوع على Twitch وYouTube. `,
        many: `${shown} ستريمر لديهم بثوث ${category} مباشرة أو مجدولة هذا الأسبوع على Twitch وYouTube. `,
        other: `${shown} ستريمر لديهم بثوث ${category} مباشرة أو مجدولة هذا الأسبوع على Twitch وYouTube. `,
      });
      const live = liveCount > 0 ? `${liveCount} يبثون الآن` : 'لا أحد يبث الآن';
      const upcoming =
        upcomingCount > 0
          ? pluralForms('ar', upcomingCount, {
              zero: '.',
              one: `، مع بث قادم واحد خلال الأيام السبعة المقبلة.`,
              two: `، مع بثين قادمين خلال الأيام السبعة المقبلة.`,
              few: `، مع ${upcomingCount} بثوث قادمة خلال الأيام السبعة المقبلة.`,
              many: `، مع ${upcomingCount} بثًا قادمًا خلال الأيام السبعة المقبلة.`,
              other: `، مع ${upcomingCount} بث قادم خلال الأيام السبعة المقبلة.`,
            })
          : '.';
      return lead + live + upcoming + superlative;
    },
    superlative: (category, name, value, isTwitch) =>
      ` صاحب أكبر عدد من ${isTwitch ? 'المتابعين' : 'المشتركين'} هنا هو ${name} بـ${value}.`,
    onPageAria: 'في هذه الصفحة',
    navLiveNow: 'مباشر الآن',
    navTopStreamers: 'أفضل الستريمرز',
    navBestTimes: 'أفضل الأوقات',
    navSchedule: 'المواعيد',
    navRelated: 'ألعاب مشابهة',
    followGame: (category) => `متابعة ${category}`,
    followingLabel: 'تتابعها',
    watchingNow: (category) => `يُبث الآن: ${category}`,
    liveStreamsAria: (category) => `بثوث ${category} المباشرة`,
    moreLiveAria: (category) => `مزيد من بثوث ${category} المباشرة`,
    showMoreLive: (n) =>
      pluralForms('ar', n, {
        zero: 'عرض قنوات مباشرة إضافية',
        one: 'عرض قناة مباشرة إضافية واحدة',
        two: 'عرض قناتين مباشرتين إضافيتين',
        few: `عرض ${n} قنوات مباشرة إضافية`,
        many: `عرض ${n} قناة مباشرة إضافية`,
        other: `عرض ${n} قناة مباشرة إضافية`,
      }),
    moreLiveInRanking: (n, category) =>
      `${n} آخرون يبثون الآن في تصنيف ${category} الكامل ←`,
    liveUpdatesNote: 'تُحدَّث حالة البث وأعداد المشاهدين كل بضع دقائق.',
    mostFollowed: (category) => `ستريمرز ${category} الأكثر متابعة`,
    tableCaption: (category) =>
      `ستريمرز ${category} مرتَّبون حسب عدد المتابعين، مع بثهم المتوقع التالي`,
    thRank: '#',
    thStreamer: 'الستريمر',
    thNextStream: 'البث التالي',
    thFollowers: 'المتابعون',
    thHours: 'الساعات / 28 يومًا',
    liveNowCell: 'مباشر الآن',
    seeFullRanking: (category) => `عرض تصنيف ${category} الكامل (أفضل 50) ←`,
    whoStreams: (category) => `ستريمرز يبثون ${category}`,
    whenStreamed: (category) => `متى يُبث ${category}؟`,
    heatmapSummary: (category) =>
      `معظم بثوث ${category} تجري {peak}{tz} — استنادًا إلى آخر 4 أسابيع من البثوث المتتبَّعة.`,
    heatmapSummaryEmpty: 'استنادًا إلى آخر 4 أسابيع من البثوث المتتبَّعة.',
    tzLocalSuffix: ' (بتوقيتك)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `خريطة حرارية أسبوعية لبثوث ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `خريطة حرارية أسبوعية لبثوث ${category}. النافذة الأكثر نشاطًا: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} من البث خلال 4 أسابيع',
    legendLess: 'أقل',
    legendMore: 'أكثر',
    heatmapDayNames: [
      'أيام الاثنين',
      'أيام الثلاثاء',
      'أيام الأربعاء',
      'أيام الخميس',
      'أيام الجمعة',
      'أيام السبت',
      'أيام الأحد',
    ],
    bestTimeToStream: (category) => `أفضل وقت لبث ${category}`,
    trendingBadge: '▲ رائج',
    bestTimeIntro: (category) =>
      `للستريمرز: النوافذ التي يكون فيها عدد مشاهدي ${category} الأعلى لكل قناة مباشرة.`,
    fullHeatmapLink: 'الخريطة الحرارية الكاملة للفرص والتحليل ←',
    bestSlotsAria: 'أفضل النوافذ الزمنية',
    viewersPerChannel: '~{score} مشاهد/قناة',
    timesLocalNote: 'الأوقات بتوقيتك المحلي.',
    timesUtcNote: 'الأوقات بتوقيت UTC.',
    quietTitle: (category) => `لا بثوث ${category} حاليًا`,
    quietBody: (category) =>
      `لا أحد من ستريمرز ${category} الذين نتتبعهم يبث الآن أو متوقع خلال الأيام السبعة المقبلة. تُحدَّث المواعيد وتوقعات الذكاء الاصطناعي عدة مرات يوميًا — عُد قريبًا.`,
    quietMeanwhile: 'في هذه الأثناء',
    seeWhosLive: 'شاهد من يبث الآن ←',
    browseAllGames: 'تصفح كل الألعاب',
    gameStreamersChip: (category) => `ستريمرز ${category}`,
    scheduleAria: (category) => `مواعيد بثوث ${category}`,
    upcomingStreams: (category) => `بثوث ${category} القادمة`,
    scheduleNote:
      'تتكيف الأوقات مع منطقتك الزمنية، مع عرض توقيت الستريمر بجانبها. تتبع الأيام تقويم UTC، لذا قد يظهر بث متأخر ليلًا تحت اليوم التالي.',
    filterAria: 'تصفية المواعيد',
    allPlatforms: 'كل المنصات',
    hideLowConfidence: 'إخفاء الاحتمالية المنخفضة',
    moreLowConfidence: (n) =>
      pluralForms('ar', n, {
        zero: 'لا توقعات إضافية منخفضة الاحتمالية',
        one: 'توقع إضافي واحد منخفض الاحتمالية',
        two: 'توقعان إضافيان منخفضا الاحتمالية',
        few: `${n} توقعات إضافية منخفضة الاحتمالية`,
        many: `${n} توقعًا إضافيًا منخفض الاحتمالية`,
        other: `${n} توقع إضافي منخفض الاحتمالية`,
      }),
    lowConfAria: (label) => `توقعات منخفضة الاحتمالية: ${label}`,
    hiddenNotShown: (n) =>
      pluralForms('ar', n, {
        zero: 'كل توقعات هذا اليوم معروضة.',
        one: 'توقع إضافي واحد لهذا اليوم غير معروض. افتح صفحة الستريمر لمواعيده الكاملة.',
        two: 'توقعان إضافيان لهذا اليوم غير معروضين. افتح صفحة الستريمر لمواعيده الكاملة.',
        few: `${n} توقعات إضافية لهذا اليوم غير معروضة. افتح صفحة الستريمر لمواعيده الكاملة.`,
        many: `${n} توقعًا إضافيًا لهذا اليوم غير معروض. افتح صفحة الستريمر لمواعيده الكاملة.`,
        other: `${n} توقع إضافي لهذا اليوم غير معروض. افتح صفحة الستريمر لمواعيده الكاملة.`,
      }),
    relatedGames: 'ألعاب مشابهة',
    relatedGamesAria: 'ألعاب مشابهة',
    relatedNote: 'ألعاب تتقاطع قوائم ستريمرزها خلال آخر 28 يومًا.',
    allGamesFooter: '→ كل الألعاب والفئات',
  },
  gameRanking: {
    notFoundTitle: 'غير موجود — StreamerTimes',
    metaTitle: (category, page) =>
      page === 1
        ? `أفضل ستريمرز ${category} — حسب المتابعين`
        : `أفضل ستريمرز ${category} — حسب المتابعين — الصفحة ${page}`,
    metaLeadIn: (name, value) => `${name} في الصدارة بـ${value} متابع. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}أفضل ستريمرز ${category} على Twitch وYouTube مرتَّبون حسب المتابعين، مع حالة البث والبثوث التالية. يُحدَّث يوميًا.`,
      `${leadIn}أفضل ستريمرز ${category} حسب المتابعين، مع حالة البث والبثوث التالية.`,
      `أفضل ستريمرز ${category} على Twitch وYouTube مرتَّبون حسب المتابعين، مع حالة البث والبثوث التالية. يُحدَّث يوميًا.`,
    ],
    ogTitle: (category) => `أفضل ستريمرز ${category} — حسب المتابعين`,
    h1: (category) => `أفضل ستريمرز ${category} حسب المتابعين`,
    introPage1: (count, category) =>
      `أفضل ${count} من ستريمرز ${category} الذين نتتبعهم، مرتَّبون حسب متابعي القناة ومشتركيها.`,
    topsTheList: (name, value, isTwitch) =>
      ` يتصدر القائمة ${name} بـ${value} ${isTwitch ? 'متابع' : 'مشترك'}.`,
    introPageN: (from, to, total, category) =>
      `المراكز ${from}–${to} من ${total} من ستريمرز ${category} الذين نتتبعهم، مرتَّبون حسب متابعي القناة ومشتركيها.`,
    methodology: (category) =>
      `ستريمرز نشطون في ${category} خلال آخر 28 يومًا، مرتَّبون حسب المتابعين. تُحدَّث الأرقام بانتظام وقد تتأخر عن أرقام المنصات.`,
    followersRefreshed: (label) => ` تحديث أعداد المتابعين: ${label}.`,
    warmingUp:
      'هذا التصنيف لا يزال قيد الإحماء — نحتاج مزيدًا من البيانات قبل أن يصبح ذا دلالة. عُد قريبًا.',
    missingDataNote:
      '— تعني أننا لم نجمع بعد بيانات كافية عن تلك القناة، مثل عيّنات المشاهدين للقنوات المضافة حديثًا.',
    sortAria: 'ترتيب التصنيف',
    sortFollowers: 'الأكثر متابعة',
    sortHours: 'الأكثر ساعات (28 يومًا)',
    sortViewers: 'الأكثر مشاهدة',
    filterLangAria: 'تصفية حسب اللغة',
    allChip: 'الكل',
    noMatch: 'لا يوجد ستريمرز يطابقون هذا الفلتر.',
    tableCaption: (category) => `ستريمرز ${category} مرتَّبون حسب عدد المتابعين`,
    thRank: '#',
    thStreamer: 'الستريمر',
    thFollowers: 'المتابعون',
    thAvgViewers: 'متوسط المشاهدين',
    thHours: 'الساعات (28 يومًا)',
    thShare: 'حصة اللعبة',
    thShareTitle: (category) =>
      `حصة ${category} من بثوث الستريمر الأخيرة`,
    thNextStream: 'البث التالي',
    liveNowCell: 'مباشر الآن',
    watchingTail: ' · {value} يشاهدون',
    trendNewBadge: 'جديد',
    trendNewTitle: 'لم يكن في هذا التصنيف قبل أسبوع',
    trendUpTemplate: 'صعد {n} منذ الأسبوع الماضي',
    trendDownTemplate: 'هبط {n} منذ الأسبوع الماضي',
    mainGameTemplate: 'اللعبة الأساسية: {share}% من البثوث الأخيرة',
    aboutRanking: 'عن هذا التصنيف',
    faqMostFollowedQ: (category) =>
      `من هو ستريمر ${category} الأكثر متابعة؟`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `، متقدمًا على ${second.name} بـ${second.value}` : '';
      return `${top.name} هو حاليًا ستريمر ${category} الأكثر ${top.isTwitch ? 'متابعة' : 'اشتراكًا'} ممن نتتبعهم، بـ${top.value}${runnerUp}. تُحدَّث الأرقام يوميًا.`;
    },
    faqHowManyQ: (category) => `كم عدد الستريمرز الذين يبثون ${category}؟`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` بثوا معًا نحو ${activity.hours} ساعة من ${category} في ${activity.streams} بثًا خلال آخر 28 يومًا.`
        : '';
      return `نتتبع حاليًا ${count} ستريمر بثوا ${category} مؤخرًا أو أدرجوه في مواعيدهم.${tail}`;
    },
    faqMeasuredQ: 'كيف يُقاس هذا التصنيف؟',
    faqMeasuredA: (category) =>
      `ستريمرز نشطون في ${category} خلال آخر 28 يومًا، مرتَّبون حسب عدد متابعي قناتهم الأساسية — متابعو القناة على Twitch أو المشتركون على YouTube. يأتي عمودا الساعات والحصة من تجميع ليلي لبثوث ${category} المنتهية.`,
    faqShareQ: 'ماذا تعني «حصة اللعبة»؟',
    faqShareA: (category) =>
      `حصة ${category} من بثوث الستريمر الأخيرة. 100% تعني أنها لعبته الوحيدة حاليًا؛ الحصة المنخفضة تدل على زائر عابر للفئة.`,
    relatedRankings: 'تصنيفات مشابهة',
    relatedRankingsAria: 'تصنيفات ألعاب مشابهة',
    liveAndSchedule: (category) => `البث المباشر ومواعيد ${category} ←`,
    allRankings: 'كل التصنيفات',
    paginationAria: (category) => `صفحات تصنيف ${category}`,
    prev: '→ السابق',
    next: 'التالي ←',
  },
};
