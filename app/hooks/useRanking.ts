import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";
import {
  UserSeasonScore,
  DailyInteraction,
  ExternalEventParticipation,
  EventTier,
  SeasonConfig,
} from "../types";
import {
  calculateRanks,
  createDailyInteraction,
  createEventParticipation,
} from "../utils/scoreCalculation";

/**
 * Hook para buscar o ranking completo de uma temporada
 */
export function useSeasonRanking(seasonId: string | null, limit: number = 100) {
  const [ranking, setRanking] = useState<UserSeasonScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seasonId) {
      setLoading(false);

      return;
    }

    const q = query(
      collection(db, "userSeasonScores"),
      where("seasonId", "==", seasonId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const scores = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserSeasonScore[];

        // Ordenar no lado do cliente por totalScore (desc)
        scores.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

        // Recalcular ranks para garantir consistência
        const rankedScores = calculateRanks(scores);

        // Limitar ao número especificado
        setRanking(rankedScores.slice(0, limit));
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar ranking:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [seasonId, limit]);

  return { ranking, loading, error };
}

/**
 * Hook para buscar o score de um usuário específico em uma temporada
 */
export function useUserScore(userId: string | null, seasonId: string | null) {
  const [score, setScore] = useState<UserSeasonScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !seasonId) {
      setLoading(false);

      return;
    }

    const q = query(
      collection(db, "userSeasonScores"),
      where("userId", "==", userId),
      where("seasonId", "==", seasonId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          setScore({
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data(),
          } as UserSeasonScore);
        } else {
          setScore(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar score do usuário:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId, seasonId]);

  return { score, loading, error };
}

/**
 * Hook para buscar interações diárias de um usuário
 */
export function useUserDailyInteractions(
  userId: string | null,
  seasonId: string | null,
) {
  const [interactions, setInteractions] = useState<DailyInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !seasonId) {
      setLoading(false);

      return;
    }

    // Removendo orderBy para evitar erro de índice composto
    const q = query(
      collection(db, "dailyInteractions"),
      where("userId", "==", userId),
      where("seasonId", "==", seasonId),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DailyInteraction[];

      // Ordenar no lado do cliente por data (desc)
      data.sort((a, b) => b.date.localeCompare(a.date));

      setInteractions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, seasonId]);

  return { interactions, loading };
}

/**
 * Hook para buscar participações em eventos de um usuário
 */
export function useUserEventParticipations(
  userId: string | null,
  seasonId: string | null,
) {
  const [participations, setParticipations] = useState<
    ExternalEventParticipation[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !seasonId) {
      setLoading(false);

      return;
    }

    // Removendo orderBy para evitar erro de índice composto
    const q = query(
      collection(db, "externalEventParticipations"),
      where("userId", "==", userId),
      where("seasonId", "==", seasonId),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ExternalEventParticipation[];

      // Ordenar no lado do cliente por eventDate (desc)
      data.sort((a, b) => {
        const dateA = a.eventDate?.toDate?.() || new Date(0);
        const dateB = b.eventDate?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setParticipations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, seasonId]);

  return { participations, loading };
}

// ===== FUNÇÕES AUXILIARES =====

/**
 * Registra uma interação diária para um usuário
 */
export async function recordDailyInteraction(
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
): Promise<void> {
  const dailyInteractionData = createDailyInteraction(
    userId,
    seasonId,
    date,
    interactions,
    config,
  );

  // Verificar se já existe uma entrada para este dia
  const q = query(
    collection(db, "dailyInteractions"),
    where("userId", "==", userId),
    where("seasonId", "==", seasonId),
    where("date", "==", date),
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Atualizar entrada existente
    const docId = snapshot.docs[0].id;

    await updateDoc(doc(db, "dailyInteractions", docId), {
      ...dailyInteractionData,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Criar nova entrada
    await addDoc(collection(db, "dailyInteractions"), {
      ...dailyInteractionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Registra uma participação em evento externo
 */
export async function recordEventParticipation(
  userId: string,
  seasonId: string,
  eventId: string,
  eventName: string,
  eventTier: EventTier,
  placement: number,
  participated: boolean,
  eventDate: any,
  config: SeasonConfig,
): Promise<void> {
  const participationData = createEventParticipation(
    userId,
    seasonId,
    eventId,
    eventName,
    eventTier,
    placement,
    participated,
    eventDate,
    config,
  );

  await addDoc(collection(db, "externalEventParticipations"), {
    ...participationData,
    createdAt: serverTimestamp(),
  });
}

/**
 * Recalcula o score de um usuário baseado em todas as suas interações e eventos
 */
export async function recalculateUserScore(
  userId: string,
  seasonId: string,
  userName: string,
  userAvatar?: string,
  organizationTag?: string,
): Promise<void> {
  // Buscar todas as interações diárias
  const dailyQuery = query(
    collection(db, "dailyInteractions"),
    where("userId", "==", userId),
    where("seasonId", "==", seasonId),
  );

  const dailySnapshot = await getDocs(dailyQuery);
  const dailyInteractions = dailySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DailyInteraction[];

  // Buscar todas as participações em eventos
  const eventsQuery = query(
    collection(db, "externalEventParticipations"),
    where("userId", "==", userId),
    where("seasonId", "==", seasonId),
  );

  const eventsSnapshot = await getDocs(eventsQuery);
  const eventParticipations = eventsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ExternalEventParticipation[];

  // Calcular scores
  const interactionScore = dailyInteractions.reduce(
    (sum, daily) => sum + daily.weightedPoints,
    0,
  );

  const eventScore = eventParticipations.reduce(
    (sum, event) => sum + event.finalPoints,
    0,
  );

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

  // Verificar se já existe um score para este usuário/temporada
  const scoreQuery = query(
    collection(db, "userSeasonScores"),
    where("userId", "==", userId),
    where("seasonId", "==", seasonId),
  );

  const scoreSnapshot = await getDocs(scoreQuery);

  const scoreData: Partial<UserSeasonScore> = {
    userId,
    seasonId,
    userName,
    userAvatar,
    organizationTag,
    interactionScore: Math.round(interactionScore * 10) / 10,
    eventScore,
    totalScore: Math.round(totalScore * 10) / 10,
    stats,
    lastUpdated: serverTimestamp(),
  };

  if (!scoreSnapshot.empty) {
    // Atualizar score existente
    const docId = scoreSnapshot.docs[0].id;
    const previousRank = scoreSnapshot.docs[0].data().rank;

    await updateDoc(doc(db, "userSeasonScores", docId), {
      ...scoreData,
      previousRank,
    });
  } else {
    // Criar novo score
    await addDoc(collection(db, "userSeasonScores"), {
      ...scoreData,
      rank: 0, // Será recalculado
      createdAt: serverTimestamp(),
    });
  }
}

/**
 * Recalcula todos os ranks de uma temporada
 */
export async function recalculateAllRanks(seasonId: string): Promise<void> {
  const q = query(
    collection(db, "userSeasonScores"),
    where("seasonId", "==", seasonId),
  );

  const snapshot = await getDocs(q);
  const scores = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as UserSeasonScore[];

  // Calcular ranks
  const rankedScores = calculateRanks(scores);

  // Atualizar cada documento
  const updatePromises = rankedScores.map((score) => {
    if (!score.id) return Promise.resolve();

    return updateDoc(doc(db, "userSeasonScores", score.id), {
      rank: score.rank,
      previousRank: score.previousRank || score.rank,
      lastUpdated: serverTimestamp(),
    });
  });

  await Promise.all(updatePromises);
}
