import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction } from '@/lib/i18n-core';
import type { HubLex } from './types';

export const ja: HubLex = {
  crumbs: {
    aria: 'パンくずリスト',
    home: 'ホーム',
    liveNow: '現在配信中',
    games: 'ゲーム',
    streamers: 'ストリーマー',
    rankings: 'ランキング',
    pageN: (n) => `${n}ページ目`,
  },
  common: {
    browseStreamersAZ: 'ストリーマー一覧を見る',
    allGamesCategories: 'すべてのゲームとカテゴリー',
  },
  home: {
    browseAllGames: 'すべてのゲームとカテゴリーを見る →',
    seeLiveNow: '今配信中のストリーマーを見る →',
  },
  homeFeed: {
    ticker: (liveCount, soonCount, soonHours) => {
      const live = liveCount > 0 ? `${liveCount}人のストリーマーが配信中` : '';
      const soon =
        soonCount > 0 ? `${soonCount}人が今後${soonHours}時間以内に開始` : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: '今いちばん見られている配信',
    liveFilterCategory: 'カテゴリ',
    liveFilterLanguage: '言語',
    liveFilterAllCategories: 'すべてのカテゴリ',
    liveFilterAllLanguages: 'すべての言語',
    liveFilterOption: (label, count) => `${label}（${count}）`,
    liveFilterMatches: (count) => `${count}件の配信`,
    liveFilterReset: 'リセット',
    liveFilterEmpty: 'この条件に合う配信は今のところありません。',
    liveFilterNote: (top, total) =>
      `現在の視聴者数トップ${top} — フィルターは全${total}件の配信から検索`,
    upNextTitle: '今日のラインナップ',
    upNextLink: '配信中・まもなく開始 →',
    lineupFilterTime: '時間',
    lineupFilterAllTimes: 'すべての時間',
    lineupFilterFrom: (time) => `${time}以降`,
    lineupFilterMatches: (count) => `${count}件の配信`,
    lineupFilterEmpty: 'この条件に合う配信予定はありません。',
    chipAll: 'すべて',
    chipFavorites: 'お気に入り',
    lineupShowAll: (n) => `${n}件の配信をすべて表示`,
    lineupShowMore: (n) => `さらに${n}件を表示`,
    lineupShowLess: '折りたたむ',
    bellAria: (name) => `${name}さんの配信開始を通知で受け取る`,
    upsell: {
      bellTitle: '配信を見逃さない',
      bellBody:
        '配信開始の直前にプッシュ通知が届きます — 無料のStreamer Timesアプリで。',
      favoritesTitle: 'お気に入りをワンタップで',
      favoritesBody:
        'ストリーマーをフォローすると、このページが自分だけの番組表になります — 無料で、アプリでもこのブラウザでも。',
      appCta: 'アプリを入手',
      loginCta: '無料でログイン',
      close: 'また今度',
    },
    interrupt: {
      title: 'このページを、あなたのストリーマーだけで。',
      body: 'ストリーマーをフォローすると、ガイドがあなた専用のフィードに変わります。自分の番組表、配信直前のプッシュ通知、今週のハイライトも。',
      note: '30秒で完了 · 無料',
      appCta: 'アプリを入手',
      loginCta: 'ブラウザでログイン',
    },
    clipsTitle: '今週のクリップ',
    clipsFilterMatches: (count) => `${count}件のクリップ`,
    clipsFilterEmpty: 'この条件に合うクリップはありません。',
    quickFactsTitle: 'クイックファクト',
    quickFactsSub: 'トラッキング中の配信から',
    factPredictionLabel: '予測チェック',
    factPrediction: (hits, total) =>
      `確度「高」の予測${total}件のうち${hits}件で、予測時刻から2時間以内に配信が始まりました。`,
    factPeakLabel: '今週のピーク',
    factPeak: (name) => `${name}さんが今週最多の同時視聴者数を記録しました。`,
    factReliableLabel: '時間ぴったり',
    factReliable: (name, hits, total) =>
      `${name}さんは直近の告知配信${total}件中${hits}件を時間どおりに開始しました。`,
    factPauseLabel: 'お休み中',
    factPause: (name) => `${name}さんはこの日までお休みです。`,
    factMarathonLabel: '今週のマラソン配信',
    factMarathon: (name) => `${name}さんがぶっ通しで配信した長さです。`,
    factComebackLabel: '今週の復帰',
    factComeback: (name, days) => `${name}さんが${days}日ぶりに配信に戻りました。`,
    factPrimeTimeLabel: 'ゴールデンタイム',
    factPrimeTime: (total) =>
      `この時間帯に始まる配信がいちばん多く、4週間で${total}件の配信が対象です。`,
    factBusiestDayLabel: 'いちばん忙しい曜日',
    factBusiestDay: (total) =>
      `配信の開始がいちばん多い曜日で、4週間で${total}件の配信が対象です。`,
    factLocalTimeNote: 'あなたのタイムゾーン',
    factUtcNote: 'UTC',
    factTopCategoryLabel: '今週のカテゴリ',
    factTopCategory: (category, streamers) =>
      `過去7日間の${category}の配信数です（${streamers}人の配信者）。`,
    factCompetitionLabel: '競合レベル',
    factCompetition: (category) =>
      `${category}で同時に配信しているトラッキング対象チャンネルの平均数です。当サイトでいちばん混み合うカテゴリです。`,
    factRoomLabel: '狙い目のニッチ',
    factRoom: (category, channels) =>
      `${category}のチャンネルあたり視聴者数です。同時配信中のトラッキング対象チャンネルはわずか${channels}件。`,
    factRoomSlotLabel: 'ベストな時間帯',
    risersTitle: '今週の急上昇',
    risersLink: 'すべてのランキング →',
    risersGained: (delta) => `7日間でフォロワー${delta}`,
    mostStreamedTitle: '今週最も配信した',
    weekHours: (value) => `配信${value}時間 · 7日間`,
    weekStreams: (n) => `${n}件の配信`,
    mostWatchedTitle: '最も視聴されている',
    topStreamersCol: 'ストリーマー トップ5',
    topCategoriesCol: 'カテゴリー トップ5',
    medianViewers: (value) => `視聴者数の中央値 ${value}`,
    hoursStreamed: (value) => `配信${value}時間 · 28日間`,
    followers: (value) => `フォロワー${value}`,
    missingStreamer: 'お目当てのストリーマーがいない？検索して追加 →',
    endcap: {
      title: '番組表を持ち歩こう。',
      bullets: [
        '推しの配信者をフォロー',
        '誰がいつ配信するかひと目でわかる',
        'スタッツもクリップも、ぜんぶここに！',
      ],
      webLead: 'ブラウザ派の方は？',
      webLink: '無料アカウントを作成',
      webTail: '— あなたのフィードが待っています。',
    },
    sessionBanner: {
      text: 'おかえりなさい — パーソナルフィードの準備ができています。',
      cta: 'マイフィードへ →',
    },
    sectionNav: {
      aria: 'セクションへ移動',
      live: '配信中',
      lineup: '今日',
      trending: 'トレンド',
      clips: 'クリップ',
      stats: 'データ',
      discover: 'ストリーマー',
    },
  },
  hero: {
    claim: '配信スケジュール。クリップ。統計。すべてがひとつに。',
    ctaLogin: 'ログイン',
    ctaMid: 'または',
    ctaApp: 'アプリを入手',
    ctaTail: 'して、お気に入りの配信者をフォローしましょう。',
    ctaAppOnlyLink: 'アプリを入手',
    ctaAppOnlyTail: 'して、お気に入りの配信者をフォローしましょう。',
    kicker: 'ライブ配信ガイド',
    badgeNew: '新登場',
    badgeLive: 'iOS & Android で配信中',
    titleLead: '',
    titleTail: ' のライブ配信スケジュール',
    subtitle: 'ストリーマーのための番組表。',
    bodyLead:
      'Twitch と YouTube をひとつのフィードに。リアルタイムの配信状況、AIが予測する次の配信、余計なノイズはゼロ。無料・アカウント不要 —',
    bodyLink: 'アプリを入手して',
    bodyTail: '配信通知を受け取りましょう。',
    appStoreSub: 'ダウンロードは',
    playSub: '手に入れよう',
    phoneAlt: '今夜の配信予定をスマホでチェックするストリーマー',
    phoneCaption: '今夜のラインナップをチェック',
    statBothLabel: '2つのプラットフォームをひとつのガイドで',
    statFavoritesValue: 'お気に入り',
    statFavoritesLabel: 'どのチャンネルも数秒で追加',
    statApiValue: '公開API',
    statApiLabel: '近日公開 · ウェイトリストに登録',
  },
  upcoming: {
    heading: 'この後の配信',
    aria: '予定されている配信',
    empty: '今は配信予定がありません — またすぐにチェックしてください。',
  },
  trending: {
    heading: 'Twitch のトレンド',
    subtitle:
      '今、Twitch全体が見ているもの。',
    aria: 'Twitch のトレンドゲーム',
    rankOnTwitch: (rank) => `Twitch で第${rank}位`,
    sortAria: 'ゲームを並び替え',
    sortTwitch: 'Twitch 順位',
    sortHours: '配信時間',
    sortViewers: '視聴者数',
    sortStreamers: '配信者数',
    liveViewers: (value) => `${value}人が視聴中`,
    streamerCount: (value) => `ストリーマー ${value}人`,
  },
  popular: {
    heading: '人気のストリーマー',
    viewAll: 'すべてのストリーマーを見る →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'どんな人か、何を配信するか、いつ配信するか。',
    viewAll: 'すべてのストリーマーを見る →',
    followers: (value) => `フォロワー約${value}人`,
    // Japanese has no plural inflection; the counter 回 covers every count.
    streams28d: (count) => `28日間で${count}回配信`,
    liveNow: '配信中',
    nextPrefix: '次回',
  },
  apiPromo: {
    heading: '開発者向けAPI',
    comingSoon: '近日公開',
    eyebrow: '開発者向け',
    headlineLead: '同じデータで開発できます —',
    headlineKey: 'まもなく、私たちのAPIで。',
    body: '現在パイロットパートナーを受け入れ中です。ウェイトリストに登録すると、一般公開の瞬間にメールでお知らせします — インディー開発者向けの無料プランも用意しています。',
    bullets: [
      'リアルタイムの配信状況と視聴者数',
      '確度つきのAI予測による今後の配信枠',
      '「配信開始」イベントのWebhook',
      'OpenAPI仕様書つき',
    ],
    cta: 'ウェイトリストに登録',
  },
  live: {
    h1: 'Twitch & YouTube で現在配信中',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `現在${liveCount}人のストリーマーが配信中です` +
      (categoryCount > 0 ? `（${categoryCount}のゲーム・カテゴリー）` : '') +
      '。' +
      (soonCount > 0
        ? `さらに${soonCount}人が今後${soonHours}時間以内に配信を開始する予定です。`
        : ''),
    introEmpty: '今は誰も配信していません — まもなく始まる配信はこちらです。',
    error: '配信状況を一時的に取得できません。しばらくしてからもう一度お試しください。',
    otherCategory: 'その他',
    categoryLiveAria: (name) => `${name} — 現在配信中`,
    nLive: (n) => `${n}件配信中`,
    jumpToGame: 'ゲームへ移動',
    startingSoon: 'まもなく配信開始',
    nextNHours: (n) => `今後${n}時間`,
    emptyAll:
      '今は配信中のチャンネルも、まもなく始まる配信もありません。ストリーマー一覧やゲームページから次に観る配信を探してみてください。',
    itemListName: 'Twitch & YouTube で現在配信中のストリーマー',
  },
  streamers: {
    h1: 'Twitch & YouTube のストリーマー一覧',
    intro:
      'Streamer Times が追跡するすべてのストリーマー — 今誰が配信中か、次に何を配信するかが分かります。ページをめくって全リストをご覧ください。',
    pageOf: (page, totalPages) => `${totalPages}ページ中${page}ページ目。`,
    error: 'ストリーマー情報を一時的に取得できません。しばらくしてからもう一度お試しください。',
    paginationAria: 'ページ送り',
    prev: '← 前へ',
    next: '次へ →',
  },
  games: {
    liveRightNow: '現在配信中',
    liveAria: 'ライブ配信のあるゲーム',
    error: 'ゲーム情報を一時的に取得できません。しばらくしてからもう一度お試しください。',
    aboutHeading: 'これらのゲームについて',
    updatedAt: (stamp) => `${stamp} 更新。`,
    relatedAria: '関連ページ',
  },
  gamesRoot: {
    h1: 'Twitch & YouTube の人気ゲーム',
    methodologyNote: '過去28日間に各カテゴリーで追跡しているストリーマー数の順に並んでいます。',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `Twitch と YouTube で${gameCount}のゲームとカテゴリーを追跡しています。`;
      const note = '過去28日間に各カテゴリーで追跡しているストリーマー数の順に並んでいます。';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `現在${formatCompactNumber(liveStreamerCount, 'ja')}人のストリーマーが配信中です`;
      const across = liveGameCount > 0 ? `（${liveGameCount}カテゴリー）` : '';
      return `${lead} ${streamers}${across}。 ${note}`;
    },
    faqPopularQ: 'Twitch と YouTube で一番人気のゲームは?',
    faqPopularA: (top, second) =>
      `${top.category} は追跡中のストリーマーが最も多く、過去28日間に${top.count}チャンネルが配信しました${second ? `。2位は ${second.category}（${second.count}チャンネル）です` : ''}。`,
    faqWhoQ: '今誰が配信していますか?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `${liveStreamerCount}人のストリーマーが${liveGameCount}カテゴリーで配信中です。カテゴリーを開くと、配信中のチャンネルと今後の配信予定が見られます。`,
    faqRankedQ: 'これらのゲームはどうやってランク付けされていますか?',
    faqRankedA: (gameCount) =>
      `過去28日間に各カテゴリーで追跡しているストリーマー数の順に並んでいます。数値は${gameCount}のゲームを対象に終了した配信を毎晩集計したもので、ライブの数値は数分ごとに更新されます。`,
    faqHoursQ: '「配信時間」は視聴時間のことですか?',
    faqHoursA:
      'いいえ。配信時間は、そのカテゴリーで配信者がライブだった時間の長さです。視聴者の視聴時間は集計していません。カードに表示されるライブ視聴者数はその時点のサンプルで、合計ではありません。',
  },
  rankings: {
    h1: 'ストリーマーランキング',
    intro: (n) =>
      `Twitch と YouTube で最も大きく、最も急成長中で、最も活発で、最も頼れるストリーマーは誰でしょう? 追跡中の全ストリーマーを対象にした${n}つのランキングを、実際の配信データから毎日更新しています。`,
    dataRefreshed: (label) => ` データ更新日: ${label}。`,
    statStreamersTracked: '人のストリーマーを追跡中',
    statLiveNow: '人が現在配信中',
    statGamesCategories: 'のゲームとカテゴリー',
    seeFullRanking: 'ランキング全体を見る →',
    warmingUp: 'ランキングは準備中です — またすぐにチェックしてください。',
    byGameHeading: 'ゲーム別ランキング',
    byGameSubtitle: '各ゲーム・カテゴリーでフォロワーの多いストリーマーです。',
    byGameAria: '人気ゲームのランキング',
    topGameStreamers: (category) => `${category} のトップストリーマー`,
    whoIsLive: '今誰が配信中?',
    climbersThisWeek: '今週の急上昇ストリーマー',
    metricH1: {
      'most-followed': 'フォロワーの多いストリーマー',
      'fastest-growing': '急成長中のストリーマー',
      'most-watched': '視聴者の多いストリーマー',
      'most-active': '最も活発なストリーマー',
      'most-reliable': '最も時間に正確なストリーマー',
    },
    metricNote: {
      'most-followed':
        '毎日更新。フォロワー数と登録者数は定期的に更新されるため、各プラットフォームのライブの数値より遅れることがあります。',
      'fastest-growing':
        '追跡中の全チャンネルの毎日のスナップショットに基づく、過去7日間のチャンネルフォロワー（Twitch）または登録者（YouTube）の増加数です。増加がプラスのチャンネルのみランクインします。毎日更新。',
      'most-watched':
        '過去28日間の同時ライブ視聴者数の中央値です（1時間ごとのサンプリング）。毎日更新。',
      'most-active':
        '過去28日間のライブ配信の合計時間です。各配信は1回だけカウントし、24時間365日の常時配信チャンネルは除外します。毎日更新。',
      'most-reliable':
        '過去90日間の直近20件の告知済み配信のうち、Twitch で告知された配信が実際に±30分以内に始まった割合です（最低10件を評価）。毎日更新。',
    },
  },
  gameChips: {
    aria: (category) => `${category} の統計`,
    streamersLabel: () => 'ストリーマー',
    liveNowLabel: '配信中',
    watchingLabel: '人が視聴中',
    streamedLabel: '配信 · 28日間',
    streamsLabel: () => '件の配信 · 28日間',
    peakLead: 'ピーク ',
    peakTail: ' 人 · 28日間',
    trendTail: ' 今週',
    trendTitle: '前週比のアクティブなストリーマー数の変化',
  },
  game: {
    notFoundTitle: 'ゲームが見つかりません — StreamerTimes',
    metaTitle: (category) => `${category} のストリーマー — 配信中・ランキング・スケジュール`,
    metaDescription: (category, names) => {
      const tail = `今誰が配信中か、今後の配信、AI が予測した Twitch・YouTube の配信スケジュール。`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'ja')}が ${category} ランキングをリードしています。`
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'ja')}が ${category} ランキングをリードしています。`
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `フォロワー数トップの ${category} ストリーマー。${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `${category} のストリーマー — 配信中・ランキング・スケジュール`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? `（${listConjunction(names, 'ja')}）` : '';
      return `フォロワー数トップの ${category} ストリーマー${ogNames}の配信状況と Twitch・YouTube の配信スケジュール。`;
    },
    h1: (category) => `${category} のストリーマー — 配信中 & スケジュール`,
    intro: (shown, category, liveCount, upcomingCount, superlative) =>
      `今週 Twitch・YouTube で ${category} を配信中または配信予定のストリーマーは${shown}人。` +
      (liveCount > 0 ? `${liveCount}人が今まさに配信中` : '今は誰も配信していません') +
      (upcomingCount > 0
        ? `、今後7日間に${upcomingCount}件の配信が控えています。`
        : '。') +
      superlative,
    superlative: (category, name, value, isTwitch) =>
      `ここで最も${isTwitch ? 'フォロワー' : '登録者'}が多い ${category} ストリーマーは ${name}（${value}）です。`,
    onPageAria: 'このページの内容',
    navLiveNow: '配信中',
    navTopStreamers: 'トップストリーマー',
    navBestTimes: 'ベストな時間',
    navSchedule: 'スケジュール',
    navRelated: '関連ゲーム',
    followGame: (category) => `${category} をフォロー`,
    followingLabel: 'フォロー中',
    watchingNow: (category) => `${category} を配信中`,
    liveStreamsAria: (category) => `配信中の ${category} ストリーム`,
    moreLiveAria: (category) => `その他の配信中の ${category} ストリーム`,
    showMoreLive: (n) => `配信中のチャンネルをあと${n}件表示`,
    moreLiveInRanking: (n, category) =>
      `${category} ランキング全体ではさらに${n}人が配信中 →`,
    liveUpdatesNote: '配信状況と視聴者数は数分ごとに更新されます。',
    mostFollowed: (category) => `フォロワー数トップの ${category} ストリーマー`,
    tableCaption: (category) =>
      `フォロワー数順の ${category} ストリーマーと次の配信予定`,
    thRank: '#',
    thStreamer: 'ストリーマー',
    thNextStream: '次の配信',
    thFollowers: 'フォロワー',
    thHours: '時間 / 28日',
    liveNowCell: '配信中',
    seeFullRanking: (category) => `${category} ランキング全体を見る（トップ50）→`,
    whoStreams: (category) => `${category} を配信するストリーマー`,
    whenStreamed: (category) => `${category} はいつ配信されている?`,
    heatmapSummary: (category) =>
      `${category} の配信は{peak}{tz}に集中しています — 直近4週間の記録に基づきます。`,
    heatmapSummaryEmpty: '直近4週間の記録に基づきます。',
    tzLocalSuffix: '（あなたの時間）',
    tzUtcSuffix: '（UTC）',
    heatmapAria: (category) => `${category} の週間配信ヒートマップ。`,
    heatmapAriaWithPeak: (category) =>
      `${category} の週間配信ヒートマップ。最も活発な時間帯: {peak}。`,
    heatmapTooltip: '{day} {from}–{to} · 4週間で{amount}配信',
    legendLess: '少',
    legendMore: '多',
    heatmapDayNames: [
      '月曜日',
      '火曜日',
      '水曜日',
      '木曜日',
      '金曜日',
      '土曜日',
      '日曜日',
    ],
    bestTimeToStream: (category) => `${category} を配信するベストな時間`,
    trendingBadge: '▲ トレンド',
    bestTimeIntro: (category) =>
      `ストリーマー向け: ${category} で配信1チャンネルあたりの視聴者が最も多くなる時間帯です。`,
    fullHeatmapLink: 'チャンスヒートマップと分析の全体を見る →',
    bestSlotsAria: 'ベストな時間帯',
    viewersPerChannel: '~{score} 視聴者/チャンネル',
    timesLocalNote: '時刻はあなたのタイムゾーンで表示。',
    timesUtcNote: '時刻は UTC で表示。',
    quietTitle: (category) => `現在 ${category} の配信はありません`,
    quietBody: (category) =>
      `追跡中の ${category} ストリーマーは誰も配信しておらず、今後7日間の予定もありません。スケジュールと AI 予測は1日に何度も更新されます — また見に来てください。`,
    quietMeanwhile: 'それまでの間に',
    seeWhosLive: '今配信中のストリーマーを見る →',
    browseAllGames: 'すべてのゲームを見る',
    gameStreamersChip: (category) => `${category} のストリーマー`,
    scheduleAria: (category) => `${category} の配信スケジュール`,
    upcomingStreams: (category) => `今後の ${category} 配信`,
    scheduleNote:
      '時刻はあなたのタイムゾーンに合わせて表示され、ストリーマー側の時刻も併記されます。日付は UTC カレンダーに従うため、深夜の配信は翌日の欄に表示されることがあります。',
    filterAria: 'スケジュールを絞り込む',
    allPlatforms: 'すべてのプラットフォーム',
    hideLowConfidence: '確度「低」を隠す',
    moreLowConfidence: (n) => `確度の低い予測があと${n}件`,
    lowConfAria: (label) => `${label}の確度の低い予測`,
    hiddenNotShown: (n) =>
      `この日はあと${n}件の予測が非表示です。全スケジュールはストリーマーのページでご覧ください。`,
    relatedGames: '関連ゲーム',
    relatedGamesAria: '関連ゲーム',
    relatedNote: '直近28日間でストリーマーの顔ぶれが重なるゲームです。',
    allGamesFooter: '← すべてのゲームとカテゴリー',
  },
  gameRanking: {
    notFoundTitle: 'ページが見つかりません — StreamerTimes',
    metaTitle: (category, page) =>
      page === 1
        ? `${category} ストリーマーランキング — フォロワー数順`
        : `${category} ストリーマーランキング — フォロワー数順 — ページ${page}`,
    metaLeadIn: (name, value) => `${name} が ${value} フォロワーでトップ。`,
    metaDescription: (category, leadIn) => [
      `${leadIn}Twitch・YouTube の ${category} ストリーマーをフォロワー数順にランキング。配信状況と次の配信付き。毎日更新。`,
      `${leadIn}${category} ストリーマーのフォロワー数ランキング。配信状況と次の配信付き。`,
      `Twitch・YouTube の ${category} ストリーマーをフォロワー数順にランキング。配信状況と次の配信付き。毎日更新。`,
    ],
    ogTitle: (category) => `${category} ストリーマーランキング — フォロワー数順`,
    h1: (category) => `${category} ストリーマーランキング（フォロワー数順）`,
    introPage1: (count, category) =>
      `追跡中の ${category} ストリーマー トップ${count}を、チャンネルのフォロワー数・登録者数でランキング。`,
    topsTheList: (name, value, isTwitch) =>
      `トップは ${name}（${value} ${isTwitch ? 'フォロワー' : '登録者'}）。`,
    introPageN: (from, to, total, category) =>
      `追跡中の ${category} ストリーマー${total}人のうち${from}〜${to}位。チャンネルのフォロワー数・登録者数でランキング。`,
    methodology: (category) =>
      `直近28日間に ${category} で活動したストリーマーをフォロワー数でランキング。数値は定期的に更新され、プラットフォームの最新値より遅れることがあります。`,
    followersRefreshed: (label) => ` フォロワー数の更新: ${label}。`,
    warmingUp:
      'このランキングはまだ準備中です — 意味のある結果にはもう少しデータが必要です。また見に来てください。',
    missingDataNote:
      '— は、そのチャンネルのデータがまだ十分に集まっていないことを意味します（例: 追加されたばかりのチャンネルの視聴者サンプリング）。',
    sortAria: 'ランキングの並び替え',
    sortFollowers: 'フォロワー数',
    sortHours: '配信時間（28日）',
    sortViewers: '視聴者数',
    filterLangAria: '言語で絞り込む',
    allChip: 'すべて',
    noMatch: 'このフィルターに合うストリーマーはいません。',
    tableCaption: (category) => `フォロワー数順の ${category} ストリーマー`,
    thRank: '#',
    thStreamer: 'ストリーマー',
    thFollowers: 'フォロワー',
    thAvgViewers: '平均視聴者',
    thHours: '時間（28日）',
    thShare: 'ゲーム比率',
    thShareTitle: (category) =>
      `直近の配信のうち ${category} が占める割合`,
    thNextStream: '次の配信',
    liveNowCell: '配信中',
    watchingTail: ' · {value} 人視聴中',
    trendNewBadge: 'new',
    trendNewTitle: '1週間前はこのランキング圏外',
    trendUpTemplate: '先週から{n}アップ',
    trendDownTemplate: '先週から{n}ダウン',
    mainGameTemplate: 'メインゲーム: 直近配信の{share}%',
    aboutRanking: 'このランキングについて',
    faqMostFollowedQ: (category) =>
      `${category} で最もフォロワーが多いストリーマーは?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `（2位は ${second.name} の ${second.value}）` : '';
      return `現在、追跡中の ${category} ストリーマーで最も${top.isTwitch ? 'フォロワー' : '登録者'}が多いのは ${top.name}（${top.value}）です${runnerUp}。数値は毎日更新されます。`;
    },
    faqHowManyQ: (category) => `${category} を配信しているストリーマーは何人?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? `直近28日間で合計約${activity.hours}時間・${activity.streams}件の ${category} 配信がありました。`
        : '';
      return `最近 ${category} を配信した、またはスケジュールに入れているストリーマーを現在${count}人追跡しています。${tail}`;
    },
    faqMeasuredQ: 'このランキングはどう測っている?',
    faqMeasuredA: (category) =>
      `直近28日間に ${category} で活動したストリーマーを、メインチャンネルのフォロワー数 — Twitch のフォロワーまたは YouTube の登録者 — でランキングしています。時間と比率の列は、終了した ${category} 配信の毎晩の集計によるものです。`,
    faqShareQ: '「ゲーム比率」とは?',
    faqShareA: (category) =>
      `ストリーマーの直近の配信のうち ${category} が占める割合です。100% なら今はこのゲームだけを配信中。低い比率はこのカテゴリーへのたまの訪問者を示します。`,
    relatedRankings: '関連ランキング',
    relatedRankingsAria: '関連ゲームのランキング',
    liveAndSchedule: (category) => `${category} の配信中 & スケジュール →`,
    allRankings: 'すべてのランキング',
    paginationAria: (category) => `${category} ランキングのページ`,
    prev: '← 前へ',
    next: '次へ →',
  },
};
