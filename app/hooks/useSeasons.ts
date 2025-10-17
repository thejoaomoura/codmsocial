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
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase";
import {
  Season,
  SeasonConfig,
  SeasonStatus,
  DEFAULT_SEASON_CONFIG,
} from "../types";

/**
 * Hook para gerenciar temporadas ativas
 */
export function useActiveSeason() {
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "seasons"),
      where("status", "==", "active"),
      orderBy("startDate", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const seasonData = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data(),
          } as Season;

          setSeason(seasonData);
        } else {
          setSeason(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar temporada ativa:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { season, loading, error };
}

/**
 * Hook para buscar todas as temporadas
 */
export function useSeasons(status?: SeasonStatus) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q;

    if (status) {
      q = query(
        collection(db, "seasons"),
        where("status", "==", status),
        orderBy("seasonNumber", "desc"),
      );
    } else {
      q = query(collection(db, "seasons"), orderBy("seasonNumber", "desc"));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const seasonsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Season[];

        setSeasons(seasonsData);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar temporadas:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [status]);

  return { seasons, loading, error };
}

/**
 * Hook para buscar uma temporada específica por ID
 */
export function useSeason(seasonId: string | null) {
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seasonId) {
      setLoading(false);

      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "seasons", seasonId),
      (snapshot) => {
        if (snapshot.exists()) {
          setSeason({
            id: snapshot.id,
            ...snapshot.data(),
          } as Season);
        } else {
          setSeason(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar temporada:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [seasonId]);

  return { season, loading, error };
}

// ===== FUNÇÕES AUXILIARES =====

/**
 * Cria uma nova temporada
 */
export async function createSeason(
  seasonNumber: number,
  name: string,
  durationDays: number = 90,
  config: SeasonConfig = DEFAULT_SEASON_CONFIG,
): Promise<string> {
  const now = new Date();
  const endDate = new Date(now);

  endDate.setDate(endDate.getDate() + durationDays);

  const seasonData: Omit<Season, "id"> = {
    seasonNumber,
    name,
    startDate: Timestamp.fromDate(now),
    endDate: Timestamp.fromDate(endDate),
    status: "active",
    durationDays,
    config,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "seasons"), seasonData);

  return docRef.id;
}

/**
 * Atualiza o status de uma temporada
 */
export async function updateSeasonStatus(
  seasonId: string,
  status: SeasonStatus,
): Promise<void> {
  await updateDoc(doc(db, "seasons", seasonId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Finaliza a temporada atual e cria uma nova
 */
export async function rotateSeason(
  currentSeasonId: string,
  newSeasonName: string,
  durationDays: number = 90,
): Promise<string> {
  // Finalizar temporada atual
  await updateSeasonStatus(currentSeasonId, "completed");

  // Buscar o número da temporada atual
  // (Em produção, você buscaria do Firestore)
  // Por simplicidade, vamos incrementar
  const newSeasonNumber = Date.now(); // Placeholder - você deve buscar do Firestore

  // Criar nova temporada
  const newSeasonId = await createSeason(
    newSeasonNumber,
    newSeasonName,
    durationDays,
  );

  return newSeasonId;
}
