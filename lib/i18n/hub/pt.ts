import { formatCompactNumber } from '@/lib/format/number';
import type { HubLex } from './types';

export const pt: HubLex = {
  crumbs: {
    aria: 'Trilha de navegação',
    home: 'Início',
    liveNow: 'Ao vivo agora',
    games: 'Jogos',
    streamers: 'Streamers',
    rankings: 'Rankings',
    pageN: (n) => `Página ${n}`,
  },
  common: {
    browseStreamersAZ: 'Todos os streamers de A a Z',
    allGamesCategories: 'Todos os jogos e categorias',
  },
  home: {
    browseAllGames: 'Explore todos os jogos e categorias →',
    seeLiveNow: 'Veja quem está ao vivo agora →',
  },
  hero: {
    kicker: 'Guia de streamers ao vivo',
    badgeNew: 'Novo',
    badgeLive: 'Já disponível para iOS e Android',
    titleLead: 'Horários de streams ao vivo de ',
    titleTail: '',
    subtitle: 'O guia de TV dos streamers.',
    bodyLead:
      'Um só feed para Twitch e YouTube. Status ao vivo em tempo real, próximos streams previstos por IA e zero ruído. Grátis, sem precisar de conta —',
    bodyLink: 'baixe o app',
    bodyTail: 'para receber alertas ao vivo.',
    appStoreSub: 'Disponível na',
    playSub: 'DISPONÍVEL NO',
    phoneAlt: 'Uma streamer conferindo a programação de hoje à noite no celular',
    phoneCaption: 'Conferindo o lineup de hoje',
    statBothLabel: 'Duas plataformas, um só guia',
    statFavoritesValue: 'Seus favoritos',
    statFavoritesLabel: 'Adicione qualquer canal em segundos',
    statApiValue: 'API pública',
    statApiLabel: 'Em breve · entre na lista de espera',
  },
  upcoming: {
    heading: 'A seguir',
    aria: 'Próximos streams',
    empty: 'Nada agendado agora — volte em breve.',
  },
  trending: {
    heading: 'Em alta na Twitch',
    subtitle:
      'Os maiores jogos da Twitch neste momento — nossos streamers ainda não cobrem todos eles.',
    aria: 'Jogos em alta na Twitch',
    rankOnTwitch: (rank) => `#${rank} na Twitch`,
  },
  popular: {
    heading: 'Streamers populares',
    viewAll: 'Ver todos os streamers →',
  },
  apiPromo: {
    heading: 'API para desenvolvedores',
    comingSoon: 'Em breve',
    eyebrow: 'Para desenvolvedores',
    headlineLead: 'Construa com os mesmos dados —',
    headlineKey: 'em breve, na nossa API.',
    body: 'Estamos integrando os primeiros parceiros piloto. Entre na lista de espera e avisaremos por e-mail assim que o acesso público abrir — incluindo um plano gratuito para devs indie.',
    bullets: [
      'Status ao vivo e número de espectadores em tempo real',
      'Próximos streams previstos por IA com nível de confiança',
      'Webhooks para eventos de “entrou ao vivo”',
      'Especificação OpenAPI incluída',
    ],
    cta: 'Entrar na lista de espera',
  },
  live: {
    h1: 'Ao vivo agora na Twitch e no YouTube',
    intro: (liveCount, categoryCount, soonCount, soonHours = 6) =>
      `${liveCount} streamer${liveCount === 1 ? ' está' : 's estão'} ao vivo agora` +
      (categoryCount > 0
        ? ` em ${categoryCount} jogo${categoryCount === 1 ? '' : 's'} e categorias`
        : '') +
      '.' +
      (soonCount > 0
        ? ` Mais ${soonCount} ${soonCount === 1 ? 'deve começar' : 'devem começar'} nas próximas ${soonHours} horas.`
        : ''),
    introEmpty: 'Ninguém está ao vivo agora — veja quem começa em breve.',
    error: 'O status ao vivo está temporariamente indisponível. Tente de novo em instantes.',
    otherCategory: 'Outros',
    categoryLiveAria: (name) => `${name} — ao vivo agora`,
    nLive: (n) => `${n} ao vivo`,
    startingSoon: 'Começando em breve',
    nextNHours: (n) => `próximas ${n} horas`,
    emptyAll:
      'Nada está ao vivo nem prestes a começar agora. Navegue pelo diretório completo de streamers ou explore os jogos para achar seu próximo stream.',
    itemListName: 'Streamers ao vivo agora na Twitch e no YouTube',
  },
  streamers: {
    h1: 'Todos os streamers de Twitch e YouTube de A a Z',
    intro:
      'Todos os streamers acompanhados no Streamer Times — veja quem está ao vivo e o que vem a seguir. Percorra a lista completa página por página.',
    pageOf: (page, totalPages) => `Página ${page} de ${totalPages}.`,
    error: 'Os streamers estão temporariamente indisponíveis. Tente de novo em instantes.',
    paginationAria: 'Paginação',
    prev: '← Anterior',
    next: 'Próxima →',
  },
  games: {
    liveRightNow: 'Ao vivo agora',
    liveAria: 'Jogos com streams ao vivo',
    error: 'Os jogos estão temporariamente indisponíveis. Tente de novo em instantes.',
    aboutHeading: 'Sobre estes jogos',
    updatedAt: (stamp) => `Atualizado às ${stamp}.`,
    relatedAria: 'Páginas relacionadas',
  },
  gamesRoot: {
    h1: 'Os jogos mais populares da Twitch e do YouTube',
    methodologyNote:
      'Ordenados por quantos streamers acompanhamos em cada categoria nos últimos 28 dias.',
    intro: (gameCount, liveStreamerCount, liveGameCount) => {
      const lead = `Acompanhamos ${gameCount} jogo${gameCount === 1 ? '' : 's'} e categorias na Twitch e no YouTube.`;
      const note =
        'Ordenados por quantos streamers acompanhamos em cada categoria nos últimos 28 dias.';
      if (liveStreamerCount <= 0) return `${lead} ${note}`;
      const streamers = `${formatCompactNumber(liveStreamerCount, 'pt')} streamer${liveStreamerCount === 1 ? ' está' : 's estão'} ao vivo agora`;
      const across =
        liveGameCount > 0
          ? ` em ${liveGameCount} categoria${liveGameCount === 1 ? '' : 's'}`
          : '';
      return `${lead} ${streamers}${across}. ${note}`;
    },
    faqPopularQ: 'Qual é o jogo mais popular da Twitch e do YouTube?',
    faqPopularA: (top, second) =>
      `${top.category} reúne o maior número de streamers que acompanhamos — ${top.count} ${top.count === 1 ? 'canal transmitiu o jogo' : 'canais transmitiram o jogo'} nos últimos 28 dias${second ? `, à frente de ${second.category} com ${second.count}` : ''}.`,
    faqWhoQ: 'Quem está fazendo stream agora?',
    faqWhoA: (liveStreamerCount, liveGameCount) =>
      `${liveStreamerCount} streamer${liveStreamerCount === 1 ? ' está' : 's estão'} ao vivo em ${liveGameCount} categoria${liveGameCount === 1 ? '' : 's'}. Abra qualquer categoria para ver os canais ao vivo e seus próximos streams.`,
    faqRankedQ: 'Como estes jogos são classificados?',
    faqRankedA: (gameCount) =>
      `Ordenados por quantos streamers acompanhamos em cada categoria nos últimos 28 dias. Os números vêm de um agregado noturno de transmissões encerradas em ${gameCount} jogo${gameCount === 1 ? '' : 's'}; os dados ao vivo são atualizados a cada poucos minutos.`,
    faqHoursQ: '“Horas transmitidas” significa tempo assistido?',
    faqHoursA:
      'Não. Horas transmitidas medem quanto tempo os streamers ficaram ao vivo em uma categoria. Não medimos o tempo assistido pelos espectadores; os espectadores ao vivo mostrados nos cards são uma amostra do momento, não um total.',
  },
  rankings: {
    h1: 'Rankings de streamers',
    intro: (n) =>
      `Quem são os maiores streamers, os que mais crescem, os mais ativos e os mais confiáveis da Twitch e do YouTube? ${n} rankings sobre todos os streamers que acompanhamos — atualizados diariamente com dados reais de transmissões.`,
    dataRefreshed: (label) => ` Dados atualizados em ${label}.`,
    statStreamersTracked: 'streamers acompanhados',
    statLiveNow: 'ao vivo agora',
    statGamesCategories: 'jogos e categorias',
    seeFullRanking: 'Ver o ranking completo →',
    warmingUp: 'Os rankings ainda estão aquecendo — volte em breve.',
    byGameHeading: 'Rankings por jogo',
    byGameSubtitle: 'Os streamers com mais seguidores de cada jogo e categoria.',
    byGameAria: 'Rankings de jogos populares',
    topGameStreamers: (category) => `Melhores streamers de ${category}`,
    whoIsLive: 'Quem está ao vivo agora?',
    metricH1: {
      'most-followed': 'Streamers com mais seguidores',
      'fastest-growing': 'Streamers que mais crescem',
      'most-watched': 'Streamers mais assistidos',
      'most-active': 'Streamers mais ativos',
      'most-reliable': 'Streamers mais pontuais',
    },
    metricNote: {
      'most-followed':
        'Atualizado diariamente. As contagens de seguidores e inscritos são atualizadas com regularidade e podem ficar atrás dos números ao vivo das plataformas.',
      'fastest-growing':
        'Ganho de seguidores do canal (Twitch) ou inscritos (YouTube) nos últimos 7 dias, a partir de capturas diárias de cada canal acompanhado. Só canais com crescimento positivo entram no ranking. Atualizado diariamente.',
      'most-watched':
        'Mediana de espectadores simultâneos ao vivo nos últimos 28 dias (amostragem por hora). Atualizado diariamente.',
      'most-active':
        'Total de horas ao vivo nos últimos 28 dias. Cada stream conta uma vez; canais 24/7 sempre no ar ficam de fora. Atualizado diariamente.',
      'most-reliable':
        'Parcela dos streams anunciados na Twitch que realmente começaram dentro de ±30 minutos, sobre os últimos 20 streams anunciados em 90 dias (mínimo de 10 avaliados). Atualizado diariamente.',
    },
  },
};
