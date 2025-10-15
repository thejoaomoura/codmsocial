"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Avatar } from '@heroui/avatar';
import { Button } from '@heroui/button';
import { Spinner } from '@heroui/spinner';
import { Tabs, Tab } from '@heroui/tabs';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { 
  HiOutlineUsers, 
  HiOutlineCog, 
  HiOutlineUserAdd,
  HiOutlineChartBar,
  HiOutlineCalendar,
  HiOutlineShieldCheck,
  HiOutlineSave,
  HiOutlineX,
  HiOutlinePhotograph,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineLockClosed
} from 'react-icons/hi';
import { Organization, Membership } from '../types';
import { User } from 'firebase/auth';
import { useRoleManagement } from '../hooks/useRoleManagement';
import { useMembersWithUserData, usePendingMemberships } from '../hooks/useMemberships';
import RoleManagement from './RoleManagement';
import InviteSystem from './InviteSystem';
import EventsManagement from './EventsManagement';
import { 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  serverTimestamp,
  collection
} from 'firebase/firestore';
import { db } from '../firebase';
import { addToast } from '@heroui/toast';
import { validateRoleChange, validateMemberRemoval } from '../utils/validation';

interface PainelOrganizacaoProps {
  user: User | null;
  userOrg: Organization | null;
  userMembership: Membership | null;
  loading: boolean;
  userOrganizations?: Organization[];
  selectedOrgId?: string;
  onSelectOrganization?: (orgId: string) => void;
}

