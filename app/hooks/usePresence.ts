"use client";

import { useEffect, useRef } from "react";
import { getDatabase, ref, onValue, onDisconnect, serverTimestamp, set, update } from "firebase/database";
import { auth } from "../firebase";

export type PresenceState = "online" | "away" | "offline";

interface PresenceData {
  state: PresenceState;
  last_active: any;
  platform: string;
  ua?: string;
}

export function usePresence() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const rtdb = getDatabase();
    const infoRef = ref(rtdb, ".info/connected");
    const connId = crypto.randomUUID();
    const myStatusRef = ref(rtdb, `status/${uid}/${connId}`);

    const setupPresence = async () => {
      onValue(infoRef, async (snap) => {
        if (snap.val() === false) return;

        try {
          // Marca offline automaticamente se cair/desconectar
          await onDisconnect(myStatusRef).update({
            state: "offline",
            last_active: serverTimestamp(),
          });

          // Marca online agora
          await set(myStatusRef, {
            state: "online",
            last_active: serverTimestamp(),
            platform: "web",
            ua: navigator.userAgent,
          });
        } catch (error) {
          console.error("Erro ao configurar presença:", error);
        }
      });

      // Heartbeat periódico (45s)
      intervalRef.current = setInterval(async () => {
        try {
          await update(myStatusRef, { last_active: serverTimestamp() });
        } catch (error) {
          console.error("Erro no heartbeat de presença:", error);
        }
      }, 45000);

      // "Away" quando aba perde foco
      const onBlur = async () => {
        try {
          await update(myStatusRef, { state: "away", last_active: serverTimestamp() });
        } catch (error) {
          console.error("Erro ao marcar como away:", error);
        }
      };
      const onFocus = async () => {
        try {
          await update(myStatusRef, { state: "online", last_active: serverTimestamp() });
        } catch (error) {
          console.error("Erro ao marcar como online:", error);
        }
      };

      window.addEventListener("blur", onBlur);
      window.addEventListener("focus", onFocus);

      // Cleanup function
      cleanupRef.current = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
        // Ao desmontar, marca offline explicitamente
        update(myStatusRef, { state: "offline", last_active: serverTimestamp() }).catch((error) => {
          console.error("Erro ao marcar como offline no cleanup:", error);
        });
      };
    };

    setupPresence();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return null; // Este hook não retorna dados, apenas gerencia a presença
}
