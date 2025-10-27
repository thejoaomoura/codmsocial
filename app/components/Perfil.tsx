"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { addToast } from "@heroui/toast";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, updateDoc, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  HiOutlineCalendar,
  HiOutlineExternalLink,
  HiOutlineCheck,
  HiOutlinePencil,
  HiOutlineX,
  HiOutlineLogout,
  HiArrowLeft,
  HiOutlineNewspaper,
  HiOutlineEye,
  HiOutlineUpload,
  HiOutlinePhotograph,
  HiOutlineUser,
} from "react-icons/hi";
import { Navbar, NavbarContent, NavbarItem } from "@heroui/navbar";
import { Tooltip } from "@heroui/tooltip";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Select, SelectItem } from "@heroui/select";
import { useRouter } from "next/navigation";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Code } from "@heroui/code";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/breadcrumbs";
import { Organization, Membership} from "../types"; // ajuste o caminho conforme seu projeto
import StatusIndicator from "./StatusIndicator";
import { usePresence } from "../hooks/usePresence";
import { useSafeUserPresence } from "../hooks/useSafeUserPresence";

interface PerfilUser {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  organizationTag?: string;
  organizationRole?: string;
  createdAt?: Date;
  // Campos de presença
  isOnline?: boolean;
  presence?: "online" | "away" | "offline";
  lastSeen?: any;
  privacy?: {
    lastSeen: "everyone" | "contacts" | "nobody" | "mutual";
  };
}

interface PerfilProps {
  userId?: string;
}


const navigation = [
  { label: "Retornar", icon: <HiArrowLeft className="w-5 h-5" /> },
];

