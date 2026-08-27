import type { UiLang } from './i18n-core';

// --- Global chrome lexicon (server-rendered) ------------------------------------
//
// Strings for the site chrome that wraps every localized page: header/nav,
// footer, mobile menu and the 404 page. The layout and footer are server
// components — they resolve the locale once and pass plain strings down as
// props to any client components (the mobile menu), so this module never lands
// in a client bundle by itself. Keep it free of server-only imports anyway:
// props-drilled strings may cross the client boundary.
//
// The 'en' entries are byte-identical to the previously hardcoded strings;
// pages without a locale render exactly as before.
//
// Translation register (see lib/i18n-slot.ts header for the full spec):
// - Informal streaming tone; German uses du-form, French tu-form, Japanese
//   polite です/ます.
// - Brand names (Twitch, YouTube, Streamer Times, App Store, Google Play) and
//   "Impressum" (German legal term) stay untranslated.
// - All non-English strings are AI-authored (reviewed via an adversarial
//   AI pass 2026-07; no native-speaker review yet — accepted risk).

export interface ChromeLex {
  nav: {
    live: string;
    streamers: string;
    games: string;
    rankings: string;
    getApp: string;
    /** Header sign-in button (visible only when the auth UI is unhidden). */
    signIn: string;
    /** aria-label on the hamburger button. */
    openMenu: string;
    /** aria-label on the mobile-menu close button. */
    closeMenu: string;
    /** Keep the … ellipsis character in every language. */
    searchPlaceholder: string;
    /** aria-label on the search results listbox. */
    searchResults: string;
    /** aria-label on the collapsed search button (below `lg`). */
    openSearch: string;
    /** aria-label on the close button of the expanded mobile search. */
    closeSearch: string;
    /** M22 S4.1: sr-only label of the search input (no ellipsis). */
    searchLabel: string;
    /** Live-search dropdown states (client-side only, never in SSR HTML). */
    searching: string;
    searchError: string;
    /** {q} is replaced client-side with the query. */
    searchViewAll: string;
    /** aria-label on the footer wordmark link. */
    home: string;
  };
  /**
   * Section switcher shown above the heading on the three signed-in pages
   * (/feed, /program, /favorites). The three labels double as each page's
   * <h1>, so the active tab always matches the page title.
   */
  feedNav: {
    /** aria-label on the <nav> switcher. */
    sections: string;
    feed: string;
    program: string;
    favorites: string;
  };
  footer: {
    /** Column heading. */
    discover: string;
    /** Column heading. */
    developers: string;
    /** Column heading. */
    legal: string;
    /** Column heading for the language switcher. */
    languages: string;
    liveNow: string;
    /** Footer link to the /tonight evening guide. */
    tonight: string;
    allStreamers: string;
    allGames: string;
    rankings: string;
    popularStreamers: string;
    getTheApp: string;
    publicApi: string;
    /**
     * Footer link to /methodology/predictions (2026-08-27). Also reused as the
     * "read more" label under prediction FAQs and in the slot reasoning box —
     * one string, one translation, one place to change it.
     */
    howPredictionsWork: string;
    support: string;
    privacy: string;
    terms: string;
    /** German legal term — stays "Impressum" in ALL languages. */
    impressum: string;
    tagline: string;
    /** Rendered after '© {year} '. */
    copyrightTail: string;
    appStoreAria: string;
    playStoreAria: string;
  };
  notFound: {
    /** '404' everywhere — the number IS the message. */
    kicker: string;
    title: string;
    body: string;
    home: string;
    liveNow: string;
    browseStreamers: string;
    games: string;
    getApp: string;
  };
}

