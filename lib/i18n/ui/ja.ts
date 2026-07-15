import type { UiLex } from '../types';

// Japanese — polite です/ます register; 配信/配信者 for stream/streamer,
// katakana loanwords (ストリーマー) where the community uses them.
export const ja: UiLex = {
  breadcrumb: {
    home: 'ホーム',
    streamers: 'ストリーマー',
  },
  hero: {
    featured: '注目',
    nowStreaming: '配信中:',
    avatarAlt: (name) => `${name}のアバター`,
  },
  promo: {
    valueProps: [
      'お気に入りのストリーマーを保存',
      '配信開始の瞬間に通知を受け取る',
      '新しいストリーマーを数秒で追加',
    ],
    qrAria: 'QRコード — スマホでスキャンしてStreamer Timesアプリを入手',
    getApp: 'アプリを入手',
  },
  lastStream: {
    heading: '前回の配信',
    pastStream: '過去の配信',
    watchVod: 'VODを見る →',
    watchAria: (name, title) => `${name}の前回の配信を見る: ${title}`,
  },
  recent: {
    heading: '最近の配信',
    vodAria: (title) => `VODを見る: ${title}`,
  },
  channelStats: {
    heading: 'チャンネル統計',
    followers: 'フォロワー',
    subscribers: '登録者',
    avgViewers: '平均視聴者数',
    medianDetail: '28日間の中央値',
    peakViewers: '最大視聴者数',
    hoursStreamed: '配信時間',
    lastNDays: (n) => `直近${n}日間`,
  },
  stats: {
    heading: (name) => `${name}の配信はいつ？`,
    caption: (name, tz) => `${name}の曜日別の典型的な配信時間（${tz}で表示）`,
    colDay: '曜日',
    colTime: 'いつもの時間',
    colDuration: '長さ',
    usuallyNoStream: '通常は配信なし',
    streamsPerWeek: '週あたりの配信数',
    typicalLength: '典型的な配信の長さ',
    topCategories: 'よく配信するカテゴリー',
    basedOn: (n, d) => `直近${d}日間の${n}件の配信に基づいています。`,
    allTimesIn: (tz) => `すべての時刻は${tz}で表示しています`,
    cityTime: (city) => `${city}時間`,
    leadSentence: (name, days, times) => {
      const base = `${name}さんは通常、週に${days}日配信しています`;
      return times
        ? `${base}（多くは${times.start}〜${times.end}、${times.tzLabel}）。`
        : `${base}。`;
    },
  },
  faq: {
    heading: 'よくある質問',
    qIsLive: (name) => `${name}は今配信中ですか？`,
    aIsLiveCat: (name, cat, platforms) =>
      `はい — ${name}さんは現在${platforms}で${cat}を配信中です。`,
    aIsLive: (name, platforms) => `はい — ${name}さんは現在${platforms}で配信中です。`,
    qUsually: (name) => `${name}は普段いつ配信していますか？`,
    typicallyLast: (duration) => `配信は通常${duration}ほど続きます。`,
    qSchedule: (name) => `${name}の配信スケジュールは？`,
    aScheduleLead: (name, n) =>
      `${name}さんは今後7日間に${n}件の配信を予定しています。`,
    nextUp: (entry) => `次の配信: ${entry}。`,
    afterThat: (list) => `その後: ${list}。`,
    plusMore: (n) => `さらに${n}件 — 上の完全なスケジュールをご覧ください。`,
    allTimesNote: (tz) => `すべての時刻は${tz}で表示しています。`,
    predictedNote:
      '予測と表示された時間は、過去の配信パターンからAIが推定したものです。',
    outsideDates: (name, time, tz) =>
      `これらの日以外では、${name}さんは通常${time}頃（${tz}）に配信を開始します — 上の典型的な配信時間をご覧ください。`,
    predictedMarker: '予測',
    qGames: (name) => `${name}はどんなゲームを配信していますか？`,
    aGamesOne: (name, cat) =>
      `${name}さんは現在${cat}を配信しています。今後の配信は上のスケジュールをご覧ください。`,
    aGamesMany: (name, list) =>
      `${name}さんは${list}を配信しています。今後の予定は上のスケジュールをご覧ください。`,
    qHowOften: (name) => `${name}はどのくらいの頻度で配信していますか？`,
    aAlwaysOn: (name, platforms) =>
      `${name}さんは24時間365日配信中 — チャンネルは${platforms}で常時ライブです。`,
    aPerWeek: (name, perWeek, windowDays) =>
      `${name}さんは直近${windowDays}日間の配信実績によると、平均して週に約${perWeek}回配信しています。`,
    aScheduleCount: (name, n, daysList) => {
      const base = `${name}さんは今後7日間に${n}件の配信を予定しています`;
      return daysList ? `${base}（${daysList}）。` : `${base}。`;
    },
    qWhere: (name) => `${name}はどこで見られますか？`,
    aWhere: (name, platforms) =>
      `${name}さんは${platforms}でライブ配信しています。Streamer Timesに${name}さんを追加すると、ライブ状況と今後の配信をまとめてチェックできます。`,
    qTimezone: (name) => `${name}はどのタイムゾーンで配信していますか？`,
    aTimezone: (name, tzCity) =>
      `${name}さんの拠点は${tzCity}のタイムゾーンです。このページのスケジュールは、各配信をあなたの現地時間と${name}さんの現地時間で表示します。`,
    qPredicted: (name) => `${name}の配信時間は予測ですか、確定ですか？`,
    aAllPredicted: (name) =>
      `${name}さんの今後の配信時間は、過去の配信パターンに基づくAI予測で、それぞれ高・中・低の確度付きで表示されます。確定した時間は、発表され次第ここに表示されます。`,
    aMixed: (name, predicted, total) =>
      `${name}さんのスケジュールにはAI予測と確定した配信が混在しています。今後の${total}件のうち${predicted}件は過去のパターンからの予測で、確度付きで表示されます。`,
  },
  empty: {
    heading: '予定されている配信はありません',
    body: (name, platforms) =>
      `${platforms}での${name}さんのライブ配信を追跡しています。十分な履歴が集まると、AI予測と確定スケジュールがここに表示されます。`,
    browseAll: 'すべてのストリーマーを見る',
  },
  related: {
    heading: '関連ストリーマー',
    liveNowSr: '（配信中）',
  },
  games: {
    heading: 'ゲーム',
    navAria: 'このストリーマーがプレイするゲーム',
  },
};
