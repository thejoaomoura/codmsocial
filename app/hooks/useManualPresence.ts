"use client";

import { useState, useEffect } from "react";
import { getDatabase, ref, set, onValue, off } from "firebase/database";
import { auth } from "../firebase";

export type ManualPresenceState = "online" | "away" | "offline" | "auto";

interface ManualPresenceData {
  manualStatus: ManualPresenceState;
  updatedAt: number;
}

export function useManualPresence() {
  const [manualStatus, setManualStatus] = useState<ManualPresenceState>("auto");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const rtdb = getDatabase();
    const manualStatusRef = ref(rtdb, `manualPresence/${auth.currentUser.uid}`);

    const unsubscribe = onValue(
      manualStatusRef,
      (snapshot) => {
        const data = snapshot.val() as ManualPresenceData | null;
        if (data) {
          setManualStatus(data.manualStatus);
        } else {
          setManualStatus("auto");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao escutar status manual:", error);
        setManualStatus("auto");
        setLoading(false);
      }
    );

    return () => {
      off(manualStatusRef, "value", unsubscribe);
    };
  }, []);

  const updateManualStatus = async (newStatus: ManualPresenceState) => {
    if (!auth.currentUser) return;

    try {
      const rtdb = getDatabase();
      const manualStatusRef = ref(rtdb, `manualPresence/${auth.currentUser.uid}`);
      
      const data: ManualPresenceData = {
        manualStatus: newStatus,
        updatedAt: Date.now()
      };

      await set(manualStatusRef, data);
      setManualStatus(newStatus);
    } catch (error) {
      console.error("Erro ao atualizar status manual:", error);
    }
  };

  return {
    manualStatus,
    loading,
    updateManualStatus
  };
}