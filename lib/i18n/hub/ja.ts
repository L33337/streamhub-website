import { formatCompactNumber } from '@/lib/format/number';
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
  hero: {
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
      '今 Twitch で最も大きなゲームです — まだ当サイトのストリーマーが全部をカバーしているわけではありません。',
    aria: 'Twitch のトレンドゲーム',
    rankOnTwitch: (rank) => `Twitch で第${rank}位`,
  },
  popular: {
    heading: '人気のストリーマー',
    viewAll: 'すべてのストリーマーを見る →',
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
};
