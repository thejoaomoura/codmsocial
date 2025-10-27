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
    const manualStatusRef = ref(rtdb, `manualPresence/${uid}`);
    
    let manualStatus: "online" | "away" | "offline" | "auto" = "auto";
    let isActive = true;

    const updatePresence = () => {
      if (!auth.currentUser) return;

      let finalState: "online" | "away" | "offline";
      
      // Se há um status manual definido (não "auto"), usar ele
      if (manualStatus !== "auto") {
        finalState = manualStatus;
      } else {
        // Usar a lógica automática baseada no foco da janela
        finalState = isActive ? "online" : "away";
      }

      const presenceData = {
        state: finalState,
        last_active: serverTimestamp(),
        platform: "web",
        ua: navigator.userAgent,
      };

      set(myStatusRef, presenceData).catch((error) => {
        console.error("Erro ao atualizar presença:", error);
      });
    };

    // Escutar mudanças no status manual
    const manualStatusUnsubscribe = onValue(manualStatusRef, (snapshot) => {
      const data = snapshot.val();
      manualStatus = data?.manualStatus || "auto";
      updatePresence(); // Atualizar presença quando status manual mudar
    });

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
          updatePresence();
        } catch (error) {
          console.error("Erro ao configurar presença:", error);
        }
      });

      // Heartbeat periódico (45s)
      intervalRef.current = setInterval(async () => {
        try {
          updatePresence(); // Usar updatePresence em vez de update direto
        } catch (error) {
          console.error("Erro no heartbeat de presença:", error);
        }
      }, 45000);

      // "Away" quando aba perde foco
      const onBlur = async () => {
        isActive = false;
        if (manualStatus === "auto") {
          updatePresence();
        }
      };
      const onFocus = async () => {
        isActive = true;
        if (manualStatus === "auto") {
          updatePresence();
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
        manualStatusUnsubscribe(); 
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
