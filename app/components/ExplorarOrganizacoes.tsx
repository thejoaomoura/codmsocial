"use client";

import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import {
  HiOutlineSearch,
  HiOutlineUsers,
  HiOutlineGlobe,
  HiOutlineUserAdd,
  HiOutlineFilter,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineUser,
} from "react-icons/hi";
import { User } from "firebase/auth";
import { addToast } from "@heroui/toast";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { db } from "../firebase";
import { Organization, Membership } from "../types";

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

interface ExplorarOrganizacoesProps {
  user: User | null;
  organizations: Organization[];
  loading: boolean;
}

const ExplorarOrganizacoes: React.FC<ExplorarOrganizacoesProps> = ({
  user,
  organizations,
  loading,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [requesting, setRequesting] = useState<string | null>(null);
  const [userMemberships, setUserMemberships] = useState<{
    [orgId: string]: Membership;
  }>({});
  const [pendingRequests, setPendingRequests] = useState<{
    [orgId: string]: boolean;
  }>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMembers, setModalMembers] = useState<Membership[]>([]);
  const [modalOrgName, setModalOrgName] = useState("");
  const [modalMemberFilter, setModalMemberFilter] = useState("");
  const [modalMembersWithUserData, setModalMembersWithUserData] = useState<
    (Membership & { displayName?: string; photoURL?: string })[]
  >([]);

  // Verificar memberships do usuário
  const checkUserMemberships = React.useCallback(async () => {
    if (!user) return;

    const memberships: { [orgId: string]: Membership } = {};
    const pending: { [orgId: string]: boolean } = {};

    try {
      // Busca TODAS as memberships do usuário de uma vez só
      const allMembershipsQuery = query(
        collection(db, "memberships"),
        where("userId", "==", user.uid),
      );

      const membershipSnapshot = await getDocs(allMembershipsQuery);

      membershipSnapshot.docs.forEach((doc) => {
        const membershipData = doc.data() as Membership;
        const orgId = membershipData.organizationId;

        memberships[orgId] = membershipData;

        if (membershipData.status === "pending") {
          pending[orgId] = true;
        }
      });
    } catch (error) {
      console.error("Erro ao verificar memberships:", error);
    }

    setUserMemberships(memberships);
    setPendingRequests(pending);
  }, [user]);

  React.useEffect(() => {
    if (user && organizations.length > 0) {
      checkUserMemberships();
    }
  }, [user, organizations.length, checkUserMemberships]);

  // Memoização do cálculo de isMemberOfAnyOrg para evitar recálculo em cada render
  const isMemberOfAnyOrg = React.useMemo(() => {
    return Object.values(userMemberships).some((m) => m.status === "accepted");
  }, [userMemberships]);
  const filteredOrganizations = React.useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.description || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesVisibility =
        visibilityFilter === "all" || org.visibility === visibilityFilter;

      return matchesSearch && matchesVisibility;
    });
  }, [organizations, searchTerm, visibilityFilter]);

  const handleRequestToJoin = async (orgId: string) => {
    if (!user) {
      addToast({
        title: "Erro",
        description: "Você precisa estar logado",
        color: "danger",
      });

      return;
    }

    const isMemberOfAnyOrg = Object.values(userMemberships).some(
      (m) => m.status === "accepted",
    );

    if (isMemberOfAnyOrg) {
      addToast({
        title: "Aviso",
        description:
          "Você já é membro de uma organização e não pode solicitar entrada em outra",
        color: "warning",
      });

      return;
    }

    if (userMemberships[orgId]) {
      if (userMemberships[orgId].status === "accepted") {
        addToast({
          title: "Aviso",
          description: "Você já é membro desta organização",
          color: "warning",
        });

        return;
      }
      if (userMemberships[orgId].status === "pending") {
        addToast({
          title: "Aviso",
          description:
            "Você já tem uma solicitação pendente para esta organização",
          color: "warning",
        });

        return;
      }
    }

    setRequesting(orgId);

    const optimisticMembership: Membership = {
      id: user.uid,
      organizationId: orgId,
      userId: user.uid,
      role: "ranked",
      status: "pending",
      joinedAt: null,
      updatedAt: new Date() as any,
      invitedBy: user.uid,
      invitedAt: new Date() as any,
      roleHistory: [],
      displayName: user.displayName || user.email || "Usuário",
      photoURL: user.photoURL || "",
    };

    setUserMemberships((prev) => ({
      ...prev,
      [orgId]: optimisticMembership,
    }));
    setPendingRequests((prev) => ({
      ...prev,
      [orgId]: true,
    }));

    try {
      const membershipData: Omit<Membership, "id"> = {
        organizationId: orgId,
        userId: user.uid,
        role: "ranked",
        status: "pending",
        joinedAt: null,
        updatedAt: serverTimestamp() as any,
        invitedBy: user.uid,
        invitedAt: serverTimestamp() as any,
        roleHistory: [],
        displayName: user.displayName || user.email || "Usuário",
        photoURL: user.photoURL || "",
      };

      // Salva membership
      await setDoc(
        doc(db, `organizations/${orgId}/memberships`, user.uid),
        membershipData,
      );
      await addDoc(collection(db, "memberships"), membershipData);

      // Buscar dados da organização para log
      const orgRef = doc(db, "organizations", orgId);
      const orgSnap = await getDoc(orgRef);
      const orgData = orgSnap.exists() ? orgSnap.data() : null;

      // Criar log nas Atividades Recentes
      if (orgData) {
        await addDoc(collection(db, "logMercado"), {
          displayName: user.displayName || user.email || "Usuário",
          photoURL: user.photoURL || "",
          status: "Solicitou",
          organizationName: orgData.name || null,
          organizationLogo: orgData.logoURL || null,
          createdAt: serverTimestamp(),
        });
      }

      addToast({
        title: "Solicitação enviada",
        description:
          "Sua solicitação foi enviada para a organização e aguarda aprovação",
        color: "success",
      });
    } catch (error) {
      console.error("❌ Erro ao solicitar entrada:", error);

      setUserMemberships((prev) => {
        const newState = { ...prev };

        delete newState[orgId];

        return newState;
      });
      setPendingRequests((prev) => {
        const newState = { ...prev };

        delete newState[orgId];

        return newState;
      });

      addToast({
        title: "Erro",
        description: "Falha ao enviar solicitação. Tente novamente.",
        color: "danger",
      });
    } finally {
      setRequesting(null);
    }
  };

  const openMembersModal = async (orgId: string, orgName: string) => {
    try {
      const membersSnap = await getDocs(
        collection(db, `organizations/${orgId}/memberships`),
      );
      const membersData: Membership[] = membersSnap.docs.map(
        (doc) => doc.data() as Membership,
      );

      devLog(`📊 Total de documentos em memberships: ${membersData.length}`);
      devLog(`📊 Membros por status:`, membersData.reduce((acc, member) => {
        acc[member.status] = (acc[member.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));

      // Buscar dados dos usuários para cada membro
      const membersWithUserData = await Promise.all(
        membersData.map(async (member) => {
          try {
            // Primeiro tenta buscar no documento do membership
            if (member.displayName && member.photoURL) {
              devLog(`[DEBUG] Usando dados do membership para ${member.userId}:`, {
                displayName: member.displayName,
                photoURL: member.photoURL
              });
              return {
                ...member,
                displayName: member.displayName,
                photoURL: member.photoURL,
              };
            }

            devLog(`[DEBUG] 🔍 Buscando dados do usuário ${member.userId} na coleção Users...`);
            const userDoc = await getDoc(doc(db, "Users", member.userId));

            if (userDoc.exists()) {
              const userData = userDoc.data();
              devLog(`[DEBUG] Dados encontrados para ${member.userId}:`, {
                displayName: userData.displayName,
                name: userData.name,
                email: userData.email,
                photoURL: userData.photoURL,
                avatar: userData.avatar
              });

              return {
                ...member,
                displayName:
                  userData.displayName || userData.name || userData.email || "Usuário",
                photoURL: userData.photoURL || userData.avatar || "",
              };
            } else {
              devError(`❌ Documento do usuário ${member.userId} não encontrado na coleção Users`);
            }

            // Fallback se não encontrar o usuário
            return {
              ...member,
              displayName: "Unknown user",
              photoURL: "",
            };
          } catch (error) {
            devError(
              `[DEBUG] Erro ao buscar dados do usuário ${member.userId}:`,
              error,
            );

            return {
              ...member,
              displayName: "Unknown user",
              photoURL: "",
            };
          }
        }),
      );

      setModalMembers(membersData);
      setModalMembersWithUserData(membersWithUserData);
      setModalOrgName(orgName);
      setModalMemberFilter("");
      setModalOpen(true);
    } catch (error) {
      devError("Erro ao buscar membros da organização:", error);
      addToast({
        title: "Erro",
        description: "Não foi possível carregar membros",
        color: "danger",
      });
    }
  };

  // Verifica se o usuário tem solicitação pendente em QUALQUER organização
  const userHasAnyPendingRequest = Object.values(userMemberships).some(
    (m) => m.status === "pending",
  );

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
    <>
      <Card className="space-y-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold ml-5 mt-3">
              Explorar Organizações
            </h2>
            <p className="text-gray-600 ml-5">
              Descubra e junte-se a organizações da comunidade
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 ml-5 mr-5 -mt-3">
            <Input
              className="flex-1"
              placeholder="Buscar por nome, tag ou descrição..."
              startContent={
                <HiOutlineSearch className="w-4 h-4 text-gray-400" />
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              className="w-full sm:w-48"
              placeholder="Filtrar por visibilidade"
              selectedKeys={[visibilityFilter]}
              startContent={<HiOutlineFilter className="w-4 h-4" />}
              aria-label="Filtrar organizações por visibilidade"
              onSelectionChange={(keys) =>
                setVisibilityFilter(Array.from(keys)[0] as string)
              }
            >
              <SelectItem key="all">Todas</SelectItem>
              <SelectItem key="public">Públicas</SelectItem>
              <SelectItem key="private">Privadas</SelectItem>
            </Select>
          </div>

          {filteredOrganizations.length === 0 ? (
            <div className="text-center py-12">
              <HiOutlineGlobe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchTerm
                  ? "Nenhuma organização encontrada"
                  : "Nenhuma organização disponível"}
              </h3>
              <p className="text-gray-500">
                {searchTerm
                  ? "Tente ajustar os filtros de busca"
                  : "Não há organizações públicas disponíveis no momento"}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOrganizations.map((org) => {
                const isOwner = org.ownerId === user?.uid;
                const membership = userMemberships[org.id];
                const isMember = membership && membership.status === "accepted";
                const hasPendingRequest =
                  membership && membership.status === "pending";

                return (
                  <Card
                    key={org.id}
                    className="hover:shadow-lg transition-shadow ml-5 mb-5 mr-5"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3 w-full">
                        <Avatar
                          className="flex-shrink-0"
                          name={org.name}
                          size="md"
                          src={org.logoURL}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {org.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Chip color="primary" size="sm" variant="flat">
                              {org.tag}
                            </Chip>
                            <Chip
                              color={
                                org.visibility === "public"
                                  ? "success"
                                  : "default"
                              }
                              size="sm"
                              variant="dot"
                            >
                              {org.visibility === "public"
                                ? "Pública"
                                : "Privada"}
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
                            <span>
                              {org.memberCount || 1}{" "}
                              {(org.memberCount || 1) === 1
                                ? "membro"
                                : "membros"}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-400">
                          Criada em{" "}
                          {new Date(
                            org.createdAt?.toDate?.() || org.createdAt,
                          ).toLocaleDateString()}
                        </div>

                        <div className="pt-2">
                          {isOwner ? (
                            // Dono da organização
                            <div className="w-full flex flex-col gap-2">
                              <Chip
                                className="w-full shiny-badge"
                                color="warning"
                                size="sm"
                                variant="flat"
                              >
                                👑 Sua Organização
                              </Chip>

                              <Button
                                className="w-full"
                                color="secondary"
                                size="sm"
                                variant="flat"
                                onClick={() =>
                                  openMembersModal(org.id, org.name)
                                }
                              >
                                Ver Membros
                              </Button>
                            </div>
                          ) : isMember ? (
                            // Membro aceito
                            <div className="w-full flex flex-col gap-2">
                              <Chip
                                className="w-full shiny-badge"
                                color="success"
                                size="sm"
                                startContent={<HiOutlineCheck />}
                                variant="flat"
                              >
                                Você é membro
                              </Chip>

                              <Button
                                className="w-full"
                                color="secondary"
                                size="sm"
                                variant="flat"
                                onClick={() =>
                                  openMembersModal(org.id, org.name)
                                }
                              >
                                Ver Membros
                              </Button>
                            </div>
                          ) : hasPendingRequest ? (
                            // Tem solicitação pendente nesta organização
                            <Chip
                              className="w-full"
                              color="default"
                              size="sm"
                              startContent={<HiOutlineClock />}
                              variant="flat"
                            >
                              Solicitação pendente
                            </Chip>
                          ) : !isMemberOfAnyOrg && !userHasAnyPendingRequest && org.visibility === "public" ? (
                            <div className="w-full flex flex-col gap-2">
                              <Button
                                className="w-full"
                                color="primary"
                                isLoading={requesting === org.id}
                                size="sm"
                                startContent={
                                  <HiOutlineUserAdd className="w-3 h-3" />
                                }
                                variant="flat"
                                onClick={() => handleRequestToJoin(org.id)}
                              >
                                {requesting === org.id
                                  ? "Enviando..."
                                  : "Solicitar Entrada"}
                              </Button>

                              <Button
                                className="w-full"
                                color="secondary"
                                size="sm"
                                variant="flat"
                                onClick={() =>
                                  openMembersModal(org.id, org.name)
                                }
                              >
                                Ver Membros
                              </Button>
                            </div>
                          ) : (
                            <div className="w-full flex flex-col gap-2">
                              <Button
                                className="w-full"
                                color="secondary"
                                size="sm"
                                variant="flat"
                                onClick={() =>
                                  openMembersModal(org.id, org.name)
                                }
                              >
                                Ver Membros
                              </Button>
                            </div>
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
      </Card>

      {modalOpen && (
        <Modal isOpen={modalOpen} size="lg" onClose={() => setModalOpen(false)}>
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <h3>{`Membros de ${modalOrgName} (${modalMembersWithUserData.length} total, ${modalMembersWithUserData.filter(member => member.status === "accepted").length} aceitos)`}</h3>
              <Input
                className="mt-2"
                placeholder="Filtrar membros por nome..."
                size="sm"
                startContent={
                  <HiOutlineSearch className="w-4 h-4 text-default-400" />
                }
                value={modalMemberFilter}
                onChange={(e) => setModalMemberFilter(e.target.value)}
              />
            </ModalHeader>
            <ModalBody className="space-y-3 max-h-96 overflow-y-auto">
              {modalMembersWithUserData.length === 0 ? (
                <p className="text-default-500 text-center py-4">
                  Nenhum membro encontrado
                </p>
              ) : (
                modalMembersWithUserData
                  .filter(
                    (member) =>
                      !modalMemberFilter ||
                      (member.displayName || "")
                        .toLowerCase()
                        .includes(modalMemberFilter.toLowerCase()),
                  )
                  .map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 bg-default-100 dark:bg-default-50 rounded-lg border border-default-200 dark:border-default-100"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          showFallback
                          fallback={
                            <span className="text-sm font-medium">
                              {(member.displayName || member.userId)
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          }
                          name={member.displayName || member.userId}
                          size="md"
                          src={member.photoURL || undefined}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-default-900 dark:text-default-800">
                            {member.displayName || member.userId}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <Chip
                              color={
                                member.role === "owner"
                                  ? "warning"
                                  : member.role === "manager"
                                    ? "secondary"
                                    : member.role === "pro"
                                      ? "primary"
                                      : "default"
                              }
                              size="sm"
                              variant="flat"
                            >
                              {member.role === "owner"
                                ? "👑 Owner"
                                : member.role === "manager"
                                  ? "⚡ Manager"
                                  : member.role === "pro"
                                    ? "🌟 Pro Player"
                                    : "🎮 Ranked"}
                            </Chip>
                            <Chip
                              color={
                                member.status === "accepted"
                                  ? "success"
                                  : "default"
                              }
                              size="sm"
                              variant="dot"
                            >
                              {member.status === "accepted"
                                ? "Aceito"
                                : member.status === "pending"
                                  ? "Pendente"
                                  : member.status}
                            </Chip>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botão Ver Perfil */}
                      {member.userId !== user?.uid && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={<HiOutlineUser className="w-4 h-4" />}
                          onClick={() => router.push(`/perfil/${member.userId}`)}
                        >
                          Ver Perfil
                        </Button>
                      )}
                    </div>
                  ))
              )}
              {modalMembersWithUserData.filter(
                (member) =>
                  !modalMemberFilter ||
                  (member.displayName || "")
                    .toLowerCase()
                    .includes(modalMemberFilter.toLowerCase()),
              ).length === 0 &&
                modalMemberFilter && (
                  <p className="text-default-500 text-center py-4">
                    Nenhum membro encontrado com o nome &quot;
                    {modalMemberFilter}&quot;
                  </p>
                )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" onClick={() => setModalOpen(false)}>
                Fechar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default ExplorarOrganizacoes;
