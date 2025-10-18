"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { addToast } from "@heroui/toast";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { HiOutlineCalendar, HiOutlineExternalLink, HiOutlineCheck, HiOutlinePencil, HiOutlineX, HiOutlineLogout } from "react-icons/hi";

interface PerfilUser {
  uid: string;
  displayName: string;
  email?: string;
  photoUrl?: string;
  organizationTag?: string;
  createdAt?: Date;
}

interface PerfilProps {
  userId?: string; // se undefined, mostra o usuário logado
}

const Perfil: React.FC<PerfilProps> = ({ userId }) => {
  const [user, setUser] = useState<PerfilUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [organizationTag, setOrganizationTag] = useState("");

  // Determina se o perfil é próprio
  const isOwnProfile = !userId || userId === auth.currentUser?.uid;

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const uidToFetch = userId || auth.currentUser?.uid;
        if (!uidToFetch) return;

        const userRef = doc(db, "Users", uidToFetch);
        const userSnap = await getDoc(userRef);
        const data = userSnap.exists() ? userSnap.data() : {};

        const perfil: PerfilUser = {
          uid: uidToFetch,
          displayName: data.displayName || "",
          email: data.email || "",
          photoUrl: data.photoURL || "", // agora usa photoURL do Firebase
          organizationTag: data.organizationTag || "",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        };

        setUser(perfil);
        setName(perfil.displayName);
        setAvatar(perfil.photoUrl || "");
        setOrganizationTag(perfil.organizationTag || "");
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
        photoURL: avatar, // atualiza photoURL no Firestore
        organizationTag,
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

  if (loading) return <p className="text-center mt-10">Carregando perfil...</p>;
  if (!user) return <p className="text-center mt-10 text-red-500">Usuário não encontrado.</p>;

  return (
    <Card
      className="space-y-6"
      style={{ maxHeight: "600px", overflowY: "auto", position: "relative" }}
    >{/* Header */}
      <CardHeader className="flex flex-col items-center gap-3">
        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-white/30 bg-gray-700 flex items-center justify-center relative">
          <img alt="Avatar" className="h-full w-full object-cover" src={avatar || "/default-avatar.png"} />
        </div>

        {editMode ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
        ) : (
          <h2 className="text-3xl font-bold flex items-center gap-3">
            {name}
            {organizationTag && (
              <Chip size="sm" variant="faded" color="primary">
                {organizationTag}
              </Chip>
            )}
          </h2>
        )}
      </CardHeader>

      <Divider />

      {/* Corpo */}
      <CardBody className="space-y-4">
        <div className="flex flex-col gap-3 text-gray-700">
          <div className="flex items-center gap-2">
            <HiOutlineExternalLink className="w-5 h-5 text-gray-500" />
            <span>{user.email || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <HiOutlineCalendar className="w-5 h-5 text-gray-500" />
            <span>Criado em: {user.createdAt?.toLocaleDateString() || "—"}</span>
          </div>
        </div>
      </CardBody>

      {/* Footer só aparece se for o próprio usuário */}
      {isOwnProfile && (
        <>
          <Divider />
          <CardFooter className="flex justify-between">
            {editMode ? (
              <>
                <Button color="primary" onPress={handleSave} startContent={<HiOutlineCheck />}>
                  Salvar
                </Button>
                <Button color="danger" onPress={() => setEditMode(false)} startContent={<HiOutlineX />}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button onPress={() => setEditMode(true)} startContent={<HiOutlinePencil />}>
                  Editar Nome
                </Button>
                <Button color="danger" onPress={() => signOut(auth)} startContent={<HiOutlineLogout />} />
              </>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default Perfil;