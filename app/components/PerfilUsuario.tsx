"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { addToast } from "@heroui/toast";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { HiOutlineCalendar, HiOutlineExternalLink, HiOutlineCheck, HiOutlinePencil, HiOutlineX, HiOutlineLogout, HiOutlineArrowLeft, HiOutlineShare } from "react-icons/hi";
import { useRouter } from "next/navigation";
import StatusIndicator from "./StatusIndicator";
import { usePresence } from "../hooks/usePresence";

interface PerfilUser {
  uid: string;
  displayName: string;
  email?: string;
  photoUrl?: string;
  organizationTag?: string;
  createdAt?: Date;
  isOnline?: boolean;
  presence?: "online" | "away" | "offline";
  lastSeen?: any;
  privacy?: {
    lastSeen: "everyone" | "contacts" | "nobody" | "mutual";
  };
}

interface PerfilUsuarioProps {
  userId: string;
}

const PerfilUsuario: React.FC<PerfilUsuarioProps> = ({ userId }) => {
  const [user, setUser] = useState<PerfilUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [organizationTag, setOrganizationTag] = useState("");
  const [privacyLastSeen, setPrivacyLastSeen] = useState<"everyone" | "contacts" | "nobody" | "mutual">("everyone");
  const router = useRouter();

  // Inicializa o sistema de presença para o usuário atual
  usePresence();

  // Determina se o perfil é próprio
  const isOwnProfile = userId === auth.currentUser?.uid;

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        if (!userId) return;

        const userRef = doc(db, "Users", userId);
        const userSnap = await getDoc(userRef);
        const data = userSnap.exists() ? userSnap.data() : {};

        const perfil: PerfilUser = {
          uid: userId,
          displayName: data.displayName || "",
          email: data.email || "",
          photoUrl: data.photoURL || "",
          organizationTag: data.organizationTag || "",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          isOnline: data.isOnline || false,
          presence: data.presence || "offline",
          lastSeen: data.lastSeen,
          privacy: data.privacy || { lastSeen: "everyone" },
        };

        setUser(perfil);
        setName(perfil.displayName);
        setAvatar(perfil.photoUrl || "");
        setOrganizationTag(perfil.organizationTag || "");
        setPrivacyLastSeen(perfil.privacy?.lastSeen || "everyone");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, {
        displayName: name,
        photoURL: avatar,
        organizationTag,
        privacy: {
          lastSeen: privacyLastSeen,
        },
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name, photoURL: avatar });
      }

      setUser({ ...user, displayName: name, photoUrl: avatar, organizationTag });
      setEditMode(false);

      addToast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
        color: "success",
      });
    } catch (error) {
      console.error(error);
      addToast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        color: "danger",
      });
    }
  };

  const handleGoBack = () => {
    router.push("/");
  };

  const handleShareProfile = async () => {
    try {
      const profileUrl = `${window.location.origin}/perfil/${userId}`;
      await navigator.clipboard.writeText(profileUrl);
      
      addToast({
        title: "Link copiado!",
        description: "O link do perfil foi copiado para a área de transferência.",
        color: "success",
      });
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      addToast({
        title: "Erro",
        description: "Não foi possível copiar o link do perfil.",
        color: "danger",
      });
    }
  };

  if (loading) return <p className="text-center mt-10">Carregando perfil...</p>;
  if (!user) return <p className="text-center mt-10 text-red-500">Usuário não encontrado.</p>;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Botão de voltar */}
        <Button
          className="mb-6"
          variant="light"
          startContent={<HiOutlineArrowLeft className="w-5 h-5" />}
          onPress={handleGoBack}
        >
          Voltar ao Feed
        </Button>

        {/* Card do perfil */}
        <Card className="w-full">
          {/* Header */}
          <CardHeader className="flex flex-col items-center gap-4 pb-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-700 flex items-center justify-center">
                <img 
                  alt="Avatar" 
                  className="h-full w-full object-cover" 
                  src={avatar || "/default-avatar.png"} 
                />
              </div>
              {/* Indicador de status */}
              <div className="absolute -bottom-1 -right-1">
                <StatusIndicator 
                  status={user.presence || "offline"} 
                  size="md"
                />
              </div>
            </div>

            {editMode ? (
              <div className="w-full max-w-sm space-y-3">
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Nome" 
                  label="Nome"
                />
                <Input 
                  value={avatar} 
                  onChange={(e) => setAvatar(e.target.value)} 
                  placeholder="URL da foto" 
                  label="Foto do perfil"
                />
                <Input 
                  value={organizationTag} 
                  onChange={(e) => setOrganizationTag(e.target.value)} 
                  placeholder="Tag da organização" 
                  label="Tag da organização"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Privacidade do Status</label>
                  <select 
                    value={privacyLastSeen}
                    onChange={(e) => setPrivacyLastSeen(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="everyone">Todos podem ver quando estou online</option>
                    <option value="contacts">Apenas contatos</option>
                    <option value="mutual">Apenas contatos mútuos</option>
                    <option value="nobody">Ninguém pode ver meu status</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                  {name}
                  {organizationTag && (
                    <Chip size="md" variant="faded" color="primary">
                      {organizationTag}
                    </Chip>
                  )}
                </h1>
              </div>
            )}
          </CardHeader>

          <Divider />

          {/* Corpo */}
          <CardBody className="space-y-4 py-6">
            <div className="flex flex-col gap-4 text-gray-700">
              <div className="flex items-center gap-3">
                <HiOutlineExternalLink className="w-5 h-5 text-gray-500" />
                <span className="text-lg">{user.email || "Email não informado"}</span>
              </div>
              <div className="flex items-center gap-3">
                <HiOutlineCalendar className="w-5 h-5 text-gray-500" />
                <span className="text-lg">
                  Membro desde: {user.createdAt?.toLocaleDateString("pt-BR") || "Data não informada"}
                </span>
              </div>
              
              {/* Status e visto por último */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <StatusIndicator status={user.presence || "offline"} size="sm" />
                  <span className="text-lg font-medium">
                    {user.presence === "online" ? "Online" : 
                     user.presence === "away" ? "Ausente" : "Offline"}
                  </span>
                </div>
              </div>
              
              {user.lastSeen && user.privacy?.lastSeen !== "nobody" && (
                <div className="flex items-center gap-3">
                  <HiOutlineCalendar className="w-5 h-5 text-gray-500" />
                  <span className="text-lg">
                    Visto por último: {user.lastSeen?.toDate ? 
                      user.lastSeen.toDate().toLocaleString("pt-BR") : 
                      "Data não disponível"}
                  </span>
                </div>
              )}
            </div>

            {/* Botão de compartilhar perfil */}
            <div className="flex justify-center pt-4">
              <Button
                variant="bordered"
                startContent={<HiOutlineShare className="w-4 h-4" />}
                onPress={handleShareProfile}
                style={{ 
                  borderColor: "#441729", 
                  color: "#f1f5f9" 
                }}
                className="hover:bg-[#441729] hover:text-white transition-colors"
              >
                Compartilhar Perfil
              </Button>
            </div>
          </CardBody>

          {/* Footer só aparece se for o próprio usuário */}
          {isOwnProfile && (
            <>
              <Divider />
              <CardFooter className="flex justify-between pt-6">
                {editMode ? (
                  <>
                    <Button 
                      color="success" 
                      onPress={handleSave} 
                      startContent={<HiOutlineCheck className="w-4 h-4" />}
                    >
                      Salvar
                    </Button>
                    <Button 
                      color="default" 
                      variant="bordered"
                      onPress={() => setEditMode(false)} 
                      startContent={<HiOutlineX className="w-4 h-4" />}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onPress={() => setEditMode(true)} 
                      startContent={<HiOutlinePencil className="w-4 h-4" />}
                    >
                      Editar Perfil
                    </Button>
                    <Button 
                      color="danger" 
                      variant="light"
                      onPress={() => {
                        auth.signOut();
                        router.push("/login");
                      }} 
                      startContent={<HiOutlineLogout className="w-4 h-4" />}
                    >
                      Sair
                    </Button>
                  </>
                )}
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PerfilUsuario;