const PainelOrganizacao: React.FC<PainelOrganizacaoProps> = ({
  user,
  userOrg,
  userMembership,
  loading,
  userOrganizations = [],
  selectedOrgId,
  onSelectOrganization
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { getRoleName, getRoleEmoji, getRolePermissions } = useRoleManagement();
  
  // Estados para configurações da organização
  const [orgSettings, setOrgSettings] = useState({
    name: userOrg?.name || '',
    tag: userOrg?.tag || '',
    description: userOrg?.description || '',
    logoURL: userOrg?.logoURL || '',
    visibility: userOrg?.visibility || 'public'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [tagValidation, setTagValidation] = useState({ isValid: true, message: '' });
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Carregar membros da organização
  const { membersWithData: members, loading: membersLoading } = useMembersWithUserData(userOrg?.id || "");
  
  // Carregar memberships pendentes
  const { pendingMemberships, loading: pendingLoading } = usePendingMemberships(userOrg?.id || "");

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Faça login para acessar o painel</p>
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

  // Debug: Verificar valores recebidos
  /* console.log('PainelOrganizacao Debug:', {
    user: user?.uid,
    userOrg: userOrg?.id,
    userMembership: userMembership?.role,
    loading
  }); */

  if (!userOrg || !userMembership) {
    return (
                  <Card className="space-y-6">
      <div className="text-center py-12">
        <div className="mb-6">
          <HiOutlineShieldCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Nenhuma Organização
          </h3>
          <p className="text-gray-500 mb-6">
            Você não faz parte de nenhuma organização ainda. Crie uma nova ou junte-se a uma existente.
          </p>

        </div>
        <div className="flex gap-4 justify-center">
          <Button 
            color="primary" 
            startContent={<HiOutlineUsers className="w-4 h-4" />}
            onClick={() => {
              const event = new CustomEvent('changeTab', { detail: 'Criar Organização' });
              window.dispatchEvent(event);
            }}
          >
            Criar Organização
          </Button>
          <Button 
            variant="bordered" 
            startContent={<HiOutlineUsers className="w-4 h-4" />}
            onClick={() => {
              const event = new CustomEvent('changeTab', { detail: 'Explorar Organizações' });
              window.dispatchEvent(event);
            }}
          >
            Explorar Organizações
          </Button>
        </div>
      </div>
      </Card>
    );
  }

  const permissions = getRolePermissions(userMembership.role);

  // Função para validar se a tag é única
  const validateTag = async (tag: string): Promise<boolean> => {
    if (!tag || tag === userOrg?.tag) return true;
    
    try {
      const q = query(collection(db, 'organizations'), where('tag', '==', tag));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Erro ao validar tag:', error);
      return false;
    }
  };

  // Função para salvar configurações da organização
  const handleSaveSettings = async () => {
    if (!userOrg || !user || userMembership?.role !== 'owner') return;

    // Validações básicas
    if (!orgSettings.name.trim()) {
      addToast({
        title: 'Erro de Validação',
        description: 'Nome da organização é obrigatório',
        color: 'danger'
      });
      return;
    }

    if (!orgSettings.tag.trim()) {
      addToast({
        title: 'Erro de Validação',
        description: 'Tag da organização é obrigatória',
        color: 'danger'
      });
      return;
    }

    // Validar formato da tag (apenas letras, números e underscore)
    const tagRegex = /^[a-zA-Z0-9_]+$/;
    if (!tagRegex.test(orgSettings.tag)) {
      addToast({
        title: 'Erro de Validação',
        description: 'Tag deve conter apenas letras, números e underscore',
        color: 'danger'
      });
      return;
    }

    setSettingsLoading(true);

    try {
      // Validar unicidade da tag
      const isTagUnique = await validateTag(orgSettings.tag);
      if (!isTagUnique) {
        setTagValidation({
          isValid: false,
          message: 'Esta tag já está em uso por outra organização'
        });
        addToast({
          title: 'Tag Indisponível',
          description: 'Esta tag já está em uso por outra organização',
          color: 'danger'
        });
        setSettingsLoading(false);
        return;
      }

      // Atualizar organização no Firestore
      const orgRef = doc(db, 'organizations', userOrg.id);
      await updateDoc(orgRef, {
        name: orgSettings.name.trim(),
        tag: orgSettings.tag.trim(),
        description: orgSettings.description.trim(),
        logoURL: orgSettings.logoURL.trim() || null,
        visibility: orgSettings.visibility,
        updatedAt: serverTimestamp()
      });

      addToast({
        title: 'Configurações Salvas',
        description: 'As configurações da organização foram atualizadas com sucesso',
        color: 'success'
      });

      setTagValidation({ isValid: true, message: '' });

    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      addToast({
        title: 'Erro',
        description: 'Erro ao salvar configurações. Tente novamente.',
        color: 'danger'
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  // Função para fazer upload do logo
  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=b1356253eee00f53fbcbe77dad8acae8`,
        { method: "POST", body: formData }
      );
      const data = await res.json();

      if (data.success) {
        const newLogoURL = data.data.url;
        setOrgSettings(prev => ({ ...prev, logoURL: newLogoURL }));

        addToast({
          title: "Upload Concluído",
          description: "Logo da organização carregado com sucesso!",
          color: "success",
        });
      } else {
        addToast({
          title: "Erro no Upload",
          description: "Erro ao enviar imagem. Tente novamente.",
          color: "danger",
        });
      }
    } catch (error) {
      console.error('Erro no upload do logo:', error);
      addToast({
        title: "Erro no Upload",
        description: "Erro ao enviar imagem. Tente novamente.",
        color: "danger",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  // Função para resetar configurações
  const handleResetSettings = () => {
    setOrgSettings({
      name: userOrg?.name || '',
      tag: userOrg?.tag || '',
      description: userOrg?.description || '',
      logoURL: userOrg?.logoURL || '',
      visibility: userOrg?.visibility || 'public'
    });
    setTagValidation({ isValid: true, message: '' });
  };

  return (
    <div className="space-y-6">
      {/* Seletor de Organização */}
      {userOrganizations.length > 1 && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Selecionar Organização:</h3>
              <div className="flex gap-2 flex-wrap">
                {userOrganizations.map((org) => (
                  <Button
                    key={org.id}
                    size="sm"
                    variant={selectedOrgId === org.id ? "solid" : "bordered"}
                    color={selectedOrgId === org.id ? "primary" : "default"}
                    onClick={() => onSelectOrganization?.(org.id)}
                    startContent={
                      <Avatar
                        src={org.logoURL}
                        name={org.name}
                        size="sm"
                        className="w-5 h-5"
                      />
                    }
                  >
                    {org.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Header da Organização */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <Avatar
              src={userOrg.logoURL}
              name={userOrg.name}
              size="lg"
              className="flex-shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{userOrg.name}</h1>
                <Chip size="sm" variant="flat" color="primary">
                  {userOrg.tag}
                </Chip>
                <Chip 
                  size="sm" 
                  variant="flat" 
                  color="warning"
                  startContent={<span className="text-xs">{getRoleEmoji(userMembership.role)}</span>}
                >
                  {getRoleName(userMembership.role)}
                </Chip>
              </div>
              <p className="text-gray-600 mb-3">
                {userOrg.description || "Sem descrição"}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <HiOutlineUsers className="w-4 h-4" />
                  <span>{userOrg.memberCount || 1} membros</span>
                </div>
                <div className="flex items-center gap-1">
                  <HiOutlineCalendar className="w-4 h-4" />
                  <span>Criada em {new Date(userOrg.createdAt?.toDate?.() || userOrg.createdAt).toLocaleDateString()}</span>
                </div>
                <Chip 
                  size="sm" 
                  variant="dot" 
                  color={userOrg.visibility === 'public' ? 'success' : 'default'}
                >
                  {userOrg.visibility === 'public' ? 'Pública' : 'Privada'}
                </Chip>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs de Navegação */}
      <Tabs 
        selectedKey={activeTab} 
        onSelectionChange={(key) => setActiveTab(key as string)}
        className="w-full"
      >
        <Tab key="overview" title={
          <div className="flex items-center gap-2">
            <HiOutlineChartBar className="w-4 h-4" />
            Visão Geral
          </div>
        }>
          <div className="space-y-6">
            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardBody className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{userOrg.memberCount || 1}</div>
                  <div className="text-sm text-gray-600">Membros Ativos</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">Eventos Ativos</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {pendingLoading ? '...' : pendingMemberships.length}
                  </div>
                  <div className="text-sm text-gray-600">Solicitações Pendentes</div>
                </CardBody>
              </Card>
            </div>

            {/* Lista Resumida de Membros */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Membros Recentes</h3>
              </CardHeader>
              <CardBody>
                {membersLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : members && members.length > 0 ? (
                  <div className="space-y-3">
                    {members.slice(0, 5).map((member) => (
                      <div key={member.userId} className="flex items-center gap-3">
                        <Avatar
                          src={member.userData.photoURL}
                          name={member.userData.displayName}
                          size="sm"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{member.userData.displayName}</div>
                          <div className="text-sm text-gray-500">
                            {getRoleName(member.role)}
                          </div>
                        </div>
                        <Chip size="sm" variant="flat">
                          {getRoleEmoji(member.role)}
                        </Chip>
                      </div>
                    ))}
                    {members.length > 5 && (
                      <Button 
                        size="sm" 
                        variant="flat" 
                        onClick={() => setActiveTab("members")}
                      >
                        Ver todos os {members.length} membros
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Nenhum membro encontrado
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* Tab de Membros - Apenas para quem tem permissão */}
        {permissions.canInviteMembers && (
          <Tab key="members" title={
            <div className="flex items-center gap-2">
              <HiOutlineUsers className="w-4 h-4" />
              Membros
            </div>
          }>
            <div className="space-y-6">
              {members && members.length > 0 && (
                <RoleManagement
                  currentUserRole={userMembership.role}
                  currentUserId={user.uid}
                  members={members}
                  onRoleChange={async (userId: string, newRole: any, reason?: string) => {
                    if (!user || !userOrg || !userMembership) return;

                    console.log('🔧 Iniciando alteração de cargo:', { userId, newRole, reason });

                    // Encontrar o membro atual para obter seu cargo
                    const targetMember = members?.find(m => m.userId === userId);
                    if (!targetMember) {
                      console.error('❌ Membro não encontrado');
                      addToast({
                        title: "Erro",
                        description: "Membro não encontrado",
                        color: "danger"
                      });
                      return;
                    }

                    // Validar permissões
                    const validation = validateRoleChange(userMembership.role, targetMember.role, newRole);
                    if (!validation.valid) {
                      console.error('❌ Validação falhou:', validation.reason);
                      addToast({
                        title: "Erro de Permissão",
                        description: validation.reason || "Erro de validação",
                        color: "danger"
                      });
                      return;
                    }

                    try {
                      const batch = writeBatch(db);

                      // Atualizar na subcoleção da organização
                      const orgMembershipRef = doc(db, `organizations/${userOrg.id}/memberships`, userId);
                      batch.update(orgMembershipRef, {
                        role: newRole,
                        updatedAt: serverTimestamp(),
                        roleHistory: [{
                          previousRole: userMembership.role,
                          newRole: newRole,
                          changedBy: user.uid,
                          changedAt: serverTimestamp(),
                          reason: reason || 'Alteração de cargo'
                        }]
                      });

                      // Atualizar na coleção global de memberships
                      const globalMembershipsQuery = query(
                        collection(db, 'memberships'),
                        where('userId', '==', userId),
                        where('organizationId', '==', userOrg.id)
                      );
                      
                      const globalMembershipsSnapshot = await getDocs(globalMembershipsQuery);
                      globalMembershipsSnapshot.forEach((doc) => {
                        batch.update(doc.ref, {
                          role: newRole,
                          updatedAt: serverTimestamp()
                        });
                      });

                      await batch.commit();

                      console.log('✅ Cargo alterado com sucesso');
                      addToast({
                        title: "Cargo Alterado",
                        description: `Cargo do membro foi alterado para ${newRole} com sucesso`,
                        color: "success"
                      });

                    } catch (error) {
                      console.error('❌ Erro ao alterar cargo:', error);
                      addToast({
                        title: "Erro",
                        description: "Erro ao alterar cargo do membro. Tente novamente.",
                        color: "danger"
                      });
                    }
                  }}
                  onRemoveMember={async (userId: string, reason?: string) => {
                    if (!user || !userOrg || !userMembership) return;

                    console.log('🔧 Iniciando remoção de membro:', { userId, reason });

                    // Validar permissões
                    const targetMember = members?.find(m => m.userId === userId);
                    if (!targetMember) {
                      console.error('❌ Membro não encontrado');
                      addToast({
                        title: "Erro",
                        description: "Membro não encontrado",
                        color: "danger"
                      });
                      return;
                    }

                    const validation = validateMemberRemoval(userMembership.role, targetMember.role);
                    if (!validation.valid) {
                      console.error('❌ Validação falhou:', validation.reason);
                      addToast({
                        title: "Erro de Permissão",
                        description: validation.reason || "Erro de validação",
                        color: "danger"
                      });
                      return;
                    }

                    try {
                      const batch = writeBatch(db);

                      // Remover da subcoleção da organização
                      const orgMembershipRef = doc(db, `organizations/${userOrg.id}/memberships`, userId);
                      batch.delete(orgMembershipRef);

                      // Remover da coleção global de memberships
                      const globalMembershipsQuery = query(
                        collection(db, 'memberships'),
                        where('userId', '==', userId),
                        where('organizationId', '==', userOrg.id)
                      );
                      
                      const globalMembershipsSnapshot = await getDocs(globalMembershipsQuery);
                      globalMembershipsSnapshot.forEach((doc) => {
                        batch.delete(doc.ref);
                      });

                      // Atualizar contador de membros na organização
                      const orgRef = doc(db, 'organizations', userOrg.id);
                      batch.update(orgRef, {
                        memberCount: (userOrg.memberCount || 0) - 1,
                        updatedAt: serverTimestamp()
                      });

                      await batch.commit();

                      console.log('✅ Membro removido com sucesso');
                      addToast({
                        title: "Membro Removido",
                        description: "Membro foi removido da organização com sucesso",
                        color: "success"
                      });

                    } catch (error) {
                      console.error('❌ Erro ao remover membro:', error);
                      addToast({
                        title: "Erro",
                        description: "Erro ao remover membro da organização. Tente novamente.",
                        color: "danger"
                      });
                    }
                  }}
                />
              )}
            </div>
          </Tab>
        )}

        {/* Tab de Convites - Apenas para quem tem permissão */}
        {permissions.canInviteMembers && (
          <Tab key="invites" title={
            <div className="flex items-center gap-2">
              <HiOutlineUserAdd className="w-4 h-4" />
              Convites
            </div>
          }>
            <InviteSystem
              organizationId={userOrg.id}
              currentUserRole={userMembership.role}
              currentUserId={user.uid}
            />
          </Tab>
        )}

        {/* Tab de Eventos - Para Owner, Moderator e Manager */}
        {(permissions.canCreateEvents || permissions.canRegisterForEvents) && (
          <Tab key="events" title={
            <div className="flex items-center gap-2">
              <HiOutlineCalendar className="w-4 h-4" />
              Eventos
            </div>
          }>
            <EventsManagement
              organization={userOrg}
              currentUserRole={userMembership.role}
              members={members || []}
              currentUserId={user?.uid}
            />
          </Tab>
        )}

        {/* Tab de Configurações - Apenas para Owner */}
        {userMembership.role === 'owner' && (
          <Tab key="settings" title={
            <div className="flex items-center gap-2">
              <HiOutlineCog className="w-4 h-4" />
              Configurações
            </div>
          }>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                 <div className="mt-2">
                  <h3 className="text-lg font-semibold">Configurações da Organização</h3>
                  <p className="text-sm text-gray-500">
                    Edite as informações básicas da sua organização
                  </p>
                </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {/* Nome da Organização */}
                    <Input
                      label="Nome da Organização"
                      placeholder="Digite o nome da organização"
                      value={orgSettings.name}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, name: e.target.value }))}
                      isRequired
                      maxLength={50}
                      description="Nome público da organização (máximo 50 caracteres)"
                    />

                    {/* Tag da Organização */}
                    <Input
                      label="Tag da Organização"
                      placeholder="Digite a tag única"
                      value={orgSettings.tag}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setOrgSettings(prev => ({ ...prev, tag: value }));
                        setTagValidation({ isValid: true, message: '' });
                      }}
                      isRequired
                      maxLength={10}
                      isInvalid={!tagValidation.isValid}
                      errorMessage={tagValidation.message}
                      description="Tag única da organização (apenas letras, números e _)"
                      startContent={<span className="text-gray-500">[</span>}
                      endContent={<span className="text-gray-500">]</span>}
                    />

                    {/* Logo da Organização */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Logo da Organização</label>
                      <div className="flex gap-3 mt-3">
                        <Button
                          variant="bordered"
                          onPress={() => logoInputRef.current?.click()}
                          isLoading={logoUploading}
                          startContent={!logoUploading && <HiOutlinePhotograph className="w-4 h-4" />}
                          isDisabled={settingsLoading}
                        >
                          {logoUploading ? 'Enviando...' : 'Escolher Imagem'}
                        </Button>
                       
                      </div>
                      <p className="text-xs text-gray-500">
                        Faça upload de uma imagem para o logo da organização (PNG, JPG, GIF)
                      </p>
                      
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          if (!e.target.files || e.target.files.length === 0) return;
                          const file = e.target.files[0];
                          await handleLogoUpload(file);
                          // Limpar o input para permitir selecionar o mesmo arquivo novamente
                          e.target.value = '';
                        }}
                      />
                    </div>

                    {/* Descrição */}
                    <Input
                      label="Descrição"
                      placeholder="Descreva sua organização..."
                      value={orgSettings.description}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, description: e.target.value }))}
                      maxLength={500}
                      description="Descrição da organização (máximo 500 caracteres)"
                    />

                    {/* Visibilidade da Organização */}
                    <Select
                      label="Visibilidade da Organização"
                      placeholder="Selecione a visibilidade"
                      selectedKeys={[orgSettings.visibility]}
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0] as string;
                        setOrgSettings(prev => ({ ...prev, visibility: selectedKey as 'public' | 'private' }));
                      }}
                      description="Define se a organização é pública ou privada"
                      startContent={
                        orgSettings.visibility === 'public' ? 
                          <HiOutlineEye className="w-4 h-4 text-green-500" /> : 
                          <HiOutlineLockClosed className="w-4 h-4 text-orange-500" />
                      }
                    >
                      <SelectItem 
                        key="public" 
                        startContent={<HiOutlineEye className="w-4 h-4 text-green-500" />}
                      >
                        Pública - Visível para todos
                      </SelectItem>
                      <SelectItem 
                        key="private" 
                        startContent={<HiOutlineLockClosed className="w-4 h-4 text-orange-500" />}
                      >
                        Privada - Apenas membros podem ver
                      </SelectItem>
                    </Select>

                    {/* Preview do Logo */}
                  {orgSettings.logoURL && (
  <div className="flex items-start gap-3 p-3 rounded-lg">
    {/* Avatar + botão em coluna */}
    <div className="flex flex-col items-center">
      <Avatar
        src={orgSettings.logoURL}
        name={orgSettings.name}
        className="w-16 h-16"
      />
        <Button
  className="mt-3 -mb-8 p-1 w-6 h-8 flex items-center justify-center rounded"
  variant="light"
  color="danger"
  onPress={() => setOrgSettings(prev => ({ ...prev, logoURL: '' }))}
  isDisabled={settingsLoading || logoUploading}
>
Remover
</Button>
    </div>

    {/* Nome e tag ao lado */}
    <div className="flex flex-col justify-center">
      <p className="font-medium">{orgSettings.name}</p>
      <p className="text-sm text-gray-500">[{orgSettings.tag}]</p>
    </div>
  </div>
)}

                    {/* Botões de Ação */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        color="primary"
                        onPress={handleSaveSettings}
                        isLoading={settingsLoading}
                        startContent={!settingsLoading && <HiOutlineSave className="w-4 h-4" />}
                      >
                        Salvar Alterações
                      </Button>
                      <Button
                        variant="bordered"
                        onPress={handleResetSettings}
                        isDisabled={settingsLoading}
                        startContent={<HiOutlineX className="w-4 h-4" />}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Card de Informações Adicionais */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Informações Importantes</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>A tag da organização deve ser única e não pode ser alterada após outros membros se juntarem</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>O logo deve ser uma URL válida de uma imagem (PNG, JPG, GIF)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Organizações públicas são visíveis para todos, enquanto privadas só aparecem para membros</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Apenas o Owner da organização pode editar essas configurações</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </Tab>
        )}
      </Tabs>
    </div>
  );
};

export default PainelOrganizacao;