/**
 * Sistema de Cálculo de Score v1
 *
 * Fórmula base:
 * ScoreTotal = min(InteraçãoDiária, CAP_DIA) * PesoInteração + PontosEvento
 *
 * Onde:
 * - InteraçãoDiária: soma ponderada das interações do dia
 * - CAP_DIA: limite de pontos por dia
 * - PesoInteração: peso aplicado às interações (ex: 0.6 = 60%)
 * - PontosEvento: pontos acumulados de eventos externos
 */

import {
  SeasonConfig,
  DailyInteraction,
  ExternalEventParticipation,
  UserSeasonScore,
  EventTier,
} from "../types";

// ===== CÁLCULO DE INTERAÇÕES DIÁRIAS =====

/**
 * Calcula os pontos de interação diária para um usuário
 * Aplica pesos, caps e anti-gaming
 */
export function calculateDailyInteractionPoints(
  postsCreated: number,
  commentsMade: number,
  reactionsReceived: number,
  reactionsGiven: number,
  config: SeasonConfig,
): {
  rawPoints: number;
  cappedPoints: number;
  weightedPoints: number;
} {
  const { weights, dailyInteractionCap, interactionWeight, antiSpam } = config;

  // Aplicar limites anti-spam
  const cappedPosts = Math.min(postsCreated, antiSpam.maxPostsPerDay);
  const cappedComments = Math.min(commentsMade, antiSpam.maxCommentsPerDay);

  // Calcular pontos brutos (antes do cap diário)
  const rawPoints =
    cappedPosts * weights.postCreated +
    cappedComments * weights.commentMade +
    reactionsReceived * weights.reactionReceived +
    reactionsGiven * weights.reactionGiven;

  // Aplicar cap diário
  const cappedPoints = Math.min(rawPoints, dailyInteractionCap);

  // Aplicar peso de interação
  const weightedPoints = cappedPoints * interactionWeight;

  return {
    rawPoints,
    cappedPoints,
    weightedPoints,
  };
}

/**
 * Cria um objeto DailyInteraction com os pontos calculados
 */
export function createDailyInteraction(
  userId: string,
  seasonId: string,
  date: string,
  interactions: {
    postsCreated: number;
    commentsMade: number;
    reactionsReceived: number;
    reactionsGiven: number;
  },
  config: SeasonConfig,
): Omit<DailyInteraction, "id" | "createdAt" | "updatedAt"> {
  const points = calculateDailyInteractionPoints(
    interactions.postsCreated,
    interactions.commentsMade,
    interactions.reactionsReceived,
    interactions.reactionsGiven,
    config,
  );

  return {
    userId,
    seasonId,
    date,
    interactions,
    rawPoints: points.rawPoints,
    cappedPoints: points.cappedPoints,
    weightedPoints: points.weightedPoints,
  };
}

// ===== CÁLCULO DE PONTOS DE EVENTOS =====

/**
 * Calcula os pontos de um evento externo baseado na colocação e tier
 */
export function calculateEventPoints(
  placement: number,
  eventTier: EventTier,
  participated: boolean,
  config: SeasonConfig,
): {
  basePoints: number;
  tierMultiplier: number;
  finalPoints: number;
} {
  const { eventPlacementPoints, eventTierMultipliers } = config;

  // Determinar pontos base pela colocação
  let basePoints = 0;

  if (!participated) {
    basePoints = 0;
  } else if (placement === 1) {
    basePoints = eventPlacementPoints.first;
  } else if (placement === 2) {
    basePoints = eventPlacementPoints.second;
  } else if (placement === 3) {
    basePoints = eventPlacementPoints.third;
  } else if (placement === 4) {
    basePoints = eventPlacementPoints.fourth;
  } else if (placement === 5) {
    basePoints = eventPlacementPoints.fifth;
  } else if (placement === 6) {
    basePoints = eventPlacementPoints.sixth;
  } else if (placement === 7) {
    basePoints = eventPlacementPoints.seventh;
  } else if (placement === 8) {
    basePoints = eventPlacementPoints.eighth;
  } else {
    // Qualquer colocação fora do top 8 recebe pontos de participação
    basePoints = eventPlacementPoints.participation;
  }

  // Aplicar multiplicador do tier do evento
  const tierMultiplier = eventTierMultipliers[eventTier];
  const finalPoints = Math.round(basePoints * tierMultiplier);

  return {
    basePoints,
    tierMultiplier,
    finalPoints,
  };
}

