"use client";

import React, { useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Input as Textarea } from "@heroui/input";
import { HiOutlineSave, HiOutlinePlus } from "react-icons/hi";
import { addToast } from "@heroui/toast";
import { Card, CardBody, CardHeader } from "@heroui/card";

import { db, auth } from "./firebase";
import { Organization, Membership, OrganizationVisibility } from "./types";
import {
  validateOrganizationCreation,
  validateTagFormat,
} from "./utils/validation";

export default function CriarOrganizacao() {
  const [user] = useAuthState(auth);
  const [nome, setNome] = useState("");
  const [tag, setTag] = useState("");
  const [descricao, setDescricao] = useState("");
  const [visibilidade, setVisibilidade] =
    useState<OrganizationVisibility>("public");
  const [isCreating, setIsCreating] = useState(false);

  // Criar organização
  const handleCreate = async () => {
    if (!user) {
      addToast({
        title: "Erro",
        description:
          "Usuário não autenticado. Faça login para criar uma organização.",
        color: "danger",
      });

      return;
    }

    // Validar dados da organização
    const orgValidation = validateOrganizationCreation({
      name: nome,
      tag: tag,
      description: descricao,
    });

    if (!orgValidation.valid) {
      addToast({
        title: "Erro de Validação",
        description: orgValidation.reason,
        color: "danger",
      });

      return;
    }

    // Validar formato da tag
    const tagValidation = validateTagFormat(tag);

    if (!tagValidation.valid) {
      addToast({
        title: "Erro na Tag",
        description: tagValidation.reason,
        color: "danger",
      });

      return;
    }

    setIsCreating(true);

    try {
      // Verificar se a tag já existe
      const tagQuery = query(
        collection(db, "organizations"),
        where("tag", "==", tag),
      );
      const tagSnapshot = await getDocs(tagQuery);

      if (!tagSnapshot.empty) {
        addToast({
          title: "Tag Indisponível",
          description: "Esta tag já está em uso. Escolha outra.",
          color: "danger",
        });
        setIsCreating(false);

        return;
      }

      const slug = nome
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      // Validar campos obrigatórios antes de enviar para Firebase
      if (
        !visibilidade ||
        (visibilidade !== "public" && visibilidade !== "private")
      ) {
        addToast({
          title: "Erro de Validação",
          description: "Visibilidade deve ser 'public' ou 'private'",
          color: "danger",
        });
        setIsCreating(false);

        return;
      }

      // Criar organização
      const orgData: Omit<Organization, "id"> = {
        name: nome.trim(),
        tag: tag,
        slug,
        description: descricao.trim() || undefined,
        visibility: visibilidade as OrganizationVisibility,
        ownerId: user.uid,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        memberCount: 1,
        maxMembers: 50,
        region: "BR", // Padrão para Brasil
        game: "CODM", // Padrão
        settings: {
          allowPublicJoin: visibilidade === "public",
          requireApproval: true,
        },
      };

      console.log("🔧 Criando nova organização:", orgData);
      const orgRef = await addDoc(collection(db, "organizations"), orgData);

      console.log("✅ Organização criada com ID:", orgRef.id);

      // Criar membership para o owner
      const membershipData: Omit<Membership, "id"> = {
        organizationId: orgRef.id,
        userId: user.uid,
        role: "owner",
        status: "accepted",
        joinedAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        invitedBy: user.uid,
        invitedAt: serverTimestamp() as any,
        roleHistory: [],
      };

      // Criar membership na subcoleção da organização usando setDoc para definir o ID
      console.log(
        "🔧 Criando membership na subcoleção:",
        `organizations/${orgRef.id}/memberships/${user.uid}`,
      );
      await setDoc(
        doc(db, `organizations/${orgRef.id}/memberships`, user.uid),
        membershipData,
      );
      console.log("✅ Membership criado na subcoleção com sucesso");

      // Também criar na coleção global de memberships para consultas gerais
      console.log("🔧 Criando membership na coleção global...");
      await addDoc(collection(db, "memberships"), membershipData);
      console.log("✅ Membership criado na coleção global com sucesso");

      // Atualizar perfil do usuário
      const userRef = doc(db, "Users", user.uid);

      await updateDoc(userRef, {
        organizationTag: tag,
        organizationRole: "owner",
        updatedAt: serverTimestamp(),
      });

      addToast({
        title: "Organização Criada!",
        description: `"${nome}" foi criada com sucesso! Você agora é o proprietário.`,
        color: "success",
      });

      // Limpar formulário
      setNome("");
      setTag("");
      setDescricao("");
      setVisibilidade("public");
    } catch (error) {
      console.error("Erro ao criar organização:", error);
      addToast({
        title: "Erro Interno",
        description:
          "Erro ao criar organização. Verifique sua conexão e tente novamente.",
        color: "danger",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Se não estiver logado, mostrar mensagem
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardBody className="text-center py-12">
            <HiOutlinePlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Faça Login para Criar uma Organização
            </h2>
            <p className="text-gray-600">
              Você precisa estar logado para criar uma nova organização.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Formulário de criação de organização
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <HiOutlinePlus className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Criar Nova Organização</h1>
              <p className="text-gray-600">
                Crie sua organização e comece a gerenciar sua equipe
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-200 mb-2">
              📋 Regras de Criação
            </h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Qualquer usuário autenticado pode criar organizações</li>
              <li>• Você se tornará automaticamente o Owner da organização</li>
              <li>
                • Seu cargo atual em outras organizações não interfere aqui
              </li>
              <li>• Você pode criar múltiplas organizações</li>
            </ul>
          </div>

          <Input
            isRequired
            isDisabled={isCreating}
            label="Nome da Organização"
            placeholder="Digite o nome da sua organização"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <Input
            isRequired
            description="Letras, números e underscore. Esta será a identificação única da sua organização. Ex: 4M, R7, G4L, K9E"
            isDisabled={isCreating}
            label="Tag da Organização"
            placeholder="123ABC"
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase())}
          />

          <Textarea
            isDisabled={isCreating}
            label="Descrição (opcional)"
            placeholder="Descreva sua organização..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          <Select
            isRequired
            isDisabled={isCreating}
            label="Visibilidade"
            placeholder="Selecione a visibilidade"
            selectedKeys={new Set([visibilidade])}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as OrganizationVisibility;

              setVisibilidade(selected);
            }}
          >
            <SelectItem key="public" textValue="Pública">
              <div className="flex items-center gap-2">
                <span>🌍</span>
                <div>
                  <div className="font-medium">Pública</div>
                  <div className="text-xs text-gray-500">
                    Visível para todos usuários autenticados. Lista e página da
                    organização são públicas.
                  </div>
                </div>
              </div>
            </SelectItem>
            <SelectItem key="private" textValue="Privada">
              <div className="flex items-center gap-2">
                <span>🔒</span>
                <div>
                  <div className="font-medium">Privada</div>
                  <div className="text-xs text-gray-500">
                    Apenas membros com status &quot;aceito&quot; podem ver a
                    organização.
                  </div>
                </div>
              </div>
            </SelectItem>
          </Select>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              color="primary"
              isDisabled={!nome.trim() || !tag.trim() || isCreating}
              isLoading={isCreating}
              startContent={
                !isCreating && <HiOutlineSave className="w-4 h-4" />
              }
              onPress={handleCreate}
            >
              {isCreating ? "Criando..." : "Criar Organização"}
            </Button>
          </div>

          <div className="text-xs text-gray-500 mt-4">
            <p>
              <strong>Nota:</strong> Após criar a organização, você poderá
              gerenciá-la através do painel &quot;Minhas Organizações&quot; ou
              &quot;Painel da Organização&quot;.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
