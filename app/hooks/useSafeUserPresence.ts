"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

interface UserPresence {
  isOnline: boolean;
  presence: "online" | "away" | "offline";
  lastSeen?: any;
  privacy?: {
    lastSeen: "everyone" | "contacts" | "nobody" | "mutual";
  };
}

export function useSafeUserPresence(userId: string) {
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

    // Só busca dados de presença se o usuário estiver autenticado
    if (!auth.currentUser) {
      setLoading(false);
      setPresence({
        isOnline: false,
        presence: "offline",
        privacy: { lastSeen: "everyone" },
      });
      return;
    }

    const fetchPresence = async () => {
      try {
        const userRef = doc(db, "Users", userId);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
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
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar presença do usuário:", err);
        setError("Erro ao carregar dados de presença");
        setPresence({
          isOnline: false,
          presence: "offline",
          privacy: { lastSeen: "everyone" },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPresence();
  }, [userId]);

  return { presence, loading, error };
}
