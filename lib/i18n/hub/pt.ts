import { formatCompactNumber } from '@/lib/format/number';
import { listConjunction } from '@/lib/i18n-core';
import type { HubLex } from './types';

export const pt: HubLex = {
  crumbs: {
    aria: 'Trilha de navegação',
    home: 'Início',
    liveNow: 'Ao vivo agora',
    tonight: 'Hoje à noite',
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
    qrTitle: 'Escaneie para baixar o Streamer Times',
    qrHeading: 'Escaneie para baixar',
    qrHint: 'Aponte a câmera do celular aqui',
  },
  homeFeed: {
    ticker: (liveCount, soonCount, soonHours) => {
      const live =
        liveCount > 0
          ? `${liveCount} streamer${liveCount === 1 ? '' : 's'} ao vivo agora`
          : '';
      const soon =
        soonCount > 0 ? `${soonCount} começam nas próximas ${soonHours} horas` : '';
      return live && soon ? `${live} · ${soon}` : live || soon;
    },
    liveTitle: 'Mais assistidos agora',
    liveFilterCategory: 'Categoria',
    liveFilterLanguage: 'Idioma',
    liveFilterAllCategories: 'Todas as categorias',
    liveFilterAllLanguages: 'Todos os idiomas',
    liveFilterOption: (label, count) => `${label} (${count})`,
    liveFilterMatches: (count) => `${count} lives`,
    liveFilterReset: 'Limpar',
    liveFilterEmpty: 'Nenhuma live corresponde a esses filtros agora.',
    liveFilterNote: (top, total) =>
      `Top ${top} por espectadores agora — os filtros buscam entre as ${total} lives`,
    upNextTitle: 'A programação de hoje',
    upNextLink: 'Ao vivo e começando em breve →',
    upNextTonightLink: 'A noite completa →',
    lineupFilterTime: 'Horário',
    lineupFilterAllTimes: 'Qualquer horário',
    lineupFilterFrom: (time) => `A partir de ${time}`,
    lineupFilterMatches: (count) =>
      `${count} ${count === 1 ? 'transmissão' : 'transmissões'}`,
    lineupFilterEmpty: 'Nenhuma transmissão corresponde a esses filtros.',
    chipAll: 'Todos',
    chipFavorites: 'Meus favoritos',
    lineupShowAll: (n) => `Mostrar todos os ${n} streams`,
    lineupShowMore: (n) => `Mostrar mais ${n}`,
    lineupShowLess: 'Mostrar menos',
    bellAria: (name) => `Receba um aviso quando ${name} entrar ao vivo`,
    upsell: {
      bellTitle: 'Não perca nenhuma stream',
      bellBody:
        'Receba uma notificação push pouco antes de a stream começar — com o app gratuito do Streamer Times.',
      favoritesTitle: 'Seus favoritos, a um toque',
      favoritesBody:
        'Siga streamers e filtre esta página até a sua própria programação — grátis, no app ou aqui mesmo no navegador.',
      appCta: 'Baixar o app',
      loginCta: 'Entrar grátis',
      close: 'Talvez depois',
    },
    interrupt: {
      title: 'Esta página — só com os seus streamers.',
      body: 'Siga seus streamers e o guia vira o seu feed pessoal: sua programação, alertas push pouco antes de entrarem ao vivo e os melhores momentos da semana deles.',
      note: 'Leva 30 segundos · grátis',
      appCta: 'Baixar o app',
      loginCta: 'Entrar pela web',
    },
    clipsTitle: 'Clipes da semana',
    clipsFilterMatches: (count) => `${count} clipe${count === 1 ? '' : 's'}`,
    clipsFilterEmpty: 'Nenhum clipe corresponde a estes filtros.',
    quickFactsTitle: 'Fatos rápidos',
    quickFactsSub: 'Números das streams que acompanhamos',
    factPredictionLabel: 'Checagem de previsões',
    factPrediction: (hits, total) =>
      `Em ${hits} de ${total} previsões de probabilidade alta, a stream começou a menos de duas horas do horário previsto.`,
    factPeakLabel: 'Pico da semana',
    factPeak: (name) =>
      `${name} atingiu o maior número de espectadores simultâneos da semana.`,
    factReliableLabel: 'Na hora certa',
    factReliable: (name, hits, total) =>
      `${name} começou no horário ${hits} das últimas ${total} streams anunciadas.`,
    factPauseLabel: 'De pausa',
    factPause: (name) => `${name} está de pausa até esta data.`,
    factMarathonLabel: 'Maratona da semana',
    factMarathon: (name) => `${name} ficou ao vivo esse tempo todo de uma vez.`,
    factComebackLabel: 'Volta da semana',
    factComeback: (name, days) => `${name} voltou após ${days} dias sem stream.`,
    factPrimeTimeLabel: 'Horário nobre',
    factPrimeTime: (total) =>
      `Nesta hora começam mais streams do que em qualquer outra, em ${total} streams em 4 semanas.`,
    factBusiestDayLabel: 'Dia mais cheio',
    factBusiestDay: (total) =>
      `O dia da semana em que começam mais streams, em ${total} streams em 4 semanas.`,
    factLocalTimeNote: 'seu fuso horário',
    factUtcNote: 'UTC',
    factTopCategoryLabel: 'Categoria da semana',
    factTopCategory: (category, streamers) =>
      `Streams de ${category} nos últimos 7 dias, de ${streamers} ${streamers === 1 ? 'streamer' : 'streamers'}.`,
    factCompetitionLabel: 'Nível de concorrência',
    factCompetition: (category) =>
      `Canais acompanhados ao vivo em ${category} ao mesmo tempo, em média — a categoria mais cheia que seguimos.`,
    factRoomLabel: 'Espaço livre',
    factRoom: (category, channels) =>
      `Espectadores por canal em ${category}, com apenas ${channels} canais acompanhados ao vivo ao mesmo tempo.`,
    factRoomSlotLabel: 'Melhor horário',
    risersTitle: 'Em ascensão esta semana',
    risersLink: 'Todos os rankings →',
    risersGained: (delta) => `${delta} seguidores em 7 dias`,
    mostStreamedTitle: 'Quem mais streamou esta semana',
    weekHours: (value) => `${value} h ao vivo · 7 dias`,
    weekStreams: (n) => `${n} stream${n === 1 ? '' : 's'}`,
    mostWatchedTitle: 'Mais assistidos',
    topStreamersCol: 'Top 5 streamers',
    topCategoriesCol: 'Top 5 categorias',
    medianViewers: (value) => `${value} espectadores (mediana)`,
    hoursStreamed: (value) => `${value} h ao vivo · 28 dias`,
    followers: (value) => `${value} seguidores`,
    missingStreamer: 'Seu streamer está faltando? Busque e adicione →',
    endcap: {
      title: 'Leve a sua programação com você.',
      bullets: [
        'Siga seus streamers favoritos',
        'Veja quem entra ao vivo e quando',
        'Stats, clipes e muito mais!',
      ],
      webLead: 'Prefere o navegador?',
      webLink: 'Crie uma conta grátis',
      webTail: '— seu feed está esperando.',
    },
    sessionBanner: {
      text: 'Bem-vindo de volta — seu feed pessoal está pronto.',
      cta: 'Ir para meu feed →',
    },
    sectionNav: {
      aria: 'Ir para uma seção',
      live: 'Ao vivo',
      lineup: 'Hoje',
      trending: 'Em alta',
      clips: 'Clipes',
      stats: 'Números',
      discover: 'Streamers',
    },
  },
  hero: {
    claim: 'Programação. Clipes. Estatísticas. Tudo em um só lugar.',
    ctaLogin: 'Faça login',
    ctaMid: ' ou ',
    ctaApp: 'baixe o app',
    ctaTail: ' para seguir seus streamers favoritos.',
    ctaAppOnlyLink: 'Baixe o app',
    ctaAppOnlyTail: ' para seguir seus streamers favoritos.',
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
      'O que a Twitch inteira está assistindo agora.',
    aria: 'Jogos em alta na Twitch',
    rankOnTwitch: (rank) => `#${rank} na Twitch`,
    sortAria: 'Ordenar jogos',
    sortTwitch: 'Twitch',
    sortHours: 'Horas',
    sortViewers: 'Espectadores',
    sortStreamers: 'Streamers',
    liveViewers: (value) => `${value} assistindo agora`,
    streamerCount: (value, count) => `${value} ${count === 1 ? 'streamer' : 'streamers'}`,
  },
  popular: {
    heading: 'Streamers populares',
    viewAll: 'Ver todos os streamers →',
  },
  streamerWiki: {
    heading: 'Streamer Wiki',
    subline: 'Quem são, o que jogam e quando entram ao vivo.',
    viewAll: 'Explorar todos os streamers →',
    followers: (value) => `≈${value} seguidores`,
    streams28d: (count) => `${count} ${count === 1 ? 'transmissão' : 'transmissões'} em 28 dias`,
    liveNow: 'Ao vivo agora',
    nextPrefix: 'Próxima',
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
    jumpToGame: 'Ir para um jogo',
    startingSoon: 'Começando em breve',
    nextNHours: (n) => `próximas ${n} horas`,
    emptyAll:
      'Nada está ao vivo nem prestes a começar agora. Navegue pelo diretório completo de streamers ou explore os jogos para achar seu próximo stream.',
    itemListName: 'Streamers ao vivo agora na Twitch e no YouTube',
  },
  tonight: {
    h1: 'Quem transmite hoje à noite?',
    h1Night: 'Quem transmite nesta madrugada',
    intro: (total, names) =>
      `${total} stream${total === 1 ? ' está programado' : 's estão programados'} para hoje à noite na Twitch e no YouTube` +
      (names ? `, incluindo ${names}` : '') +
      '.',
    introEmpty:
      'Ainda não há nada programado para hoje à noite. As previsões vão sendo preenchidas ao longo do dia, conforme os streamers encerram as transmissões atuais.',
    timesInZone: (zone) => `Todos os horários em ${zone}`,
    timesLocal: 'Todos os horários no seu fuso horário',
    error: 'A programação de hoje à noite está temporariamente indisponível. Tente de novo em instantes.',
    jumpAria: 'Ir para um horário da noite',
    liveNowHeading: 'Já ao vivo',
    liveNowLink: 'Ver todo mundo que está ao vivo',
    primetimeHeading: 'Destaques da noite',
    primetimeSub: (time) => `Os maiores nomes que entram ao vivo por volta das ${time}.`,
    blockFrom: (time) => `A partir das ${time}`,
    blockNight: 'Madrugada',
    blockCount: (n) => `${n} stream${n === 1 ? '' : 's'}`,
    quietBody:
      'Volte mais tarde ou veja quem está ao vivo agora — a noite costuma encher a partir das 18h.',
    aboutHeading: 'Sobre o guia de hoje à noite',
    aboutBody:
      'Esta página é a visão noturna do Streamer Times: todas as transmissões da Twitch e do YouTube que esperamos entre 18h e 6h, agrupadas pelo horário de início, para você planejar a noite como faria com um guia de TV.',
    faqWhatQ: 'O que tem hoje à noite?',
    faqWhatA:
      'Os blocos acima listam todas as transmissões programadas ou previstas para esta noite, da mais cedo para a mais tarde. As transmissões anunciadas vêm direto da agenda do próprio streamer; o restante é previsto a partir do histórico, com um selo de confiança em cada card.',
    faqHowQ: 'Como vocês sabem quando alguém vai transmitir?',
    faqHowA:
      'Acompanhamos o histórico de transmissões de cada canal e os anúncios, e a partir daí prevemos o próximo início. Confiança alta significa um padrão forte e regular ou uma data anunciada; confiança baixa significa que a agenda anda irregular.',
    faqTimesQ: 'Em que fuso horário estão os horários?',
    faqTimesA: (zone) =>
      `Os horários aparecem em ${zone} e mudam para o seu próprio fuso assim que a página carrega. A noite vai das 18h às 6h, então uma transmissão que começa depois da meia-noite ainda faz parte de hoje à noite.`,
    itemListName: 'Transmissões de hoje à noite na Twitch e no YouTube',
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
    filterEmpty: 'Nenhum streamer deste ranking corresponde a esses filtros.',
    filterError: 'Não foi possível carregar o ranking filtrado.',
    filterRetry: 'Tentar de novo',
    byGameHeading: 'Rankings por jogo',
    byGameSubtitle: 'Os streamers com mais seguidores de cada jogo e categoria.',
    byGameAria: 'Rankings de jogos populares',
    topGameStreamers: (category) => `Melhores streamers de ${category}`,
    whoIsLive: 'Quem está ao vivo agora?',
    climbersThisWeek: 'Maiores subidas da semana',
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
    tableColStreamer: 'Streamer',
    tableColMainGame: 'Jogo principal',
    tableColNextStream: 'Próximo stream',
    tableHeaders: {
      'Followers': 'Seguidores',
      'Avg viewers': 'Média de espectadores',
      'Gained (7d)': 'Ganhos (7 d)',
      'Growth': 'Crescimento',
      'Followers now': 'Seguidores agora',
      'Hours (28d)': 'Horas (28 d)',
      'Streams / week': 'Streams / semana',
      'Avg duration': 'Duração média',
      'On-time rate': 'Pontualidade',
      'Typical deviation': 'Desvio típico',
      'Streams evaluated': 'Streams avaliados',
    },
    trendNewLabel: 'novo',
    trendNewTitle: 'Há uma semana não estava neste ranking',
    trendMoveTitle: (up, delta) => `${up ? 'Subiu' : 'Caiu'} ${delta} desde a semana passada`,
    mainGameShareTitle: (pct) => `${pct}% dos streams categorizados`,
    alwaysOnTitle: 'Canal sempre ativo — ao vivo 24 horas',
  },
  recaps: {
    weeklyKicker: 'Resumo da semana',
    monthlyKicker: 'Resumo do mês',
    readMore: 'Ler o resumo completo',
    archiveTitle: 'Arquivo de resumos',
    archiveIntro:
      'Todos os resumos semanais e mensais dos rankings: quem subiu, quem cresceu mais rápido e os clipes que todo mundo assistiu.',
    allRecaps: 'Todos os resumos',
    backToRankings: 'Todos os rankings',
    previousEdition: 'Edição anterior',
    nextEdition: 'Próxima edição',
    translationPending:
      'Esta edição ainda não foi traduzida — exibindo o original em inglês.',
  },
  gamesExplorer: {
    sectionAria: 'Todos os jogos e categorias',
    sortAria: 'Ordenar jogos',
    sortLabels: { streamers: 'Mais streamers', hours: 'Mais transmitidos', trending: 'Em alta' },
    viewTitles: {
      streamers: 'Os jogos mais populares na Twitch e no YouTube',
      hours: 'Os jogos mais transmitidos na Twitch e no YouTube',
      trending: 'Jogos em alta na Twitch e no YouTube',
    },
    searchPlaceholder: 'Buscar jogos…',
    searchAria: 'Buscar jogos',
    noMatch: 'Nenhum jogo corresponde a “{q}”.',
  },
  gameChips: {
    aria: (category) => `Estatísticas de ${category}`,
    streamersLabel: (n) => (n === 1 ? 'streamer' : 'streamers'),
    liveNowLabel: 'ao vivo agora',
    watchingLabel: 'assistindo',
    streamedLabel: 'de stream · 28 dias',
    streamsLabel: () => 'streams · 28 dias',
    peakLead: 'Pico de ',
    peakTail: ' espectadores · 28 dias',
    trendTail: ' esta semana',
    trendTitle: 'Variação de streamers ativos em relação à semana passada',
  },
  game: {
    notFoundTitle: 'Jogo não encontrado — StreamerTimes',
    metaTitle: (category) => `Streamers de ${category} — Ao vivo, rankings e horários`,
    metaDescription: (category, names) => {
      const tail = `Quem está ao vivo agora, próximos streams e horários previstos por IA na Twitch e no YouTube.`;
      const namesLead =
        names.length > 0
          ? `${listConjunction(names, 'pt')} ${names.length === 1 ? 'lidera' : 'lideram'} o ranking de ${category}. `
          : '';
      const twoNamesLead =
        names.length > 1
          ? `${listConjunction(names.slice(0, 2), 'pt')} lideram o ranking de ${category}. `
          : '';
      return [
        `${namesLead}${tail}`,
        `${twoNamesLead}${tail}`,
        `Os streamers de ${category} com mais seguidores. ${tail}`,
        tail,
      ];
    },
    ogTitle: (category) => `Streamers de ${category} — ao vivo, rankings e horários`,
    ogDescription: (category, names) => {
      const ogNames = names.length > 0 ? ` — ${listConjunction(names, 'pt')} —` : ':';
      return `Os streamers de ${category} com mais seguidores${ogNames} status ao vivo e horários de stream na Twitch e no YouTube.`;
    },
    h1: (category) => `Streamers de ${category} — ao vivo e horários`,
    intro: (shown, category, liveCount, upcomingCount, superlative) =>
      `${shown} streamer${shown === 1 ? ' tem' : 's têm'} streams de ${category} ao vivo ou agendados esta semana na Twitch e no YouTube. ` +
      (liveCount > 0
        ? `${liveCount} ${liveCount === 1 ? 'está' : 'estão'} ao vivo agora`
        : 'Ninguém está ao vivo agora') +
      (upcomingCount > 0
        ? `, com ${upcomingCount} ${upcomingCount === 1 ? 'stream por vir' : 'streams por vir'} nos próximos 7 dias.`
        : '.') +
      superlative,
    superlative: (category, name, value, isTwitch) =>
      ` O streamer de ${category} com mais ${isTwitch ? 'seguidores' : 'inscritos'} aqui é ${name}, com ${value}.`,
    onPageAria: 'Nesta página',
    navLiveNow: 'Ao vivo',
    navTopStreamers: 'Top streamers',
    navBestTimes: 'Melhores horários',
    navSchedule: 'Agenda',
    navRelated: 'Jogos relacionados',
    followGame: (category) => `Seguir ${category}`,
    followingLabel: 'Seguindo',
    watchingNow: (category) => `Assistindo ${category} agora`,
    liveStreamsAria: (category) => `Streams de ${category} ao vivo`,
    moreLiveAria: (category) => `Mais streams de ${category} ao vivo`,
    showMoreLive: (n) =>
      n === 1 ? 'Ver mais 1 canal ao vivo' : `Ver mais ${n} canais ao vivo`,
    moreLiveInRanking: (n, category) =>
      `Mais ${n} ao vivo no ranking completo de ${category} →`,
    liveUpdatesNote:
      'O status ao vivo e os espectadores atualizam a cada poucos minutos.',
    mostFollowed: (category) => `Streamers de ${category} com mais seguidores`,
    tableCaption: (category) =>
      `Streamers de ${category} ordenados por seguidores, com o próximo stream esperado`,
    thRank: '#',
    thStreamer: 'Streamer',
    thNextStream: 'Próximo stream',
    thFollowers: 'Seguidores',
    thHours: 'Horas / 28 dias',
    liveNowCell: 'Ao vivo',
    seeFullRanking: (category) => `Ver o ranking completo de ${category} (top 50) →`,
    whoStreams: (category) => `Streamers que fazem stream de ${category}`,
    whenStreamed: (category) => `Quando ${category} é streamado?`,
    heatmapSummary: (category) =>
      `A maioria dos streams de ${category} rola {peak}{tz} — com base nas últimas 4 semanas de streams registrados.`,
    heatmapSummaryEmpty: 'Com base nas últimas 4 semanas de streams registrados.',
    tzLocalSuffix: ' (seu horário)',
    tzUtcSuffix: ' (UTC)',
    heatmapAria: (category) => `Mapa de calor semanal dos streams de ${category}.`,
    heatmapAriaWithPeak: (category) =>
      `Mapa de calor semanal dos streams de ${category}. Janela mais movimentada: {peak}.`,
    heatmapTooltip: '{day} {from}–{to} · {amount} de stream em 4 semanas',
    legendLess: 'Menos',
    legendMore: 'Mais',
    heatmapDayNames: [
      'às segundas',
      'às terças',
      'às quartas',
      'às quintas',
      'às sextas',
      'aos sábados',
      'aos domingos',
    ],
    bestTimeToStream: (category) => `Melhor horário para streamar ${category}`,
    trendingBadge: '▲ Em alta',
    bestTimeIntro: (category) =>
      `Para streamers: as janelas em que ${category} tem mais espectadores por canal ao vivo.`,
    fullHeatmapLink: 'Mapa de calor de oportunidades e análise completa →',
    bestSlotsAria: 'Melhores janelas de horário',
    viewersPerChannel: '~{score} espectadores/canal',
    timesLocalNote: 'Horários no seu fuso horário.',
    timesUtcNote: 'Horários em UTC.',
    quietTitle: (category) => `Nenhum stream de ${category} agora`,
    quietBody: (category) =>
      `Nenhum dos streamers de ${category} que acompanhamos está ao vivo ou é esperado nos próximos 7 dias. As agendas e previsões de IA atualizam várias vezes ao dia — volte em breve.`,
    quietMeanwhile: 'Enquanto isso',
    seeWhosLive: 'Veja quem está ao vivo agora →',
    browseAllGames: 'Explorar todos os jogos',
    gameStreamersChip: (category) => `Streamers de ${category}`,
    scheduleAria: (category) => `Agenda de streams de ${category}`,
    upcomingStreams: (category) => `Próximos streams de ${category}`,
    scheduleNote:
      'Os horários se ajustam ao seu fuso, com o horário do streamer ao lado. Os dias seguem o calendário UTC, então um stream de madrugada pode aparecer no dia seguinte.',
    filterAria: 'Filtrar a agenda',
    allPlatforms: 'Todas as plataformas',
    hideLowConfidence: 'Ocultar probabilidade baixa',
    moreLowConfidence: (n) =>
      n === 1
        ? 'Mais 1 previsão com probabilidade baixa'
        : `Mais ${n} previsões com probabilidade baixa`,
    lowConfAria: (label) => `Previsões com probabilidade baixa: ${label}`,
    hiddenNotShown: (n) =>
      n === 1
        ? 'Mais 1 previsão deste dia não é exibida. Abra a página do streamer para ver a agenda completa.'
        : `Mais ${n} previsões deste dia não são exibidas. Abra a página do streamer para ver a agenda completa.`,
    relatedGames: 'Jogos relacionados',
    relatedGamesAria: 'Jogos relacionados',
    relatedNote:
      'Jogos cujos elencos de streamers se sobrepõem nos últimos 28 dias.',
    allGamesFooter: '← Todos os jogos e categorias',
  },
  gameRanking: {
    notFoundTitle: 'Não encontrado — StreamerTimes',
    metaTitle: (category, page) =>
      page === 1
        ? `Top streamers de ${category} — por seguidores`
        : `Top streamers de ${category} — por seguidores — Página ${page}`,
    metaLeadIn: (name, value) => `${name} lidera com ${value} seguidores. `,
    metaDescription: (category, leadIn) => [
      `${leadIn}Os melhores streamers de ${category} na Twitch e no YouTube, ordenados por seguidores, com status ao vivo e próximos streams. Atualizado diariamente.`,
      `${leadIn}Os melhores streamers de ${category} por seguidores, com status ao vivo e próximos streams.`,
      `Os melhores streamers de ${category} na Twitch e no YouTube, ordenados por seguidores, com status ao vivo e próximos streams. Atualizado diariamente.`,
    ],
    ogTitle: (category) => `Top streamers de ${category} — por seguidores`,
    h1: (category) => `Top streamers de ${category} por seguidores`,
    introPage1: (count, category) =>
      `Os ${count} melhores streamers de ${category} que acompanhamos, ordenados por seguidores e inscritos do canal.`,
    topsTheList: (name, value, isTwitch) =>
      ` ${name} lidera a lista com ${value} ${isTwitch ? 'seguidores' : 'inscritos'}.`,
    introPageN: (from, to, total, category) =>
      `Posições ${from}–${to} de ${total} streamers de ${category} que acompanhamos, ordenados por seguidores e inscritos do canal.`,
    methodology: (category) =>
      `Streamers ativos em ${category} nos últimos 28 dias, ordenados por seguidores. Os números são atualizados com frequência e podem ficar atrás dos valores das plataformas.`,
    followersRefreshed: (label) => ` Seguidores atualizados: ${label}.`,
    warmingUp:
      'Este ranking ainda está esquentando — precisamos de um pouco mais de dados antes que ele diga algo. Volte em breve.',
    missingDataNote:
      '— significa que ainda não coletamos dados suficientes desse canal, por exemplo amostragens de espectadores em canais recém-adicionados.',
    sortAria: 'Ordenar o ranking',
    sortFollowers: 'Mais seguidos',
    sortHours: 'Mais horas (28 dias)',
    sortViewers: 'Mais assistidos',
    filterLangAria: 'Filtrar por idioma',
    allChip: 'Todos',
    noMatch: 'Nenhum streamer corresponde a este filtro.',
    tableCaption: (category) => `Streamers de ${category} ordenados por seguidores`,
    thRank: '#',
    thStreamer: 'Streamer',
    thFollowers: 'Seguidores',
    thAvgViewers: 'Espectadores méd.',
    thHours: 'Horas (28 dias)',
    thShare: 'Parcela do jogo',
    thShareTitle: (category) =>
      `Parcela dos últimos streams do streamer que foram de ${category}`,
    thNextStream: 'Próximo stream',
    liveNowCell: 'Ao vivo',
    watchingTail: ' · {value} assistindo',
    trendNewBadge: 'novo',
    trendNewTitle: 'Há uma semana não estava neste ranking',
    trendUpTemplate: 'Subiu {n} desde a semana passada',
    trendDownTemplate: 'Desceu {n} desde a semana passada',
    mainGameTemplate: 'Jogo principal: {share}% dos últimos streams',
    aboutRanking: 'Sobre este ranking',
    faqMostFollowedQ: (category) =>
      `Qual streamer de ${category} tem mais seguidores?`,
    faqMostFollowedA: (category, top, second) => {
      const runnerUp = second ? `, à frente de ${second.name} com ${second.value}` : '';
      return `${top.name} é atualmente o streamer de ${category} com mais ${top.isTwitch ? 'seguidores' : 'inscritos'} entre os que acompanhamos, com ${top.value}${runnerUp}. Os números são atualizados diariamente.`;
    },
    faqHowManyQ: (category) => `Quantos streamers fazem stream de ${category}?`,
    faqHowManyA: (category, count, activity) => {
      const tail = activity
        ? ` Juntos, eles streamaram cerca de ${activity.hours} horas de ${category} em ${activity.streams} streams nos últimos 28 dias.`
        : '';
      return `Atualmente acompanhamos ${count} streamer${count === 1 ? '' : 's'} que streamaram ${category} recentemente ou o têm na agenda.${tail}`;
    },
    faqMeasuredQ: 'Como este ranking é medido?',
    faqMeasuredA: (category) =>
      `Streamers ativos em ${category} nos últimos 28 dias, ordenados pelos seguidores do canal principal — seguidores do canal na Twitch ou inscritos no YouTube. As colunas de horas e parcela vêm de um agregado noturno de streams de ${category} finalizados.`,
    faqShareQ: 'O que significa "Parcela do jogo"?',
    faqShareA: (category) =>
      `A parcela dos últimos streams de um streamer que foram de ${category}. 100% significa que, no momento, é o único jogo; uma parcela baixa marca um visitante ocasional da categoria.`,
    relatedRankings: 'Rankings relacionados',
    relatedRankingsAria: 'Rankings de jogos relacionados',
    liveAndSchedule: (category) => `Ao vivo e agenda de ${category} →`,
    allRankings: 'Todos os rankings',
    paginationAria: (category) => `Páginas do ranking de ${category}`,
    prev: '← Anterior',
    next: 'Próxima →',
  },
};