/**
 * Cria um objeto ExternalEventParticipation com os pontos calculados
 */
export function createEventParticipation(
  userId: string,
  seasonId: string,
  eventId: string,
  eventName: string,
  eventTier: EventTier,
  placement: number,
  participated: boolean,
  eventDate: any,
  config: SeasonConfig,
): Omit<ExternalEventParticipation, "id" | "createdAt"> {
  const points = calculateEventPoints(
    placement,
    eventTier,
    participated,
    config,
  );

  return {
    userId,
    seasonId,
    eventId,
    eventName,
    eventTier,
    placement,
    participated,
    basePoints: points.basePoints,
    tierMultiplier: points.tierMultiplier,
    finalPoints: points.finalPoints,
    eventDate,
  };
}

// ===== CÁLCULO DE SCORE TOTAL DO USUÁRIO =====

/**
 * Calcula o score total de um usuário em uma temporada
 * baseado em suas interações diárias e participações em eventos
 */
export function calculateUserSeasonScore(
  userId: string,
  seasonId: string,
  userName: string,
  userAvatar: string | undefined,
  organizationTag: string | undefined,
  dailyInteractions: DailyInteraction[],
  eventParticipations: ExternalEventParticipation[],
): Omit<
  UserSeasonScore,
  "id" | "rank" | "previousRank" | "lastUpdated" | "createdAt"
> {
  // Somar pontos de interações diárias
  const interactionScore = dailyInteractions.reduce(
    (sum, daily) => sum + daily.weightedPoints,
    0,
  );

  // Somar pontos de eventos
  const eventScore = eventParticipations.reduce(
    (sum, event) => sum + event.finalPoints,
    0,
  );

  // Score total
  const totalScore = interactionScore + eventScore;

  // Calcular estatísticas
  const stats = {
    totalPosts: dailyInteractions.reduce(
      (sum, daily) => sum + daily.interactions.postsCreated,
      0,
    ),
    totalComments: dailyInteractions.reduce(
      (sum, daily) => sum + daily.interactions.commentsMade,
      0,
    ),
    totalReactionsReceived: dailyInteractions.reduce(
      (sum, daily) => sum + daily.interactions.reactionsReceived,
      0,
    ),
    totalReactionsGiven: dailyInteractions.reduce(
      (sum, daily) => sum + daily.interactions.reactionsGiven,
      0,
    ),
    eventsParticipated: eventParticipations.filter((e) => e.participated)
      .length,
    bestEventPlacement:
      eventParticipations.length > 0
        ? Math.min(...eventParticipations.map((e) => e.placement))
        : null,
    totalWins: eventParticipations.filter((e) => e.placement === 1).length,
    activeDays: dailyInteractions.length,
  };

  return {
    userId,
    seasonId,
    userName,
    userAvatar,
    organizationTag,
    interactionScore: Math.round(interactionScore * 10) / 10, // Arredondar para 1 decimal
    eventScore,
    totalScore: Math.round(totalScore * 10) / 10,
    stats,
  };
}

// ===== CRITÉRIOS DE DESEMPATE =====