const Perfil: React.FC<PerfilProps> = ({ userId }) => {
  const [authUser, setAuthUser] = useState<PerfilUser | null>(null);
  const [profileUser, setProfileUser] = useState<PerfilUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [organizationTag, setOrganizationTag] = useState("");
  const [organizationRole, setOrganizationRole] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [privacyLastSeen, setPrivacyLastSeen] = useState<"everyone" | "contacts" | "nobody" | "mutual">("everyone");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const handleLogout = async () => await signOut(auth);
  const isOwnProfile = !userId || userId === auth.currentUser?.uid;

  // Inicializa o sistema de presença para o usuário atual
  usePresence();
  
  // Busca dados de presença do usuário do perfil (apenas se userId for válido)
  const { presence: userPresence, loading: presenceLoading, error: presenceError } = useSafeUserPresence(userId || "");
const [organization, setOrganization] = useState<Organization | null>(null);
// --- Modal de membros ---
const [modalOpen, setModalOpen] = useState(false);
const [modalMembers, setModalMembers] = useState<Membership[]>([]);
const [modalMembersWithUserData, setModalMembersWithUserData] = useState<
  (Membership & { displayName?: string; photoURL?: string })[]
>([]);
const [modalOrgName, setModalOrgName] = useState("");
const [modalMemberFilter, setModalMemberFilter] = useState("");


useEffect(() => {
  const fetchOrganization = async () => {
    if (!profileUser?.organizationTag) {
      setOrganization(null);
      return;
    }

    try {
      const membershipQuery = query(
        collection(db, "memberships"),
        where("userId", "==", profileUser.uid)
      );
      
      const membershipSnapshot = await getDocs(membershipQuery);
      
      if (!membershipSnapshot.empty) {
        const membershipData = membershipSnapshot.docs[0].data();
        const orgRef = doc(db, "organizations", membershipData.organizationId);
        const orgSnap = await getDoc(orgRef);
        
        if (orgSnap.exists()) {
          const data = orgSnap.data();
          const foundOrg: Organization = {
            id: orgSnap.id,
            name: data.name,
            tag: data.tag,
            slug: data.slug,
            ownerId: data.ownerId,
            hasPendingRequest: data.hasPendingRequest,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            logoURL: data.logoURL,
            region: data.region,
            game: data.game,
            visibility: data.visibility,
            memberCount: data.memberCount,
            description: data.description,
            maxMembers: data.maxMembers,
            settings: data.settings,
          };
          setOrganization(foundOrg);
          return;
        }
      }
      
      // Se não encontrou membership, tenta buscar organizações públicas por tag
      const orgQuery = query(
        collection(db, "organizations"),
        where("tag", "==", profileUser.organizationTag),
        where("visibility", "==", "public")
      );
      
      const orgSnapshot = await getDocs(orgQuery);
      
      if (!orgSnapshot.empty) {
        const docSnap = orgSnapshot.docs[0];
        const data = docSnap.data();
        
        const foundOrg: Organization = {
          id: docSnap.id,
          name: data.name,
          tag: data.tag,
          slug: data.slug,
          ownerId: data.ownerId,
          hasPendingRequest: data.hasPendingRequest,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          logoURL: data.logoURL,
          region: data.region,
          game: data.game,
          visibility: data.visibility,
          memberCount: data.memberCount,
          description: data.description,
          maxMembers: data.maxMembers,
          settings: data.settings,
        };
        
        setOrganization(foundOrg);
      } else {
        setOrganization(null);
      }
    } catch (err) {
      console.error("Erro ao buscar organização:", err);
      setOrganization(null);
    }
  };

  fetchOrganization();
}, [profileUser?.organizationTag, profileUser?.uid]);

  // --- Carrega usuário logado ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const ref = doc(db, "Users", currentUser.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : {};

        setAuthUser({
          uid: currentUser.uid,
          displayName: data.displayName || currentUser.displayName || "Usuário",
          email: data.email || currentUser.email || "",
          photoURL: data.photoURL || currentUser.photoURL || "",
          organizationRole: data.organizationRole || "",
          organizationTag: data.organizationTag || "",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        });
      }
    });

    return () => unsub();
  }, []);

  // --- Carrega perfil visitado ou próprio ---
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const uidToFetch = userId || auth.currentUser?.uid;
        if (!uidToFetch) return;

        const snap = await getDoc(doc(db, "Users", uidToFetch));
        const data = snap.exists() ? snap.data() : {};

        // Buscar o role correto da coleção global memberships
        let correctRole = data.organizationRole || "";
        if (data.organizationTag) {
          try {
            const membershipQuery = query(
              collection(db, "memberships"),
              where("userId", "==", uidToFetch),
              where("organizationTag", "==", data.organizationTag)
            );
            const membershipSnapshot = await getDocs(membershipQuery);
            
            if (!membershipSnapshot.empty) {
              const membershipDoc = membershipSnapshot.docs[0];
              correctRole = membershipDoc.data().role || correctRole;
            }
          } catch (membershipError) {
            console.error("Erro ao buscar role da membership:", membershipError);
            // Manter o role da coleção Users como fallback
          }
        }

        const perfil: PerfilUser = {
          uid: uidToFetch,
          displayName: data.displayName || "Unknown user",
          organizationRole: correctRole,
          email: data.email || "",
          photoURL: data.photoURL || "",
          organizationTag: data.organizationTag || "",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          isOnline: data.isOnline || false,
          presence: data.presence || "offline",
          lastSeen: data.lastSeen,
          privacy: data.privacy || { lastSeen: "everyone" },
        };

        setProfileUser(perfil);
        setName(perfil.displayName);
        setAvatar(perfil.photoURL || "");
        setOrganizationTag(perfil.organizationTag || "");
        setPrivacyLastSeen(perfil.privacy?.lastSeen || "everyone");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // --- Salva nome ---
  const handleSave = async () => {
    if (!profileUser) return;

    try {
      const ref = doc(db, "Users", profileUser.uid);
      await updateDoc(ref, { 
        displayName: name,
        photoURL: avatar,
        organizationTag,
        privacy: {
          lastSeen: privacyLastSeen,
        },
      });

      if (auth.currentUser?.uid === profileUser.uid) {
        await updateProfile(auth.currentUser, { displayName: name, photoURL: avatar });
      }

      // Atualiza estado usando non-null assertion
      setProfileUser({ 
        ...profileUser, 
        displayName: name,
        photoURL: avatar,
        organizationTag,
        privacy: {
          lastSeen: privacyLastSeen,
        },
      });

      setEditMode(false);
      addToast({ title: "Sucesso", description: "Perfil atualizado!", color: "success" });
    } catch (err) {
      console.error(err);
      addToast({ title: "Erro", description: "Falha ao atualizar nome.", color: "danger" });
    }
  };

  // --- Salva avatar ---
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=b1356253eee00f53fbcbe77dad8acae8`, { method: "POST", body: formData });
      const data = await res.json();

      if (!data.success) throw new Error("Falha no upload");

      const newPhotoURL = data.data.url;

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: newPhotoURL });
        await updateDoc(doc(db, "Users", auth.currentUser.uid), { photoURL: newPhotoURL });
      }

      setAvatar(newPhotoURL);

      if (profileUser?.uid === auth.currentUser?.uid && profileUser) {
        setProfileUser({ ...profileUser, photoURL: newPhotoURL });
      }

      addToast({ title: "Sucesso", description: "Foto atualizada!", color: "success" });
    } catch {
      addToast({ title: "Erro", description: "Erro ao enviar imagem.", color: "danger" });
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
  
        // Buscar dados dos usuários para cada membro
        const membersWithUserData = await Promise.all(
          membersData.map(async (member) => {
            try {
              // Primeiro tenta buscar no documento do membership
              if (member.displayName && member.photoURL) {
                return {
                  ...member,
                  displayName: member.displayName,
                  photoURL: member.photoURL,
                };
              }
  
              const userDoc = await getDoc(doc(db, "Users", member.userId));
  
              if (userDoc.exists()) {
                const userData = userDoc.data();
  
                return {
                  ...member,
                  displayName:
                    userData.displayName || userData.email || "Usuário",
                  photoURL: userData.photoURL || "",
                };
              }
  
              // Fallback se não encontrar o usuário
              return {
                ...member,
                displayName: member.userId,
                photoURL: "",
              };
            } catch (error) {
              console.error(
                `Erro ao buscar dados do usuário ${member.userId}:`,
                error,
              );
  
              return {
                ...member,
                displayName: member.userId,
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
        console.error("Erro ao buscar membros da organização:", error);
        addToast({
          title: "Erro",
          description: "Não foi possível carregar membros",
          color: "danger",
        });
      }
    };
  


  if (loading) return <p className="text-center mt-10">Carregando perfil...</p>;
  if (!profileUser) return <p className="text-center mt-10 text-red-500">Usuário não encontrado.</p>;

  return (
   <div>
  {isOwnProfile ? null : (
    <>
    <Navbar>     
      <NavbarContent justify="start">
        {navigation.map((n) => (
          <NavbarItem key={n.label}>
            <Tooltip content={n.label} placement="bottom">
              <Button onPress={() => router.push("/")}>{n.icon}</Button>
            </Tooltip>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
                  <Button color="danger" onPress={handleLogout}>
                    <HiOutlineLogout className="w-5 h-5" />
                  </Button>
        {authUser && (
          <>
            <Dropdown>
              <DropdownTrigger>
                <div className="group h-12 w-12 rounded-full overflow-hidden border-2 border-white/30 bg-gray-700 flex items-center justify-center cursor-pointer">
                  <img
                    alt="Avatar"
                    src={authUser.photoURL || "/default-avatar.png"}
                    className="h-full w-full object-cover"
                  />
                </div>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem
                  key="change-photo"
                  onPress={() => inputRef.current?.click()}
                >
                  Alterar Foto
                </DropdownItem>
                <DropdownItem
                  key="change-name"
                  onPress={() => setShowNameModal(true)}
                >
                  Alterar Nome
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </>
        )}
      </NavbarContent>
    </Navbar>

  <div
    style={{
      maxWidth: 800,
      margin: "0 auto",
      marginTop: 0,
      marginBottom: 10,
      paddingLeft: 25,
    }}
  >
    <Breadcrumbs>
      <BreadcrumbItem
        startContent={<HiOutlineNewspaper />}
        onPress={() => router.push("/")}
      >
        Feed
      </BreadcrumbItem>
      <BreadcrumbItem>{profileUser.displayName}</BreadcrumbItem>
    </Breadcrumbs>
  </div>
</>
  )}


<Modal isOpen={showNameModal} onOpenChange={setShowNameModal}>
  <ModalContent>
    <ModalHeader>Editar Nome</ModalHeader>
    <ModalBody>
      <div className="flex flex-col gap-4">
        {/* Nome atual */}
        <div>
          <Code className="mb-2" color="primary">
            Seu nome atual
          </Code>
          <div className="flex items-center gap-2">
            {authUser?.organizationTag && (
              <Code
                className="flex items-center px-2 h-[38px] text-sm rounded"
                color="danger"
              >
                {authUser.organizationTag}
              </Code>
            )}
            <Input
              disabled
              className="h-[38px]"
              type="text"
              value={authUser?.displayName || ""}
            />
          </div>
        </div>

        {/* Novo nome */}
        <div>
          <Code className="mb-2" color="primary">
            Seu novo nome
          </Code>
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
      </div>
    </ModalBody>
    <ModalFooter>
      <Button onPress={() => setShowNameModal(false)}>Cancelar</Button>
      <Button
        color="primary"
        onPress={async () => {
          if (!newName.trim() || !authUser) return;

          try {
            // Atualiza no Firestore
            await updateDoc(doc(db, "Users", authUser.uid), { displayName: newName });

            // Atualiza no Firebase Auth
            if (auth.currentUser) {
              await updateProfile(auth.currentUser, { displayName: newName });
            }

            // Atualiza estado local
            setAuthUser({ ...authUser, displayName: newName });
            setShowNameModal(false);
            addToast({ title: "Sucesso", description: "Nome atualizado!", color: "success" });
          } catch (err) {
            console.error(err);
            addToast({ title: "Erro", description: "Falha ao atualizar nome.", color: "danger" });
          }
        }}
      >
        Salvar
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>

      {/* Perfil */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 0 }}>
        <Card className="space-y-6 mr-5 ml-5 bg-gray-900/50 border-gray-700"
              classNames={{
                base: "bg-gray-900/50 border border-gray-700",
                header: "bg-gray-800/30",
                body: "bg-gray-900/30",
                footer: "bg-gray-800/30"
              }}>
<CardHeader className="flex flex-col items-center gap-3">
  {/* Avatares */}
  <div className="flex items-center gap-2">
    <div className="relative">
      <img
        src={profileUser.photoURL || "/default-avatar.png"}
        alt="Avatar"
        className="h-20 w-20 rounded-full object-cover border-2 border-white/30 bg-gray-700 z-10"
      />
      {/* Indicador de status */}
      <div className="absolute -bottom-1 -right-1">
        <StatusIndicator 
          status={userPresence?.presence || profileUser.presence || "offline"} 
          size="md"
        />
      </div>
    </div>
    <img
      src={organization?.logoURL || "https://i.ibb.co/jZJ28pJm/image.png"}
      alt={organization?.name || "Organização"}
      className="-ml-10 h-20 w-20 rounded-full object-cover border-2 border-white/30 bg-gray-700 -z-10"
    />
  </div>

  {/* Nome, organização e cargo */}
  {isOwnProfile ? (
    editMode ? (
      <div className="w-full space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          label="Nome"
          variant="bordered"
          classNames={{
            input: "text-white",
            inputWrapper: "bg-gray-800/50 border-gray-600 hover:border-gray-500 focus-within:border-blue-500",
            label: "text-gray-300"
          }}
        />
        
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Foto do perfil</label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-gray-600 bg-gray-800/50 flex items-center justify-center shadow-lg">
              <img 
                alt="Avatar preview" 
                className="h-full w-full object-cover" 
                src={avatar || "/default-avatar.png"} 
              />
            </div>
            <div className="flex-1">
              <Chip
                as="button"
                onClick={() => inputRef.current?.click()}
                startContent={<HiOutlineUpload className="w-4 h-4" />}
                variant="bordered"
                className="bg-gray-800/50 border-gray-600 hover:border-blue-500 hover:bg-gray-700/50 transition-all cursor-pointer text-gray-300 hover:text-white"
              >
                Escolher arquivo
              </Chip>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-gray-400 mt-2">Formatos aceitos: JPG, PNG, GIF (máx. 5MB)</p>
            </div>
          </div>
        </div>
        
        <Input
          value={organizationTag}
          onChange={(e) => setOrganizationTag(e.target.value)}
          placeholder="Tag da organização"
          label="Tag da organização"
          variant="bordered"
          classNames={{
            input: "text-white",
            inputWrapper: "bg-gray-800/50 border-gray-600 hover:border-gray-500 focus-within:border-blue-500",
            label: "text-gray-300"
          }}
        />
        
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">Privacidade do status online</label>
          <Select
            selectedKeys={[privacyLastSeen]}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as string;
              setPrivacyLastSeen(selectedKey as any);
            }}
            variant="bordered"
            classNames={{
              trigger: "bg-gray-800/50 border-gray-600 hover:border-gray-500 data-[focus=true]:border-blue-500",
              value: "text-white",
              popoverContent: "bg-gray-800 border-gray-600",
              listboxWrapper: "max-h-[400px]"
            }}
          >
            <SelectItem key="everyone" className="text-gray-200 data-[hover=true]:bg-gray-700">
              Todos podem ver quando estou online
            </SelectItem>
            <SelectItem key="contacts" className="text-gray-200 data-[hover=true]:bg-gray-700">
              Apenas meus contatos
            </SelectItem>
            <SelectItem key="mutual" className="text-gray-200 data-[hover=true]:bg-gray-700">
              Apenas contatos mútuos
            </SelectItem>
            <SelectItem key="nobody" className="text-gray-200 data-[hover=true]:bg-gray-700">
              Ninguém pode ver meu status
            </SelectItem>
          </Select>
        </div>
      </div>
    ) : (
      <>
        <h2 className="text-3xl font-bold">{profileUser.displayName}</h2>

        {organization ? (
          <div className="flex flex-col items-center w-full -mt-2">
            {/* Nome da organização + role em um único Chip */}
            <div className="flex items-center gap-2">
              <Chip
                color={
                  profileUser.organizationRole === "owner"
                    ? "warning"
                    : profileUser.organizationRole === "manager"
                    ? "secondary"
                    : profileUser.organizationRole === "pro"
                    ? "primary"
                    : "default"
                }
                size="md"
                variant="flat"
                className="font-semibold"
              >
                {organization.name} • {
                  profileUser.organizationRole === "owner"
                    ? "👑 Dono"
                    : profileUser.organizationRole === "manager"
                    ? "⚡ Manager"
                    : profileUser.organizationRole === "pro"
                    ? "🌟 Pro Player"
                    : "🎮 Ranked"
                }
              </Chip>
              <Button
                color="secondary"
                size="sm"
                variant="flat"
                onClick={() =>
                  openMembersModal(organization.id, organization.name)
                }
              >
               <HiOutlineEye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 text-sm">
            Este usuário não pertence a nenhuma organização.
          </p>
        )}
      </>
    )
  ) : (
    <>
      <h2 className="text-3xl font-bold">{profileUser.displayName}</h2>

      {organization ? (
        <div className="flex flex-col items-center w-full -mt-2">
          {/* Nome da organização + role em um único Chip */}
          <div className="flex items-center gap-2">
            <Chip
              color={
                profileUser.organizationRole === "owner"
                  ? "warning"
                  : profileUser.organizationRole === "manager"
                  ? "secondary"
                  : profileUser.organizationRole === "pro"
                  ? "primary"
                  : "default"
              }
              size="md"
              variant="flat"
              className="font-semibold"
            >
              {organization.name} • {
                profileUser.organizationRole === "owner"
                  ? "👑 Dono"
                  : profileUser.organizationRole === "manager"
                  ? "⚡ Manager"
                  : profileUser.organizationRole === "pro"
                  ? "🌟 Pro Player"
                  : "🎮 Ranked"
              }
            </Chip>
            <Button
              color="secondary"
              size="sm"
              variant="flat"
              onClick={() =>
                openMembersModal(organization.id, organization.name)
              }
            >
              <HiOutlineEye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-400 text-sm">
          Este usuário não pertence a nenhuma organização.
        </p>
      )}
    </>
  )}
</CardHeader>

          <Divider />

          <CardBody className="space-y-3 text-gray-700">
            <div className="flex items-center gap-2">
              <HiOutlineExternalLink className="w-5 h-5 text-gray-500" />
              <span>{profileUser.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <HiOutlineCalendar className="w-5 h-5 text-gray-500" />
              <span>
                Criado em: {profileUser.createdAt ? profileUser.createdAt.toLocaleDateString() : "—"}
              </span>
            </div>
            
            {/* Status e visto por último */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <StatusIndicator 
                  status={userPresence?.presence || profileUser.presence || "offline"} 
                  size="sm"
                />
                <span className="font-medium">
                  {userPresence?.presence === "online" ? "Online" : 
                   userPresence?.presence === "away" ? "Ausente" : 
                   profileUser.presence === "online" ? "Online" :
                   profileUser.presence === "away" ? "Ausente" : "Offline"}
                </span>
              </div>
            </div>
            
            {userPresence?.lastSeen && userPresence.privacy?.lastSeen !== "nobody" && (
              <div className="flex items-center gap-2">
                <HiOutlineCalendar className="w-5 h-5 text-gray-500" />
                <span>
                  Visto por último: {userPresence.lastSeen?.toDate ? 
                    userPresence.lastSeen.toDate().toLocaleString("pt-BR") : 
                    "Data não disponível"}
                </span>
              </div>
            )}
          </CardBody>

          {isOwnProfile && (
            <CardFooter className="flex justify-center gap-3">
              {editMode ? (
                <>
                  <Chip
                    as="button"
                    onClick={handleSave}
                    startContent={<HiOutlineCheck className="w-4 h-4" />}
                    variant="solid"
                    color="success"
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    Salvar
                  </Chip>
                  <Chip
                    as="button"
                    onClick={() => setEditMode(false)}
                    startContent={<HiOutlineX className="w-4 h-4" />}
                    variant="bordered"
                    color="danger"
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    Cancelar
                  </Chip>
                </>
              ) : (
                <>
                  <Chip
                    as="button"
                    onClick={() => setEditMode(true)}
                    startContent={<HiOutlinePencil className="w-4 h-4" />}
                    variant="bordered"
                    color="primary"
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    Editar Perfil
                  </Chip>
                  <Chip
                    as="button"
                    onClick={() => signOut(auth)}
                    startContent={<HiOutlineLogout className="w-4 h-4" />}
                    variant="bordered"
                    color="danger"
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    Sair
                  </Chip>
                </>
              )}
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Modal de membros da organização */}
      <Modal isOpen={modalOpen} onOpenChange={setModalOpen} size="lg">
        <ModalContent>
          <ModalHeader>
            Membros de {modalOrgName}
          </ModalHeader>
          <ModalBody>
            <Input
              type="text"
              placeholder="Filtrar membros..."
              value={modalMemberFilter}
              onChange={(e) => setModalMemberFilter(e.target.value)}
              className="mb-3"
            />

            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {modalMembersWithUserData
                .filter((m) =>
                  m.displayName
                    ?.toLowerCase()
                    .includes(modalMemberFilter.toLowerCase()),
                )
                .map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between bg-gray-800/40 rounded-xl p-2"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={m.photoURL || "/default-avatar.png"}
                        size="sm"
                        radius="lg"
                      />
                      <div>
                        <p className="font-semibold">{m.displayName}</p>
                        <p className="text-xs text-gray-400">
                          {m.role === "owner"
                            ? "👑 Dono"
                            : m.role === "manager"
                            ? "⚡ Gerente"
                            : m.role === "pro"
                            ? "🌟 Pro Player"
                            : "🎮 Membro"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Botão Ver Perfil */}
                    {m.userId !== authUser?.uid && (
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        startContent={<HiOutlineUser className="w-4 h-4" />}
                        onClick={() => router.push(`/perfil/${m.userId}`)}
                      >
                        Ver Perfil
                      </Button>
                    )}
                  </div>
                ))}
              {modalMembersWithUserData.length === 0 && (
                <p className="text-center text-gray-500">Nenhum membro encontrado.</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="flat" onPress={() => setModalOpen(false)}>
              Fechar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Perfil;