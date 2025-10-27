"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { Input as Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import {
  HiOutlineMail,
  HiOutlineUserAdd,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineClock,
  HiOutlineUsers,
  HiOutlineUser,
} from "react-icons/hi";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  writeBatch,
  increment,
} from "firebase/firestore";

import { db } from "../firebase";
import {
  OrganizationInvite,
  User,
  OrganizationRole,
  Membership,
  MembershipStatus,
} from "../types";
import { useRoleManagement } from "../hooks/useRoleManagement";
import {
  validateInviteEmail,
  validateInvitePermission,
} from "../utils/validation";

interface InviteSystemProps {
  organizationId: string;
  currentUserRole: OrganizationRole;
  currentUserId: string;
  currentUserName?: string;
  organizationName?: string;
  organizationLogo?: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  currentUserRole: OrganizationRole;
  onInviteSent: () => void;
  organizationName?: string;
  organizationLogo?: string;
  currentUserId?: string;
  currentUserName?: string;
}

interface PendingInvitesProps {
  organizationId: string;
  currentUserRole: OrganizationRole;
  currentUserId: string;
  onInviteProcessed: () => void;
}

interface PendingRequestsProps {
  organizationId: string;
  currentUserRole: OrganizationRole;
  currentUserId: string;
  onRequestProcessed: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  currentUserRole,
  onInviteSent,
  organizationName,
  organizationLogo,
  currentUserId,
  currentUserName,
}) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { canInviteMembers } = useRoleManagement();

  const handleSendInvite = async () => {
    // Validar email
    const emailValidation = validateInviteEmail(email);

    if (!emailValidation.valid) {
      addToast({
        title: "Email Inválido",
        description: emailValidation.reason,
        color: "danger",
      });

      return;
    }

    // Validar permissão para convidar
    const permissionValidation = validateInvitePermission(currentUserRole);

    if (!permissionValidation.valid) {
      addToast({
        title: "Sem Permissão",
        description: permissionValidation.reason,
        color: "danger",
      });

      return;
    }

    try {
      setLoading(true);

      // Verificar se o e-mail já está cadastrado na plataforma
      const usersQuery = query(
        collection(db, "Users"),
        where("email", "==", email.toLowerCase().trim()),
      );

      const usersSnapshot = await getDocs(usersQuery);
      let existingUserId: string | null = null;

      if (!usersSnapshot.empty) {
        existingUserId = usersSnapshot.docs[0].id;
        //console.log("✅ Usuário já cadastrado na plataforma:", existingUserId);
      } else {
        console.log("ℹ️ Novo usuário - será criado ao aceitar o convite");
      }

      // Verificar se já existe convite pendente para este email
      const existingInviteQuery = query(
        collection(db, "organizationInvites"),
        where("organizationId", "==", organizationId),
        where("invitedEmail", "==", email.toLowerCase().trim()),
        where("status", "==", "pending"),
      );

      const existingInvites = await getDocs(existingInviteQuery);

      if (!existingInvites.empty) {
        addToast({
          title: "Convite já enviado",
          description: "Já existe um convite pendente para este email",
          color: "warning",
        });

        return;
      }

      // Verificar se o usuário já é membro da organização
      const membershipQuery = query(
        collection(db, "memberships"),
        where("organizationId", "==", organizationId),
        where("userEmail", "==", email.toLowerCase().trim()),
      );

      const existingMemberships = await getDocs(membershipQuery);

      if (!existingMemberships.empty) {
        addToast({
          title: "Usuário já é membro",
          description: "Este usuário já faz parte da organização",
          color: "warning",
        });

        return;
      }

      // Criar convite
      const inviteData: Omit<OrganizationInvite, "id"> = {
        organizationId,
        invitedUserId: existingUserId || "", // preenche se usuário já existe
        invitedEmail: email.toLowerCase().trim(),
        invitedBy: currentUserRole,
        message: message.trim() || null,
        status: "pending",
        createdAt: serverTimestamp() as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      };

      await addDoc(collection(db, "organizationInvites"), inviteData);

      // Enviar e-mail via API
      try {
        const response = await fetch("/api/send-invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invitedEmail: email.toLowerCase().trim(),
            organizationName: organizationName || "uma organização",
            organizationLogo: organizationLogo || "",
            inviterName: currentUserName || "Um membro",
            message: message.trim(),
            inviteUrl:
              typeof window !== "undefined" ? window.location.origin : "",
          }),
        });

        if (!response.ok) {
          console.error("Erro ao enviar e-mail, mas convite foi salvo");
        }
      } catch (emailError) {
        console.error("Erro ao enviar e-mail:", emailError);
      }

      // Mensagem personalizada baseada no status do usuário
      const successMessage = existingUserId
        ? `Convite enviado para ${email}. O usuário já está cadastrado e receberá uma notificação.`
        : `Convite enviado para ${email}. Um e-mail foi enviado com as instruções de cadastro.`;

      addToast({
        title: "Convite enviado!",
        description: successMessage,
        color: "success",
      });

      setEmail("");
      setMessage("");
      onClose();
      onInviteSent();
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
      addToast({
        title: "Erro",
        description: "Erro ao enviar convite. Tente novamente.",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} size="md" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <HiOutlineUserAdd className="w-5 h-5" />
            Convidar Novo Membro
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              isRequired
              label="Email do usuário"
              placeholder="usuario@exemplo.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Textarea
              label="Mensagem personalizada (opcional)"
              maxLength={300}
              placeholder="Adicione uma mensagem de boas-vindas..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="bg-primary-50 p-3 rounded-lg">
              <p className="text-sm text-primary-700">
                💡 O convite será válido por 7 dias. O usuário receberá uma
                notificação quando fizer login no sistema.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            color="primary"
            isDisabled={!email.trim()}
            isLoading={loading}
            startContent={<HiOutlineMail className="w-4 h-4" />}
            onPress={handleSendInvite}
          >
            Enviar Convite
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const PendingInvites: React.FC<PendingInvitesProps> = ({
  organizationId,
  currentUserRole,
  currentUserId,
  onInviteProcessed,
}) => {
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const { canInviteMembers } = useRoleManagement();

  const loadInvites = async () => {
    try {
      const invitesQuery = query(
        collection(db, "organizationInvites"),
        where("organizationId", "==", organizationId),
        where("status", "==", "pending"),
      );

      const invitesSnapshot = await getDocs(invitesQuery);
      const invitesData = invitesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as OrganizationInvite[];

      // Filtrar convites expirados
      const now = new Date();
      const validInvites = invitesData.filter(
        (invite) => invite.expiresAt && invite.expiresAt.toDate() > now,
      );

      // Remover convites expirados do banco
      const expiredInvites = invitesData.filter(
        (invite) => invite.expiresAt && invite.expiresAt.toDate() <= now,
      );

      for (const expiredInvite of expiredInvites) {
        await deleteDoc(doc(db, "organizationInvites", expiredInvite.id));
      }

      setInvites(validInvites);
    } catch (error) {
      console.error("Erro ao carregar convites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, "organizationInvites", inviteId));

      addToast({
        title: "Convite cancelado",
        description: "O convite foi cancelado com sucesso",
        color: "success",
      });

      loadInvites();
      onInviteProcessed();
    } catch (error) {
      console.error("Erro ao cancelar convite:", error);
      addToast({
        title: "Erro",
        description: "Erro ao cancelar convite",
        color: "danger",
      });
    }
  };

  useEffect(() => {
    loadInvites();
  }, [organizationId]);

  if (loading) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (invites.length === 0) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8">
            <HiOutlineMail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum convite pendente</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <HiOutlineClock className="w-5 h-5" />
        <h4 className="font-semibold">Convites Pendentes ({invites.length})</h4>
      </div>

      {invites.map((invite) => (
        <Card key={invite.id}>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <HiOutlineMail className="w-4 h-4 text-primary" />
                  <span className="font-medium">{invite.invitedEmail}</span>
                  <Chip color="warning" size="sm" variant="flat">
                    Pendente
                  </Chip>
                </div>

                {invite.message && (
                  <p className="text-sm text-gray-600 mb-2">
                    &quot;{invite.message}&quot;
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    Enviado em:{" "}
                    {invite.createdAt?.toDate?.()?.toLocaleDateString("pt-BR")}
                  </span>
                  <span>
                    Expira em:{" "}
                    {invite.expiresAt?.toDate?.()?.toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>

              {canInviteMembers(currentUserRole) && (
                <Button
                  color="danger"
                  size="sm"
                  startContent={<HiOutlineX className="w-4 h-4" />}
                  variant="light"
                  onPress={() => handleCancelInvite(invite.id)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

const PendingRequests: React.FC<PendingRequestsProps> = ({
  organizationId,
  currentUserRole,
  currentUserId,
  onRequestProcessed,
}) => {
  const router = useRouter();
  const [requests, setRequests] = useState<(Membership & { userData: User })[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { canInviteMembers } = useRoleManagement();

  const loadRequests = async () => {
    try {
      const requestsQuery = query(
        collection(db, `organizations/${organizationId}/memberships`),
        where("status", "==", "pending"),
      );

      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Membership[];

      // Buscar dados dos usuários
      const requestsWithUserData = await Promise.all(
        requestsData.map(async (request) => {
          const userDoc = await getDoc(doc(db, "Users", request.userId));
          const userData = userDoc.exists()
            ? ({ uid: userDoc.id, ...userDoc.data() } as User)
            : null;

          return {
            ...request,
            userData: userData || {
              uid: request.userId,
              name: "Usuário não encontrado",
              tag: "",
              avatar: "",
              displayName: "Usuário não encontrado",
              email: "",
            },
          };
        }),
      );

      setRequests(requestsWithUserData as (Membership & { userData: User })[]);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (
    request: Membership & { userData: User },
  ) => {
    if (!canInviteMembers(currentUserRole)) {
      addToast({
        title: "Sem Permissão",
        description: "Você não tem permissão para aceitar solicitações",
        color: "danger",
      });

      return;
    }

    setProcessing(request.userId);

    try {
      const batch = writeBatch(db);

      // Atualizar membership na subcoleção da organização
      const orgMembershipRef = doc(
        db,
        `organizations/${organizationId}/memberships`,
        request.userId,
      );

      batch.update(orgMembershipRef, {
        status: "accepted" as MembershipStatus,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Atualizar na coleção global de memberships
      const globalMembershipsQuery = query(
        collection(db, "memberships"),
        where("organizationId", "==", organizationId),
        where("userId", "==", request.userId),
        where("status", "==", "pending"),
      );

      const globalSnapshot = await getDocs(globalMembershipsQuery);

      globalSnapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          status: "accepted" as MembershipStatus,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      // Incrementar memberCount da organização
      const orgRef = doc(db, "organizations", organizationId);

      batch.update(orgRef, {
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Buscar dados da organização
      const orgSnap = await getDoc(orgRef);
      const orgData = orgSnap.exists() ? orgSnap.data() : null;
      const organizationTag = orgData?.tag || orgData?.slug || null;

      // Atualizar documento do usuário
      if (organizationTag) {
        const userRef = doc(db, "Users", request.userId);

        batch.update(userRef, {
          organizationTag: organizationTag,
          updatedAt: serverTimestamp(),
        });
      }

      // Criar log nas Atividades Recentes
      if (orgData) {
        const logRef = doc(collection(db, "logMercado"));

        batch.set(logRef, {
          displayName: request.userData.displayName || request.userData.name,
          photoURL:
            request.userData.photoURL || request.userData.avatar || null,
          status: "Aceitou",
          organizationName: orgData.name || null,
          organizationLogo: orgData.logoURL || null,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();

      addToast({
        title: "Solicitação aceita",
        description: `${request.userData.displayName || request.userData.name} foi aceito na organização`,
        color: "success",
      });

      loadRequests();
      onRequestProcessed();
    } catch (error) {
      console.error("Erro ao aceitar solicitação:", error);
      addToast({
        title: "Erro",
        description: "Erro ao aceitar solicitação",
        color: "danger",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectRequest = async (
    request: Membership & { userData: User },
  ) => {
    if (!canInviteMembers(currentUserRole)) {
      addToast({
        title: "Sem Permissão",
        description: "Você não tem permissão para recusar solicitações",
        color: "danger",
      });

      return;
    }

    setProcessing(request.userId);

    try {
      const batch = writeBatch(db);

      // Remover membership da subcoleção da organização
      const orgMembershipRef = doc(
        db,
        `organizations/${organizationId}/memberships`,
        request.userId,
      );

      batch.delete(orgMembershipRef);

      // Remover da coleção global de memberships
      const globalMembershipsQuery = query(
        collection(db, "memberships"),
        where("organizationId", "==", organizationId),
        where("userId", "==", request.userId),
        where("status", "==", "pending"),
      );
      const globalSnapshot = await getDocs(globalMembershipsQuery);

      globalSnapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));

      // Buscar dados da organização para log
      const orgRef = doc(db, "organizations", organizationId);
      const orgSnap = await getDoc(orgRef);
      const orgData = orgSnap.exists() ? orgSnap.data() : null;

      // Criar log nas Atividades Recentes
      if (orgData) {
        const logRef = doc(collection(db, "logMercado"));

        batch.set(logRef, {
          displayName: request.userData.displayName || request.userData.name,
          photoURL:
            request.userData.photoURL || request.userData.avatar || null,
          status: "Recusou",
          organizationName: orgData.name || null,
          organizationLogo: orgData.logoURL || null,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();

      addToast({
        title: "Solicitação recusada",
        description: `A solicitação de ${request.userData.displayName || request.userData.name} foi recusada`,
        color: "success",
      });

      loadRequests();
      onRequestProcessed();
    } catch (error) {
      console.error("Erro ao recusar solicitação:", error);
      addToast({
        title: "Erro",
        description: "Erro ao recusar solicitação",
        color: "danger",
      });
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [organizationId]);

  if (loading) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8">
            <HiOutlineUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Nenhuma solicitação de entrada pendente
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <HiOutlineUsers className="w-5 h-5" />
        <h4 className="font-semibold">
          Solicitações de Entrada ({requests.length})
        </h4>
      </div>

      {requests.map((request) => (
        <Card key={request.userId}>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Avatar
                  name={request.userData.displayName || request.userData.name}
                  size="md"
                  src={request.userData.photoURL || request.userData.avatar}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {request.userData.displayName || request.userData.name}
                    </span>
                    <Chip color="primary" size="sm" variant="flat">
                      Solicitação
                    </Chip>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {request.userData.email}
                  </p>

                  <div className="text-xs text-gray-500">
                    Solicitado em:{" "}
                    {request.invitedAt?.toDate?.()?.toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>

              {canInviteMembers(currentUserRole) && (
                <div className="flex items-center gap-2">
                  <Button
                    color="default"
                    size="sm"
                    startContent={<HiOutlineUser className="w-4 h-4" />}
                    variant="light"
                    onPress={() => router.push(`/perfil/${request.userId}`)}
                  >
                    Ver Perfil
                  </Button>
                  <Button
                    color="success"
                    isLoading={processing === request.userId}
                    size="sm"
                    startContent={<HiOutlineCheck className="w-4 h-4" />}
                    variant="flat"
                    onPress={() => handleAcceptRequest(request)}
                  >
                    Aceitar
                  </Button>
                  <Button
                    color="danger"
                    isLoading={processing === request.userId}
                    size="sm"
                    startContent={<HiOutlineX className="w-4 h-4" />}
                    variant="flat"
                    onPress={() => handleRejectRequest(request)}
                  >
                    Recusar
                  </Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

const InviteSystem: React.FC<InviteSystemProps> = ({
  organizationId,
  currentUserRole,
  currentUserId,
  currentUserName,
  organizationName,
  organizationLogo,
}) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { canInviteMembers } = useRoleManagement();

  const handleInviteProcessed = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Botão para convidar novos membros */}
      {canInviteMembers(currentUserRole) && (
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Sistema de Convites</h3>
            <p className="text-sm text-gray-600">
              Gerencie convites para novos membros da organização
            </p>
          </div>
          <Button
            color="primary"
            startContent={<HiOutlineUserAdd className="w-4 h-4" />}
            onPress={() => setIsInviteModalOpen(true)}
          >
            Convidar Membro
          </Button>
        </div>
      )}

      {/* Lista de solicitações de entrada pendentes */}
      <PendingRequests
        key={`requests-${refreshKey}`}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        organizationId={organizationId}
        onRequestProcessed={handleInviteProcessed}
      />

      {/* Lista de convites por email pendentes */}
      <PendingInvites
        key={`invites-${refreshKey}`}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        organizationId={organizationId}
        onInviteProcessed={handleInviteProcessed}
      />

      {/* Modal de convite */}
      <InviteModal
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserRole={currentUserRole}
        isOpen={isInviteModalOpen}
        organizationId={organizationId}
        organizationLogo={organizationLogo}
        organizationName={organizationName}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSent={handleInviteProcessed}
      />
    </div>
  );
};

export default InviteSystem;
