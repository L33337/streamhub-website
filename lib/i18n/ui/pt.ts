import type { UiLex } from '../types';

// Portuguese — pt-BR leaning (matches the pt_BR og:locale), você-form,
// "live/stream" loanwords as used by the Brazilian streaming community.
export const pt: UiLex = {
  breadcrumb: {
    home: 'Início',
    streamers: 'Streamers',
  },
  hero: {
    featured: 'Destaque',
    nowStreaming: 'Transmitindo agora:',
    avatarAlt: (name) => `Avatar de ${name}`,
    showMore: 'Ver mais',
    showLess: 'Ver menos',
  },
  promo: {
    valueProps: [
      'Salve seus streamers favoritos',
      'Receba uma notificação assim que eles entrarem ao vivo',
      'Adicione qualquer streamer em segundos',
    ],
    qrAria: 'Código QR — escaneie com o celular para baixar o app Streamer Times',
    getApp: 'Baixe o app',
  },
  lastStream: {
    heading: 'Última live',
    pastStream: 'Live anterior',
    watchVod: 'Assistir ao VOD →',
    watchAria: (name, title) => `Assistir à última live de ${name}: ${title}`,
  },
  recent: {
    heading: 'Lives recentes',
    vodAria: (title) => `Assistir ao VOD: ${title}`,
  },
  channelStats: {
    heading: 'Estatísticas do canal',
    followers: 'Seguidores',
    subscribers: 'Inscritos',
    avgViewers: 'Média de espectadores',
    medianDetail: 'mediana de 28 dias',
    peakViewers: 'Pico de espectadores',
    hoursStreamed: 'Horas transmitidas',
    lastNDays: (n) => `últimos ${n} dias`,
  },
  streamerRankings: {
    heading: 'Classificações',
    intro: (name) => `A posição de ${name} nas nossas classificações de streamers.`,
    ofTotal: (total) => `de ${total}`,
    metric: {
      'most-followed': 'Mais seguidos',
      'most-watched': 'Mais vistos',
      'most-active': 'Mais ativos',
      'most-reliable': 'Mais pontuais',
      'fastest-growing': 'Crescimento mais rápido',
    },
    rowAria: (rank, total, label) => `Posição ${rank} de ${total} em ${label}`,
    trendUp: (p) => `subiu ${p} ${p === 1 ? 'posição' : 'posições'} desde a semana passada`,
    trendDown: (p) => `desceu ${p} ${p === 1 ? 'posição' : 'posições'} desde a semana passada`,
    byCategory: 'Por categoria',
    summary: (name, parts) => `${name} está em ${parts.join(' e ')} no Streamer Times.`,
  },
  stats: {
    heading: (name) => `Quando ${name} faz live?`,
    caption: (name, tz) =>
      `Horários típicos das lives de ${name} por dia da semana, exibidos em ${tz}`,
    colDay: 'Dia',
    colTime: 'Horário típico',
    colDuration: 'Duração',
    usuallyNoStream: 'Normalmente sem live',
    streamsPerWeek: 'Lives por semana',
    typicalLength: 'Duração típica da live',
    topCategories: 'Categorias mais transmitidas',
    basedOn: (n, d) => `Com base em ${n} lives dos últimos ${d} dias.`,
    allTimesIn: (tz) => `Todos os horários são exibidos em ${tz}`,
    cityTime: (city) => `horário de ${city}`,
    tzToggleYour: 'Seu horário',
    tzToggleAria: 'Mostrar horários em',
    leadSentence: (name, days, times) => {
      const dayWord = days === 1 ? 'dia' : 'dias';
      const base = `${name} costuma fazer live ${days} ${dayWord} por semana`;
      return times
        ? `${base}, normalmente entre ${times.start} e ${times.end} (${times.tzLabel}).`
        : `${base}.`;
    },
  },
  faq: {
    heading: 'Perguntas frequentes',
    qIsLive: (name) => `${name} está ao vivo agora?`,
    aIsLiveCat: (name, cat, platforms) =>
      `Sim — ${name} está ao vivo agora transmitindo ${cat} em ${platforms}.`,
    aIsLive: (name, platforms) => `Sim — ${name} está ao vivo agora em ${platforms}.`,
    qUsually: (name) => `Quando ${name} costuma fazer live?`,
    typicallyLast: (duration) => `As lives costumam durar cerca de ${duration}.`,
    qSchedule: (name) => `Qual é a agenda de lives de ${name}?`,
    aScheduleLead: (name, n) =>
      n === 1
        ? `${name} tem 1 live agendada para os próximos 7 dias.`
        : `${name} tem ${n} lives agendadas para os próximos 7 dias.`,
    nextUp: (entry) => `A próxima: ${entry}.`,
    afterThat: (list) => `Depois: ${list}.`,
    plusMore: (n) =>
      n === 1
        ? `E mais 1 — veja a agenda completa acima.`
        : `E mais ${n} — veja a agenda completa acima.`,
    allTimesNote: (tz) => `Todos os horários são exibidos em ${tz}.`,
    predictedNote:
      'Os horários marcados como previsão são estimados por IA a partir dos padrões de lives anteriores.',
    outsideDates: (name, time, tz) =>
      `Fora dessas datas, ${name} costuma entrar ao vivo por volta das ${time} (${tz}) — veja os horários típicos acima.`,
    predictedMarker: 'previsão',
    qGames: (name) => `Quais jogos ${name} transmite?`,
    aGamesOne: (name, cat) =>
      `${name} está transmitindo ${cat} atualmente. Veja a agenda acima para as próximas lives.`,
    aGamesMany: (name, list) =>
      `${name} transmite ${list}. Veja a agenda acima para saber o que vem por aí.`,
    qHowOften: (name) => `Com que frequência ${name} faz live?`,
    aAlwaysOn: (name, platforms) =>
      `${name} transmite 24/7 — o canal está sempre ao vivo em ${platforms}.`,
    aPerWeek: (name, perWeek, windowDays) =>
      `${name} faz live cerca de ${perWeek} vezes por semana em média, com base nas transmissões dos últimos ${windowDays} dias.`,
    aScheduleCount: (name, n, daysList) => {
      const base =
        n === 1
          ? `${name} tem 1 live agendada para os próximos 7 dias`
          : `${name} tem ${n} lives agendadas para os próximos 7 dias`;
      return daysList ? `${base}, em ${daysList}.` : `${base}.`;
    },
    qWhere: (name) => `Onde posso assistir ${name}?`,
    aWhere: (name, platforms) =>
      `${name} transmite ao vivo em ${platforms}. Adicione ${name} no Streamer Times para acompanhar o status ao vivo e as próximas lives em um só lugar.`,
    qTimezone: (name) => `Em qual fuso horário ${name} transmite?`,
    aTimezone: (name, tzCity) =>
      `${name} mora no fuso horário de ${tzCity}. A agenda desta página mostra cada live no seu horário local e no horário local de ${name}.`,
    qPredicted: (name) => `Os horários de ${name} são previstos ou confirmados?`,
    aAllPredicted: (name) =>
      `Os próximos horários de ${name} são previsões de IA baseadas nos padrões de lives anteriores, cada uma com nível de probabilidade alto, médio ou baixo. Horários confirmados aparecem aqui assim que forem anunciados.`,
    aMixed: (name, predicted, total) =>
      `A agenda de ${name} combina previsões de IA com lives confirmadas. ${predicted} dos ${total} próximos horários são previstos a partir de padrões anteriores, exibidos com nível de probabilidade.`,
  },
  empty: {
    heading: 'Nenhuma live agendada',
    body: (name, platforms) =>
      `Acompanhamos as lives de ${name} em ${platforms}. Previsões de IA e agendas confirmadas aparecerão aqui quando houver histórico suficiente.`,
    browseAll: 'Ver todos os streamers',
  },
  related: {
    heading: 'Streamers relacionados',
    liveNowSr: '(ao vivo agora)',
  },
  games: {
    heading: 'Jogos',
    navAria: 'Jogos que este streamer joga',
  },
  wiki: {
    teaserTitle: 'Wiki e fatos',
    teaserSub: (name) => `Idade, patrimônio, carreira — o perfil wiki de ${name}`,
    breadcrumb: 'Wiki',
    heading: (name) => `${name} — Wiki`,
    metaTitle: (name, year) => `${name} Wiki ${year}: idade, patrimônio e fatos`,
    updated: (date) => `Atualizado em ${date}`,
    factsHeading: 'Fatos rápidos',
    factLabel: {
      real_name: 'Nome real',
      birth_date: 'Nascimento',
      birthplace: 'Local de nascimento',
      residence: 'Residência',
      nationality: 'Nacionalidade',
      relationship_status: 'Estado civil',
      net_worth_usd: 'Patrimônio (est.)',
      est_income_monthly_usd: 'Renda mensal (est.)',
      career_start: 'Faz stream desde',
      teams: 'Times e orgs',
      height_cm: 'Altura',
    },
    relationship: {
      single: 'Solteiro(a)',
      in_relationship: 'Em um relacionamento',
      engaged: 'Noivo(a)',
      married: 'Casado(a)',
      divorced: 'Divorciado(a)',
      widowed: 'Viúvo(a)',
    },
    ageSuffix: (age) => `${age} anos`,
    estimate: 'estimativa',
    asOf: (when) => `dados de ${when}`,
    sectionCareer: 'Carreira',
    sectionPersonalLife: 'Vida pessoal',
    sectionEarnings: 'Ganhos e patrimônio',
    aboutHeading: (name) => `Sobre ${name}`,
    nextStreamHeading: 'Próxima transmissão',
    fullSchedule: (name) => `Ver a agenda completa de ${name}`,
    sourcesHeading: 'Fontes',
    minorNote: 'Para streamers menores de 18 anos, publicamos apenas informações de carreira.',
    disclaimerHeading: 'Sobre esta página',
    disclaimer: (name) =>
      `Este perfil wiki foi montado a partir de fontes públicas. Números como patrimônio e renda são estimativas de terceiros, não valores verificados; os dados pessoais refletem o que ${name} ou veículos estabelecidos tornaram público.`,
    disclaimerContact:
      'Você é esse streamer e quer corrigir ou remover algo? Escreva para a gente:',
  },
};
