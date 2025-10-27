"use client";

import { useState, useEffect } from "react";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { auth } from "../firebase";

export type PresenceState = "online" | "away" | "offline";

interface UserPresenceData {
  state: PresenceState;
  last_active: any;
  platform: string;
  ua?: string;
}

interface UserPresence {
  isOnline: boolean;
  presence: PresenceState;
  lastSeen: Date | null;
  privacy?: {
    lastSeen: "everyone" | "contacts" | "nobody" | "mutual";
  };
}

export function useUserPresence(userId: string) {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || userId.trim() === "") {
      setLoading(false);
      setPresence({
        isOnline: false,
        presence: "offline",
        lastSeen: null,
        privacy: { lastSeen: "everyone" },
      });
      return;
    }

    // Só busca dados de presença se o usuário estiver autenticado
    if (!auth.currentUser) {
      setLoading(false);
      setPresence({
        isOnline: false,
        presence: "offline",
        lastSeen: null,
        privacy: { lastSeen: "everyone" },
      });
      return;
    }

    const rtdb = getDatabase();
    const userStatusRef = ref(rtdb, `status/${userId}`);

    const unsubscribe = onValue(
      userStatusRef,
      (snapshot) => {
        try {
          const data = snapshot.val();
          
          if (!data) {
            // Usuário não tem dados de presença
            setPresence({
              isOnline: false,
              presence: "offline",
              lastSeen: null,
              privacy: { lastSeen: "everyone" },
            });
            setError(null);
            setLoading(false);
            return;
          }

          let connections: UserPresenceData[];
          
          if (data.state && data.last_active) {
            // Single connection object
            connections = [data as UserPresenceData];
          } else {
            // Multiple connections object
            connections = Object.values(data) as UserPresenceData[];
          }
          
          // Determinar o status geral baseado em todas as conexões
          let overallState: PresenceState = "offline";
          let mostRecentActivity: Date | null = null;

          for (const connection of connections) {
            // Converter timestamp do Firebase para Date
            let activityDate: Date | null = null;
            if (connection.last_active) {
              if (typeof connection.last_active === 'number') {
                activityDate = new Date(connection.last_active);
              } else if (connection.last_active && typeof connection.last_active === 'object' && 'toDate' in connection.last_active) {
                activityDate = connection.last_active.toDate();
              }
            }

            // Atualizar a atividade mais recente
            if (activityDate) {
              if (!mostRecentActivity || activityDate > mostRecentActivity) {
                mostRecentActivity = activityDate;
              }
            }

            // Determinar o status geral (prioridade: online > away > offline)
            if (connection.state === "online") {
              overallState = "online";
            } else if (connection.state === "away" && overallState === "offline") {
              overallState = "away";
            }
          }

          // Verificar se o usuário está realmente online baseado na última atividade
          const now = new Date();
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          
          // Se a última atividade foi há mais de 5 minutos, considerar offline
          if (mostRecentActivity && mostRecentActivity.getTime() < fiveMinutesAgo.getTime()) {
            overallState = "offline";
          }

          setPresence({
            isOnline: overallState === "online",
            presence: overallState,
            lastSeen: mostRecentActivity,
            privacy: { lastSeen: "everyone" },
          });
          
          setError(null);
        } catch (err) {
          console.error("Erro ao processar dados de presença:", err);
          setError("Erro ao processar dados de presença");
          setPresence({
            isOnline: false,
            presence: "offline",
            lastSeen: null,
            privacy: { lastSeen: "everyone" },
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Erro ao escutar presença do usuário:", error);
        setError("Erro ao carregar dados de presença");
        setPresence({
          isOnline: false,
          presence: "offline",
          lastSeen: null,
          privacy: { lastSeen: "everyone" },
        });
        setLoading(false);
      }
    );

    return () => {
      off(userStatusRef, "value", unsubscribe);
    };
  }, [userId]);

  return { presence, loading, error };
}
