"use client";

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Avatar } from '@heroui/avatar';
import { Button } from '@heroui/button';
import { Badge } from '@heroui/badge';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { Checkbox } from '@heroui/checkbox';
import { 
  HiOutlineCalendar, 
  HiOutlineStar,
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineX
} from 'react-icons/hi';
import { Event, EventRegistration, Organization, Membership, User, OrganizationRole } from '../types';
import { useRoleManagement } from '../hooks/useRoleManagement';

interface EventsManagementProps {
  organization: Organization;
  currentUserRole: OrganizationRole;
  members: (Membership & { userData: User })[];
}

const EventsManagement: React.FC<EventsManagementProps> = ({
  organization,
  currentUserRole,
  members
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState<string[]>([]);
  const { getRolePermissions } = useRoleManagement();

  const permissions = getRolePermissions(currentUserRole);

  // Mock data para demonstração
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
      status: 'open',
      createdBy: organization.ownerId,
      createdAt: new Date(),
      region: 'BR'
    },
    {
      id: '2',
      type: 'tournament',
      hostOrgId: 'other-org',
      name: 'Copa Nacional CODM',
      description: 'Torneio nacional com premiação em dinheiro',
      gameMode: 'MP',
      teamSize: 5,
      rosterMin: 5,
      rosterMax: 7,
      startsAt: new Date(Date.now() + 604800000), // Próxima semana
      status: 'open',
      createdBy: 'other-user',
      createdAt: new Date(),
      maxTeams: 32,
      prizePool: 'R$ 5.000',
      region: 'BR'
    }
  ];

  const handleRegisterForEvent = (event: Event) => {
    setSelectedEvent(event);
    setSelectedRoster([]);
    setShowRosterModal(true);
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
      return;
    }

    // TODO: Implementar lógica de inscrição no evento
    console.log('Registrando para evento:', {
      eventId: selectedEvent.id,
      roster: selectedRoster
    });

    setShowRosterModal(false);
    setSelectedEvent(null);
    setSelectedRoster([]);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Eventos Disponíveis</h3>
        {permissions.canCreateEvents && (
          <Button color="primary" startContent={<HiOutlineCalendar className="w-4 h-4" />}>
            Criar Evento
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {mockEvents.map((event) => {
          const EventIcon = getEventTypeIcon(event.type);
          const canRegister = permissions.canRegisterForEvents && event.status === 'open';
          
          return (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-3">
                    {React.createElement(EventIcon, { className: "w-6 h-6 text-primary" })}
                    <div>
                      <h4 className="font-semibold">{event.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
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
                      </div>
                    </div>
                  </div>
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
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-gray-600 mb-3">{event.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <HiOutlineUsers className="w-4 h-4 text-gray-500" />
                    <span>Time: {event.teamSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiOutlineUsers className="w-4 h-4 text-gray-500" />
                    <span>Roster: {event.rosterMin}-{event.rosterMax}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiOutlineClock className="w-4 h-4 text-gray-500" />
                    <span>{new Date(event.startsAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Região: {event.region}</span>
                  </div>
                </div>

                {event.prizePool && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <HiOutlineStar className="w-4 h-4 text-yellow-600" />
                      <span className="text-yellow-800 font-medium">
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

      {/* Modal de Seleção de Roster */}
      <Modal 
        isOpen={showRosterModal} 
        onClose={() => setShowRosterModal(false)}
        size="2xl"
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">Selecionar Roster</h3>
              <p className="text-sm text-gray-500">
                {selectedEvent?.name} - Selecione {selectedEvent?.rosterMin} a {selectedEvent?.rosterMax} membros
              </p>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Membros Selecionados</span>
                <Badge 
                  content={selectedRoster.length} 
                  color={selectedRoster.length >= (selectedEvent?.rosterMin || 0) ? 'success' : 'danger'}
                  size="lg"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <HiOutlineUsers className="w-4 h-4 text-primary" />
                  </div>
                </Badge>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {members.map((member) => (
                  <div key={member.userId} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      isSelected={selectedRoster.includes(member.userId)}
                      onValueChange={(checked) => handleRosterSelection(member.userId, checked)}
                      isDisabled={
                        !selectedRoster.includes(member.userId) && 
                        selectedRoster.length >= (selectedEvent?.rosterMax || 0)
                      }
                    />
                    <Avatar
                      src={member.userData.photoURL}
                      name={member.userData.displayName}
                      size="sm"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{member.userData.displayName}</div>
                      <div className="text-sm text-gray-500">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="flat" 
              onPress={() => setShowRosterModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              color="primary" 
              onPress={handleConfirmRegistration}
              isDisabled={selectedRoster.length < (selectedEvent?.rosterMin || 0)}
              startContent={<HiOutlineCheck className="w-4 h-4" />}
            >
              Confirmar Inscrição ({selectedRoster.length}/{selectedEvent?.rosterMax || 0})
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default EventsManagement;