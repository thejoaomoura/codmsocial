"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

interface UserPresence {
  isOnline: boolean;
  presence: "online" | "away" | "offline";
  lastSeen?: any;
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
        privacy: { lastSeen: "everyone" },
      });
      return;
    }

    // Só tenta acessar dados de presença se o usuário estiver autenticado
    // e se não for o próprio usuário (para evitar loops)
    const userRef = doc(db, "Users", userId);
    const unsubscribe = onSnapshot(
      userRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setPresence({
            isOnline: data.isOnline || false,
            presence: data.presence || "offline",
            lastSeen: data.lastSeen,
            privacy: data.privacy || { lastSeen: "everyone" },
          });
        } else {
          setPresence({
            isOnline: false,
            presence: "offline",
            privacy: { lastSeen: "everyone" },
          });
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Erro ao carregar presença do usuário:", err);
        setError("Erro ao carregar dados de presença");
        setLoading(false);
        // Define valores padrão em caso de erro
        setPresence({
          isOnline: false,
          presence: "offline",
          privacy: { lastSeen: "everyone" },
        });
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { presence, loading, error };
}
