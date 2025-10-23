"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Tabs, Tab } from "@heroui/tabs";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
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
  HiOutlineEye,
  HiOutlineLockClosed,
  HiOutlineGlobeAlt,
  HiOutlineDesktopComputer,
  HiOutlineUserGroup,
  HiOutlineLink,
  HiOutlineSwitchHorizontal,
} from "react-icons/hi";
import { User } from "firebase/auth";
import {
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  collection,
  deleteField,
  arrayUnion,
  limit,
} from "firebase/firestore";
import { addToast } from "@heroui/toast";

import { Organization, Membership, GameType } from "../types";
import { useRoleManagement } from "../hooks/useRoleManagement";
import {
  useMembersWithUserData,
  usePendingMemberships,
} from "../hooks/useMemberships";
import { db } from "../firebase";
import { validateRoleChange, validateMemberRemoval } from "../utils/validation";

import RoleManagement from "./RoleManagement";
import InviteSystem from "./InviteSystem";
import EventsManagement from "./EventsManagement";
import XTreinosPublicos from "./XTreinosPublicos";
import InfoCardExpandable from "./InfoCardExpandable";

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
  onSelectOrganization,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { getRoleName, getRoleEmoji, getRolePermissions } = useRoleManagement();

  // Listener para mudanças de sub-aba via eventos customizados
  useEffect(() => {
    const handleSubTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail as string);
    };

    window.addEventListener("changeSubTab", handleSubTabChange as EventListener);

    return () =>
      window.removeEventListener("changeSubTab", handleSubTabChange as EventListener);
  }, []);

  // Estados para configurações da organização
  const [orgSettings, setOrgSettings] = useState({
    name: userOrg?.name || "",
    tag: userOrg?.tag || "",
    description: userOrg?.description || "",
    logoURL: userOrg?.logoURL || "",
    visibility: userOrg?.visibility || "public",
    game: userOrg?.game || "CODM",
    maxMembers: userOrg?.maxMembers || 50,
    region: userOrg?.region || "BR",
    slug: userOrg?.slug || "",
    ownerId: userOrg?.ownerId || "",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [tagValidation, setTagValidation] = useState({
    isValid: true,
    message: "",
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Carregar membros da organização
  const { membersWithData: members, loading: membersLoading } =
    useMembersWithUserData(userOrg?.id || "");

  // Carregar memberships pendentes
  const { pendingMemberships, loading: pendingLoading } = usePendingMemberships(
    userOrg?.id || "",
  );

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
            <h3 className="text-xl font-semibold mb-2">Nenhuma Organização</h3>
            <p className="text-gray-500 mb-6 mr-5 ml-5">
              Você não faz parte de nenhuma organização ainda. Crie uma nova ou
              junte-se a uma existente.
            </p>
          </div>
          <div className="flex gap-4 justify-center mr-5 ml-5">
            <Button
              color="primary"
              startContent={<HiOutlineUsers className="w-4 h-4" />}
              onClick={() => {
                const event = new CustomEvent("changeTab", {
                  detail: "Criar Organização",
                });

                window.dispatchEvent(event);
              }}
            >
              Criar Organização
            </Button>
            <Button
              startContent={<HiOutlineUsers className="w-4 h-4 mr-5 ml-5" />}
              variant="bordered"
              onClick={() => {
                const event = new CustomEvent("changeTab", {
                  detail: "Explorar Organizações",
                });

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
      // Adicionar limite para otimizar a consulta
      const q = query(
        collection(db, "organizations"), 
        where("tag", "==", tag),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.empty;
    } catch (error) {
      console.error("Erro ao validar tag:", error);

      return false;
    }
  };

  // Função para salvar configurações da organização
  const handleSaveSettings = async () => {
    if (!userOrg || !user || userMembership?.role !== "owner") return;

    // Validações básicas
    if (!orgSettings.name.trim()) {
      addToast({
        title: "Erro de Validação",
        description: "Nome da organização é obrigatório",
        color: "danger",
      });

      return;
    }

    if (!orgSettings.tag.trim()) {
      addToast({
        title: "Erro de Validação",
        description: "Tag da organização é obrigatória",
        color: "danger",
      });

      return;
    }

    // Validar formato da tag (permite caracteres Unicode, letras, números e underscore)
    const tagRegex = /^[\p{L}\p{N}_]+$/u;

    if (!tagRegex.test(orgSettings.tag)) {
      addToast({
          title: "Erro de Validação",
          description: "Tag deve conter apenas letras, números, underscore e caracteres Unicode",
          color: "danger",
        });

      return;
    }

    setSettingsLoading(true);

    try {
      // Validar unicidade da tag apenas se for diferente da tag atual
      if (orgSettings.tag !== userOrg.tag) {
        const isTagUnique = await validateTag(orgSettings.tag);

        if (!isTagUnique) {
          setTagValidation({
            isValid: false,
            message: "Esta tag já está em uso por outra organização",
          });
          addToast({
            title: "Tag Indisponível",
            description: "Esta tag já está em uso por outra organização",
            color: "danger",
          });
          setSettingsLoading(false);

          return;
        }
      }

      // Atualizar organização no Firestore
       const orgRef = doc(db, "organizations", userOrg.id);

       await updateDoc(orgRef, {
         name: orgSettings.name.trim(),
         tag: orgSettings.tag.trim(),
         description: orgSettings.description.trim(),
         logoURL: orgSettings.logoURL.trim() || null,
         visibility: orgSettings.visibility,
         game: orgSettings.game,
         maxMembers: orgSettings.maxMembers,
         region: orgSettings.region,
         slug: orgSettings.slug.trim(),
         ownerId: orgSettings.ownerId.trim() || userOrg.ownerId,
         updatedAt: serverTimestamp(),
       });

      addToast({
        title: "Configurações Salvas",
        description:
          "As configurações da organização foram atualizadas com sucesso",
        color: "success",
      });

      setTagValidation({ isValid: true, message: "" });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      addToast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        color: "danger",
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
        { method: "POST", body: formData },
      );
      const data = await res.json();

      if (data.success) {
        const newLogoURL = data.data.url;

        setOrgSettings((prev) => ({ ...prev, logoURL: newLogoURL }));

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
      console.error("Erro no upload do logo:", error);
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
       name: userOrg?.name || "",
       tag: userOrg?.tag || "",
       description: userOrg?.description || "",
       logoURL: userOrg?.logoURL || "",
       visibility: userOrg?.visibility || "public",
       game: userOrg?.game || "CODM",
       maxMembers: userOrg?.maxMembers || 50,
       region: userOrg?.region || "BR",
       slug: userOrg?.slug || "",
       ownerId: userOrg?.ownerId || "",
     });
     setTagValidation({ isValid: true, message: "" });
   };

  // Função helper para logs apenas em desenvolvimento
  function devLog(...args: any[]) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      console.log(...args);
    }
  }

  function devError(...args: any[]) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      console.error(...args);
    }
  }

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
                    color={selectedOrgId === org.id ? "primary" : "default"}
                    size="sm"
                    startContent={
                      <Avatar
                        className="w-5 h-5"
                        name={org.name}
                        size="sm"
                        src={org.logoURL}
                      />
                    }
                    variant={selectedOrgId === org.id ? "solid" : "bordered"}
                    onClick={() => onSelectOrganization?.(org.id)}
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
              className="flex-shrink-0"
              name={userOrg.name}
              size="lg"
              src={userOrg.logoURL}
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{userOrg.name}</h1>
                <Chip color="primary" size="sm" variant="flat">
                  {userOrg.tag}
                </Chip>
                <Chip
                  color="warning"
                  size="sm"
                  startContent={
                    <span className="text-xs">
                      {getRoleEmoji(userMembership.role)}
                    </span>
                  }
                  variant="flat"
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
                  <span>
                    {userOrg.memberCount || 1}{" "}
                    {(userOrg.memberCount || 1) === 1 ? "membro" : "membros"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <HiOutlineCalendar className="w-4 h-4" />
                  <span>
                    Criada em{" "}
                    {new Date(
                      userOrg.createdAt?.toDate?.() || userOrg.createdAt,
                    ).toLocaleDateString()}
                  </span>
                </div>
                <Chip
                  color={
                    userOrg.visibility === "public" ? "success" : "default"
                  }
                  size="sm"
                  variant="dot"
                >
                  {userOrg.visibility === "public" ? "Pública" : "Privada"}
                </Chip>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs de Navegação */}
      <Tabs
        className="w-full"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
      >
        <Tab
          key="overview"
          title={
            <div className="flex items-center gap-2">
              <HiOutlineChartBar className="w-4 h-4" />
              Visão Geral
            </div>
          }
        >
          <div className="space-y-6">
            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardBody className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {userOrg.memberCount || 1}
                  </div>
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
                    {pendingLoading ? "..." : pendingMemberships.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Solicitações Pendentes
                  </div>
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
                      <div
                        key={member.userId}
                        className="flex items-center gap-3"
                      >
                        <Avatar
                          name={member.userData.displayName}
                          size="sm"
                          src={member.userData.photoURL}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {member.userData.displayName}
                          </div>
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
                        Ver {members.length === 1 ? "o" : "todos os"}{" "}
                        {members.length}{" "}
                        {members.length === 1 ? "membro" : "membros"}
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
          <Tab
            key="members"
            title={
              <div className="flex items-center gap-2">
                <HiOutlineUsers className="w-4 h-4" />
                Membros
              </div>
            }
          >
            <div className="space-y-6">
              {members && members.length > 0 && (
                <RoleManagement
                  currentUserId={user.uid}
                  currentUserRole={userMembership.role}
                  members={members}
                  onRemoveMember={async (userId: string, reason?: string) => {
                    if (!user || !userOrg || !userMembership) return;

                    devLog("🔧 Iniciando remoção de membro:", {
                      userId,
                      reason,
                    });

                    const targetMember = members?.find(
                      (m) => m.userId === userId,
                    );

                    if (!targetMember) {
                      devError("❌ Membro não encontrado");
                      addToast({
                        title: "Erro",
                        description: "Membro não encontrado",
                        color: "danger",
                      });

                      return;
                    }

                    const validation = validateMemberRemoval(
                      userMembership.role,
                      targetMember.role,
                    );

                    if (!validation.valid) {
                      devError("❌ Validação falhou:", validation.reason);
                      addToast({
                        title: "Erro de Permissão",
                        description: validation.reason || "Erro de validação",
                        color: "danger",
                      });

                      return;
                    }

                    try {
                      const batch = writeBatch(db);

                      // Remove da subcoleção da organização
                      const orgMembershipRef = doc(
                        db,
                        `organizations/${userOrg.id}/memberships`,
                        userId,
                      );

                      batch.delete(orgMembershipRef);

                      // Remove da coleção global "memberships"
                      const globalMembershipsQuery = query(
                        collection(db, "memberships"),
                        where("userId", "==", userId),
                        where("organizationId", "==", userOrg.id),
                      );
                      const globalMembershipsSnapshot = await getDocs(
                        globalMembershipsQuery,
                      );

                      globalMembershipsSnapshot.forEach((docSnap) =>
                        batch.delete(docSnap.ref),
                      );

                      // Atualiza contador da organização
                      const orgRef = doc(db, "organizations", userOrg.id);

                      batch.update(orgRef, {
                        memberCount: (userOrg.memberCount || 0) - 1,
                        updatedAt: serverTimestamp(),
                      });

                      // Remove o campo organizationTag do documento do usuário
                      const userRef = doc(db, "Users", userId);

                      batch.set(
                        userRef,
                        {
                          organizationTag: deleteField(),
                          updatedAt: serverTimestamp(),
                        },
                        { merge: true }, // garante que não apague outros campos
                      );

                      await batch.commit();

                      devLog("✅ Membro removido e organizationTag apagado");

                      addToast({
                        title: "Membro Removido",
                        description:
                          "Membro foi removido da organização com sucesso",
                        color: "success",
                      });
                    } catch (error) {
                      devError("❌ Erro ao remover membro:", error);
                      addToast({
                        title: "Erro",
                        description:
                          "Erro ao remover membro da organização. Tente novamente.",
                        color: "danger",
                      });
                    }
                  }}
                  onRoleChange={async (
                    userId: string,
                    newRole: any,
                    reason?: string,
                  ) => {
                    if (!user || !userOrg || !userMembership) return;

                    devLog("🔧 Iniciando alteração de cargo:", {
                      userId,
                      newRole,
                      reason,
                    });

                    // Encontrar o membro atual para obter seu cargo
                    const targetMember = members?.find(
                      (m) => m.userId === userId,
                    );

                    if (!targetMember) {
                      devError("❌ Membro não encontrado");
                      addToast({
                        title: "Erro",
                        description: "Membro não encontrado",
                        color: "danger",
                      });

                      return;
                    }

                    // Validar permissões
                    const validation = validateRoleChange(
                      userMembership.role,
                      targetMember.role,
                      newRole,
                    );

                    if (!validation.valid) {
                      devError("❌ Validação falhou:", validation.reason);
                      addToast({
                        title: "Erro de Permissão",
                        description: validation.reason || "Erro de validação",
                        color: "danger",
                      });

                      return;
                    }

                    try {
                      const batch = writeBatch(db);

                      // Atualizar na subcoleção da organização
                      const orgMembershipRef = doc(
                        db,
                        `organizations/${userOrg.id}/memberships`,
                        userId,
                      );

                      batch.update(orgMembershipRef, {
                        role: newRole,
                        updatedAt: serverTimestamp(),
                        roleHistory: arrayUnion({
                          previousRole: targetMember.role,
                          newRole: newRole,
                          changedBy: user.uid,
                          changedAt: new Date(),
                          reason: reason || "Alteração de cargo",
                        }),
                      });

                      // Atualizar na coleção global de memberships
                      const globalMembershipsQuery = query(
                        collection(db, "memberships"),
                        where("userId", "==", userId),
                        where("organizationId", "==", userOrg.id),
                      );

                      const globalMembershipsSnapshot = await getDocs(
                        globalMembershipsQuery,
                      );

                      globalMembershipsSnapshot.forEach((doc) => {
                        batch.update(doc.ref, {
                          role: newRole,
                          updatedAt: serverTimestamp(),
                        });
                      });

                      await batch.commit();

                      devLog("✅ Cargo alterado com sucesso");
                      addToast({
                        title: "Cargo Alterado",
                        description: `Cargo do membro foi alterado para ${newRole} com sucesso`,
                        color: "success",
                      });
                    } catch (error) {
                      devError("❌ Erro ao alterar cargo:", error);
                      addToast({
                        title: "Erro",
                        description:
                          "Erro ao alterar cargo do membro. Tente novamente.",
                        color: "danger",
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
          <Tab
            key="invites"
            title={
              <div className="flex items-center gap-2">
                <HiOutlineUserAdd className="w-4 h-4" />
                Convites
              </div>
            }
          >
            <InviteSystem
              currentUserId={user.uid}
              currentUserName={user.displayName || user.email || "Usuário"}
              currentUserRole={userMembership.role}
              organizationId={userOrg.id}
              organizationLogo={userOrg.logoURL}
              organizationName={userOrg.name}
            />
          </Tab>
        )}

        {/* Tab de Eventos - Para Owner, Moderator e Manager */}
        {(permissions.canCreateEvents || permissions.canRegisterForEvents) && (
          <Tab
            key="events"
            title={
              <div className="flex items-center gap-2">
                <HiOutlineCalendar className="w-4 h-4" />
                Eventos
              </div>
            }
          >
            <EventsManagement
              currentUserId={user?.uid}
              currentUserRole={userMembership.role}
              members={members || []}
              organization={userOrg}
            />
          </Tab>
        )}

        {/* Tab de X-Treinos Públicos - Visível para todos os membros */}
        <Tab
          key="x-treinos"
          title={
            <div className="flex items-center gap-2">
              <HiOutlineGlobeAlt className="w-4 h-4" />
              X-Treinos
            </div>
          }
        >
          <XTreinosPublicos
            currentUserId={user?.uid}
            currentUserRole={userMembership.role}
            members={members || []}
            organization={userOrg}
          />
        </Tab>

        {/* Tab de Configurações - Apenas para Owner */}
        {userMembership.role === "owner" && (
          <Tab
            key="settings"
            title={
              <div className="flex items-center gap-2">
                <HiOutlineCog className="w-4 h-4" />
                Configurações
              </div>
            }
          >
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="mt-2">
                    <h3 className="text-lg font-semibold">
                      Configurações da Organização
                    </h3>
                    <p className="text-sm text-gray-500">
                      Edite as informações básicas da sua organização
                    </p>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {/* Nome da Organização */}
                    <Input
                      isRequired
                      description="Nome público da organização (máximo 50 caracteres)"
                      label="Nome da Organização"
                      maxLength={50}
                      placeholder="Digite o nome da organização"
                      value={orgSettings.name}
                      onChange={(e) =>
                        setOrgSettings((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />

                    {/* Tag da Organização */}
                    <Input
                      isRequired
                      description="Tag única da organização (letras, números, underscore e caracteres Unicode). Ex: 123M, AB0, G4L, ҲƲƧ, ƝҲƧ"
                      endContent={<span className="text-gray-500">]</span>}
                      errorMessage={tagValidation.message}
                      isInvalid={!tagValidation.isValid}
                      label="Tag da Organização"
                      maxLength={10}
                      placeholder="Digite a tag única"
                      startContent={<span className="text-gray-500">[</span>}
                      value={orgSettings.tag}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();

                        setOrgSettings((prev) => ({ ...prev, tag: value }));
                        setTagValidation({ isValid: true, message: "" });
                      }}
                    />

                    {/* Logo da Organização */}
                    <div className="space-y-2">
                      <span className="text-sm font-medium">
                        Logo da Organização
                      </span>
                      <div className="flex gap-3 mt-3">
                        <Button
                          isDisabled={settingsLoading}
                          isLoading={logoUploading}
                          startContent={
                            !logoUploading && (
                              <HiOutlinePhotograph className="w-4 h-4" />
                            )
                          }
                          variant="bordered"
                          onPress={() => logoInputRef.current?.click()}
                        >
                          {logoUploading ? "Enviando..." : "Escolher Imagem"}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Faça upload de uma imagem para o logo da organização
                        (PNG, JPG, GIF)
                      </p>

                      <input
                        ref={logoInputRef}
                        accept="image/*"
                        style={{ display: "none" }}
                        type="file"
                        onChange={async (e) => {
                          if (!e.target.files || e.target.files.length === 0)
                            return;
                          const file = e.target.files[0];

                          await handleLogoUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {/* Descrição */}
                    <Textarea
                      description="Descrição da organização (máximo 1000 caracteres)"
                      label="Descrição"
                      maxLength={1000}
                      placeholder="Descreva sua organização..."
                      value={orgSettings.description}
                      minRows={3}
                      maxRows={6}
                      classNames={{
                        input: "resize-none",
                        inputWrapper: "min-h-[80px]"
                      }}
                      onChange={(e) =>
                        setOrgSettings((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />

                    {/* Visibilidade da Organização */}
                    <Select
                      description="Define se a organização é pública ou privada"
                      label="Visibilidade da Organização"
                      placeholder="Selecione a visibilidade"
                      selectedKeys={[orgSettings.visibility]}
                      startContent={
                        orgSettings.visibility === "public" ? (
                          <HiOutlineEye className="w-4 h-4 text-green-500" />
                        ) : (
                          <HiOutlineLockClosed className="w-4 h-4 text-orange-500" />
                        )
                      }
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0] as string;

                        setOrgSettings((prev) => ({
                          ...prev,
                          visibility: selectedKey as "public" | "private",
                        }));
                      }}
                    >
                      <SelectItem
                        key="public"
                        startContent={
                          <HiOutlineEye className="w-4 h-4 text-green-500" />
                        }
                      >
                        Pública - Visível para todos
                      </SelectItem>
                      <SelectItem
                        key="private"
                        startContent={
                          <HiOutlineLockClosed className="w-4 h-4 text-orange-500" />
                        }
                      >
                        Privada - Apenas membros podem ver
                      </SelectItem>
                    </Select>

                    {/* Jogo da Organização */}
                    <Select
                      description="Selecione o jogo principal da organização"
                      label="Jogo Principal"
                      placeholder="Selecione o jogo"
                      selectedKeys={[orgSettings.game]}
                      startContent={
                        <HiOutlineDesktopComputer className="w-4 h-4 text-blue-500" />
                      }
                      onSelectionChange={(keys) => {
                        const gameValue = Array.from(keys)[0] as GameType;
                        setOrgSettings((prev) => ({
                          ...prev,
                          game: gameValue,
                        }));
                      }}
                    >
                      <SelectItem
                        key="CODM"
                        startContent={
                          <HiOutlineDesktopComputer className="w-4 h-4 text-blue-500" />
                        }
                      >
                        Call of Duty Mobile
                      </SelectItem>
                      <SelectItem
                        key="PUBGM"
                        startContent={
                          <HiOutlineDesktopComputer className="w-4 h-4 text-green-500" />
                        }
                      >
                        PUBG Mobile
                      </SelectItem>
                      <SelectItem
                        key="FF"
                        startContent={
                          <HiOutlineDesktopComputer className="w-4 h-4 text-orange-500" />
                        }
                      >
                        Free Fire
                      </SelectItem>
                      <SelectItem
                        key="VALORANT"
                        startContent={
                          <HiOutlineDesktopComputer className="w-4 h-4 text-red-500" />
                        }
                      >
                        Valorant
                      </SelectItem>
                    </Select>

                    {/* Região da Organização */}
                    <Select
                      description="Selecione a região principal da organização"
                      label="Região"
                      placeholder="Selecione a região"
                      selectedKeys={[orgSettings.region]}
                      startContent={
                        <span className="text-lg">🌍</span>
                      }
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0] as string;

                        setOrgSettings((prev) => ({
                          ...prev,
                          region: selectedKey,
                        }));
                      }}
                    >
                      <SelectItem
                        key="BR"
                        startContent={<span className="text-lg">🇧🇷</span>}
                      >
                        Brasil
                      </SelectItem>
                      <SelectItem
                        key="NA"
                        startContent={<span className="text-lg">🇺🇸</span>}
                      >
                        América do Norte
                      </SelectItem>
                      <SelectItem
                        key="EU"
                        startContent={<span className="text-lg">🇪🇺</span>}
                      >
                        Europa
                      </SelectItem>
                      <SelectItem
                        key="AS"
                        startContent={<span className="text-lg">🇯🇵</span>}
                      >
                        Ásia
                      </SelectItem>
                      <SelectItem
                        key="SA"
                        startContent={<span className="text-lg">🇦🇷</span>}
                      >
                        América do Sul
                      </SelectItem>
                    </Select>

                    {/* Máximo de Membros */}
                    <Input
                      description="Número máximo de membros permitidos na organização"
                      label="Máximo de Membros"
                      placeholder="Digite o número máximo de membros"
                      startContent={
                        <HiOutlineUserGroup className="w-4 h-4 text-indigo-500" />
                      }
                      type="number"
                      min="1"
                      max="1000"
                      value={orgSettings.maxMembers.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 50;
                        setOrgSettings((prev) => ({
                          ...prev,
                          maxMembers: Math.max(1, Math.min(1000, value)),
                        }));
                      }}
                    />

                    {/* Proprietário da Organização */}
                    <Select
                      description="Selecione um membro para transferir a liderança da organização"
                      label="Transferir Liderança"
                      placeholder={members && members.length > 1 ? "Selecione um membro" : "Nenhum membro disponível (não é possível transferir)"}
                      selectedKeys={
                        orgSettings.ownerId && 
                        members?.some(member => 
                          member.userId === orgSettings.ownerId && 
                          member.userId !== userOrg?.ownerId && 
                          member.status === 'accepted'
                        ) 
                          ? [orgSettings.ownerId] 
                          : []
                      }
                      startContent={
                        <HiOutlineSwitchHorizontal className="w-4 h-4 text-pink-500" />
                      }
                      isDisabled={!members || members.length <= 1 || settingsLoading}
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0] as string;
                        setOrgSettings((prev) => ({
                          ...prev,
                          ownerId: selectedKey || "",
                        }));
                      }}
                    >
                      {members && members
                         .filter(member => member.userId !== userOrg?.ownerId && member.status === 'accepted')
                         .map((member) => (
                           <SelectItem
                             key={member.userId}
                             textValue={`${member.userData?.displayName || "Usuário"} (${getRoleName(member.role)})`}
                             startContent={
                               <Avatar
                                 className="w-6 h-6"
                                 name={member.userData?.displayName || "Usuário"}
                                 src={member.userData?.photoURL}
                               />
                             }
                           >
                             {member.userData?.displayName || "Usuário"} ({getRoleName(member.role)})
                           </SelectItem>
                         ))}
                    </Select>

                    {/* Preview do Logo */}
                    {orgSettings.logoURL && (
                      <div className="flex items-start gap-3 p-3 rounded-lg">
                        {/* Avatar + botão em coluna */}
                        <div className="flex flex-col items-center">
                          <Avatar
                            className="w-16 h-16"
                            name={orgSettings.name}
                            src={orgSettings.logoURL}
                          />
                          <Button
                            className="mt-3 -mb-8 p-1 w-6 h-8 flex items-center justify-center rounded"
                            color="danger"
                            isDisabled={settingsLoading || logoUploading}
                            variant="light"
                            onPress={() =>
                              setOrgSettings((prev) => ({
                                ...prev,
                                logoURL: "",
                              }))
                            }
                          >
                            Remover
                          </Button>
                        </div>

                        {/* Nome e tag ao lado */}
                        <div className="flex flex-col justify-center">
                          <p className="font-medium">{orgSettings.name}</p>
                          <p className="text-sm text-gray-500">
                            [{orgSettings.tag}]
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        color="success"
                        isLoading={settingsLoading}
                        startContent={
                          !settingsLoading && (
                            <HiOutlineSave className="w-4 h-4" />
                          )
                        }
                        onPress={handleSaveSettings}
                      >
                        Salvar Alterações
                      </Button>
                      <Button
                        isDisabled={settingsLoading}
                        startContent={<HiOutlineX className="w-4 h-4" />}
                        variant="bordered"
                        onPress={handleResetSettings}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
              {/* Card de Informações Adicionais */}
              <InfoCardExpandable />
            </div>
          </Tab>
        )}
      </Tabs>
    </div>
  );
};

export default PainelOrganizacao;
