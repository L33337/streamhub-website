import type { UiLang } from './i18n-core';

// --- Hub-page <title>/description lexicon (server-only usage) -------------------
//
// Localized metadata for the 5 main hub pages (/, /live, /streamers, /games,
// /rankings), consumed from generateMetadata() in the localized route
// segments. Streamer/game detail pages keep their own metadata builders in
// lib/seo.ts — this module covers ONLY the hubs.
//
// The 'en' entries are byte-identical to the inline Metadata exports of the
// English pages (the /games entry uses a static variant of the dynamic
// description — see the note there), so the English routes render exactly the
// same tags whether they read this table or their inline copy.
//
// Translation rules: brand/product names (StreamerTimes, Streamer Times,
// Twitch, YouTube) stay untranslated; keep the same structure and separators
// (— and |); titles ≤ 65 chars and descriptions ≤ 160 chars where feasible.

export interface SiteMetaLex {
  home: { title: string; description: string };
  live: { title: string; description: string };
  streamers: { title: string; description: string };
  games: { title: string; description: string };
  rankings: { title: string; description: string };
}

export const SITE_META_STRINGS: Record<UiLang, SiteMetaLex> = {
  en: {
    home: {
      title: 'Stream Schedule, Highlights & Stats — Twitch & YouTube | StreamerTimes',
      description:
        'Stream schedules, weekly highlights and channel stats for Twitch and YouTube — all in one place. See who is live now and when your favorites go live next.',
    },
    live: {
      title: "Who's Live Now on Twitch & YouTube | StreamerTimes",
      description:
        'See every streamer live right now on Twitch and YouTube, grouped by game and category — plus who is starting in the next few hours. Updated every minute.',
    },
    streamers: {
      title: 'All Streamers A–Z — Twitch & YouTube Live Schedules | StreamerTimes',
      description:
        'Browse every Twitch and YouTube streamer tracked on Streamer Times, A to Z. See who is live now, upcoming schedules, and AI-predicted next streams.',
    },
    games: {
      // The English /games page builds its description dynamically with the
      // live catalog count ("Browse {n} games ranked by …"); this static
      // variant drops the number but keeps the rest of the sentence verbatim.
      title: 'Most Popular Games on Twitch & YouTube | StreamerTimes',
      description:
        'Browse the most popular games ranked by how many streamers play them. See who is live now, upcoming streams and predicted schedules.',
    },
    rankings: {
      title: 'Streamer Rankings — Most Followed, Most Watched & Most Active',
      description:
        'Live leaderboards for Twitch and YouTube streamers: the most followed, fastest growing, most watched, most active and most punctual streamers we track, plus rankings by game. Updated daily.',
    },
  },
  de: {
    home: {
      title: 'Sendeplan, Highlights & Statistiken — Twitch & YouTube | StreamerTimes',
      description:
        'Sendepläne, Highlights der Woche und Kanal-Statistiken für Twitch und YouTube — alles an einem Ort. Sieh, wer gerade live ist und wann deine Favoriten starten.',
    },
    live: {
      title: 'Wer ist jetzt live auf Twitch & YouTube? | StreamerTimes',
      description:
        'Alle Streamer, die gerade auf Twitch und YouTube live sind, gruppiert nach Spiel und Kategorie — plus wer in den nächsten Stunden startet. Minütlich aktualisiert.',
    },
    streamers: {
      title: 'Alle Streamer A–Z — Twitch & YouTube Sendepläne | StreamerTimes',
      description:
        'Durchstöbere alle Twitch- und YouTube-Streamer auf Streamer Times, von A bis Z. Sieh, wer gerade live ist, kommende Sendepläne und KI-Prognosen.',
    },
    games: {
      title: 'Die beliebtesten Spiele auf Twitch & YouTube | StreamerTimes',
      description:
        'Entdecke die beliebtesten Spiele, sortiert danach, wie viele Streamer sie spielen. Sieh, wer live ist, kommende Streams und prognostizierte Sendepläne.',
    },
    rankings: {
      title: 'Streamer-Rankings — Meiste Follower, Zuschauer & Aktivität',
      description:
        'Ranglisten für Twitch- und YouTube-Streamer: Follower, Wachstum, Zuschauer, Streamzeit und Pünktlichkeit — plus Rankings pro Spiel. Täglich aktualisiert.',
    },
  },
  es: {
    home: {
      title: 'Programación, clips y estadísticas — Twitch y YouTube | StreamerTimes',
      description:
        'Programación de directos, clips de la semana y estadísticas de canales de Twitch y YouTube, todo en un mismo sitio. Mira quién está en directo y cuándo empiezan tus favoritos.',
    },
    live: {
      title: '¿Quién está en directo en Twitch y YouTube? | StreamerTimes',
      description:
        'Todos los streamers en directo ahora en Twitch y YouTube, agrupados por juego y categoría — y quién empieza en las próximas horas. Se actualiza cada minuto.',
    },
    streamers: {
      title: 'Todos los streamers A–Z — Horarios de Twitch y YouTube | StreamerTimes',
      description:
        'Explora todos los streamers de Twitch y YouTube en Streamer Times, de la A a la Z. Mira quién está en directo, próximos horarios y predicciones con IA.',
    },
    games: {
      title: 'Los juegos más populares en Twitch y YouTube | StreamerTimes',
      description:
        'Explora los juegos más populares, ordenados por cuántos streamers los juegan. Mira quién está en directo, próximos streams y horarios predichos.',
    },
    rankings: {
      title: 'Rankings de streamers — Más seguidos, más vistos y más activos',
      description:
        'Rankings de streamers de Twitch y YouTube: más seguidos, mayor crecimiento, más vistos, más activos y más puntuales, más rankings por juego. Actualizado a diario.',
    },
  },
  fr: {
    home: {
      title: 'Programme, clips & stats — Twitch & YouTube | StreamerTimes',
      description:
        'Programme des streams, clips de la semaine et stats des chaînes Twitch et YouTube, au même endroit. Vois qui est en live et quand tes streamers préférés commencent.',
    },
    live: {
      title: 'Qui est en live sur Twitch & YouTube ? | StreamerTimes',
      description:
        'Tous les streamers en live en ce moment sur Twitch et YouTube, groupés par jeu et catégorie — et qui démarre dans les prochaines heures. Mis à jour chaque minute.',
    },
    streamers: {
      title: 'Tous les streamers A–Z — Horaires Twitch & YouTube | StreamerTimes',
      description:
        'Parcours tous les streamers Twitch et YouTube suivis sur Streamer Times, de A à Z. Qui est en live, prochains horaires et streams prédits par IA.',
    },
    games: {
      title: 'Les jeux les plus populaires sur Twitch & YouTube | StreamerTimes',
      description:
        'Parcours les jeux les plus populaires, classés selon le nombre de streamers qui y jouent. Qui est en live, prochains streams et horaires prédits.',
    },
    rankings: {
      title: 'Classements des streamers — les plus suivis, vus et actifs',
      description:
        'Classements Twitch et YouTube : plus suivis, plus forte croissance, plus regardés, plus actifs et plus ponctuels, plus des classements par jeu. Mis à jour chaque jour.',
    },
  },
  pt: {
    home: {
      title: 'Programação, clipes e estatísticas — Twitch e YouTube | StreamerTimes',
      description:
        'Programação de streams, clipes da semana e estatísticas de canais da Twitch e do YouTube em um só lugar. Veja quem está ao vivo e quando seus favoritos começam.',
    },
    live: {
      title: 'Quem está ao vivo na Twitch e no YouTube? | StreamerTimes',
      description:
        'Veja todos os streamers ao vivo agora na Twitch e no YouTube, agrupados por jogo e categoria — e quem começa nas próximas horas. Atualizado a cada minuto.',
    },
    streamers: {
      title: 'Todos os streamers A–Z — Horários de Twitch e YouTube | StreamerTimes',
      description:
        'Veja todos os streamers de Twitch e YouTube no Streamer Times, de A a Z. Quem está ao vivo, próximos horários e streams previstos por IA.',
    },
    games: {
      title: 'Os jogos mais populares na Twitch e no YouTube | StreamerTimes',
      description:
        'Veja os jogos mais populares, ordenados por quantos streamers os jogam. Quem está ao vivo, próximos streams e horários previstos.',
    },
    rankings: {
      title: 'Rankings de streamers — Mais seguidos, vistos e ativos',
      description:
        'Rankings de streamers de Twitch e YouTube: mais seguidos, maior crescimento, mais assistidos, mais ativos e mais pontuais, além de rankings por jogo. Atualizado diariamente.',
    },
  },
  it: {
    home: {
      title: 'Programmazione, clip e statistiche — Twitch e YouTube | StreamerTimes',
      description:
        'Programmazione degli stream, clip della settimana e statistiche dei canali Twitch e YouTube in un unico posto. Scopri chi è in diretta e quando iniziano i tuoi preferiti.',
    },
    live: {
      title: 'Chi è in diretta su Twitch e YouTube? | StreamerTimes',
      description:
        'Tutti gli streamer in diretta ora su Twitch e YouTube, raggruppati per gioco e categoria — e chi inizia nelle prossime ore. Aggiornato ogni minuto.',
    },
    streamers: {
      title: 'Tutti gli streamer A–Z — Orari Twitch & YouTube | StreamerTimes',
      description: `Sfoglia tutti gli streamer Twitch e YouTube su Streamer Times, dalla A alla Z. Chi è in diretta, prossimi orari e stream previsti dall'IA.`,
    },
    games: {
      title: 'I giochi più popolari su Twitch e YouTube | StreamerTimes',
      description:
        'Sfoglia i giochi più popolari, ordinati per numero di streamer che li giocano. Chi è in diretta, prossimi stream e orari previsti.',
    },
    rankings: {
      title: 'Classifiche streamer — più seguiti, più visti e più attivi',
      description:
        'Classifiche degli streamer Twitch e YouTube: più seguiti, crescita più rapida, più visti, più attivi e più puntuali, più classifiche per gioco. Aggiornate ogni giorno.',
    },
  },
  ru: {
    home: {
      title: 'Расписание, клипы и статистика — Twitch и YouTube | StreamerTimes',
      description:
        'Расписание стримов, клипы недели и статистика каналов Twitch и YouTube — всё в одном месте. Смотрите, кто в эфире сейчас и когда начнут любимые стримеры.',
    },
    live: {
      title: 'Кто сейчас в эфире на Twitch и YouTube | StreamerTimes',
      description:
        'Все стримеры, которые сейчас в эфире на Twitch и YouTube, по играм и категориям — и кто начнёт в ближайшие часы. Обновляется каждую минуту.',
    },
    streamers: {
      title: 'Все стримеры A–Z — расписания Twitch и YouTube | StreamerTimes',
      description:
        'Все стримеры Twitch и YouTube на Streamer Times, от A до Z. Кто в эфире, ближайшие расписания и ИИ-прогнозы следующих стримов.',
    },
    games: {
      title: 'Самые популярные игры на Twitch и YouTube | StreamerTimes',
      description:
        'Самые популярные игры — по числу стримеров, которые в них играют. Кто в эфире, ближайшие стримы и прогнозируемые расписания.',
    },
    rankings: {
      title: 'Рейтинги стримеров — подписчики, зрители и активность',
      description:
        'Рейтинги стримеров Twitch и YouTube: больше всего подписчиков, самый быстрый рост, больше всего зрителей и часов в эфире, пунктуальность — плюс рейтинги по играм. Обновляются ежедневно.',
    },
  },
  ja: {
    home: {
      title: '配信スケジュール・クリップ・統計 — Twitch & YouTube | StreamerTimes',
      description:
        'TwitchとYouTubeの配信スケジュール、今週のクリップ、チャンネル統計をすべてひとつに。今ライブ中の配信者と、お気に入りが次に配信する時間がわかります。',
    },
    live: {
      title: 'TwitchとYouTubeで今配信中のストリーマー | StreamerTimes',
      description:
        '今まさにTwitchとYouTubeで配信中のストリーマーをゲーム・カテゴリー別に一覧表示。数時間以内に始まる配信もわかります。毎分更新。',
    },
    streamers: {
      title: '全ストリーマー A–Z — Twitch & YouTube配信予定 | StreamerTimes',
      description:
        'Streamer Timesが追跡するTwitch・YouTubeのストリーマーをAからZまで一覧で。ライブ状況、今後の予定、AIが予測する次回配信も。',
    },
    games: {
      title: 'Twitch & YouTubeで人気のゲーム | StreamerTimes',
      description:
        '人気ゲームを、配信しているストリーマー数のランキングで表示。今配信中の人、今後の配信、予測スケジュールもチェック。',
    },
    rankings: {
      title: 'ストリーマーランキング — フォロワー数・視聴者数・配信時間',
      description:
        'TwitchとYouTubeのストリーマーランキング: フォロワー数、成長率、視聴者数、配信時間、時間の正確さ、さらにゲーム別ランキングも。毎日更新。',
    },
  },
  uk: {
    home: {
      title: 'Розклад, кліпи та статистика — Twitch і YouTube | StreamerTimes',
      description:
        'Розклад стрімів, кліпи тижня та статистика каналів Twitch і YouTube — усе в одному місці. Дивіться, хто в ефірі зараз і коли почнуть улюблені стрімери.',
    },
    live: {
      title: 'Хто зараз в ефірі на Twitch і YouTube | StreamerTimes',
      description:
        'Усі стримери, які зараз в ефірі на Twitch і YouTube, за іграми та категоріями — і хто почне найближчими годинами. Оновлюється щохвилини.',
    },
    streamers: {
      title: 'Усі стримери A–Z — розклади Twitch і YouTube | StreamerTimes',
      description:
        'Усі стримери Twitch і YouTube на Streamer Times, від A до Z. Хто в ефірі, найближчі розклади та ШІ-прогнози наступних стрімів.',
    },
    games: {
      title: 'Найпопулярніші ігри на Twitch і YouTube | StreamerTimes',
      description:
        'Найпопулярніші ігри — за кількістю стримерів, які в них грають. Хто в ефірі, найближчі стріми та прогнозовані розклади.',
    },
    rankings: {
      title: 'Рейтинги стримерів — підписники, глядачі й активність',
      description:
        'Рейтинги стримерів Twitch і YouTube: найбільше підписників, найшвидше зростання, найбільше глядачів і годин в ефірі, пунктуальність — плюс рейтинги за іграми. Оновлюються щодня.',
    },
  },
  ar: {
    home: {
      title: 'جدول البث والمقاطع والإحصائيات — Twitch وYouTube | StreamerTimes',
      description:
        'جداول البث ومقاطع الأسبوع وإحصائيات القنوات على Twitch وYouTube في مكان واحد. اعرف من يبث الآن ومتى يبدأ صانعو المحتوى المفضلون لديك.',
    },
    live: {
      title: 'من يبث الآن على Twitch وYouTube؟ | StreamerTimes',
      description:
        'شاهد كل الستريمرز الذين يبثون الآن على Twitch وYouTube، مصنّفين حسب اللعبة والفئة — ومن سيبدأ خلال الساعات القادمة. يُحدَّث كل دقيقة.',
    },
    streamers: {
      title: 'كل الستريمرز من A إلى Z — مواعيد Twitch وYouTube | StreamerTimes',
      description:
        'تصفّح كل ستريمرز Twitch وYouTube على Streamer Times من A إلى Z. من يبث الآن، المواعيد القادمة، والبثوث المتوقعة بالذكاء الاصطناعي.',
    },
    games: {
      title: 'أشهر الألعاب على Twitch وYouTube | StreamerTimes',
      description:
        'تصفّح أشهر الألعاب مرتبةً حسب عدد الستريمرز الذين يلعبونها. من يبث الآن، البثوث القادمة، والمواعيد المتوقعة.',
    },
    rankings: {
      title: 'تصنيفات الستريمرز — الأكثر متابعة ومشاهدة ونشاطًا',
      description:
        'تصنيفات ستريمرز Twitch وYouTube: الأكثر متابعة، الأسرع نموًا، الأكثر مشاهدة، الأكثر نشاطًا والأكثر التزامًا بالمواعيد — إضافة إلى تصنيفات حسب اللعبة. تُحدَّث يوميًا.',
    },
  },
  hu: {
    home: {
      title: 'Műsorrend, klipek és statisztikák — Twitch & YouTube | StreamerTimes',
      description:
        'Stream-műsorrend, a hét klipjei és csatornastatisztikák a Twitchről és a YouTube-ról, mind egy helyen. Nézd meg, ki van élőben, és mikor kezdenek a kedvenceid.',
    },
    live: {
      title: 'Ki van most élőben Twitchen és YouTube-on? | StreamerTimes',
      description:
        'Az összes streamer, aki most élőben van Twitchen és YouTube-on, játék és kategória szerint — plusz akik a következő órákban kezdenek. Percenként frissül.',
    },
    streamers: {
      title: 'Összes streamer A–Z — Twitch & YouTube műsorok | StreamerTimes',
      description:
        'Böngészd a Streamer Times által követett összes Twitch- és YouTube-streamert A-tól Z-ig. Ki van élőben, közelgő műsorok és MI-jósolt adások.',
    },
    games: {
      title: 'A legnépszerűbb játékok Twitchen és YouTube-on | StreamerTimes',
      description:
        'Böngészd a legnépszerűbb játékokat aszerint rangsorolva, hány streamer játssza őket. Ki van élőben, közelgő adások és előrejelzett műsorok.',
    },
    rankings: {
      title: 'Streamer-ranglisták — legtöbb követő, néző és adás',
      description:
        'Ranglisták Twitch- és YouTube-streamerekről: legtöbb követő, leggyorsabb növekedés, legtöbb néző, legtöbb adásóra és legpontosabb kezdés — plusz játékonkénti ranglisták. Naponta frissül.',
    },
  },
  pl: {
    home: {
      title: 'Harmonogram, klipy i statystyki — Twitch i YouTube | StreamerTimes',
      description:
        'Harmonogramy streamów, klipy tygodnia i statystyki kanałów z Twitcha i YouTube w jednym miejscu. Zobacz, kto jest na żywo i kiedy zaczynają twoi ulubieńcy.',
    },
    live: {
      title: 'Kto jest teraz na żywo na Twitchu i YouTube? | StreamerTimes',
      description:
        'Wszyscy streamerzy na żywo na Twitchu i YouTube, pogrupowani według gier i kategorii — plus kto zaczyna w najbliższych godzinach. Aktualizacja co minutę.',
    },
    streamers: {
      title: 'Wszyscy streamerzy A–Z — harmonogramy Twitch i YouTube | StreamerTimes',
      description:
        'Przeglądaj wszystkich streamerów Twitcha i YouTube na Streamer Times, od A do Z. Kto jest na żywo, nadchodzące harmonogramy i streamy przewidziane przez AI.',
    },
    games: {
      title: 'Najpopularniejsze gry na Twitchu i YouTube | StreamerTimes',
      description:
        'Przeglądaj najpopularniejsze gry uszeregowane według liczby grających w nie streamerów. Kto jest na żywo, nadchodzące streamy i przewidywane harmonogramy.',
    },
    rankings: {
      title: 'Rankingi streamerów — najczęściej obserwowani i oglądani',
      description:
        'Rankingi streamerów Twitcha i YouTube: najwięcej obserwujących, najszybszy wzrost, najwięcej widzów i godzin, największa punktualność — plus rankingi według gier. Aktualizowane codziennie.',
    },
  },
};

/** Hub-page metadata lexicon for a resolved page locale. */
export function siteMetaFor(locale: UiLang): SiteMetaLex {
  return SITE_META_STRINGS[locale] ?? SITE_META_STRINGS.en;
}
