import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase";
import { Event, EventRegistration, RegistrationState } from "../types";

/**
 * Cria um novo evento no Firestore
 */
export const createEvent = async (
  eventData: Omit<Event, "id" | "createdAt">,
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "events"), {
      ...eventData,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    throw error;
  }
};

/**
 * Atualiza um evento existente
 */
export const updateEvent = async (
  eventId: string,
  updates: Partial<Event>,
): Promise<void> => {
  try {
    const eventRef = doc(db, "events", eventId);

    await updateDoc(eventRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    throw error;
  }
};

/**
 * Deleta um evento
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "events", eventId));
  } catch (error) {
    console.error("Erro ao deletar evento:", error);
    throw error;
  }
};

/**
 * Busca eventos por organização
 */
export const getEventsByOrganization = async (
  orgId: string,
): Promise<Event[]> => {
  try {
    const eventsQuery = query(
      collection(db, "events"),
      where("hostOrgId", "==", orgId),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(eventsQuery);
    const events: Event[] = [];

    snapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event);
    });

    return events;
  } catch (error) {
    console.error("Erro ao buscar eventos da organização:", error);
    throw error;
  }
};

/**
 * Busca eventos públicos/abertos
 */
export const getPublicEvents = async (limit: number = 20): Promise<Event[]> => {
  try {
    const eventsQuery = query(
      collection(db, "events"),
      where("status", "==", "open"),
      orderBy("startsAt", "asc"),
    );

    const snapshot = await getDocs(eventsQuery);
    const events: Event[] = [];

    snapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as Event);
    });

    return events.slice(0, limit);
  } catch (error) {
    console.error("Erro ao buscar eventos públicos:", error);
    throw error;
  }
};

/**
 * Busca inscrições de um evento específico
 */
export const getEventRegistrations = async (
  eventId: string,
): Promise<EventRegistration[]> => {
  try {
    const registrationsQuery = query(
      collection(db, "eventRegistrations"),
      where("eventId", "==", eventId),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(registrationsQuery);
    const registrations: EventRegistration[] = [];

    snapshot.forEach((doc) => {
      registrations.push({ id: doc.id, ...doc.data() } as EventRegistration);
    });

    return registrations;
  } catch (error) {
    console.error("Erro ao buscar inscrições do evento:", error);
    throw error;
  }
};

/**
 * Busca inscrições de uma organização
 */
export const getOrganizationRegistrations = async (
  orgId: string,
): Promise<EventRegistration[]> => {
  try {
    const registrationsQuery = query(
      collection(db, "eventRegistrations"),
      where("orgId", "==", orgId),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(registrationsQuery);
    const registrations: EventRegistration[] = [];

    snapshot.forEach((doc) => {
      registrations.push({ id: doc.id, ...doc.data() } as EventRegistration);
    });

    return registrations;
  } catch (error) {
    console.error("Erro ao buscar inscrições da organização:", error);
    throw error;
  }
};

/**
 * Atualiza o status de uma inscrição
 */
export const updateRegistrationStatus = async (
  registrationId: string,
  newState: RegistrationState,
  approvedBy?: string,
): Promise<void> => {
  try {
    const registrationRef = doc(db, "eventRegistrations", registrationId);
    const updateData: any = {
      state: newState,
      updatedAt: serverTimestamp(),
    };

    if (newState === "approved" && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = serverTimestamp();
    }

    await updateDoc(registrationRef, updateData);
  } catch (error) {
    console.error("Erro ao atualizar status da inscrição:", error);
    throw error;
  }
};

/**
 * Verifica se uma organização já está inscrita em um evento
 */
export const checkExistingRegistration = async (
  eventId: string,
  orgId: string,
): Promise<EventRegistration | null> => {
  try {
    const registrationsQuery = query(
      collection(db, "eventRegistrations"),
      where("eventId", "==", eventId),
      where("orgId", "==", orgId),
    );

    const snapshot = await getDocs(registrationsQuery);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];

      return { id: doc.id, ...doc.data() } as EventRegistration;
    }

    return null;
  } catch (error) {
    console.error("Erro ao verificar inscrição existente:", error);
    throw error;
  }
};

/**
 * Formata data para exibição
 */
export const formatEventDate = (timestamp: any): string => {
  if (!timestamp) return "Data não definida";

  let date: Date;

  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Calcula se o check-in está disponível
 */
export const isCheckinAvailable = (event: Event): boolean => {
  if (!event.startsAt || !event.checkinWindow) return false;

  const now = new Date();
  let eventStart: Date;

  if (event.startsAt instanceof Timestamp) {
    eventStart = event.startsAt.toDate();
  } else if (event.startsAt.toDate) {
    eventStart = event.startsAt.toDate();
  } else {
    eventStart = new Date(event.startsAt);
  }

  const checkinStart = new Date(
    eventStart.getTime() - event.checkinWindow * 60 * 1000,
  );

  return now >= checkinStart && now <= eventStart;
};