export const CHROME_STRINGS: Record<UiLang, ChromeLex> = {
  en: {
    nav: {
      live: 'Live',
      streamers: 'Streamers',
      games: 'Games',
      rankings: 'Rankings',
      getApp: 'Get the App',
      signIn: 'Sign in',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      searchPlaceholder: 'Search streamers…',
      searchResults: 'Search results',
      openSearch: 'Open search',
      closeSearch: 'Close search',
      searchLabel: 'Search streamers',
      searching: 'Searching…',
      searchError: 'Search is unavailable right now.',
      searchViewAll: 'View all results for “{q}” →',
      home: 'Streamer Times home',
    },
    feedNav: {
      sections: 'Your sections',
      feed: 'My Feed',
      program: 'Program',
      favorites: 'My Favorites',
    },
    footer: {
      discover: 'Discover',
      developers: 'Developers',
      legal: 'Legal',
      languages: 'Languages',
      liveNow: 'Live now',
      tonight: 'Streaming tonight',
      allStreamers: 'All streamers',
      allGames: 'All games',
      rankings: 'Streamer rankings',
      popularStreamers: 'Popular streamers',
      getTheApp: 'Get the app',
      publicApi: 'Public API',
      howPredictionsWork: 'How predictions work',
      support: 'Support',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      impressum: 'Impressum',
      tagline: 'Your Livestream Guide for Twitch & YouTube.',
      copyrightTail: 'Streamer Times — Your Livestream Guide.',
      appStoreAria: 'Download on the App Store',
      playStoreAria: 'Get it on Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'Page not found',
      body: 'We couldn’t find that page. It may have moved, or the link may be broken. Try one of these instead:',
      home: 'Home',
      liveNow: "Who's live now",
      browseStreamers: 'Browse streamers',
      games: 'Games',
      getApp: 'Get the app',
    },
  },
  de: {
    nav: {
      live: 'Live',
      streamers: 'Streamer',
      games: 'Spiele',
      rankings: 'Rankings',
      getApp: 'Hol dir die App',
      signIn: 'Anmelden',
      openMenu: 'Menü öffnen',
      closeMenu: 'Menü schließen',
      searchPlaceholder: 'Streamer suchen…',
      searchResults: 'Suchergebnisse',
      openSearch: 'Suche öffnen',
      closeSearch: 'Suche schließen',
      searchLabel: 'Streamer suchen',
      searching: 'Suche läuft…',
      searchError: 'Die Suche ist gerade nicht verfügbar.',
      searchViewAll: 'Alle Ergebnisse für „{q}“ →',
      home: 'Streamer Times Startseite',
    },
    feedNav: {
      sections: 'Deine Bereiche',
      feed: 'Mein Feed',
      program: 'Programm',
      favorites: 'Meine Favoriten',
    },
    footer: {
      discover: 'Entdecken',
      developers: 'Entwickler',
      legal: 'Rechtliches',
      languages: 'Sprachen',
      liveNow: 'Jetzt live',
      tonight: 'Streams heute Abend',
      allStreamers: 'Alle Streamer',
      allGames: 'Alle Spiele',
      rankings: 'Streamer-Rankings',
      popularStreamers: 'Beliebte Streamer',
      getTheApp: 'Hol dir die App',
      publicApi: 'Öffentliche API',
      howPredictionsWork: 'Wie Prognosen entstehen',
      support: 'Support',
      privacy: 'Datenschutzerklärung',
      terms: 'Nutzungsbedingungen',
      impressum: 'Impressum',
      tagline: 'Dein Livestream-Guide für Twitch & YouTube.',
      copyrightTail: 'Streamer Times — Dein Livestream-Guide.',
      appStoreAria: 'Im App Store laden',
      playStoreAria: 'Jetzt bei Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'Seite nicht gefunden',
      body: 'Diese Seite konnten wir nicht finden. Vielleicht wurde sie verschoben oder der Link ist kaputt. Probier stattdessen eine dieser Seiten:',
      home: 'Startseite',
      liveNow: 'Wer ist gerade live?',
      browseStreamers: 'Alle Streamer durchstöbern',
      games: 'Spiele',
      getApp: 'Hol dir die App',
    },
  },
  es: {
    nav: {
      live: 'En directo',
      streamers: 'Streamers',
      games: 'Juegos',
      rankings: 'Rankings',
      getApp: 'Descarga la app',
      signIn: 'Iniciar sesión',
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
      searchPlaceholder: 'Buscar streamers…',
      searchResults: 'Resultados de búsqueda',
      openSearch: 'Abrir búsqueda',
      closeSearch: 'Cerrar búsqueda',
      searchLabel: 'Buscar streamers',
      searching: 'Buscando…',
      searchError: 'La búsqueda no está disponible ahora mismo.',
      searchViewAll: 'Ver todos los resultados de “{q}” →',
      home: 'Inicio de Streamer Times',
    },
    feedNav: {
      sections: 'Tus secciones',
      feed: 'Mi feed',
      program: 'Programación',
      favorites: 'Mis favoritos',
    },
    footer: {
      discover: 'Descubre',
      developers: 'Desarrolladores',
      legal: 'Legal',
      languages: 'Idiomas',
      liveNow: 'En directo ahora',
      tonight: 'Directos esta noche',
      allStreamers: 'Todos los streamers',
      allGames: 'Todos los juegos',
      rankings: 'Rankings de streamers',
      popularStreamers: 'Streamers populares',
      getTheApp: 'Descarga la app',
      publicApi: 'API pública',
      howPredictionsWork: 'Cómo funcionan las predicciones',
      support: 'Soporte',
      privacy: 'Política de privacidad',
      terms: 'Términos de servicio',
      impressum: 'Impressum',
      tagline: 'Tu guía de livestreams para Twitch y YouTube.',
      copyrightTail: 'Streamer Times — Tu guía de livestreams.',
      appStoreAria: 'Descargar en el App Store',
      playStoreAria: 'Disponible en Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'Página no encontrada',
      body: 'No hemos encontrado esa página. Puede que se haya movido o que el enlace esté roto. Prueba con una de estas:',
      home: 'Inicio',
      liveNow: 'Quién está en directo',
      browseStreamers: 'Ver todos los streamers',
      games: 'Juegos',
      getApp: 'Descarga la app',
    },
  },
  fr: {
    nav: {
      live: 'En direct',
      streamers: 'Streamers',
      games: 'Jeux',
      rankings: 'Classements',
      getApp: `Télécharge l'app`,
      signIn: 'Se connecter',
      openMenu: 'Ouvrir le menu',
      closeMenu: 'Fermer le menu',
      searchPlaceholder: 'Rechercher un streamer…',
      searchResults: 'Résultats de recherche',
      openSearch: 'Ouvrir la recherche',
      closeSearch: 'Fermer la recherche',
      searchLabel: 'Rechercher des streamers',
      searching: 'Recherche…',
      searchError: 'La recherche est indisponible pour le moment.',
      searchViewAll: 'Voir tous les résultats pour « {q} » →',
      home: 'Accueil Streamer Times',
    },
    feedNav: {
      sections: 'Tes sections',
      feed: 'Mon fil',
      program: 'Programme',
      favorites: 'Mes favoris',
    },
    footer: {
      discover: 'Découvrir',
      developers: 'Développeurs',
      legal: 'Légal',
      languages: 'Langues',
      liveNow: 'En direct maintenant',
      tonight: 'Streams ce soir',
      allStreamers: 'Tous les streamers',
      allGames: 'Tous les jeux',
      rankings: 'Classements des streamers',
      popularStreamers: 'Streamers populaires',
      getTheApp: `Télécharge l'app`,
      publicApi: 'API publique',
      howPredictionsWork: 'Comment fonctionnent les prédictions',
      support: 'Support',
      privacy: 'Politique de confidentialité',
      terms: `Conditions d'utilisation`,
      impressum: 'Impressum',
      tagline: 'Ton guide des livestreams pour Twitch & YouTube.',
      copyrightTail: 'Streamer Times — Ton guide des livestreams.',
      appStoreAria: `Télécharger dans l'App Store`,
      playStoreAria: 'Disponible sur Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'Page introuvable',
      body: `Impossible de trouver cette page. Elle a peut-être été déplacée, ou le lien est cassé. Essaie plutôt l'une de ces pages :`,
      home: 'Accueil',
      liveNow: 'Qui est en direct',
      browseStreamers: 'Parcourir les streamers',
      games: 'Jeux',
      getApp: `Télécharge l'app`,
    },
  },
  pt: {
    nav: {
      live: 'Ao vivo',
      streamers: 'Streamers',
      games: 'Jogos',
      rankings: 'Rankings',
      getApp: 'Baixe o app',
      signIn: 'Entrar',
      openMenu: 'Abrir menu',
      closeMenu: 'Fechar menu',
      searchPlaceholder: 'Buscar streamers…',
      searchResults: 'Resultados da busca',
      openSearch: 'Abrir a busca',
      closeSearch: 'Fechar a busca',
      searchLabel: 'Buscar streamers',
      searching: 'Buscando…',
      searchError: 'A busca está indisponível agora.',
      searchViewAll: 'Ver todos os resultados de “{q}” →',
      home: 'Página inicial do Streamer Times',
    },
    feedNav: {
      sections: 'Suas seções',
      feed: 'Meu feed',
      program: 'Programação',
      favorites: 'Meus favoritos',
    },
    footer: {
      discover: 'Descubra',
      developers: 'Desenvolvedores',
      legal: 'Legal',
      languages: 'Idiomas',
      liveNow: 'Ao vivo agora',
      tonight: 'Streams hoje à noite',
      allStreamers: 'Todos os streamers',
      allGames: 'Todos os jogos',
      rankings: 'Rankings de streamers',
      popularStreamers: 'Streamers populares',
      getTheApp: 'Baixe o app',
      publicApi: 'API pública',
      howPredictionsWork: 'Como funcionam as previsões',
      support: 'Suporte',
      privacy: 'Política de Privacidade',
      terms: 'Termos de Serviço',
      impressum: 'Impressum',
      tagline: 'Seu guia de livestreams para Twitch e YouTube.',
      copyrightTail: 'Streamer Times — Seu guia de livestreams.',
      appStoreAria: 'Baixar na App Store',
      playStoreAria: 'Disponível no Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'Página não encontrada',
      body: 'Não encontramos essa página. Ela pode ter sido movida, ou o link pode estar quebrado. Tente uma destas:',
      home: 'Início',
      liveNow: 'Quem está ao vivo',
      browseStreamers: 'Ver todos os streamers',
      games: 'Jogos',
      getApp: 'Baixe o app',
    },
  },
  it: {
    nav: {
      live: 'In diretta',
      streamers: 'Streamer',
      games: 'Giochi',
      rankings: 'Classifiche',
      getApp: `Scarica l'app`,
      signIn: 'Accedi',
      openMenu: 'Apri il menu',
      closeMenu: 'Chiudi il menu',
      searchPlaceholder: 'Cerca streamer…',
      searchResults: 'Risultati della ricerca',
      openSearch: 'Apri la ricerca',
      closeSearch: 'Chiudi la ricerca',
      searchLabel: 'Cerca streamer',
      searching: 'Ricerca in corso…',
      searchError: 'La ricerca non è disponibile al momento.',
      searchViewAll: 'Vedi tutti i risultati per “{q}” →',
      home: 'Home di Streamer Times',
    },
    feedNav: {
      sections: 'Le tue sezioni',
      feed: 'Il mio feed',
      program: 'Programma',
      favorites: 'I miei preferiti',
    },
    footer: {
      discover: 'Scopri',
      developers: 'Sviluppatori',
      legal: 'Note legali',
      languages: 'Lingue',
      liveNow: 'In diretta ora',
      tonight: 'Stream di stasera',
      allStreamers: 'Tutti gli streamer',
      allGames: 'Tutti i giochi',
      rankings: 'Classifiche degli streamer',
      popularStreamers: 'Streamer popolari',
      getTheApp: `Scarica l'app`,
      publicApi: 'API pubblica',
      howPredictionsWork: 'Come funzionano le previsioni',
      support: 'Supporto',
      privacy: 'Informativa sulla privacy',
      terms: 'Termini di servizio',
      impressum: 'Impressum',
      tagline: 'La tua guida ai livestream per Twitch e YouTube.',
      copyrightTail: 'Streamer Times — La tua guida ai livestream.',
      appStoreAria: `Scarica dall'App Store`,
      playStoreAria: 'Disponibile su Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'Pagina non trovata',
      body: 'Non siamo riusciti a trovare questa pagina. Forse è stata spostata o il link non funziona più. Prova con una di queste:',
      home: 'Home',
      liveNow: 'Chi è in diretta ora',
      browseStreamers: 'Sfoglia gli streamer',
      games: 'Giochi',
      getApp: `Scarica l'app`,
    },
  },
  ru: {
    nav: {
      live: 'В эфире',
      streamers: 'Стримеры',
      games: 'Игры',
      rankings: 'Рейтинги',
      getApp: 'Скачать приложение',
      signIn: 'Войти',
      openMenu: 'Открыть меню',
      closeMenu: 'Закрыть меню',
      searchPlaceholder: 'Поиск стримеров…',
      searchResults: 'Результаты поиска',
      openSearch: 'Открыть поиск',
      closeSearch: 'Закрыть поиск',
      searchLabel: 'Поиск стримеров',
      searching: 'Ищем…',
      searchError: 'Поиск сейчас недоступен.',
      searchViewAll: 'Все результаты по запросу «{q}» →',
      home: 'Главная Streamer Times',
    },
    feedNav: {
      sections: 'Ваши разделы',
      feed: 'Моя лента',
      program: 'Программа',
      favorites: 'Избранное',
    },
    footer: {
      discover: 'Обзор',
      developers: 'Разработчикам',
      legal: 'Правовая информация',
      languages: 'Языки',
      liveNow: 'Сейчас в эфире',
      tonight: 'Сегодня вечером',
      allStreamers: 'Все стримеры',
      allGames: 'Все игры',
      rankings: 'Рейтинги стримеров',
      popularStreamers: 'Популярные стримеры',
      getTheApp: 'Скачать приложение',
      publicApi: 'Публичный API',
      howPredictionsWork: 'Как работают прогнозы',
      support: 'Поддержка',
      privacy: 'Политика конфиденциальности',
      terms: 'Условия использования',
      impressum: 'Impressum',
      tagline: 'Ваш гид по стримам на Twitch и YouTube.',
      copyrightTail: 'Streamer Times — ваш гид по стримам.',
      appStoreAria: 'Загрузить в App Store',
      playStoreAria: 'Доступно в Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'Страница не найдена',
      body: 'Мы не смогли найти эту страницу. Возможно, её переместили или ссылка не работает. Попробуйте одну из этих:',
      home: 'Главная',
      liveNow: 'Кто сейчас в эфире',
      browseStreamers: 'Все стримеры',
      games: 'Игры',
      getApp: 'Скачать приложение',
    },
  },
  ja: {
    nav: {
      live: '配信中',
      streamers: 'ストリーマー',
      games: 'ゲーム',
      rankings: 'ランキング',
      getApp: 'アプリを入手',
      signIn: 'ログイン',
      openMenu: 'メニューを開く',
      closeMenu: 'メニューを閉じる',
      searchPlaceholder: 'ストリーマーを検索…',
      searchResults: '検索結果',
      openSearch: '検索を開く',
      closeSearch: '検索を閉じる',
      searchLabel: 'ストリーマーを検索',
      searching: '検索中…',
      searchError: '現在検索を利用できません。',
      searchViewAll: '「{q}」の検索結果をすべて見る →',
      home: 'Streamer Times ホーム',
    },
    feedNav: {
      sections: 'セクション',
      feed: 'マイフィード',
      program: '番組表',
      favorites: 'お気に入り',
    },
    footer: {
      discover: '見つける',
      developers: '開発者向け',
      legal: '法的情報',
      languages: '言語',
      liveNow: '現在配信中',
      tonight: '今夜の配信',
      allStreamers: 'すべてのストリーマー',
      allGames: 'すべてのゲーム',
      rankings: 'ストリーマーランキング',
      popularStreamers: '人気のストリーマー',
      getTheApp: 'アプリを入手',
      publicApi: '公開API',
      howPredictionsWork: '予測の仕組み',
      support: 'サポート',
      privacy: 'プライバシーポリシー',
      terms: '利用規約',
      impressum: 'Impressum',
      tagline: 'Twitch & YouTubeのライブ配信ガイド。',
      copyrightTail: 'Streamer Times — ライブ配信ガイド。',
      appStoreAria: 'App Storeでダウンロード',
      playStoreAria: 'Google Playで手に入れよう',
    },
    notFound: {
      kicker: '404',
      title: 'ページが見つかりません',
      body: 'お探しのページは見つかりませんでした。移動したか、リンクが切れている可能性があります。代わりにこちらをお試しください:',
      home: 'ホーム',
      liveNow: '現在配信中のストリーマー',
      browseStreamers: 'ストリーマー一覧',
      games: 'ゲーム',
      getApp: 'アプリを入手',
    },
  },
  uk: {
    nav: {
      live: 'В ефірі',
      streamers: 'Стримери',
      games: 'Ігри',
      rankings: 'Рейтинги',
      getApp: 'Завантажити застосунок',
      signIn: 'Увійти',
      openMenu: 'Відкрити меню',
      closeMenu: 'Закрити меню',
      searchPlaceholder: 'Пошук стримерів…',
      searchResults: 'Результати пошуку',
      openSearch: 'Відкрити пошук',
      closeSearch: 'Закрити пошук',
      searchLabel: 'Пошук стримерів',
      searching: 'Шукаємо…',
      searchError: 'Пошук зараз недоступний.',
      searchViewAll: 'Усі результати за запитом «{q}» →',
      home: 'Головна Streamer Times',
    },
    feedNav: {
      sections: 'Ваші розділи',
      feed: 'Моя стрічка',
      program: 'Програма',
      favorites: 'Обране',
    },
    footer: {
      discover: 'Огляд',
      developers: 'Розробникам',
      legal: 'Правова інформація',
      languages: 'Мови',
      liveNow: 'Зараз в ефірі',
      tonight: 'Сьогодні ввечері',
      allStreamers: 'Усі стримери',
      allGames: 'Усі ігри',
      rankings: 'Рейтинги стримерів',
      popularStreamers: 'Популярні стримери',
      getTheApp: 'Завантажити застосунок',
      publicApi: 'Публічний API',
      howPredictionsWork: 'Як працюють прогнози',
      support: 'Підтримка',
      privacy: 'Політика конфіденційності',
      terms: 'Умови користування',
      impressum: 'Impressum',
      tagline: 'Ваш гід по стрімах на Twitch і YouTube.',
      copyrightTail: 'Streamer Times — ваш гід по стрімах.',
      appStoreAria: 'Завантажити в App Store',
      playStoreAria: 'Доступно в Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'Сторінку не знайдено',
      body: 'Ми не змогли знайти цю сторінку. Можливо, її перемістили або посилання не працює. Спробуйте натомість одну з цих:',
      home: 'Головна',
      liveNow: 'Хто зараз в ефірі',
      browseStreamers: 'Усі стримери',
      games: 'Ігри',
      getApp: 'Завантажити застосунок',
    },
  },
  ar: {
    nav: {
      live: 'مباشر',
      streamers: 'الستريمرز',
      games: 'الألعاب',
      rankings: 'التصنيفات',
      getApp: 'حمّل التطبيق',
      signIn: 'تسجيل الدخول',
      openMenu: 'فتح القائمة',
      closeMenu: 'إغلاق القائمة',
      searchPlaceholder: 'ابحث عن ستريمر…',
      searchResults: 'نتائج البحث',
      openSearch: 'فتح البحث',
      closeSearch: 'إغلاق البحث',
      searchLabel: 'ابحث عن ستريمرز',
      searching: 'جارٍ البحث…',
      searchError: 'البحث غير متاح حاليًا.',
      searchViewAll: 'عرض كل نتائج "{q}" →',
      home: 'الصفحة الرئيسية لـ Streamer Times',
    },
    feedNav: {
      sections: 'أقسامك',
      feed: 'خلاصتي',
      program: 'البرنامج',
      favorites: 'المفضلة',
    },
    footer: {
      discover: 'استكشف',
      developers: 'المطورون',
      legal: 'قانوني',
      languages: 'اللغات',
      liveNow: 'مباشر الآن',
      tonight: 'بث الليلة',
      allStreamers: 'كل الستريمرز',
      allGames: 'كل الألعاب',
      rankings: 'تصنيفات الستريمرز',
      popularStreamers: 'ستريمرز مشهورون',
      getTheApp: 'حمّل التطبيق',
      publicApi: 'واجهة API عامة',
      howPredictionsWork: 'كيف تعمل التوقعات',
      support: 'الدعم',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الخدمة',
      impressum: 'Impressum',
      tagline: 'دليلك للبث المباشر على Twitch وYouTube.',
      copyrightTail: 'Streamer Times — دليلك للبث المباشر.',
      appStoreAria: 'حمّل من App Store',
      playStoreAria: 'احصل عليه من Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'الصفحة غير موجودة',
      body: 'لم نتمكن من العثور على هذه الصفحة. ربما تم نقلها أو أن الرابط معطّل. جرّب إحدى هذه الصفحات بدلًا من ذلك:',
      home: 'الرئيسية',
      liveNow: 'من يبث الآن',
      browseStreamers: 'تصفّح الستريمرز',
      games: 'الألعاب',
      getApp: 'حمّل التطبيق',
    },
  },
  hu: {
    nav: {
      live: 'Élő',
      streamers: 'Streamerek',
      games: 'Játékok',
      rankings: 'Ranglisták',
      getApp: 'Töltsd le az appot',
      signIn: 'Bejelentkezés',
      openMenu: 'Menü megnyitása',
      closeMenu: 'Menü bezárása',
      searchPlaceholder: 'Streamerek keresése…',
      searchResults: 'Keresési találatok',
      openSearch: 'Keresés megnyitása',
      closeSearch: 'Keresés bezárása',
      searchLabel: 'Streamerek keresése',
      searching: 'Keresés…',
      searchError: 'A keresés jelenleg nem érhető el.',
      searchViewAll: 'Összes találat erre: „{q}” →',
      home: 'Streamer Times főoldal',
    },
    feedNav: {
      sections: 'Szakaszaid',
      feed: 'Saját feed',
      program: 'Műsor',
      favorites: 'Kedvencek',
    },
    footer: {
      discover: 'Fedezd fel',
      developers: 'Fejlesztőknek',
      legal: 'Jogi információk',
      languages: 'Nyelvek',
      liveNow: 'Most élőben',
      tonight: 'Ma esti streamek',
      allStreamers: 'Összes streamer',
      allGames: 'Összes játék',
      rankings: 'Streamer-ranglisták',
      popularStreamers: 'Népszerű streamerek',
      getTheApp: 'Töltsd le az appot',
      publicApi: 'Nyilvános API',
      howPredictionsWork: 'Hogyan készülnek az előrejelzések',
      support: 'Támogatás',
      privacy: 'Adatvédelmi irányelvek',
      terms: 'Felhasználási feltételek',
      impressum: 'Impressum',
      tagline: 'A livestream-kalauzod a Twitchhez és a YouTube-hoz.',
      copyrightTail: 'Streamer Times — a livestream-kalauzod.',
      appStoreAria: 'Letöltés az App Store-ból',
      playStoreAria: 'Szerezd meg a Google Playen',
    },
    notFound: {
      kicker: '404',
      title: 'Az oldal nem található',
      body: 'Nem találtuk ezt az oldalt. Lehet, hogy elköltözött, vagy a link hibás. Próbáld meg ezek egyikét:',
      home: 'Főoldal',
      liveNow: 'Ki van most élőben',
      browseStreamers: 'Streamerek böngészése',
      games: 'Játékok',
      getApp: 'Töltsd le az appot',
    },
  },
  pl: {
    nav: {
      live: 'Na żywo',
      streamers: 'Streamerzy',
      games: 'Gry',
      rankings: 'Rankingi',
      getApp: 'Pobierz aplikację',
      signIn: 'Zaloguj się',
      openMenu: 'Otwórz menu',
      closeMenu: 'Zamknij menu',
      searchPlaceholder: 'Szukaj streamerów…',
      searchResults: 'Wyniki wyszukiwania',
      openSearch: 'Otwórz wyszukiwarkę',
      closeSearch: 'Zamknij wyszukiwarkę',
      searchLabel: 'Szukaj streamerów',
      searching: 'Szukam…',
      searchError: 'Wyszukiwarka jest teraz niedostępna.',
      searchViewAll: 'Zobacz wszystkie wyniki dla „{q}” →',
      home: 'Strona główna Streamer Times',
    },
    feedNav: {
      sections: 'Twoje sekcje',
      feed: 'Mój kanał',
      program: 'Program',
      favorites: 'Ulubione',
    },
    footer: {
      discover: 'Odkrywaj',
      developers: 'Dla deweloperów',
      legal: 'Informacje prawne',
      languages: 'Języki',
      liveNow: 'Teraz na żywo',
      tonight: 'Dziś wieczorem',
      allStreamers: 'Wszyscy streamerzy',
      allGames: 'Wszystkie gry',
      rankings: 'Rankingi streamerów',
      popularStreamers: 'Popularni streamerzy',
      getTheApp: 'Pobierz aplikację',
      publicApi: 'Publiczne API',
      howPredictionsWork: 'Jak działają prognozy',
      support: 'Pomoc',
      privacy: 'Polityka prywatności',
      terms: 'Warunki korzystania',
      impressum: 'Impressum',
      tagline: 'Twój przewodnik po livestreamach na Twitchu i YouTube.',
      copyrightTail: 'Streamer Times — Twój przewodnik po livestreamach.',
      appStoreAria: 'Pobierz w App Store',
      playStoreAria: 'Pobierz z Google Play',
    },
    notFound: {
      kicker: '404',
      title: 'Nie znaleziono strony',
      body: 'Nie mogliśmy znaleźć tej strony. Być może została przeniesiona albo link jest uszkodzony. Spróbuj jednej z tych:',
      home: 'Strona główna',
      liveNow: 'Kto jest teraz na żywo',
      browseStreamers: 'Przeglądaj streamerów',
      games: 'Gry',
      getApp: 'Pobierz aplikację',
    },
  },
};

/** Chrome lexicon for a resolved page locale. */
export function chromeLexFor(locale: UiLang): ChromeLex {
  return CHROME_STRINGS[locale] ?? CHROME_STRINGS.en;
}

/** Native display name of each UI language, for the language switcher. */
export const LANGUAGE_NATIVE_NAMES: Record<UiLang, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
  it: 'Italiano',
  ru: 'Русский',
  ja: '日本語',
  uk: 'Українська',
  ar: 'العربية',
  hu: 'Magyar',
  pl: 'Polski',
};
