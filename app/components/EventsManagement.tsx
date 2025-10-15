"use client";

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Avatar } from '@heroui/avatar';
import { Button } from '@heroui/button';
import { Badge } from '@heroui/badge';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { Checkbox } from '@heroui/checkbox';
import { Divider } from '@heroui/divider';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { addToast } from '@heroui/toast';
import { 
  HiOutlineCalendar, 
  HiOutlineStar,
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineExternalLink,
  HiOutlinePlus
} from 'react-icons/hi';
import { Event, EventRegistration, Organization, Membership, User, OrganizationRole, EventType, GameMode, EventStatus } from '../types';
import { useRoleManagement } from '../hooks/useRoleManagement';
import { useEventRegistrations } from '../hooks/useEventRegistrations';
import { formatDate, formatDateTime, isValidDate, parseDateTime } from '../utils/dateUtils';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {DatePicker} from "@heroui/date-picker";
import { parseZonedDateTime, ZonedDateTime } from "@internationalized/date";
import { I18nProvider } from "@react-aria/i18n";




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
  currentUserId
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<string[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createEventLoading, setCreateEventLoading] = useState(false);
  const { getRolePermissions } = useRoleManagement();
  const { registerForEvent, loading: registrationLoading } = useEventRegistrations();

  // Estado do formulário de criação de evento
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    type: 'scrim' as EventType,
    gameMode: 'BR' as GameMode,
    teamSize: 4,
    rosterMin: 4,
    rosterMax: 6,
    startsAt: '',
    checkinWindow: 30,
    maxTeams: undefined as number | undefined,
    prizePool: '',
    rulesURL: ''
  });

  const permissions = getRolePermissions(currentUserRole);

  // Carregar eventos do Firebase
  React.useEffect(() => {
    const eventsQuery = query(
      collection(db, 'events'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar eventos:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Resetar formulário
  const resetEventForm = () => {
    setEventForm({
      name: '',
      description: '',
      type: 'scrim' as EventType,
      gameMode: 'BR' as GameMode,
      teamSize: 4,
      rosterMin: 4,
      rosterMax: 6,
      startsAt: '',
      checkinWindow: 30,
      maxTeams: undefined,
      prizePool: '',
      rulesURL: ''
    });
  };

  // Criar evento
  const handleCreateEvent = async () => {
    if (!eventForm.name.trim() || !eventForm.description.trim() || !eventForm.startsAt) {
      addToast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        color: 'danger'
      });
      return;
    }



    
let eventDate: ZonedDateTime | null = null;

try {
  if (!eventForm.startsAt) throw new Error("empty");

  eventDate = parseZonedDateTime(eventForm.startsAt);

  if (!(eventDate instanceof ZonedDateTime)) {
    throw new Error("invalid");
  }

  // ✅ Data válida
  console.log("Data válida:", eventDate.toString());

} catch (error) {
  addToast({
    title: "Data inválida",
    description: "Por favor, selecione uma data e hora válidas",
    color: "danger",
  });
  return;
}


    try {
  const eventDate = eventForm.startsAt
    ? parseZonedDateTime(eventForm.startsAt)
    : null;

  if (!eventDate || !(eventDate instanceof ZonedDateTime)) {
    addToast({
      title: "Data inválida",
      description: "Por favor, selecione uma data e hora válidas",
      color: "danger",
    });
    return;
  }

  // ✅ Se passou, a data é válida — pode continuar daqui
} catch (error) {
  addToast({
    title: "Data inválida",
    description: "Por favor, selecione uma data e hora válidas",
    color: "danger",
  });
  return;
}

    

  
// Converte para Date padrão do JS
const jsDate = new Date(eventDate.toString());

// Agora podemos comparar
if (jsDate <= new Date()) {
  addToast({
    title: "Data inválida",
    description: "A data do evento deve ser no futuro",
    color: "danger",
  });
  return;
}
    if (eventForm.rosterMin > eventForm.rosterMax) {
      addToast({
        title: 'Erro de validação',
        description: 'O roster mínimo não pode ser maior que o máximo',
        color: 'danger'
      });
      return;
    }

    // Validação adicional para campos obrigatórios
    if (!eventForm.type || !eventForm.gameMode) {
      addToast({
        title: 'Campos obrigatórios',
        description: 'Selecione o tipo de evento e modo de jogo',
        color: 'danger'
      });
      return;
    }

    setCreateEventLoading(true);

    try {
     const eventData: Omit<Event, 'id'> = {
  type: eventForm.type,
  hostOrgId: organization.id,
  name: eventForm.name.trim(),
  description: eventForm.description.trim(),
  gameMode: eventForm.gameMode,
  teamSize: eventForm.teamSize,
  rosterMin: eventForm.rosterMin,
  rosterMax: eventForm.rosterMax,
  startsAt: eventDate.toString(), // ✅ converte para string ISO
  checkinWindow: eventForm.checkinWindow,
  status: 'open' as EventStatus,
  createdBy: currentUserId || '',
  createdAt: serverTimestamp(),
  region: organization.region,
  ...(eventForm.maxTeams && { maxTeams: eventForm.maxTeams }),
  ...(eventForm.prizePool.trim() && { prizePool: eventForm.prizePool.trim() }),
  ...(eventForm.rulesURL.trim() && { rulesURL: eventForm.rulesURL.trim() })
};

      console.log('Dados do evento antes de enviar:', eventData);

      await addDoc(collection(db, 'events'), eventData);

      addToast({
        title: 'Evento criado',
        description: 'O evento foi criado com sucesso!',
        color: 'success'
      });

      setShowCreateEventModal(false);
      resetEventForm();
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      addToast({
        title: 'Erro',
        description: 'Erro ao criar evento. Tente novamente.',
        color: 'danger'
      });
    } finally {
      setCreateEventLoading(false);
    }
  };

  // Mock data para demonstração / Remover em produção
  const mockEvents: Event[] = [
    {
      id: '1',
      type: 'scrim',
      hostOrgId: organization.id,
      name: 'Scrim Semanal - BR',
      description: 'Treino competitivo semanal para melhorar coordenação da equipe',
      gameMode: 'BR',
      teamSize: 4,
      rosterMin: 4,
      rosterMax: 6,
      startsAt: new Date(Date.now() + 86400000), // Amanhã
      checkinWindow: 30,
      status: 'open',
      createdBy: organization.ownerId,
      createdAt: new Date(),
      region: 'BR',
      rulesURL: 'https://example.com/rules'
    },
    {
      id: '2',
      type: 'tournament',
      hostOrgId: 'other-org',
      name: 'Copa Nacional CODM',
      description: 'Torneio nacional com premiação em dinheiro. Evento aberto para todas as organizações qualificadas.',
      gameMode: 'MP',
      teamSize: 5,
      rosterMin: 5,
      rosterMax: 7,
      startsAt: new Date(Date.now() + 604800000), // Próxima semana
      checkinWindow: 60,
      status: 'open',
      createdBy: 'other-user',
      createdAt: new Date(),
      maxTeams: 32,
      prizePool: 'R$ 5.000',
      region: 'BR',
      rulesURL: 'https://example.com/tournament-rules'
    },
    {
      id: '3',
      type: 'scrim',
      hostOrgId: 'private-org',
      name: 'Scrim Privado - Elite',
      description: 'Treino exclusivo para organizações convidadas',
      gameMode: 'BR',
      teamSize: 4,
      rosterMin: 4,
      rosterMax: 6,
      startsAt: new Date(Date.now() + 172800000), 
      status: 'closed',
      createdBy: 'private-user',
      createdAt: new Date(),
      region: 'BR'
    }
  ];

  // Mock data para registrations
  const mockRegistrations: EventRegistration[] = [
    {
      eventId: '2',
      orgId: organization.id,
      managerId: organization.ownerId,
      roster: [currentUserId || '', 'user2', 'user3', 'user4', 'user5'],
      substitutes: ['user6'],
      createdAt: new Date(),
      updatedAt: new Date(),
      state: 'approved'
    }
  ];

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

    // Para eventos de outras organizações, verificar se é público ou se a org está inscrita
    const isRegistered = mockRegistrations.some(reg => reg.eventId === event.id && reg.orgId === organization.id);
    
    return event.status === 'open' || isRegistered;
  };

  // Função para obter o status da inscrição da organização
  const getRegistrationStatus = (eventId: string) => {
    return mockRegistrations.find(reg => reg.eventId === eventId && reg.orgId === organization.id);
  };

  // Função para verificar se o usuário atual está no roster
  const getUserRosterStatus = (eventId: string) => {
    const registration = getRegistrationStatus(eventId);
    if (!registration || !currentUserId) return null;

    if (registration.roster.includes(currentUserId)) {
      return 'titular';
    }
    if (registration.substitutes?.includes(currentUserId)) {
      return 'reserva';
    }
    return 'não incluído';
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
      setSelectedRoster(selectedRoster.filter(id => id !== userId));
    }
  };

  const handleConfirmRegistration = async () => {
    if (!selectedEvent || selectedRoster.length < (selectedEvent.rosterMin || 0)) {
      addToast({
        title: 'Roster Insuficiente',
        description: `Selecione pelo menos ${selectedEvent?.rosterMin} jogadores`,
        color: 'danger'
      });
      return;
    }

    if (selectedRoster.length > (selectedEvent.rosterMax || 0)) {
      addToast({
        title: 'Roster Excedido',
        description: `Máximo de ${selectedEvent?.rosterMax} jogadores permitido`,
        color: 'danger'
      });
      return;
    }

    try {
      // Usar o hook para registrar no evento via Firestore
      const success = await registerForEvent(
        selectedEvent.id,
        organization.id,
        currentUserId || '',
        selectedRoster,
        [] // 
      );

      if (success) {
        setShowRosterModal(false);
        setSelectedEvent(null);
        setSelectedRoster([]);
      }
    } catch (error) {
      console.error('Erro ao inscrever no evento:', error);
      addToast({
        title: 'Erro na Inscrição',
        description: 'Erro ao inscrever no evento. Tente novamente.',
        color: 'danger'
      });
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'success';
      case 'closed': return 'warning';
      case 'finished': return 'default';
      default: return 'primary';
    }
  };

  const getEventTypeIcon = (type: string) => {
    return type === 'tournament' ? HiOutlineStar : HiOutlineCalendar;
  };

  const getRegistrationStatusColor = (state: string) => {
    switch (state) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      case 'withdrawn': return 'default';
      default: return 'primary';
    }
  };

  const getRegistrationStatusText = (state: string) => {
    switch (state) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitado';
      case 'withdrawn': return 'Retirado';
      default: return state;
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
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
            color="primary" 
            startContent={<HiOutlinePlus className="w-4 h-4" />}
            onClick={() => setShowCreateEventModal(true)}
          >
            Criar Evento
          </Button>
        )}
      </div>

      {/* Informação sobre permissões para Ranked/Pro */}
      {(currentUserRole === 'ranked' || currentUserRole === 'pro') && (
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="py-3">
            <div className="flex items-center gap-2">
              <HiOutlineEye className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                <strong>Modo Visualização:</strong> Você pode ver informações dos eventos, mas não pode inscrever a organização ou editar rosters.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4">
        {visibleEvents.map((event) => {
          const EventIcon = getEventTypeIcon(event.type);
          const canRegister = permissions.canRegisterForEvents && event.status === 'open';
          const registration = getRegistrationStatus(event.id);
          const userRosterStatus = getUserRosterStatus(event.id);
          
          return (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-3">
                    {React.createElement(EventIcon, { className: "w-6 h-6 text-primary" })}
                    <div>
                      <h4 className="font-semibold">{event.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Chip size="sm" variant="flat" color={getEventStatusColor(event.status)}>
                          {event.status === 'open' ? 'Aberto' : 
                           event.status === 'closed' ? 'Fechado' : 
                           event.status === 'finished' ? 'Finalizado' : 'Rascunho'}
                        </Chip>
                        <Chip size="sm" variant="dot" color="primary">
                          {event.type === 'tournament' ? 'Torneio' : 'Scrim'}
                        </Chip>
                        <Chip size="sm" variant="bordered">
                          {event.gameMode}
                        </Chip>
                        {event.hostOrgId === organization.id && (
                          <Chip size="sm" variant="flat" color="secondary">
                            Própria Org
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      color="default" 
                      variant="flat"
                      size="sm"
                      startContent={<HiOutlineEye className="w-4 h-4" />}
                      onClick={() => handleViewEventDetails(event)}
                    >
                      Detalhes
                    </Button>
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
                        <span className="text-sm font-medium text-default-700">Status da Organização:</span>
                        <Chip size="sm" color={getRegistrationStatusColor(registration.state)}>
                          {getRegistrationStatusText(registration.state)}
                        </Chip>
                      </div>
                      {permissions.canViewOwnRosterStatus && userRosterStatus && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-default-600">Seu status:</span>
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
                    <span className="text-default-700">Time: {event.teamSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiOutlineUsers className="w-4 h-4 text-default-500" />
                    <span className="text-default-700">Roster: {event.rosterMin}-{event.rosterMax}</span>
                  </div>
<div className="flex items-center gap-2">
  <HiOutlineClock className="w-4 h-4 text-default-500" />
  <span className="text-default-700">
    {formatEventDate(event.startsAt)}
  </span>
</div>
                  <div className="flex items-center gap-2">
                    <span className="text-default-700">Região: {event.region}</span>
                  </div>
                </div>

                {event.checkinWindow && (
                  <div className="mt-2 text-sm text-default-600">
                    <span>Check-in: {event.checkinWindow} min antes do início</span>
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
        })}
      </div>

      {visibleEvents.length === 0 && (
         <Card>
           <CardBody className="text-center py-8">
             <HiOutlineCalendar className="w-12 h-12 text-default-400 mx-auto mb-4" />
             <p className="text-default-600">Nenhum evento disponível no momento.</p>
           </CardBody>
         </Card>
       )}

      {/* Modal de Seleção de Roster */}
      <Modal 
        isOpen={showRosterModal} 
        onClose={() => setShowRosterModal(false)}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">Seleção de Roster</h3>
              <p className="text-sm text-default-600 font-normal">
                {selectedEvent?.name} - Selecione {selectedEvent?.rosterMin} a {selectedEvent?.rosterMax} jogadores
              </p>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Jogadores Selecionados:</span>
                <Badge content={selectedRoster.length} color="primary">
                  <div className="w-6 h-6" />
                </Badge>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {members
                  .filter(member => member.status === 'accepted')
                  .map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-default-50">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          src={member.userData.avatar} 
                          name={member.userData.displayName}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">{member.userData.displayName}</p>
                          <p className="text-sm text-default-600">@{member.userData.tag}</p>
                        </div>
                      </div>
                      <Checkbox
                        isSelected={selectedRoster.includes(member.userId)}
                        onValueChange={(checked) => handleRosterSelection(member.userId, checked)}
                        isDisabled={
                          !selectedRoster.includes(member.userId) && 
                          selectedRoster.length >= (selectedEvent?.rosterMax || 0)
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
              onClick={handleConfirmRegistration}
              isDisabled={selectedRoster.length < (selectedEvent?.rosterMin || 0)}
              isLoading={registrationLoading}
            >
              Confirmar Inscrição
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Detalhes do Evento */}
      <Modal 
        isOpen={showEventDetailsModal} 
        onClose={() => setShowEventDetailsModal(false)}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              {selectedEvent && React.createElement(getEventTypeIcon(selectedEvent.type), { 
                className: "w-6 h-6 text-primary" 
              })}
              <div>
                <h3 className="text-lg font-semibold">{selectedEvent?.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Chip size="sm" variant="flat" color={getEventStatusColor(selectedEvent?.status || '')}>
                    {selectedEvent?.status === 'open' ? 'Aberto' : 
                     selectedEvent?.status === 'closed' ? 'Fechado' : 
                     selectedEvent?.status === 'finished' ? 'Finalizado' : 'Rascunho'}
                  </Chip>
                  <Chip size="sm" variant="dot" color="primary">
                    {selectedEvent?.type === 'tournament' ? 'Torneio' : 'Scrim'}
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
                  <p className="text-default-600">{selectedEvent.description}</p>
                </div>

                {/* Informações do Evento */}
                <div>
                  <h4 className="font-semibold mb-3">Informações do Evento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <HiOutlineUsers className="w-4 h-4 text-default-500" />
                        <span className="text-sm text-default-700">
                          <strong>Tamanho do Time:</strong> {selectedEvent.teamSize} jogadores
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiOutlineUsers className="w-4 h-4 text-default-500" />
                        <span className="text-sm text-default-700">
                          <strong>Roster:</strong> {selectedEvent.rosterMin} - {selectedEvent.rosterMax} jogadores
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
                          <strong>Check-in:</strong> {selectedEvent.checkinWindow} min antes
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
                  const userRosterStatus = getUserRosterStatus(selectedEvent.id);
                  
                  if (registration) {
                    return (
                      <div>
                        <h4 className="font-semibold mb-3">Status da Sua Organização</h4>
                        <div className="p-4 bg-default-100 border border-default-200 rounded-lg space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Status da Inscrição:</span>
                            <Chip size="sm" color={getRegistrationStatusColor(registration.state)}>
                              {getRegistrationStatusText(registration.state)}
                            </Chip>
                          </div>
                          
                          {permissions.canViewOwnRosterStatus && userRosterStatus && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Seu Status no Roster:</span>
                              <Chip size="sm" variant="bordered">
                                {userRosterStatus}
                              </Chip>
                            </div>
                          )}
                          
                          {registration.state === 'approved' && (
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
                      href={selectedEvent.rulesURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                      variant="bordered"
                      size="sm"
                      startContent={<HiOutlineExternalLink className="w-4 h-4" />}
                    >
                      Ver Regras Completas
                    </Button>
                  </div>
                )}

                {/* Informação sobre limitações para Ranked/Pro */}
                {(currentUserRole === 'ranked' || currentUserRole === 'pro') && (
                  <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <HiOutlineEye className="w-5 h-5 text-primary-600 mt-0.5" />
                      <div className="text-sm text-primary-800">
                        <p className="font-medium mb-1">Modo Visualização</p>
                        <p>
                          Como {currentUserRole === 'ranked' ? 'Ranked Player' : 'Pro Player'}, você pode visualizar 
                          todas as informações do evento, mas não pode inscrever a organização ou editar rosters. 
                          Entre em contato com um Manager ou Owner para realizar inscrições.
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
            {selectedEvent && permissions.canRegisterForEvents && 
             selectedEvent.status === 'open' && 
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
        onClose={() => {
          setShowCreateEventModal(false);
          resetEventForm();
        }}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Criar Novo Evento</h2>
            <p className="text-sm text-default-600">Preencha as informações do evento</p>
          </ModalHeader>
          <ModalBody className="gap-4">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Básicas</h3>
              
              <Input
                label="Nome do Evento"
                placeholder="Ex: Scrim Semanal - BR"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                isRequired
                variant="bordered"
                classNames={{
                  input: "text-default-900",
                  label: "text-default-700"
                }}
              />

              <Input
                label="Descrição"
                placeholder="Descreva o evento, objetivos e informações importantes..."
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                isRequired
                variant="bordered"
                classNames={{
                  input: "text-default-900",
                  label: "text-default-700"
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Tipo de Evento"
                  selectedKeys={[eventForm.type]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as EventType;
                    if (selected && (selected === 'scrim' || selected === 'tournament')) {
                      setEventForm({ ...eventForm, type: selected });
                    }
                  }}
                  variant="bordered"
                  classNames={{
                    trigger: "bg-default-100",
                    label: "text-default-700"
                  }}
                >
                  <SelectItem key="scrim">Scrim/Treino</SelectItem>
                  <SelectItem key="tournament">Torneio/Campeonato</SelectItem>
                </Select>

                <Select
                  label="Modo de Jogo"
                  selectedKeys={[eventForm.gameMode]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as GameMode;
                    if (selected && (selected === 'BR' || selected === 'MP')) {
                      setEventForm({ ...eventForm, gameMode: selected });
                    }
                  }}
                  variant="bordered"
                  classNames={{
                    trigger: "bg-default-100",
                    label: "text-default-700"
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
                  type="number"
                  label="Tamanho do Time"
                  value={eventForm.teamSize.toString()}
                  onChange={(e) => setEventForm({ ...eventForm, teamSize: parseInt(e.target.value) || 4 })}
                  min={1}
                  max={10}
                  variant="bordered"
                  classNames={{
                    input: "text-default-900",
                    label: "text-default-700"
                  }}
                />

                <Input
                  type="number"
                  label="Roster Mínimo"
                  value={eventForm.rosterMin.toString()}
                  onChange={(e) => setEventForm({ ...eventForm, rosterMin: parseInt(e.target.value) || 4 })}
                  min={1}
                  max={15}
                  variant="bordered"
                  classNames={{
                    input: "text-default-900",
                    label: "text-default-700"
                  }}
                />

                <Input
                  type="number"
                  label="Roster Máximo"
                  value={eventForm.rosterMax.toString()}
                  onChange={(e) => setEventForm({ ...eventForm, rosterMax: parseInt(e.target.value) || 6 })}
                  min={1}
                  max={15}
                  variant="bordered"
                  classNames={{
                    input: "text-default-900",
                    label: "text-default-700"
                  }}
                />
              </div>
            </div>

            <Divider />

            {/* Data e Horário */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Data e Horário</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
  <I18nProvider locale="pt-BR">
      <DatePicker
        className="max-w-xs"
        label="Data e Hora de Início"
        labelPlacement="outside"
        value={
          eventForm.startsAt
            ? parseZonedDateTime(eventForm.startsAt)
            : parseZonedDateTime("2025-10-14T00:00[America/Sao_Paulo]")
        }
        onChange={(date) =>
          setEventForm({ ...eventForm, startsAt: date?.toString() || "" })
        }
        hourCycle={24} // usa formato 24h
      />
    </I18nProvider>
</div>
                <Input
                  type="number"
                  label="Check-in (minutos antes)"
                  value={eventForm.checkinWindow.toString()}
                  onChange={(e) => setEventForm({ ...eventForm, checkinWindow: parseInt(e.target.value) || 30 })}
                  min={0}
                  max={120}
                  variant="bordered"
                  classNames={{
                    input: "text-default-900",
                    label: "text-default-700"
                  }}
                />
              </div>
            </div>

            <Divider />

            {/* Configurações Adicionais */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configurações Adicionais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eventForm.type === 'tournament' && (
                  <Input
                    type="number"
                    label="Máximo de Times"
                    placeholder="Ex: 32"
                    value={eventForm.maxTeams?.toString() || ''}
                    onChange={(e) => setEventForm({ 
                      ...eventForm, 
                      maxTeams: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    min={2}
                    max={128}
                    variant="bordered"
                    classNames={{
                      input: "text-default-900",
                      label: "text-default-700"
                    }}
                  />
                )}

                <Input
                  label="Premiação"
                  placeholder="Ex: R$ 5.000"
                  value={eventForm.prizePool}
                  onChange={(e) => setEventForm({ ...eventForm, prizePool: e.target.value })}
                  variant="bordered"
                  classNames={{
                    input: "text-default-900",
                    label: "text-default-700"
                  }}
                />
              </div>

              <Input
                label="URL das Regras"
                placeholder="https://exemplo.com/regras"
                value={eventForm.rulesURL}
                onChange={(e) => setEventForm({ ...eventForm, rulesURL: e.target.value })}
                variant="bordered"
                classNames={{
                  input: "text-default-900",
                  label: "text-default-700"
                }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button 
              color="default" 
              variant="light" 
              onClick={() => {
                setShowCreateEventModal(false);
                resetEventForm();
              }}
            >
              Cancelar
            </Button>
            <Button 
              color="primary" 
              onClick={handleCreateEvent}
              isLoading={createEventLoading}
              startContent={!createEventLoading ? <HiOutlinePlus className="w-4 h-4" /> : null}
            >
              {createEventLoading ? 'Criando...' : 'Criar Evento'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default EventsManagement;