"use client";

import React from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import {
  HiOutlinePlus,
  HiOutlineUsers,
  HiOutlineCog,
  HiOutlineEye,
  HiOutlineCheck,
  HiOutlineLogout,
} from "react-icons/hi";
import { User } from "firebase/auth";
import {
  doc,
  writeBatch,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  deleteField,
  addDoc,
} from "firebase/firestore";
import { addToast } from "@heroui/toast";

import { Organization } from "../types";
import { useRoleManagement } from "../hooks/useRoleManagement";
import { db } from "../firebase";

interface MinhasOrganizacoesProps {
  user: User | null;
  userOrganizations: Organization[];
  loading: boolean;
  selectedOrgId?: string | null;
  onSelectOrganization?: (orgId: string) => void;
}

const MinhasOrganizacoes: React.FC<MinhasOrganizacoesProps> = ({
  user,
  userOrganizations,
  loading,
  selectedOrgId,
  onSelectOrganization,
}) => {
  const { getRoleName, getRoleEmoji } = useRoleManagement();

  // Função para sair da organização
  const handleLeaveOrganization = async (org: Organization) => {
    if (!user) return;

    // Verificar se é o owner
    if (org.ownerId === user.uid) {
      addToast({
        title: "Ação Não Permitida",
        description:
          "Você é o dono da organização e não pode sair. Transfira a propriedade primeiro.",
        color: "danger",
      });

      return;
    }

    // Confirmar ação
    if (!confirm(`Tem certeza que deseja sair de ${org.name}?`)) {
      return;
    }

    try {
      const batch = writeBatch(db);

      // Remove da subcoleção da organização
      const orgMembershipRef = doc(
        db,
        `organizations/${org.id}/memberships`,
        user.uid,
      );

      batch.delete(orgMembershipRef);

      // Remove da coleção global "memberships"
      const globalMembershipsQuery = query(
        collection(db, "memberships"),
        where("userId", "==", user.uid),
        where("organizationId", "==", org.id),
      );
      const globalMembershipsSnapshot = await getDocs(globalMembershipsQuery);

      globalMembershipsSnapshot.forEach((docSnap) => batch.delete(docSnap.ref));

      // Atualiza contador da organização
      const orgRef = doc(db, "organizations", org.id);

      batch.update(orgRef, {
        memberCount: (org.memberCount || 0) - 1,
        updatedAt: serverTimestamp(),
      });

      //  Remove o campo organizationTag do documento do usuário
      const userRef = doc(db, "Users", user.uid);

      batch.set(
        userRef,
        {
          organizationTag: deleteField(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      // Executa o batch
      await batch.commit();

      // Adiciona log às Atividades Recentes
      await addDoc(collection(db, "logMercado"), {
        displayName: user.displayName || "Usuário",
        photoURL: user.photoURL || "",
        status: "Saiu",
        organizationName: org.name,
        organizationLogo: org.logoURL || "",
        createdAt: serverTimestamp(),
      });

      console.log("✅ Saiu da organização com sucesso");

      addToast({
        title: "Saída Concluída",
        description: `Você saiu de ${org.name} com sucesso`,
        color: "success",
      });
    } catch (error) {
      console.error("❌ Erro ao sair da organização:", error);
      addToast({
        title: "Erro",
        description: "Erro ao sair da organização. Tente novamente.",
        color: "danger",
      });
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Faça login para ver suas organizações</p>
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

  if (userOrganizations.length === 0) {
    return (
      <Card className="space-y-6">
        <div className="text-center py-12">
          <div className="mb-6">
            <HiOutlineUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 mr-5 ml-5">
              Nenhuma Organização Encontrada
            </h3>
            <p className="text-gray-500 mb-6 mr-5 ml-5">
              Você ainda não faz parte de nenhuma organização. Crie uma nova ou
              explore organizações da comunidade para se juntar.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              color="primary"
              startContent={<HiOutlinePlus className="w-4 h-4 mr-5 ml-5" />}
              onClick={() => {
                // Navegar para criar organização
                const event = new CustomEvent("changeTab", {
                  detail: "Criar Organização",
                });

                window.dispatchEvent(event);
              }}
            >
              Criar Organização
            </Button>
            <Button
              startContent={<HiOutlineEye className="w-4 h-4 mr-5 ml-5" />}
              variant="bordered"
              onClick={() => {
                // Navegar para explorar organizações
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

  return (
    <Card className="space-y-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold ml-5 mt-3">
              Minhas Organizações
            </h2>
            <p className="text-gray-600 ml-5">
              Gerencie suas organizações e veja seu status
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 ml-5 mr-5 mb-10">
          {userOrganizations.map((org) => {
            const isSelected = selectedOrgId === org.id;

            return (
              <Card
                key={org.id}
                className={`hover:shadow-lg transition-all cursor-pointer ${
                  isSelected ? "ring-2 ring-primary border-primary" : ""
                }`}
                onClick={() => onSelectOrganization?.(org.id)}
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg truncate">
                          {org.name}
                        </h3>
                        {isSelected && (
                          <Chip color="primary" size="sm" variant="flat">
                            <HiOutlineCheck />
                          </Chip>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip color="primary" size="sm" variant="flat">
                          {org.tag}
                        </Chip>
                        {org.ownerId === user.uid && (
                          <Chip
                            color="warning"
                            size="sm"
                            startContent={<span className="text-xs">👑</span>}
                            variant="flat"
                          >
                            {getRoleName("owner")}
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="pt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {org.description || "Sem descrição"}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <HiOutlineUsers className="w-4 h-4" />
                        <span>
                          {org.memberCount || 1}{" "}
                          {(org.memberCount || 1) === 1 ? "membro" : "membros"}
                        </span>
                      </div>
                      <Chip
                        color={
                          org.visibility === "public" ? "success" : "default"
                        }
                        size="sm"
                        variant="dot"
                      >
                        {org.visibility === "public" ? "Pública" : "Privada"}
                      </Chip>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        color="primary"
                        size="sm"
                        startContent={<HiOutlineCog className="w-3 h-3" />}
                        variant="flat"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrganization?.(org.id);
                          const event = new CustomEvent("changeTab", {
                            detail: "Painel da Organização",
                          });

                          window.dispatchEvent(event);
                        }}
                      >
                        Gerenciar
                      </Button>
                      {org.ownerId !== user.uid && (
                        <Button
                          color="danger"
                          size="sm"
                          startContent={<HiOutlineLogout className="w-3 h-3" />}
                          variant="flat"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveOrganization(org);
                          }}
                        >
                          Sair
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default MinhasOrganizacoes;
