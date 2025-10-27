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
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { addToast } from "@heroui/toast";
import {
  HiOutlineUserGroup,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUser,
} from "react-icons/hi";

import { OrganizationRole, Membership, User } from "../types";
import { useRoleManagement } from "../hooks/useRoleManagement";
import { validateMemberRemoval } from "../utils/validation";

interface RoleManagementProps {
  currentUserRole: OrganizationRole;
  currentUserId: string;
  members: (Membership & { userData: User })[];
  onRoleChange: (
    userId: string,
    newRole: OrganizationRole,
    reason?: string,
  ) => Promise<void>;
  onRemoveMember: (userId: string, reason?: string) => Promise<void>;
}

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: (Membership & { userData: User }) | null;
  currentUserRole: OrganizationRole;
  currentUserId: string;
  onConfirm: (newRole: OrganizationRole, reason?: string) => Promise<void>;
}

const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  isOpen,
  onClose,
  member,
  currentUserRole,
  currentUserId,
  onConfirm,
}) => {
  const [selectedRole, setSelectedRole] = useState<OrganizationRole | "">("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    getRoleHierarchy,
    getRoleName,
    getRoleEmoji,
    validateRoleChange,
    canChangeRole,
  } = useRoleManagement();

  // Resetar o estado quando o modal abrir/fechar ou o membro mudar
  useEffect(() => {
    if (isOpen && member) {
      setSelectedRole("");
      setReason("");
    }
  }, [isOpen, member]);

  const handleConfirm = async () => {
    if (!member || selectedRole === "") return;

    const validation = validateRoleChange(
      currentUserRole,
      member.userId,
      member.role,
      selectedRole as OrganizationRole,
      currentUserId,
    );

    if (!validation.valid) {
      addToast({
        title: "Alteração Não Permitida",
        description: validation.reason,
        color: "danger",
      });

      return;
    }

    try {
      setLoading(true);
      await onConfirm(
        selectedRole as OrganizationRole,
        reason.trim() || undefined,
      );
      onClose();
      setReason("");
      setSelectedRole("");

      addToast({
        title: "Cargo Alterado",
        description: `Cargo de ${member.userData.displayName} alterado para ${getRoleName(selectedRole as OrganizationRole)}`,
        color: "success",
      });
    } catch (error) {
      console.error("Erro ao alterar cargo:", error);
      addToast({
        title: "Erro",
        description: "Erro ao alterar cargo. Tente novamente.",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableRoles = (): OrganizationRole[] => {
    const allRoles = getRoleHierarchy();

    if (currentUserRole === "owner") {
      // Owner pode definir qualquer cargo (exceto owner)
      return allRoles.filter((role) => role !== "owner");
    }

    if (currentUserRole === "moderator") {
      // Moderator pode definir manager, pro e ranked
      return allRoles.filter((role) => !["owner", "moderator"].includes(role));
    }

    return [];
  };

  const availableRoles = getAvailableRoles();

  return (
    <Modal isOpen={isOpen} size="md" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <HiOutlinePencil className="w-5 h-5" />
            Alterar Cargo
          </div>
        </ModalHeader>
        <ModalBody>
          {member && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar
                  alt={member.userData.displayName || member.userData.name}
                  size="md"
                  src={member.userData.photoURL || member.userData.avatar}
                />
                <div>
                  <p className="font-semibold">
                    {member.userData.displayName || member.userData.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span>Cargo atual:</span>
                    <Chip
                      color="primary"
                      startContent={<span>{getRoleEmoji(member.role)}</span>}
                      variant="flat"
                    >
                      {getRoleName(member.role)}
                    </Chip>
                  </div>
                </div>
              </div>

              <Select
                label="Novo Cargo"
                placeholder="Selecione o novo cargo"
                selectedKeys={
                  selectedRole ? new Set([selectedRole]) : new Set()
                }
                onSelectionChange={(keys) => {
                  const keysArray = Array.from(keys);
                  const selected = keysArray[0] as OrganizationRole;

                  setSelectedRole(selected || "");
                }}
                style={{
                  // Fix for focus scope accessibility warning
                  '--focus-scope-end-display': 'inline'
                } as React.CSSProperties}
                className="[&_span[data-focus-scope-end='true']]:!inline"
              >
                {availableRoles.map((role) => (
                  <SelectItem key={role} textValue={getRoleName(role)}>
                    <div className="flex items-center gap-2">
                      <span>{getRoleEmoji(role)}</span>
                      <span>{getRoleName(role)}</span>
                    </div>
                  </SelectItem>
                ))}
              </Select>

              <Input
                label="Motivo (opcional)"
                maxLength={200}
                placeholder="Descreva o motivo da alteração..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            color="primary"
            isDisabled={!selectedRole || selectedRole === member?.role}
            isLoading={loading}
            onPress={handleConfirm}
          >
            Confirmar Alteração
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const RoleManagement: React.FC<RoleManagementProps> = ({
  currentUserRole,
  currentUserId,
  members,
  onRoleChange,
  onRemoveMember,
}) => {
  const router = useRouter();
  const [selectedMember, setSelectedMember] = useState<
    (Membership & { userData: User }) | null
  >(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    getRoleName,
    getRoleEmoji,
    getRoleColor,
    canChangeRole,
    canRemoveMember,
  } = useRoleManagement();

  const handleRoleChange = async (
    newRole: OrganizationRole,
    reason?: string,
  ) => {
    if (!selectedMember) return;
    await onRoleChange(selectedMember.userId, newRole, reason);
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    // Validar remoção de membro usando as regras de negócio
    const validation = validateMemberRemoval(
      currentUserRole,
      selectedMember.role,
    );

    if (!validation.valid) {
      addToast({
        title: "Remoção Não Permitida",
        description: validation.reason,
        color: "danger",
      });

      return;
    }

    try {
      setLoading(true);
      await onRemoveMember(
        selectedMember.userId,
        removeReason.trim() || undefined,
      );

      addToast({
        title: "Membro Removido",
        description: `${selectedMember.userData.displayName} foi removido da organização`,
        color: "success",
      });

      setIsRemoveModalOpen(false);
      setRemoveReason("");
      setSelectedMember(null);
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      addToast({
        title: "Erro",
        description: "Erro ao remover membro. Tente novamente.",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const openRoleModal = (member: Membership & { userData: User }) => {
    setSelectedMember(member);
    setIsRoleModalOpen(true);
  };

  const openRemoveModal = (member: Membership & { userData: User }) => {
    setSelectedMember(member);
    setIsRemoveModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <HiOutlineUserGroup className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Gestão de Membros</h3>
      </div>

      <div className="grid gap-3">
        {members.map((member) => {
          const canChange = canChangeRole(
            currentUserRole,
            member.role,
            "ranked",
          ); // teste básico
          const canRemove = canRemoveMember(currentUserRole, member.role);
          const isCurrentUser = member.userId === currentUserId;

          return (
            <Card key={member.userId} className="p-4">
              <CardBody className="p-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      alt={member.userData.displayName || member.userData.name}
                      size="md"
                      src={member.userData.photoURL || member.userData.avatar}
                    />
                    <div>
                      <p className="font-semibold">
                        {member.userData.displayName || member.userData.name}
                        {isCurrentUser && (
                          <span className="text-sm text-gray-500 ml-2">
                            (Você)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {member.userData.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Chip
                          color={getRoleColor(member.role) as any}
                          size="sm"
                          startContent={
                            <span>{getRoleEmoji(member.role)}</span>
                          }
                          variant="flat"
                        >
                          {getRoleName(member.role)}
                        </Chip>
                        <span className="text-xs text-gray-500">
                          Desde{" "}
                          {member.joinedAt
                            ?.toDate?.()
                            ?.toLocaleDateString("pt-BR") || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isCurrentUser && (
                    <div className="flex gap-2">
                      <Button
                        color="default"
                        size="sm"
                        startContent={<HiOutlineUser className="w-4 h-4" />}
                        variant="light"
                        onPress={() => router.push(`/perfil/${member.userId}`)}
                      >
                        Ver Perfil
                      </Button>
                      {canChange && (
                        <Button
                          color="primary"
                          size="sm"
                          startContent={<HiOutlinePencil className="w-4 h-4" />}
                          variant="light"
                          onPress={() => openRoleModal(member)}
                        >
                          Alterar Cargo
                        </Button>
                      )}
                      {canRemove && (
                        <Button
                          color="danger"
                          size="sm"
                          startContent={<HiOutlineTrash className="w-4 h-4" />}
                          variant="light"
                          onPress={() => openRemoveModal(member)}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Modal de Alteração de Cargo */}
      <RoleChangeModal
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        isOpen={isRoleModalOpen}
        member={selectedMember}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedMember(null);
        }}
        onConfirm={handleRoleChange}
      />

      {/* Modal de Remoção de Membro */}
      <Modal
        isOpen={isRemoveModalOpen}
        size="md"
        onClose={() => setIsRemoveModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <HiOutlineTrash className="w-5 h-5 text-danger" />
              Remover Membro
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedMember && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    alt={
                      selectedMember.userData.displayName ||
                      selectedMember.userData.name
                    }
                    size="md"
                    src={
                      selectedMember.userData.photoURL ||
                      selectedMember.userData.avatar
                    }
                  />
                  <div>
                    <p className="font-semibold">
                      {selectedMember.userData.displayName ||
                        selectedMember.userData.name}
                    </p>
                    <Chip
                      color={getRoleColor(selectedMember.role) as any}
                      size="sm"
                      startContent={
                        <span>{getRoleEmoji(selectedMember.role)}</span>
                      }
                      variant="flat"
                    >
                      {getRoleName(selectedMember.role)}
                    </Chip>
                  </div>
                </div>

                <div className="bg-danger-50 p-3 rounded-lg">
                  <p className="text-sm text-danger-700">
                    ⚠️ Esta ação removerá o membro da organização
                    permanentemente. A tag da organização será removida do
                    perfil do usuário.
                  </p>
                </div>

                <Input
                  label="Motivo da remoção (opcional)"
                  maxLength={200}
                  placeholder="Descreva o motivo da remoção..."
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsRemoveModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="danger"
              isLoading={loading}
              onPress={handleRemoveMember}
            >
              Confirmar Remoção
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default RoleManagement;