/**
 * Compara dois UserSeasonScore para ordenação no ranking
 * Critérios de desempate (em ordem):
 * 1. Total Score (maior primeiro)
 * 2. Event Score (maior primeiro)
 * 3. Total Wins (mais vitórias primeiro)
 * 4. Best Event Placement (melhor colocação primeiro - menor número)
 * 5. Events Participated (mais eventos primeiro)
 * 6. Interaction Score (maior primeiro)
 * 7. Active Days (mais dias ativos primeiro)
 */
export function compareUserScores(
  a: UserSeasonScore,
  b: UserSeasonScore,
): number {
  // 1. Total Score
  if (a.totalScore !== b.totalScore) {
    return b.totalScore - a.totalScore;
  }

  // 2. Event Score
  if (a.eventScore !== b.eventScore) {
    return b.eventScore - a.eventScore;
  }

  // 3. Total Wins
  if (a.stats.totalWins !== b.stats.totalWins) {
    return b.stats.totalWins - a.stats.totalWins;
  }

  // 4. Best Event Placement (menor é melhor)
  const aBest = a.stats.bestEventPlacement ?? Number.MAX_SAFE_INTEGER;
  const bBest = b.stats.bestEventPlacement ?? Number.MAX_SAFE_INTEGER;

  if (aBest !== bBest) {
    return aBest - bBest;
  }

  // 5. Events Participated
  if (a.stats.eventsParticipated !== b.stats.eventsParticipated) {
    return b.stats.eventsParticipated - a.stats.eventsParticipated;
  }

  // 6. Interaction Score
  if (a.interactionScore !== b.interactionScore) {
    return b.interactionScore - a.interactionScore;
  }

  // 7. Active Days
  return b.stats.activeDays - a.stats.activeDays;
}

/**
 * Calcula os ranks de uma lista de UserSeasonScore
 * Ordena os scores e atribui posições
 */
export function calculateRanks(scores: UserSeasonScore[]): UserSeasonScore[] {
  // Ordenar scores
  const sortedScores = [...scores].sort(compareUserScores);

  // Atribuir ranks
  return sortedScores.map((score, index) => ({
    ...score,
    rank: index + 1,
  }));
}

// ===== VALIDAÇÃO DE DADOS =====

/**
 * Valida se uma interação diária está dentro dos limites anti-spam
 */
export function validateDailyInteraction(
  interactions: {
    postsCreated: number;
    commentsMade: number;
    reactionsReceived: number;
    reactionsGiven: number;
  },
  config: SeasonConfig,
): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const { antiSpam } = config;

  if (interactions.postsCreated > antiSpam.maxPostsPerDay) {
    warnings.push(
      `Posts excederam o limite diário (${interactions.postsCreated}/${antiSpam.maxPostsPerDay})`,
    );
  }

  if (interactions.commentsMade > antiSpam.maxCommentsPerDay) {
    warnings.push(
      `Comentários excederam o limite diário (${interactions.commentsMade}/${antiSpam.maxCommentsPerDay})`,
    );
  }

  const totalReactions =
    interactions.reactionsReceived + interactions.reactionsGiven;

  if (totalReactions > antiSpam.maxReactionsPerDay) {
    warnings.push(
      `Reações excederam o limite diário (${totalReactions}/${antiSpam.maxReactionsPerDay})`,
    );
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

// ===== UTILITÁRIOS =====

/**
 * Formata uma data para o formato YYYY-MM-DD usado no sistema
 */
export function formatDateForScore(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Verifica se uma temporada está ativa em uma determinada data
 */
export function isSeasonActive(
  season: { startDate: any; endDate: any; status: string },
  date: Date = new Date(),
): boolean {
  if (season.status !== "active") return false;

  const startDate = season.startDate?.toDate?.() || new Date(season.startDate);
  const endDate = season.endDate?.toDate?.() || new Date(season.endDate);

  return date >= startDate && date <= endDate;
}

/**
 * Calcula o número de dias restantes em uma temporada
 */
export function getDaysRemaining(season: { endDate: any }): number {
  const endDate = season.endDate?.toDate?.() || new Date(season.endDate);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
