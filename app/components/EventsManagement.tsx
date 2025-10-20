"use client";

import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Badge } from "@heroui/badge";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Checkbox } from "@heroui/checkbox";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { addToast } from "@heroui/toast";
import {
  HiOutlineCalendar,
  HiOutlineStar,
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlineExternalLink,
  HiOutlinePlus,
  HiOutlinePencil,
} from "react-icons/hi";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { I18nProvider } from "@react-aria/i18n";

import {
  Event,
  EventRegistration,
  Organization,
  Membership,
  User,
  OrganizationRole,
  EventType,
  EventVisibility,
  GameMode,
  EventStatus,
} from "../types";
import { useRoleManagement } from "../hooks/useRoleManagement";
import { useEventRegistrations } from "../hooks/useEventRegistrations";
import { db } from "../firebase";

// dayjs import removed – not used in this component

interface EventsManagementProps {
  organization: Organization;
  currentUserRole: OrganizationRole;
  members: (Membership & { userData: User })[];
  currentUserId?: string;
}

const EventsManagement: React.FC<EventsManagementProps> = ({
  organization,
  currentUserRole,
  members,
  currentUserId,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<string[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createEventLoading, setCreateEventLoading] = useState(false);
  const { getRolePermissions } = useRoleManagement();
  const { registerForEvent, loading: registrationLoading } =
    useEventRegistrations();
  const [date, setDate] = useState(""); // YYYY-MM-DD

  const [time, setTime] = useState(""); // HH:mm
  const [dateText, setDateText] = useState(""); // DD/MM/YYYY
  const [timeText, setTimeText] = useState(""); // HH:mm

  const handleDateChange = (value: string) => {
    let numbers = value.replace(/\D/g, ""); // remove tudo que não é número

    if (numbers.length > 8) numbers = numbers.slice(0, 8);

    let masked = "";

    if (numbers.length >= 1) masked += numbers.slice(0, 2);
    if (numbers.length >= 3) masked += "/" + numbers.slice(2, 4);
    if (numbers.length >= 5) masked += "/" + numbers.slice(4, 8);

    setDateText(masked);
  };

  const handleTimeChange = (value: string) => {
    let numbers = value.replace(/\D/g, "");

    if (numbers.length > 4) numbers = numbers.slice(0, 4);

    let masked = "";

    if (numbers.length >= 1) masked += numbers.slice(0, 2);
    if (numbers.length >= 3) masked += ":" + numbers.slice(2, 4);

    setTimeText(masked);
  };

  const combineDateAndTimeFromText = (
    dateStr: string,
    timeStr: string,
  ): string | null => {
    if (!dateStr || !timeStr) return null;

    const dateMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const timeMatch = timeStr.match(/^(\d{2}):(\d{2})$/);

    if (!dateMatch || !timeMatch) return null;

    const [, dayStr, monthStr, yearStr] = dateMatch;
    const [, hoursStr, minutesStr] = timeMatch;

    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    const jsDate = new Date(year, month - 1, day, hours, minutes, 0); // horário local

    return jsDate.toISOString();
  };

  // Estado do formulário de criação de evento
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    type: "scrim" as EventType,
    gameMode: "BR" as GameMode,
    teamSize: 4,
    rosterMin: 4,
    rosterMax: 6,
    startsAt: "",
    checkinWindow: 30,
    maxTeams: undefined as number | undefined,
    prizePool: "",
    prizeCurrency: "BRL" as "BRL" | "USD",
    rulesURL: "",
    visibility: "public" as EventVisibility,
  });

  // Função para formatar valor da premiação
  const formatPrizeValue = (value: string, currency: "BRL" | "USD"): string => {
    // Remove caracteres não numéricos exceto vírgula e ponto
    const cleanValue = value.replace(/[^\d.,]/g, "");

    if (!cleanValue) return "";

    // Converte vírgula para ponto para processamento
    const normalizedValue = cleanValue.replace(",", ".");
    const numericValue = parseFloat(normalizedValue);

    if (isNaN(numericValue)) return "";

    // Formata conforme a moeda
    if (currency === "BRL") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(numericValue);
    } else {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(numericValue);
    }
  };

  // Função para extrair valor numérico da string formatada
  const extractNumericValue = (formattedValue: string): string => {
    return formattedValue.replace(/[^\d.,]/g, "").replace(",", ".");
  };

  const permissions = getRolePermissions(currentUserRole);

  React.useEffect(() => {
    // Query simples para evitar erro de índice
    const eventsQuery = query(
      collection(db, "events")
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const eventsData: Event[] = [];

        snapshot.forEach((doc) => {
          eventsData.push({ id: doc.id, ...doc.data() } as Event);
        });
        
        // Ordenar no cliente por createdAt (mais recente primeiro)
        eventsData.sort((a, b) => {
          const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        setEvents(eventsData);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar eventos:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Resetar formulário
  const resetEventForm = () => {
    setEventForm({
      name: "",
      description: "",
      type: "scrim" as EventType,
      gameMode: "BR" as GameMode,
      teamSize: 4,
      rosterMin: 4,
      rosterMax: 6,
      startsAt: "",
      checkinWindow: 30,
      maxTeams: undefined,
      prizePool: "",
      prizeCurrency: "BRL" as "BRL" | "USD",
      rulesURL: "",
      visibility: "public" as EventVisibility,
    });
  };

  const populateEventForm = (event: Event) => {
    const startsAtDate =
      event.startsAt instanceof Timestamp
        ? event.startsAt.toDate()
        : new Date(event.startsAt);

    const formattedDate = startsAtDate.toISOString().slice(0, 16);

    const prizeValue = event.prizePool
      ? extractNumericValue(event.prizePool)
      : "";
    const currency = event.prizePool?.includes("$") ? "USD" : "BRL";

    setEventForm({
      name: event.name,
      description: event.description,
      type: event.type,
      gameMode: event.gameMode,
      teamSize: event.teamSize,
      rosterMin: event.rosterMin,
      rosterMax: event.rosterMax,
      startsAt: formattedDate,
      checkinWindow: event.checkinWindow || 10,
      maxTeams: event.maxTeams,
      prizePool: prizeValue,
      prizeCurrency: currency,
      rulesURL: event.rulesURL || "",
      visibility: event.visibility || "public",
    });
  };

  // Criar evento
  const handleCreateEvent = async () => {
    if (
      !eventForm.name.trim() ||
      !eventForm.description.trim() ||
      !eventForm.startsAt
    ) {
      addToast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        color: "danger",
      });

      return;
    }

    // ✅ Validação simples e robusta de data
    const jsDate = new Date(eventForm.startsAt);
    const now = new Date();

    if (isNaN(jsDate.getTime())) {
      addToast({
        title: "Data inválida",
        description: "Por favor, selecione uma data e hora válidas",
        color: "danger",
      });

      return;
    }

    if (jsDate <= now) {
      addToast({
        title: "Data inválida",
        description: "A data deve ser no futuro",
        color: "danger",
      });

      return;
    }

    if (eventForm.rosterMin > eventForm.rosterMax) {
      addToast({
        title: "Erro de validação",
        description: "O roster mínimo não pode ser maior que o máximo",
        color: "danger",
      });

      return;
    }

    if (!eventForm.type || !eventForm.gameMode) {
      addToast({
        title: "Campos obrigatórios",
        description: "Selecione o tipo de evento e modo de jogo",
        color: "danger",
      });

      return;
    }

    setCreateEventLoading(true);

    try {
      const eventData: Omit<Event, "id"> = {
        type: eventForm.type,
        hostOrgId: organization.id,
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        gameMode: eventForm.gameMode,
        teamSize: eventForm.teamSize,
        rosterMin: eventForm.rosterMin,
        rosterMax: eventForm.rosterMax,
        startsAt: jsDate.toISOString(),
        checkinWindow: eventForm.checkinWindow,
        status: "open" as EventStatus,
        visibility: eventForm.visibility,
        createdBy: currentUserId || "",
        createdAt: serverTimestamp(),
        region: organization.region,
        ...(eventForm.maxTeams && { maxTeams: eventForm.maxTeams }),
        ...(eventForm.prizePool.trim() && {
          prizePool: formatPrizeValue(
            eventForm.prizePool,
            eventForm.prizeCurrency,
          ),
        }),
        ...(eventForm.rulesURL.trim() && {
          rulesURL: eventForm.rulesURL.trim(),
        }),
      };

      console.log("Dados do evento antes de enviar:", eventData);

      await addDoc(collection(db, "events"), eventData);

      addToast({
        title: "Evento criado",
        description: "O evento foi criado com sucesso!",
        color: "success",
      });

      setShowCreateEventModal(false);
      resetEventForm();
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      addToast({
        title: "Erro",
        description: "Erro ao criar evento. Tente novamente.",
        color: "danger",
      });
    } finally {
      setCreateEventLoading(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (
      !selectedEvent ||
      !eventForm.name.trim() ||
      !eventForm.description.trim() ||
      !eventForm.startsAt
    ) {
      addToast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        color: "danger",
      });

      return;
    }

    const jsDate = new Date(eventForm.startsAt);
    const now = new Date();

    if (isNaN(jsDate.getTime())) {
      addToast({
        title: "Data inválida",
        description: "Por favor, selecione uma data e hora válidas",
        color: "danger",
      });

      return;
    }

    if (jsDate <= now) {
      addToast({
        title: "Data inválida",
        description: "A data deve ser no futuro",
        color: "danger",
      });

      return;
    }

    if (eventForm.rosterMin > eventForm.rosterMax) {
      addToast({
        title: "Erro de validação",
        description: "O roster mínimo não pode ser maior que o máximo",
        color: "danger",
      });

      return;
    }

    if (!eventForm.type || !eventForm.gameMode) {
      addToast({
        title: "Campos obrigatórios",
        description: "Selecione o tipo de evento e modo de jogo",
        color: "danger",
      });

      return;
    }

    setCreateEventLoading(true);

    try {
      const updateData: Partial<Event> = {
        name: eventForm.name.trim(),
        description: eventForm.description.trim(),
        type: eventForm.type,
        gameMode: eventForm.gameMode,
        teamSize: eventForm.teamSize,
        rosterMin: eventForm.rosterMin,
        rosterMax: eventForm.rosterMax,
        startsAt: jsDate.toISOString(),
        checkinWindow: eventForm.checkinWindow,
        visibility: eventForm.visibility,
        ...(eventForm.maxTeams && { maxTeams: eventForm.maxTeams }),
        ...(eventForm.prizePool.trim() && {
          prizePool: formatPrizeValue(
            eventForm.prizePool,
            eventForm.prizeCurrency,
          ),
        }),
        ...(eventForm.rulesURL.trim() && {
          rulesURL: eventForm.rulesURL.trim(),
        }),
      };

      await updateDoc(doc(db, "events", selectedEvent.id), updateData);

      addToast({
        title: "Evento atualizado",
        description: "O evento foi atualizado com sucesso!",
        color: "success",
      });

      setShowCreateEventModal(false);
      setIsEditMode(false);
      setSelectedEvent(null);
      resetEventForm();
    } catch (error) {
      console.error("Erro ao atualizar evento:", error);
      addToast({
        title: "Erro",
        description: "Erro ao atualizar evento. Tente novamente.",
        color: "danger",
      });
    } finally {
      setCreateEventLoading(false);
    }
  };

  // Estado para registrations
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);

  // Carregar registrations em tempo real
  React.useEffect(() => {
    if (events.length === 0) return;

    const eventIds = events.map(event => event.id);
    const registrationsQuery = query(
      collection(db, "eventRegistrations"),
      where("eventId", "in", eventIds)
    );

    const unsubscribe = onSnapshot(
      registrationsQuery,
      (snapshot) => {
        const registrationsData: EventRegistration[] = [];
        snapshot.forEach((doc) => {
          registrationsData.push({ id: doc.id, ...doc.data() } as EventRegistration);
        });
        setRegistrations(registrationsData);
      },
      (error) => {
        console.error("Erro ao carregar registrations:", error);
      }
    );

    return () => unsubscribe();
  }, [events]);

  // Função para verificar se o usuário pode ver um evento
  const canViewEvent = (event: Event): boolean => {
    // Se não tem permissão para ver eventos, não pode ver nenhum
    if (!permissions.canViewEvents) {
      return false;
    }

    // Eventos da própria organização sempre visíveis
    if (event.hostOrgId === organization.id) {
      return true;
    }

    // Para eventos privados de outras organizações, não são visíveis
    if (event.visibility === "private") {
      return false;
    }

    // Para eventos públicos de outras organizações, verificar se está aberto ou se a org está inscrita
    const isRegistered = registrations.some(
      (reg) => reg.eventId === event.id && reg.orgId === organization.id,
    );

    return event.status === "open" || isRegistered;
  };

  // Função para obter o status da inscrição da organização
  const getRegistrationStatus = (eventId: string) => {
    return registrations.find(
      (reg) => reg.eventId === eventId && reg.orgId === organization.id,
    );
  };

  // Função para verificar se o usuário atual está no roster
  const getUserRosterStatus = (eventId: string) => {
    const registration = getRegistrationStatus(eventId);

    if (!registration || !currentUserId) return null;

    if (registration.roster.includes(currentUserId)) {
      return "titular";
    }
    if (registration.substitutes?.includes(currentUserId)) {
      return "reserva";
    }

    return "não incluído";
  };

  const handleRegisterForEvent = (event: Event) => {
    setSelectedEvent(event);
    setSelectedRoster([]);
    setShowRosterModal(true);
  };

  const handleViewEventDetails = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetailsModal(true);
  };

  const handleRosterSelection = (userId: string, checked: boolean) => {
    if (checked) {
      if (selectedRoster.length < (selectedEvent?.rosterMax || 0)) {
        setSelectedRoster([...selectedRoster, userId]);
      }
    } else {
      setSelectedRoster(selectedRoster.filter((id) => id !== userId));
    }
  };

  const handleConfirmRegistration = async () => {
    if (
      !selectedEvent ||
      selectedRoster.length < (selectedEvent.rosterMin || 0)
    ) {
      addToast({
        title: "Roster Insuficiente",
        description: `Selecione pelo menos ${selectedEvent?.rosterMin} jogadores`,
        color: "danger",
      });

      return;
    }

    if (selectedRoster.length > (selectedEvent.rosterMax || 0)) {
      addToast({
        title: "Roster Excedido",
        description: `Máximo de ${selectedEvent?.rosterMax} jogadores permitido`,
        color: "danger",
      });

      return;
    }

    try {
      // Usar o hook para registrar no evento via Firestore
      const success = await registerForEvent(
        selectedEvent.id,
        organization.id,
        currentUserId || "",
        selectedRoster,
        [], //
      );

      if (success) {
        setShowRosterModal(false);
        setSelectedEvent(null);
        setSelectedRoster([]);
      }
    } catch (error) {
      console.error("Erro ao inscrever no evento:", error);
      addToast({
        title: "Erro na Inscrição",
        description: "Erro ao inscrever no evento. Tente novamente.",
        color: "danger",
      });
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "success";
      case "closed":
        return "warning";
      case "finished":
        return "default";
      default:
        return "primary";
    }
  };

  const getEventTypeIcon = (type: string) => {
    return type === "tournament" ? HiOutlineStar : HiOutlineCalendar;
  };

  const getRegistrationStatusColor = (state: string) => {
    switch (state) {
      case "approved":
        return "success";
      case "pending":
        return "warning";
      case "rejected":
        return "danger";
      case "withdrawn":
        return "default";
      default:
        return "primary";
    }
  };

  const getRegistrationStatusText = (state: string) => {
    switch (state) {
      case "approved":
        return "Aprovado";
      case "pending":
        return "Pendente";
      case "rejected":
        return "Rejeitado";
      case "withdrawn":
        return "Retirado";
      default:
        return state;
    }
  };

  const formatEventDate = (dateString?: string) => {
    if (!dateString) return "";

    try {
      // Remove o timezone em colchetes, mantendo a parte ISO que JS entende
      const cleanedString = dateString.replace(/\[.*\]$/, ""); // "2025-10-15T20:00:00-03:00"

      const jsDate = new Date(cleanedString);

      if (isNaN(jsDate.getTime())) return "";

      const day = jsDate.getDate().toString().padStart(2, "0");
      const month = (jsDate.getMonth() + 1).toString().padStart(2, "0");
      const year = jsDate.getFullYear();
      const hours = jsDate.getHours().toString().padStart(2, "0");
      const minutes = jsDate.getMinutes().toString().padStart(2, "0");

      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch (error) {
      console.error("Erro ao formatar a data:", error);

      return "";
    }
  };
  // Filtrar eventos que o usuário pode ver
  const visibleEvents = events.filter(canViewEvent);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-default-600">Carregando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Eventos Disponíveis</h3>
        {permissions.canCreateEvents && (
          <Button
            startContent={<HiOutlinePlus className="w-4 h-4" />}
            style={{
              background: "rgba(219, 16, 87, 0.25)",
              border: "1px solid rgba(219, 16, 87, 0.4)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              color: "#fff",
              fontWeight: 500,
              transition: "all 0.3s ease",
            }}
            onClick={() => setShowCreateEventModal(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(219, 16, 87, 0.4)";
              e.currentTarget.style.border = "1px solid rgba(219, 16, 87, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(219, 16, 87, 0.25)";
              e.currentTarget.style.border = "1px solid rgba(219, 16, 87, 0.4)";
            }}
          >
            Criar Evento
          </Button>
        )}
      </div>

      {/* Informação sobre permissões para Ranked/Pro */}
      {(currentUserRole === "ranked" || currentUserRole === "pro") && (
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="py-3">
            <div className="flex items-center gap-2">
              <HiOutlineEye className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                <strong>Modo Visualização:</strong> Você pode ver informações
                dos eventos, mas não pode inscrever a organização ou editar
                rosters.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4">
        {visibleEvents.filter((event) => event.hostOrgId === organization.id)
          .length === 0 ? (
          <div className="text-center py-6 text-default-500">
            Nenhum evento encontrado para sua organização.
          </div>
        ) : (
          visibleEvents
            .filter((event) => event.hostOrgId === organization.id)
            .map((event) => {
              const EventIcon = getEventTypeIcon(event.type);
              const canRegister =
                permissions.canRegisterForEvents && event.status === "open";
              const registration = getRegistrationStatus(event.id);
              const userRosterStatus = getUserRosterStatus(event.id);

              return (
                <Card
                  key={event.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start w-full">
                      <div className="flex items-center gap-3">
                        {React.createElement(EventIcon, {
                          className: "w-6 h-6 text-primary",
                        })}
                        <div>
                          <h4 className="font-semibold">{event.name}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Chip
                              color={getEventStatusColor(event.status)}
                              size="sm"
                              variant="flat"
                            >
                              {event.status === "open"
                                ? "Aberto"
                                : event.status === "closed"
                                  ? "Fechado"
                                  : event.status === "finished"
                                    ? "Finalizado"
                                    : "Rascunho"}
                            </Chip>
                            <Chip color="primary" size="sm" variant="dot">
                              {event.type === "tournament"
                                ? "Torneio"
                                : "Scrim"}
                            </Chip>
                            <Chip size="sm" variant="bordered">
                              {event.gameMode}
                            </Chip>
                            {event.hostOrgId === organization.id && (
                              <Chip color="secondary" size="sm" variant="flat">
                                Própria Org
                              </Chip>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          color="default"
                          size="sm"
                          startContent={<HiOutlineEye className="w-4 h-4" />}
                          variant="flat"
                          onClick={() => handleViewEventDetails(event)}
                        >
                          Detalhes
                        </Button>

                        {/* Botão de edição - apenas para o criador do evento */}
                        {event.createdBy === currentUserId && (
                          <Button
                            isIconOnly
                            color="primary"
                            size="sm"
                            startContent={
                              <HiOutlinePencil className="w-4 h-4" />
                            }
                            variant="flat"
                            onClick={() => {
                              setSelectedEvent(event);
                              populateEventForm(event);
                              setIsEditMode(true);
                              setShowCreateEventModal(true);
                            }}
                          />
                        )}

                        {canRegister && !registration && (
                          <Button
                            color="primary"
                            size="sm"
                            onClick={() => handleRegisterForEvent(event)}
                          >
                            Inscrever
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardBody className="pt-0">
                    <p className="text-default-600 mb-3">{event.description}</p>

                    {/* Status da inscrição da organização */}
                    {registration && (
                      <div className="mb-3 p-3 bg-default-100 border border-default-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-default-700">
                              Status da Organização:
                            </span>
                            <Chip
                              color={getRegistrationStatusColor(
                                registration.state,
                              )}
                              size="sm"
                            >
                              {getRegistrationStatusText(registration.state)}
                            </Chip>
                          </div>
                          {permissions.canViewOwnRosterStatus &&
                            userRosterStatus && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-default-600">
                                  Seu status:
                                </span>
                                <Chip size="sm" variant="bordered">
                                  {userRosterStatus}
                                </Chip>
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <HiOutlineUsers className="w-4 h-4 text-default-500" />
                        <span className="text-default-700">
                          Time: {event.teamSize}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiOutlineUsers className="w-4 h-4 text-default-500" />
                        <span className="text-default-700">
                          Roster: {event.rosterMin}-{event.rosterMax}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiOutlineClock className="w-4 h-4 text-default-500" />
                        <span className="text-default-700">
                          {formatEventDate(event.startsAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-default-700">
                          Região: {event.region}
                        </span>
                      </div>
                    </div>

                    {event.checkinWindow && (
                      <div className="mt-2 text-sm text-default-600">
                        <span>
                          Check-in: {event.checkinWindow} min antes do início
                        </span>
                      </div>
                    )}

                    {event.prizePool && (
                      <div className="mt-3 p-2 bg-warning-50 border border-warning-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <HiOutlineStar className="w-4 h-4 text-warning-600" />
                          <span className="text-warning-800 font-medium">
                            Premiação: {event.prizePool}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })
        )}
      </div>

      {visibleEvents.length === 0 && (
        <Card>
          <CardBody className="text-center py-8">
            <HiOutlineCalendar className="w-12 h-12 text-default-400 mx-auto mb-4" />
            <p className="text-default-600">
              Nenhum evento disponível no momento.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Modal de Seleção de Roster */}
      <Modal
        isOpen={showRosterModal}
        scrollBehavior="inside"
        size="2xl"
        onClose={() => setShowRosterModal(false)}
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">Seleção de Roster</h3>
              <p className="text-sm text-default-600 font-normal">
                {selectedEvent?.name} - Selecione {selectedEvent?.rosterMin} a{" "}
                {selectedEvent?.rosterMax} jogadores
              </p>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Jogadores Selecionados:
                </span>
                <Badge color="primary" content={selectedRoster.length}>
                  <div className="w-6 h-6" />
                </Badge>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {members
                  .filter((member) => member.status === "accepted")
                  .map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-default-50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={member.userData.displayName}
                          size="sm"
                          src={member.userData.avatar}
                        />
                        <div>
                          <p className="font-medium">
                            {member.userData.displayName}
                          </p>
                          <p className="text-sm text-default-600">
                            @{member.userData.organizationTag}
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        isDisabled={
                          !selectedRoster.includes(member.userId) &&
                          selectedRoster.length >=
                            (selectedEvent?.rosterMax || 0)
                        }
                        isSelected={selectedRoster.includes(member.userId)}
                        onValueChange={(checked) =>
                          handleRosterSelection(member.userId, checked)
                        }
                      />
                    </div>
                  ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onClick={() => setShowRosterModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              isDisabled={
                selectedRoster.length < (selectedEvent?.rosterMin || 0)
              }
              isLoading={registrationLoading}
              onClick={handleConfirmRegistration}
            >
              Confirmar Inscrição
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Detalhes do Evento */}
      <Modal
        isOpen={showEventDetailsModal}
        scrollBehavior="inside"
        size="3xl"
        onClose={() => setShowEventDetailsModal(false)}
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              {selectedEvent &&
                React.createElement(getEventTypeIcon(selectedEvent.type), {
                  className: "w-6 h-6 text-primary",
                })}
              <div>
                <h3 className="text-lg font-semibold">{selectedEvent?.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Chip
                    color={getEventStatusColor(selectedEvent?.status || "")}
                    size="sm"
                    variant="flat"
                  >
                    {selectedEvent?.status === "open"
                      ? "Aberto"
                      : selectedEvent?.status === "closed"
                        ? "Fechado"
                        : selectedEvent?.status === "finished"
                          ? "Finalizado"
                          : "Rascunho"}
                  </Chip>
                  <Chip color="primary" size="sm" variant="dot">
                    {selectedEvent?.type === "tournament" ? "Torneio" : "Scrim"}
                  </Chip>
                </div>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedEvent && (
              <div className="space-y-6">
                {/* Descrição */}
                <div>
                  <h4 className="font-semibold mb-2">Descrição</h4>
                  <p className="text-default-600">
                    {selectedEvent.description}
                  </p>
                </div>

                {/* Informações do Evento */}
                <div>
                  <h4 className="font-semibold mb-3">Informações do Evento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <HiOutlineUsers className="w-4 h-4 text-default-500" />
                        <span className="text-sm text-default-700">
                          <strong>Tamanho do Time:</strong>{" "}
                          {selectedEvent.teamSize} jogadores
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiOutlineUsers className="w-4 h-4 text-default-500" />
                        <span className="text-sm text-default-700">
                          <strong>Roster:</strong> {selectedEvent.rosterMin} -{" "}
                          {selectedEvent.rosterMax} jogadores
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiOutlineClock className="w-4 h-4 text-default-500" />
                        <span className="text-default-700">
                          {formatEventDate(selectedEvent.startsAt)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <strong>Modo de Jogo:</strong> {selectedEvent.gameMode}
                      </div>
                      <div className="text-sm">
                        <strong>Região:</strong> {selectedEvent.region}
                      </div>
                      {selectedEvent.checkinWindow && (
                        <div className="text-sm">
                          <strong>Check-in:</strong>{" "}
                          {selectedEvent.checkinWindow} min antes
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Premiação (se houver) */}
                {selectedEvent.prizePool && (
                  <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <HiOutlineStar className="w-5 h-5 text-warning-600" />
                      <span className="font-semibold text-warning-800">
                        Premiação: {selectedEvent.prizePool}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status da Organização */}
                {(() => {
                  const registration = getRegistrationStatus(selectedEvent.id);
                  const userRosterStatus = getUserRosterStatus(
                    selectedEvent.id,
                  );

                  if (registration) {
                    return (
                      <div>
                        <h4 className="font-semibold mb-3">
                          Status da Sua Organização
                        </h4>
                        <div className="p-4 bg-default-100 border border-default-200 rounded-lg space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              Status da Inscrição:
                            </span>
                            <Chip
                              color={getRegistrationStatusColor(
                                registration.state,
                              )}
                              size="sm"
                            >
                              {getRegistrationStatusText(registration.state)}
                            </Chip>
                          </div>

                          {permissions.canViewOwnRosterStatus &&
                            userRosterStatus && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  Seu Status no Roster:
                                </span>
                                <Chip size="sm" variant="bordered">
                                  {userRosterStatus}
                                </Chip>
                              </div>
                            )}

                          {registration.state === "approved" && (
                            <div className="text-sm text-success-700">
                              <HiOutlineCheck className="w-4 h-4 inline mr-1" />
                              Sua organização está confirmada para este evento!
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Regras (se houver) */}
                {selectedEvent.rulesURL && (
                  <div>
                    <h4 className="font-semibold mb-2">Regras do Evento</h4>
                    <Button
                      as="a"
                      color="primary"
                      href={selectedEvent.rulesURL}
                      rel="noopener noreferrer"
                      size="sm"
                      startContent={
                        <HiOutlineExternalLink className="w-4 h-4" />
                      }
                      target="_blank"
                      variant="bordered"
                    >
                      Ver Regras Completas
                    </Button>
                  </div>
                )}

                {/* Informação sobre limitações para Ranked/Pro */}
                {(currentUserRole === "ranked" ||
                  currentUserRole === "pro") && (
                  <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <HiOutlineEye className="w-5 h-5 text-primary-600 mt-0.5" />
                      <div className="text-sm text-primary-800">
                        <p className="font-medium mb-1">Modo Visualização</p>
                        <p>
                          Como{" "}
                          {currentUserRole === "ranked"
                            ? "Ranked Player"
                            : "Pro Player"}
                          , você pode visualizar todas as informações do evento,
                          mas não pode inscrever a organização ou editar
                          rosters. Entre em contato com um Manager ou Owner para
                          realizar inscrições.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onClick={() => setShowEventDetailsModal(false)}
            >
              Fechar
            </Button>
            {selectedEvent &&
              permissions.canRegisterForEvents &&
              selectedEvent.status === "open" &&
              !getRegistrationStatus(selectedEvent.id) && (
                <Button
                  color="primary"
                  onClick={() => {
                    setShowEventDetailsModal(false);
                    handleRegisterForEvent(selectedEvent);
                  }}
                >
                  Inscrever Organização
                </Button>
              )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Criação de Evento */}
      <Modal
        isOpen={showCreateEventModal}
        scrollBehavior="inside"
        size="2xl"
        onClose={() => {
          setShowCreateEventModal(false);
          resetEventForm();
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">
              {isEditMode ? "Editar Evento" : "Criar Novo Evento"}
            </h2>
            <p className="text-sm text-default-600">
              {isEditMode
                ? "Atualize as informações do evento"
                : "Preencha as informações do evento"}
            </p>
          </ModalHeader>
          <ModalBody className="gap-4">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Básicas</h3>

              <Input
                isRequired
                classNames={{
                  input: "text-default-900",
                  label: "text-default-700",
                }}
                label="Nome do Evento"
                placeholder="Ex: Scrim Semanal - BR"
                value={eventForm.name}
                variant="bordered"
                onChange={(e) =>
                  setEventForm({ ...eventForm, name: e.target.value })
                }
              />

              <Input
                isRequired
                classNames={{
                  input: "text-default-900",
                  label: "text-default-700",
                }}
                label="Descrição"
                placeholder="Descreva o evento, objetivos e informações importantes..."
                value={eventForm.description}
                variant="bordered"
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  classNames={{
                    trigger: "bg-default-100",
                    label: "text-default-700",
                  }}
                  label="Tipo de Evento"
                  selectedKeys={[eventForm.type]}
                  variant="bordered"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as EventType;

                    if (
                      selected &&
                      (selected === "scrim" || selected === "tournament")
                    ) {
                      setEventForm({ ...eventForm, type: selected });
                    }
                  }}
                >
                  <SelectItem key="scrim">Scrim/Treino</SelectItem>
                  <SelectItem key="tournament">Torneio/Campeonato</SelectItem>
                </Select>

                <Select
                  classNames={{
                    trigger: "bg-default-100",
                    label: "text-default-700",
                  }}
                  label="Modo de Jogo"
                  selectedKeys={[eventForm.gameMode]}
                  variant="bordered"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as GameMode;

                    if (selected && (selected === "BR" || selected === "MP")) {
                      setEventForm({ ...eventForm, gameMode: selected });
                    }
                  }}
                >
                  <SelectItem key="BR">Battle Royale</SelectItem>
                  <SelectItem key="MP">Multiplayer</SelectItem>
                </Select>
              </div>
            </div>

            <Divider />
            {/* Configurações da Equipe */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configurações da Equipe</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  classNames={{
                    input: "text-default-900",
                    label: "text-default-700",
                  }}
                  label="Tamanho do Time"
                  max={10}
                  min={1}
                  type="number"
                  value={eventForm.teamSize.toString()}
                  variant="bordered"
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      teamSize: parseInt(e.target.value) || 4,
                    })
                  }
                />

                <Input
                  classNames={{
                    input: "text-default-900",
                    label: "text-default-700",
                  }}
                  label="Roster Mínimo"
                  max={15}
                  min={1}
                  type="number"
                  value={eventForm.rosterMin.toString()}
                  variant="bordered"
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      rosterMin: parseInt(e.target.value) || 4,
                    })
                  }
                />

                <Input
                  classNames={{
                    input: "text-default-900",
                    label: "text-default-700",
                  }}
                  label="Roster Máximo"
                  max={15}
                  min={1}
                  type="number"
                  value={eventForm.rosterMax.toString()}
                  variant="bordered"
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      rosterMax: parseInt(e.target.value) || 6,
                    })
                  }
                />
              </div>
            </div>
            <Divider />

            {/* Data e Horário */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Data e Horário</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full mx-auto">
                  <I18nProvider locale="pt-BR">
                    {/* Input de Data */}
                    <Input
                      isRequired
                      className="w-full mb-3"
                      placeholder="Data (dd/mm/yyyy)"
                      startContent={<HiOutlineCalendar />}
                      type="text"
                      value={dateText}
                      variant="bordered"
                      onChange={(e) => {
                        handleDateChange(e.target.value);

                        const isoString = combineDateAndTimeFromText(
                          e.target.value,
                          timeText,
                        );

                        if (isoString)
                          setEventForm({ ...eventForm, startsAt: isoString });
                      }}
                    />

                    {/* Input de Hora */}
                    <Input
                      isRequired
                      className="w-full"
                      placeholder="Horario (hh:mm)"
                      startContent={<HiOutlineClock />}
                      type="text"
                      value={timeText}
                      variant="bordered"
                      onChange={(e) => {
                        handleTimeChange(e.target.value);

                        const isoString = combineDateAndTimeFromText(
                          dateText,
                          e.target.value,
                        );

                        if (isoString)
                          setEventForm({ ...eventForm, startsAt: isoString });
                      }}
                    />
                  </I18nProvider>
                  <div />
                </div>
                <Input
                  classNames={{
                    input: "text-default-900",
                    label: "text-default-700",
                  }}
                  label="Check-in (minutos antes)"
                  max={120}
                  min={0}
                  type="number"
                  value={eventForm.checkinWindow.toString()}
                  variant="bordered"
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      checkinWindow: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
            </div>

            <Divider />

            {/* Configurações Adicionais */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configurações Adicionais</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eventForm.type === "tournament" && (
                  <Input
                    classNames={{
                      input: "text-default-900",
                      label: "text-default-700",
                    }}
                    label="Máximo de Times"
                    max={128}
                    min={2}
                    placeholder="Ex: 32"
                    type="number"
                    value={eventForm.maxTeams?.toString() || ""}
                    variant="bordered"
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        maxTeams: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                  />
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-default-700">
                      Premiação
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-default-500">BRL</span>
                      <Switch
                        classNames={{
                          wrapper:
                            "p-0 h-4 overflow-visible bg-default-200 group-data-[selected=true]:bg-default-300",
                          thumb:
                            "w-4 h-4 border-2 shadow-sm bg-white ml-0 group-data-[selected=true]:ml-4",
                        }}
                        isSelected={eventForm.prizeCurrency === "USD"}
                        size="sm"
                        onValueChange={(isSelected) =>
                          setEventForm({
                            ...eventForm,
                            prizeCurrency: isSelected ? "USD" : "BRL",
                          })
                        }
                      />
                      <span className="text-xs text-default-500">USD</span>
                    </div>
                  </div>
                  <Input
                    classNames={{
                      input: "text-default-900",
                      label: "text-default-700",
                    }}
                    description={`Valor será formatado automaticamente para ${eventForm.prizeCurrency === "BRL" ? "reais (R$)" : "dólares ($)"} ao salvar`}
                    placeholder={
                      eventForm.prizeCurrency === "BRL"
                        ? "Ex: 5000 ou 5000,50"
                        : "Ex: 1000 or 1000.50"
                    }
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">
                          {eventForm.prizeCurrency === "BRL" ? "R$" : "$"}
                        </span>
                      </div>
                    }
                    value={eventForm.prizePool}
                    variant="bordered"
                    onChange={(e) =>
                      setEventForm({ ...eventForm, prizePool: e.target.value })
                    }
                  />
                </div>
              </div>

              <Input
                classNames={{
                  input: "text-default-900",
                  label: "text-default-700",
                }}
                label="URL das Regras"
                placeholder="https://exemplo.com/regras"
                value={eventForm.rulesURL}
                variant="bordered"
                onChange={(e) =>
                  setEventForm({ ...eventForm, rulesURL: e.target.value })
                }
              />

              <Select
                classNames={{
                  trigger: "bg-default-100",
                  label: "text-default-700",
                }}
                label="Visibilidade do Evento"
                description="Eventos públicos aparecem na aba X-Treinos para todas as organizações. Eventos privados são visíveis apenas no painel da sua organização."
                selectedKeys={[eventForm.visibility]}
                variant="bordered"
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as EventVisibility;
                  if (selected && (selected === "public" || selected === "private")) {
                    setEventForm({ ...eventForm, visibility: selected });
                  }
                }}
              >
                <SelectItem key="public">Público</SelectItem>
                <SelectItem key="private">Privado</SelectItem>
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onClick={() => {
                setShowCreateEventModal(false);
                setIsEditMode(false);
                setSelectedEvent(null);
                resetEventForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              className="text-white font-medium transition-all duration-300
                      [background:rgba(219,16,87,0.25)]
                      [border:1px_solid_rgba(219,16,87,0.4)]
                      backdrop-blur-md hover:[background:rgba(219,16,87,0.4)]
                      hover:[border:1px_solid_rgba(219,16,87,0.6)]
                      active:[background:rgba(219,16,87,0.5)]
                      rounded-xl"
              isLoading={createEventLoading}
              startContent={
                !createEventLoading ? (
                  isEditMode ? (
                    <HiOutlinePencil className="w-4 h-4" />
                  ) : (
                    <HiOutlinePlus className="w-4 h-4" />
                  )
                ) : null
              }
              onClick={isEditMode ? handleUpdateEvent : handleCreateEvent}
            >
              {createEventLoading
                ? isEditMode
                  ? "Atualizando..."
                  : "Criando..."
                : isEditMode
                  ? "Atualizar Evento"
                  : "Criar Evento"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default EventsManagement;
