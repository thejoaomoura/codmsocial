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
} from "react-icons/hi";
import { User } from "firebase/auth";

import { Organization } from "../types";
import { useRoleManagement } from "../hooks/useRoleManagement";

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
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma Organização Encontrada
            </h3>
            <p className="text-gray-500 mb-6">
              Você ainda não faz parte de nenhuma organização. Crie uma nova ou
              explore organizações da comunidade para se juntar.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              color="primary"
              startContent={<HiOutlinePlus className="w-4 h-4" />}
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
              startContent={<HiOutlineEye className="w-4 h-4" />}
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

          {/* Botão "Nova Organização" removido - usuários que já são membros não devem criar novas organizações */}
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
                        <span>{org.memberCount || 1} membros</span>
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
