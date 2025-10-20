"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";
import { Avatar, AvatarGroup } from "@heroui/avatar";
import { Tooltip } from "@heroui/tooltip";
import { Badge } from "@heroui/badge";
import { 
  HiOutlineStar, 
  HiOutlineCalendar, 
  HiOutlineGlobeAlt, 
  HiOutlineEye, 
  HiOutlineUsers, 
  HiOutlineCheck, 
  HiOutlineExternalLink 
} from "react-icons/hi";
import { FiCalendar, FiUsers, FiMapPin, FiClock } from "react-icons/fi";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";

import { auth, db } from "../firebase";
import { Event, EventRegistration } from "../types";
import { useAuthState } from "react-firebase-hooks/auth";
import { useOrganizations } from "../hooks/useOrganizations";
import { useEventRegistrations } from "../hooks/useEventRegistrations";

interface XTreinosPublicosProps {
  currentUserId?: string;
  currentUserRole?: string;
  members?: any[];
  organization?: any;
}

export default function XTreinosPublicos(props?: XTreinosPublicosProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<string[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [user] = useAuthState(auth);
  const { registerForEvent, loading: registrationLoading } = useEventRegistrations();

  // Usando props ou valores padrão
  const currentUserId = props?.currentUserId || user?.uid;
  const currentUserRole = props?.currentUserRole || "ranked";
  const membersFromProps = props?.members || [];
  const organization = props?.organization;

  // Mock data para permissões
  const permissions = { canRegisterForEvents: true };

  useEffect(() => {
    // Query simples para buscar apenas eventos públicos 
    const eventsQuery = query(
      collection(db, "events"),
      where("visibility", "==", "public")
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
        console.error("Erro ao carregar eventos públicos:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Carregar registrations em tempo real
  useEffect(() => {
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

  // Função para obter o status da inscrição da organização
  const getRegistrationStatus = (eventId: string) => {
    return registrations.find(
      (reg) => reg.eventId === eventId && reg.managerId === user?.uid
    );
  };

  // Função para verificar se o usuário atual está no roster
  const getUserRosterStatus = (eventId: string) => {
    const registration = getRegistrationStatus(eventId);
    if (!registration || !user?.uid) return null;

    if (registration.roster.includes(user.uid)) {
      return "titular";
    }
    if (registration.substitutes?.includes(user.uid)) {
      return "reserva";
    }
    return "não incluído";
  };

  const handleRegisterForEvent = (event: Event) => {
    setSelectedEvent(event);
    onOpen();
  };

  const handleViewEventDetails = (event: Event) => {
    setSelectedEvent(event);
    onOpen();
  };

  // Função para lidar com a seleção de roster
  const handleRosterSelection = (userId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedRoster([...selectedRoster, userId]);
    } else {
      setSelectedRoster(selectedRoster.filter(id => id !== userId));
    }
  };

  const handleConfirmRegistration = async () => {
    if (!selectedEvent || !user) {
      return;
    }

    try {
      const success = await registerForEvent(
        selectedEvent.id,
        user.uid, // usando userId em vez de orgId
        user.uid,
        [], // roster vazio por enquanto
        []  // substitutes vazios por enquanto
      );

      if (success) {
        onClose();
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error("Erro ao inscrever no evento:", error);
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
      const cleanedString = dateString.replace(/\[.*\]$/, "");
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-default-600">Carregando X-Treinos públicos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <HiOutlineGlobeAlt className="w-5 h-5 text-primary" />
            X-Treinos Públicos
          </h3>
          <p className="text-sm text-default-600 mt-1">
            Eventos públicos criados por organizações da comunidade
          </p>
        </div>
      </div>

      {/* Informação sobre permissões para Ranked/Pro */}
      {(currentUserRole === "ranked" || currentUserRole === "pro") && (
        <Card className="bg-gray-900 border-gray-700">
          <CardBody className="py-3">
            <div className="flex items-center gap-2">
              <HiOutlineEye className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-300">
                <strong>Modo Visualização:</strong> Você pode ver informações
                dos eventos, mas não pode inscrever a organização.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <HiOutlineGlobeAlt className="w-12 h-12 text-default-300 mx-auto mb-3" />
            <p className="text-default-500 text-lg font-medium mb-2">
              Nenhum X-Treino público disponível
            </p>
            <p className="text-default-400 text-sm">
              Aguarde novas organizações criarem eventos públicos
            </p>
          </div>
        ) : (
          events.map((event) => {
            const registration = getRegistrationStatus(event.id);
            const userStatus = getUserRosterStatus(event.id);
            const canRegister =
              permissions.canRegisterForEvents &&
              event.status === "open" &&
              !registration;

            const EventIcon = getEventTypeIcon(event.type);

            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <EventIcon className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{event.name}</h4>
                          <Chip
                            color="primary"
                            size="sm"
                            startContent={<HiOutlineGlobeAlt className="w-3 h-3" />}
                            variant="flat"
                          >
                            Público
                          </Chip>
                        </div>
                        <p className="text-default-600 text-sm mb-2">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-default-500">
                          <span className="flex items-center gap-1">
                            <HiOutlineCalendar className="w-4 h-4" />
                            {formatEventDate(event.startsAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <HiOutlineUsers className="w-4 h-4" />
                            {event.teamSize} jogadores ({event.gameMode})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Chip
                        color={getEventStatusColor(event.status)}
                        size="sm"
                        variant="flat"
                      >
                        {event.status === "open"
                          ? "Aberto"
                          : event.status === "closed"
                          ? "Fechado"
                          : "Finalizado"}
                      </Chip>
                      {event.prizePool && (
                        <Chip color="warning" size="sm" variant="flat">
                          {event.prizePool}
                        </Chip>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {registration && (
                        <Badge
                          color={getRegistrationStatusColor(registration.state)}
                          content={getRegistrationStatusText(registration.state)}
                          size="sm"
                        >
                          <Chip
                            color={getRegistrationStatusColor(registration.state)}
                            size="sm"
                            startContent={<HiOutlineCheck className="w-3 h-3" />}
                            variant="flat"
                          >
                            Inscrito
                          </Chip>
                        </Badge>
                      )}
                      {userStatus && (
                        <Chip
                          color={userStatus === "titular" ? "success" : "warning"}
                          size="sm"
                          variant="flat"
                        >
                          {userStatus === "titular"
                            ? "Titular"
                            : userStatus === "reserva"
                            ? "Reserva"
                            : "Não incluído"}
                        </Chip>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        color="default"
                        size="sm"
                        startContent={<HiOutlineEye className="w-4 h-4" />}
                        variant="flat"
                        onClick={() => handleViewEventDetails(event)}
                      >
                        Detalhes
                      </Button>

                      {canRegister && (
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
                </CardBody>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal de Detalhes do Evento */}
      <Modal
        isOpen={showEventDetailsModal}
        scrollBehavior="inside"
        size="2xl"
        onClose={() => setShowEventDetailsModal(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{selectedEvent?.name}</h2>
              <Chip
                color="primary"
                size="sm"
                startContent={<HiOutlineGlobeAlt className="w-3 h-3" />}
                variant="flat"
              >
                Público
              </Chip>
            </div>
            <p className="text-sm text-default-600">
              {selectedEvent?.description}
            </p>
          </ModalHeader>
          <ModalBody className="gap-4">
            {selectedEvent && (
              <div className="space-y-4">
                {/* Informações básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Tipo de Evento</h4>
                    <p className="text-default-600">
                      {selectedEvent.type === "tournament"
                        ? "Torneio/Campeonato"
                        : "Scrim/Treino"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Modo de Jogo</h4>
                    <p className="text-default-600">
                      {selectedEvent.gameMode === "BR"
                        ? "Battle Royale"
                        : "Multiplayer"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Data e Horário</h4>
                    <p className="text-default-600">
                      {formatEventDate(selectedEvent.startsAt)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Tamanho da Equipe</h4>
                    <p className="text-default-600">
                      {selectedEvent.teamSize} jogadores
                    </p>
                  </div>
                </div>

                <Divider />

                {/* Configurações do Roster */}
                <div>
                  <h4 className="font-semibold mb-2">Configurações do Roster</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p className="text-default-600">
                      <strong>Mínimo:</strong> {selectedEvent.rosterMin} jogadores
                    </p>
                    <p className="text-default-600">
                      <strong>Máximo:</strong> {selectedEvent.rosterMax} jogadores
                    </p>
                  </div>
                </div>

                {/* Premiação (se houver) */}
                {selectedEvent.prizePool && (
                  <div>
                    <h4 className="font-semibold mb-2">Premiação</h4>
                    <Chip color="warning" variant="flat">
                      {selectedEvent.prizePool}
                    </Chip>
                  </div>
                )}

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
                      startContent={<HiOutlineExternalLink className="w-4 h-4" />}
                      target="_blank"
                      variant="bordered"
                    >
                      Ver Regras Completas
                    </Button>
                  </div>
                )}

                {/* Informação sobre limitações para Ranked/Pro */}
                {(currentUserRole === "ranked" || currentUserRole === "pro") && (
                  <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                    <div className="flex items-start gap-2">
                      <HiOutlineEye className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="text-sm text-gray-300">
                        <p className="font-medium mb-1">Modo Visualização</p>
                        <p>
                          Como{" "}
                          <strong>
                            {currentUserRole === "ranked" ? "Ranked" : "Pro"}
                          </strong>
                          , você pode visualizar as informações do evento, mas não
                          pode inscrever a organização ou gerenciar rosters.
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

      {/* Modal de Seleção de Roster */}
      <Modal
        isOpen={isOpen}
        scrollBehavior="inside"
        size="lg"
        onClose={onClose}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Selecionar Roster</h2>
            <p className="text-sm text-default-600">
              Selecione os jogadores para o evento: {selectedEvent?.name}
            </p>
          </ModalHeader>
          <ModalBody>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="p-4 bg-default-50 rounded-lg">
                  <h4 className="font-medium mb-2">Requisitos do Roster</h4>
                  <div className="text-sm text-default-600 space-y-1">
                    <p>
                      • Mínimo: {selectedEvent.rosterMin} jogadores
                    </p>
                    <p>
                      • Máximo: {selectedEvent.rosterMax} jogadores
                    </p>
                    <p>
                      • Selecionados: {selectedRoster.length} jogadores
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Membros Disponíveis</h4>
                  {membersFromProps.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 border border-default-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          size="sm"
                          src={member.userData.avatar}
                          name={member.userData.name}
                        />
                        <div>
                          <p className="font-medium">{member.userData.name}</p>
                          <p className="text-sm text-default-500">
                            {member.role}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedRoster.includes(member.userId)}
                        onChange={(e) =>
                          handleRosterSelection(member.userId, e.target.checked)
                        }
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              isLoading={registrationLoading}
              onClick={handleConfirmRegistration}
            >
              Confirmar Inscrição
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}