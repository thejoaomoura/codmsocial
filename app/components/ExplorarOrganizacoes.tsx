"use client";

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Avatar } from '@heroui/avatar';
import { Button } from '@heroui/button';
import { Spinner } from '@heroui/spinner';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { 
  HiOutlineSearch, 
  HiOutlineUsers, 
  HiOutlineGlobe, 
  HiOutlineUserAdd,
  HiOutlineFilter
} from 'react-icons/hi';
import { User } from 'firebase/auth';
import { addToast } from '@heroui/toast';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  arrayUnion,
  setDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Organization, Membership, MembershipStatus } from '../types';

interface ExplorarOrganizacoesProps {
  user: User | null;
  organizations: Organization[];
  loading: boolean;
}

const ExplorarOrganizacoes: React.FC<ExplorarOrganizacoesProps> = ({
  user,
  organizations,
  loading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [requesting, setRequesting] = useState<string | null>(null);
  const [userMemberships, setUserMemberships] = useState<{[orgId: string]: Membership}>({});
  const [pendingRequests, setPendingRequests] = useState<{[orgId: string]: boolean}>({});

  // Verificar memberships do usuário
  const checkUserMemberships = async () => {
    if (!user) return;

    const memberships: {[orgId: string]: Membership} = {};
    const pending: {[orgId: string]: boolean} = {};

    for (const org of organizations) {
      try {
        // Verificar na subcoleção da organização
        const membershipQuery = query(
          collection(db, `organizations/${org.id}/memberships`),
          where('userId', '==', user.uid)
        );
        
        const membershipSnapshot = await getDocs(membershipQuery);
        
        if (!membershipSnapshot.empty) {
          const membershipData = membershipSnapshot.docs[0].data() as Membership;
          memberships[org.id] = membershipData;
          
          if (membershipData.status === 'pending') {
            pending[org.id] = true;
          }
        }
      } catch (error) {
        console.error(`Erro ao verificar membership para organização ${org.id}:`, error);
      }
    }

    setUserMemberships(memberships);
    setPendingRequests(pending);
  };

  // Executar verificação quando organizações ou usuário mudarem
  React.useEffect(() => {
    if (user && organizations.length > 0) {
      checkUserMemberships();
    }
  }, [user, organizations]);

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (org.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVisibility = visibilityFilter === 'all' || org.visibility === visibilityFilter;
    
    return matchesSearch && matchesVisibility;
  });

  const handleRequestToJoin = async (orgId: string) => {
    if (!user) {
      addToast({ title: "Erro", description: "Você precisa estar logado", color: "danger" });
      return;
    }

    // Verificar se já é membro ou tem solicitação pendente
    if (userMemberships[orgId]) {
      if (userMemberships[orgId].status === 'accepted') {
        addToast({ title: "Aviso", description: "Você já é membro desta organização", color: "warning" });
        return;
      }
      if (userMemberships[orgId].status === 'pending') {
        addToast({ title: "Aviso", description: "Você já tem uma solicitação pendente para esta organização", color: "warning" });
        return;
      }
    }

    setRequesting(orgId);
    
    try {
      console.log('🔧 Criando solicitação de entrada para organização:', orgId);

      // Dados da membership pendente
      const membershipData: Omit<Membership, 'id'> = {
        organizationId: orgId,
        userId: user.uid,
        role: 'ranked', // Role padrão para novos membros
        status: 'pending' as MembershipStatus,
        joinedAt: null, // Será preenchido quando aceito
        updatedAt: serverTimestamp() as any,
        invitedBy: user.uid, // O próprio usuário está solicitando
        invitedAt: serverTimestamp() as any,
        roleHistory: []
      };

      // Criar na subcoleção da organização usando setDoc para definir o ID
      //console.log('🔧 Criando membership na subcoleção:', `organizations/${orgId}/memberships/${user.uid}`);
      await setDoc(doc(db, `organizations/${orgId}/memberships`, user.uid), membershipData);
      console.log('✅ Membership criado na subcoleção com sucesso');

      // Também criar na coleção global de memberships para consultas gerais
      console.log('🔧 Criando membership na coleção global...');
      await addDoc(collection(db, "memberships"), membershipData);
      console.log('✅ Membership criado na coleção global com sucesso');

      // Atualizar estado local
      setUserMemberships(prev => ({
        ...prev,
        [orgId]: { ...membershipData, id: user.uid }
      }));
      setPendingRequests(prev => ({
        ...prev,
        [orgId]: true
      }));

      addToast({ 
        title: "Solicitação enviada", 
        description: "Sua solicitação foi enviada para a organização e aguarda aprovação", 
        color: "success" 
      });
    } catch (error) {
      console.error("❌ Erro ao solicitar entrada:", error);
      addToast({ 
        title: "Erro", 
        description: "Falha ao enviar solicitação. Tente novamente.", 
        color: "danger" 
      });
    } finally {
      setRequesting(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Faça login para explorar organizações</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Explorar Organizações</h2>
        <p className="text-gray-600">Descubra e junte-se a organizações da comunidade</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por nome, tag ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          startContent={<HiOutlineSearch className="w-4 h-4 text-gray-400" />}
          className="flex-1"
        />
        <Select
          placeholder="Filtrar por visibilidade"
          selectedKeys={[visibilityFilter]}
          onSelectionChange={(keys) => setVisibilityFilter(Array.from(keys)[0] as string)}
          className="w-full sm:w-48"
          startContent={<HiOutlineFilter className="w-4 h-4" />}
        >
          <SelectItem key="all">Todas</SelectItem>
                <SelectItem key="public">Públicas</SelectItem>
                <SelectItem key="private">Privadas</SelectItem>
        </Select>
      </div>

      {/* Lista de Organizações */}
      {filteredOrganizations.length === 0 ? (
        <div className="text-center py-12">
          <HiOutlineGlobe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {searchTerm ? 'Nenhuma organização encontrada' : 'Nenhuma organização disponível'}
          </h3>
          <p className="text-gray-500">
            {searchTerm 
              ? 'Tente ajustar os filtros de busca' 
              : 'Não há organizações públicas disponíveis no momento'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrganizations.map((org) => {
            const isOwner = org.ownerId === user.uid;
            // Verificar se é membro através dos memberships carregados
            const membership = userMemberships[org.id];
            const isMember = membership && membership.status === 'accepted';
            const hasPendingRequest = membership && membership.status === 'pending';
            
            return (
              <Card key={org.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 w-full">
                    <Avatar
                      src={org.logoURL}
                      name={org.name}
                      size="md"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{org.name}</h3>
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant="flat" color="primary">
                          {org.tag}
                        </Chip>
                        <Chip 
                          size="sm" 
                          variant="dot" 
                          color={org.visibility === 'public' ? 'success' : 'default'}
                        >
                          {org.visibility === 'public' ? 'Pública' : 'Privada'}
                        </Chip>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardBody className="pt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {org.description || "Sem descrição disponível"}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <HiOutlineUsers className="w-4 h-4" />
                        <span>{org.memberCount || 1} membros</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Criada em {new Date(org.createdAt?.toDate?.() || org.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="pt-2">
                      {isOwner ? (
                        <Chip size="sm" color="warning" variant="flat" className="w-full">
                          👑 Sua Organização
                        </Chip>
                      ) : isMember ? (
                        <Chip size="sm" color="success" variant="flat" className="w-full">
                          ✅ Você é membro
                        </Chip>
                      ) : hasPendingRequest ? (
                        <Chip size="sm" color="default" variant="flat" className="w-full">
                          ⏳ Solicitação pendente
                        </Chip>
                      ) : (
                        <Button 
                          size="sm" 
                          color="primary"
                          variant="flat"
                          startContent={<HiOutlineUserAdd className="w-3 h-3" />}
                          onClick={() => handleRequestToJoin(org.id)}
                          isLoading={requesting === org.id}
                          disabled={requesting === org.id}
                          className="w-full"
                        >
                          {requesting === org.id ? 'Enviando...' : 'Solicitar Entrada'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExplorarOrganizacoes;