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
    showMore: 'もっと見る',
    showLess: '閉じる',
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
  streamerRankings: {
    heading: 'ランキング',
    intro: (name) => `${name} のランキング順位です。`,
    ofTotal: (total) => `${total}人中`,
    metric: {
      'most-followed': 'フォロワー数',
      'most-watched': '視聴者数',
      'most-active': '配信時間',
      'most-reliable': '時間の正確さ',
      'fastest-growing': '成長率',
    },
    rowAria: (rank, total, label) => `${label} で ${total}人中 ${rank}位`,
    trendUp: (p) => `先週より ${p} 位上昇`,
    trendDown: (p) => `先週より ${p} 位下降`,
    byCategory: 'カテゴリー別',
    summary: (name, parts) => `Streamer Times での ${name} の順位: ${parts.join('、')}。`,
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
    tzToggleYour: 'あなたの時間',
    tzToggleAria: '時刻の表示基準',
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
  wiki: {
    teaserTitle: 'Wiki・プロフィール',
    teaserSub: (name) => `${name}の年齢・資産・経歴をまとめたWikiプロフィール`,
    breadcrumb: 'Wiki',
    heading: (name) => `${name} — Wiki`,
    metaTitle: (name, year) => `${name} Wiki ${year}：年齢・資産・プロフィール`,
    updated: (date) => `${date}更新`,
    factsHeading: '基本情報',
    factLabel: {
      real_name: '本名',
      birth_date: '生年月日',
      birthplace: '出身地',
      residence: '居住地',
      nationality: '国籍',
      relationship_status: '交際状況',
      net_worth_usd: '推定資産',
      est_income_monthly_usd: '推定月収',
      career_start: '配信開始',
      teams: '所属チーム',
      height_cm: '身長',
    },
    relationship: {
      single: '独身',
      in_relationship: '交際中',
      engaged: '婚約中',
      married: '既婚',
      divorced: '離婚',
      widowed: '死別',
    },
    ageSuffix: (age) => `${age}歳`,
    estimate: '推定',
    asOf: (when) => `${when}時点`,
    sectionCareer: '経歴',
    sectionPersonalLife: '私生活',
    sectionEarnings: '収入と資産',
    aboutHeading: (name) => `${name}について`,
    sourcesHeading: '出典',
    minorNote: '18歳未満のストリーマーについては、経歴に関する情報のみを掲載しています。',
    disclaimerHeading: 'このページについて',
    disclaimer: (name) =>
      `このWikiプロフィールは公開情報をもとに作成されています。資産や収入などの数字は第三者による推定であり、確定した値ではありません。個人に関する記載は、${name}本人または信頼できるメディアが公表した内容に基づきます。`,
    disclaimerContact: 'ご本人で、修正や削除をご希望の場合はご連絡ください：',
  },
};
