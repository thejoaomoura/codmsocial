import { useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { addToast } from "@heroui/toast";

import { db } from "../firebase";
import { EventRegistration, RegistrationState } from "../types";

export const useEventRegistrations = () => {
  const [loading, setLoading] = useState(false);

  /**
   * Inscreve uma organização em um evento
   */
  const registerForEvent = async (
    eventId: string,
    orgId: string,
    managerId: string,
    roster: string[],
    substitutes: string[] = [],
    event?: any, // Evento completo para validações
    currentUserId?: string, // ID do usuário atual
    userRole?: string, // Role do usuário na organização
  ): Promise<boolean> => {
    setLoading(true);

    try {
      // Validação: Verificar se o usuário é owner da organização hospedeira
      if (event && event.hostOrgId === orgId) {
        addToast({
          title: "Inscrição Não Permitida",
          description: "A organização hospedeira não pode se inscrever no próprio evento",
          color: "warning",
        });
        return false;
      }

      // Validação: Verificar se o usuário é o criador do evento
      if (event && event.createdBy === currentUserId) {
        addToast({
          title: "Inscrição Não Permitida", 
          description: "O criador do evento não pode inscrever sua organização no próprio evento",
          color: "warning",
        });
        return false;
      }

      // Validação: Verificar se o usuário é owner da organização (não pode se auto-inscrever)
      if (userRole === "owner") {
        addToast({
          title: "Inscrição Não Permitida",
          description: "Owners não podem inscrever a própria organização em eventos. Apenas membros podem se inscrever.",
          color: "warning",
        });
        return false;
      }

      // Verificar se já existe uma inscrição para esta organização neste evento
      const existingRegistrationQuery = query(
        collection(db, "eventRegistrations"),
        where("eventId", "==", eventId),
        where("orgId", "==", orgId),
      );

      const existingRegistrations = await getDocs(existingRegistrationQuery);

      if (!existingRegistrations.empty) {
        addToast({
          title: "Inscrição Já Existe",
          description: "Sua organização já está inscrita neste evento",
          color: "warning",
        });

        return false;
      }

      // Criar nova inscrição
      const registrationData: Omit<EventRegistration, "id"> = {
        eventId,
        orgId,
        managerId,
        roster,
        substitutes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        state: "pending" as RegistrationState,
      };

      await addDoc(collection(db, "eventRegistrations"), registrationData);

      addToast({
        title: "Inscrição Enviada",
        description: "Sua organização foi inscrita no evento com sucesso!",
        color: "success",
      });

      return true;
    } catch (error) {
      console.error("Erro ao inscrever no evento:", error);
      
      // Melhor tratamento de erros para UX
      if (error instanceof Error) {
        if (error.message.includes("Missing or insufficient permissions")) {
          addToast({
            title: "Erro de Permissão",
            description: "Você não tem permissão para realizar esta inscrição. Verifique se sua organização está ativa.",
            color: "danger",
          });
        } else if (error.message.includes("network")) {
          addToast({
            title: "Erro de Conexão",
            description: "Verifique sua conexão com a internet e tente novamente.",
            color: "danger",
          });
        } else {
          addToast({
            title: "Erro na Inscrição",
            description: "Ocorreu um erro inesperado. Tente novamente em alguns instantes.",
            color: "danger",
          });
        }
      } else {
        addToast({
          title: "Erro na Inscrição",
          description: "Ocorreu um erro inesperado. Tente novamente.",
          color: "danger",
        });
      }

      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza o roster de uma inscrição existente
   */
  const updateRegistrationRoster = async (
    registrationId: string,
    newRoster: string[],
    newSubstitutes: string[] = [],
  ): Promise<boolean> => {
    setLoading(true);

    try {
      const registrationRef = doc(db, "eventRegistrations", registrationId);

      await updateDoc(registrationRef, {
        roster: newRoster,
        substitutes: newSubstitutes,
        updatedAt: serverTimestamp(),
      });

      addToast({
        title: "Roster Atualizado",
        description: "Roster da equipe foi atualizado com sucesso!",
        color: "success",
      });

      return true;
    } catch (error) {
      console.error("Erro ao atualizar roster:", error);
      addToast({
        title: "Erro na Atualização",
        description: "Erro ao atualizar roster. Tente novamente.",
        color: "danger",
      });

      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtém inscrições de uma organização em tempo real
   */
  const subscribeToOrgRegistrations = (
    orgId: string,
    callback: (registrations: EventRegistration[]) => void,
  ) => {
    const registrationsQuery = query(
      collection(db, "eventRegistrations"),
      where("orgId", "==", orgId),
    );

    return onSnapshot(registrationsQuery, (snapshot) => {
      const registrations: EventRegistration[] = [];

      snapshot.forEach((doc) => {
        registrations.push({ id: doc.id, ...doc.data() } as EventRegistration);
      });
      callback(registrations);
    });
  };

  /**
   * Obtém inscrições de um evento específico
   */
  const subscribeToEventRegistrations = (
    eventId: string,
    callback: (registrations: EventRegistration[]) => void,
  ) => {
    const registrationsQuery = query(
      collection(db, "eventRegistrations"),
      where("eventId", "==", eventId),
    );

    return onSnapshot(registrationsQuery, (snapshot) => {
      const registrations: EventRegistration[] = [];

      snapshot.forEach((doc) => {
        registrations.push({ id: doc.id, ...doc.data() } as EventRegistration);
      });
      callback(registrations);
    });
  };

  return {
    loading,
    registerForEvent,
    updateRegistrationRoster,
    subscribeToOrgRegistrations,
    subscribeToEventRegistrations,
  };
};
