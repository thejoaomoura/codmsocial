"use client";

import React, { useEffect, useState, useRef } from "react";
import FeedWithChat from "./FeedWithChat";
import Chat from "./Chat";
import Login from "./Login";
import { Post, ChatOverview, ChatMessage } from "./types";

import {
  Navbar,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { HiOutlineHome, HiOutlineInbox, HiOutlineLogout, HiOutlineMenu, HiOutlineNewspaper, HiOutlinePencil, HiOutlineSave, HiOutlineTicket, HiOutlineUserGroup, HiOutlineViewList, HiOutlineX } from "react-icons/hi";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
  query,
  orderBy,
  setDoc,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from "firebase/auth";

import { db, auth, provider } from "./firebase";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";

import { addToast, ToastProvider } from "@heroui/toast";
import { Code } from "@heroui/code";
import { Input } from "@heroui/input";
import { Tooltip } from "@heroui/tooltip";
import CriarOrganizacao from "./CriarOrganizacao";
import Organizacoes from "./Organizacoes";
import { useUserOrganizations, useOrganizations } from "./hooks/useOrganizations";
import { useUserMembership } from "./hooks/useMemberships";
import { useRoleManagement } from "./hooks/useRoleManagement";
import { HiOutlineBriefcase, HiOutlineGlobe, HiOutlineCog, HiOutlineShieldCheck } from "react-icons/hi";

// Componentes para as novas funcionalidades
import MinhasOrganizacoes from "./components/MinhasOrganizacoes";
import ExplorarOrganizacoes from "./components/ExplorarOrganizacoes";
import PainelOrganizacao from "./components/PainelOrganizacao";

const navigation = [
  { label: "Feed", icon: <HiOutlineNewspaper className="w-5 h-5" /> },
  { label: "Conversas", icon: <HiOutlineInbox className="w-5 h-5" /> },
  { label: "Minhas Organizações", icon: <HiOutlineBriefcase className="w-5 h-5" /> },
  { label: "Explorar Organizações", icon: <HiOutlineGlobe className="w-5 h-5" /> },
  { label: "Criar Organização", icon: <HiOutlineHome className="w-5 h-5" /> },
  { label: "Painel da Organização", icon: <HiOutlineShieldCheck className="w-5 h-5" /> },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
const [activeTab, setActiveTab] = useState<"Feed" | "Conversas" | "Minhas Organizações" | "Explorar Organizações" | "Criar Organização" | "Painel da Organização">("Feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [conversas, setConversas] = useState<ChatOverview[]>([]);
  const [activeChatOverview, setActiveChatOverview] = useState<ChatOverview | null>(null);
  const [showChatWith, setShowChatWith] = useState<ChatOverview | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState("");

  // Evento externo para abrir conversas
  useEffect(() => {
    const listener = () => setActiveTab("Conversas");
    window.addEventListener("goToConversas", listener);
    return () => window.removeEventListener("goToConversas", listener);
  }, []);

  // Listener para mudanças de aba via eventos customizados
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail as any);
    };
    
    window.addEventListener("changeTab", handleTabChange as EventListener);
    return () => window.removeEventListener("changeTab", handleTabChange as EventListener);
  }, []);

  const [profileNameTag, setProfileNameTag] = useState(""); 

  // Hooks para organizações - só executar se user estiver logado
  const { userOrganizations, loading: userOrgsLoading } = useUserOrganizations(user?.uid || null);
  const { userOrganizations: publicOrganizations, loading: publicOrgsLoading } = useOrganizations();
  const { getRoleName, getRoleEmoji } = useRoleManagement();

  // Pegar a primeira organização do usuário 
  const userOrg = userOrganizations?.[0] || null;
  const { membership: userMembership, loading: membershipLoading } = useUserMembership(
    userOrg?.id || null, 
    user?.uid || null
  );

  // Debug: Verificar valores dos hooks
  console.log('Page.tsx Debug:', {
    user: user ? `logged in as ${user.uid}` : 'undefined',
    userOrganizations: userOrganizations?.length || 0,
    userOrg: userOrg ? `found: ${userOrg.id}` : 'undefined',
    userMembership: userMembership ? `found: ${userMembership.role}` : 'undefined',
    userOrgsLoading,
    membershipLoading
  });

  // Debug adicional: Verificar se o usuário tem organizações mas não está sendo detectado
  if (user && userOrganizations && userOrganizations.length > 0) {
    console.log('Page.tsx - User has organizations:', userOrganizations);
    console.log('Page.tsx - First organization:', userOrganizations[0]);
  }

useEffect(() => {
  console.log('Setting up auth listener...');
  const unsub = onAuthStateChanged(auth, async (u) => {
    console.log('Auth state changed:', u ? `User logged in: ${u.uid}` : 'User logged out');
    setUser(u);
    if (u) {
      const userDocRef = doc(db, "Users", u.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setProfileName(userData.displayName || "");
        setProfileNameTag(userData.tag || ""); // nova state para a tag
        setProfilePhoto(userData.photoURL || "");
      } else {
        setProfileName(u.displayName || "");
        setProfileNameTag(""); // sem tag
        setProfilePhoto(u.photoURL || "");
      }
    }
  });
  return () => unsub();
}, []);

  // Posts
  useEffect(() => {
    const q = query(collection(db, "Posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
      setPosts(docs);
    });
    return () => unsub();
  }, []);

  // Conversas
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "Chats"), (snap) => {
      const list: ChatOverview[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (!data.participants?.includes(user.uid)) return;

        const otherUid = data.participants.find((uid: string) => uid !== user.uid);
        const otherName = data.names?.[otherUid] || otherUid;
        const otherAvatar = data.avatars?.[otherUid] || "";
        const unread = data.unreadBy?.includes(user.uid) || false;
        list.push({
          id: docSnap.id,
          otherUserId: otherUid,
          otherUserName: otherName,
          otherUserAvatar: otherAvatar || "",
          lastMessage: data.lastMessage ?? "",
          unread: unread || false,
        });
      });
      setConversas(list);
    });
    return () => unsub();
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      console.log('handleGoogleLogin - Iniciando login com Google...');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('handleGoogleLogin - Login bem-sucedido, usuário:', user.uid);

      const userRef = doc(db, "Users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('handleGoogleLogin - Novo usuário, criando documento...');
        // Novo usuário: salva createdAt
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(), // <-- timestamp para 24h
        });
        console.log('handleGoogleLogin - Documento do usuário criado');
      } else {
        console.log('handleGoogleLogin - Usuário existente, atualizando dados...');
        // Usuário já existe: atualiza dados sem alterar createdAt
        await updateDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
        console.log('handleGoogleLogin - Dados do usuário atualizados');
      }
    } catch (error: any) {
      // Tratar erros de popup cancelado pelo usuário sem mostrar erro
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // Usuário cancelou o login voluntariamente, não mostrar erro
        console.log('Login cancelado pelo usuário');
        return;
      }
      
      // Para outros erros, mostrar mensagem
      console.error('Erro no login:', error);
      addToast({
        title: "Erro no Login",
        description: "Erro ao fazer login. Tente novamente.",
        color: "danger"
      });
    }
  };


  const handleLogout = async () => await signOut(auth);

const handlePost = async () => {
  if (!user || !text.trim()) return;

  const userDocRef = doc(db, "Users", user.uid);
  const userDocSnap = await getDoc(userDocRef);
  const userData = userDocSnap.exists() ? userDocSnap.data() : {};

  await addDoc(collection(db, "Posts"), {
    authorName: userData.displayName || user.displayName || user.email?.split("@")[0],
    authorTag: userData.tag || null, // envia tag separada se existir
    authorId: user.uid,
    authorAvatar: userData.photoURL || user.photoURL || "",
    text: text.trim(),
    createdAt: serverTimestamp(),
    reactions: [],
  });

  setText("");
};


const handleComment = async (postId: string, commentText: string) => {
  if (!user || !commentText.trim()) return;

  const postRef = doc(db, "Posts", postId);

  // Carrega a tag do usuário (se existir)
  let userTag = "";
  try {
    const userRef = doc(db, "Users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      userTag = userSnap.data().tag || "";
    }
  } catch (error) {
    console.error("Erro ao buscar tag do usuário:", error);
  }

  const newComment = {
    authorId: user.uid,
    authorName: profileName || user.displayName || user.email?.split("@")[0] || "Anonymous",
    authorAvatar: profilePhoto || user.photoURL || "",
    authorTag: userTag || "", // ✅ adiciona tag se existir
    text: commentText.trim(),
    createdAt: new Date(),
  };

  try {
    await updateDoc(postRef, {
      comments: arrayUnion(newComment),
    });
    console.log("Comentário adicionado no post:", postId);
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
  }
};


// Função para deletar comentário
const handleDeleteComment = async (postId: string, comment: any) => {
  if (!user) return;

  // Só permite deletar se for o autor do comentário
  if (comment.authorId !== user.uid) {
    alert("Você só pode deletar seus próprios comentários.");
    return;
  }

  const postRef = doc(db, "Posts", postId);

  try {
    await updateDoc(postRef, {
      comments: arrayRemove(comment), // remove exatamente o objeto do array
    });
    console.log("Comentário deletado:", comment);
  } catch (err) {
    console.error("Erro ao deletar comentário:", err);
  }
};


  const toggleReaction = async (post: Post) => {
    if (!user || !post.id) return;
    const pRef = doc(db, "Posts", post.id);
    const reactions = new Set(post.reactions || []);
    if (reactions.has(user.uid)) reactions.delete(user.uid);
    else reactions.add(user.uid);
    await updateDoc(pRef, { reactions: Array.from(reactions) });
  };

  const openChatFromConversa = (c: ChatOverview): void => {
    if (!user) return;
    setActiveTab("Conversas");
    setActiveChatOverview(c);

    const chatId = [user.uid, c.otherUserId].sort().join("_");
    const chatCol = collection(db, "Chats", chatId, "Messages");

    // Configurar listener em tempo real para mensagens com ordenação correta
    const unsubscribe = onSnapshot(
      query(chatCol, orderBy("createdAt", "asc")), 
      (snap) => {
        console.log('Mensagens recebidas:', snap.docs.length);
        const msgs = snap.docs.map((d) => {
          const data = d.data() as ChatMessage;
          console.log('Mensagem:', data);
          return data;
        });
        setChatMessages(msgs);
      },
      (error) => {
        console.error('Erro no listener de mensagens:', error);
      }
    );

    // Marcar mensagens como lidas
    const chatDoc = doc(db, "Chats", chatId);
    getDoc(chatDoc).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      if (data.unreadBy?.includes(user.uid)) {
        updateDoc(chatDoc, {
          unreadBy: data.unreadBy.filter((uid: string) => uid !== user.uid),
        });
      }
    });

    setShowChatWith({ ...c });
  };

  const sendMessage = async () => {
    if (!user || !chatText.trim() || !showChatWith) return;

    const chatId = [user.uid, showChatWith.otherUserId].sort().join("_");
    const chatDoc = doc(db, "Chats", chatId);
    const chatCol = collection(db, "Chats", chatId, "Messages");

    try {
      console.log('Enviando mensagem para chatId:', chatId);
      
      // Adicionar mensagem à subcoleção
      await addDoc(chatCol, {
        senderId: user.uid,
        senderName: user.displayName || user.email?.split("@")[0],
        senderAvatar: user.photoURL || "",
        text: chatText.trim(),
        createdAt: serverTimestamp(),
      });

      console.log('Mensagem enviada com sucesso');

      // Atualizar documento principal do chat
      await setDoc(
        chatDoc,
        {
          participants: [user.uid, showChatWith.otherUserId],
          names: {
            [user.uid]: user.displayName || user.email?.split("@")[0],
            [showChatWith.otherUserId]: showChatWith.otherUserName,
          },
          avatars: {
            [user.uid]: user.photoURL || "",
            [showChatWith.otherUserId]: showChatWith.otherUserAvatar || "",
          },
          lastMessage: chatText.trim(),
          unreadBy: [showChatWith.otherUserId],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log('Documento do chat atualizado');
      setChatText("");
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      addToast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        color: "danger"
      });
    }
  };

  const handleProfileSave = async (newName: string) => {
    if (!user) return;

    const usersRef = collection(db, "Users");
    const q = query(usersRef);
    const snap = await getDocs(q);

    // Verifica se o nome já existe
    const nameExists = snap.docs.some(
      (docSnap) => docSnap.data().displayName?.toLowerCase() === newName.toLowerCase()
    );

    if (nameExists) {
      alert("Esse nome já está em uso, escolha outro.");
      return;
    }

    try {
      // Atualiza o Firestore
      await setDoc(
        doc(db, "Users", user.uid),
        { displayName: newName, photoURL: profilePhoto || "" },
        { merge: true }
      );

      // Atualiza o estado local
      setProfileName(newName);

      alert("Perfil atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      alert("Erro ao atualizar perfil.");
    }
  };



  const handleEditName = () => {
    setNewName(profileName);
    setShowNameModal(true);
  };

  const handleSubmitName = async () => {
    if (!newName.trim()) {
      return addToast({
        title: "Erro",
        description: "Nome não pode ser vazio",
        color: "danger",
      });
    }

    const q = query(collection(db, "Users"), where("displayName", "==", newName.trim()));
    const snap = await getDocs(q);

    if (!snap.empty) {
      return addToast({
        title: "Erro",
        description: "Este nome já está em uso.",
        color: "danger",
      });
    }

    const userRef = doc(db, "Users", user!.uid);
    await updateDoc(userRef, { displayName: newName.trim() });

    // Atualiza também no Firebase Auth
    await updateProfile(user!, { displayName: newName.trim() });

    setProfileName(newName.trim());
    setShowNameModal(false);

    addToast({
      title: "Sucesso",
      description: "Nome atualizado com sucesso!",
      color: "success",
    });
  };

  if (!user) return <Login handleGoogleLogin={handleGoogleLogin} />;

  return (
    <div>
      {/* Navbar */}
      <Navbar>
        {/* Navbar esquerda */}
        <NavbarContent justify="start">
        <div className="hidden sm:flex gap-2">
  {navigation.map((n) => (
    <NavbarItem key={n.label} isActive={activeTab === n.label}>
      <Tooltip content={n.label} placement="bottom">
<Button onPress={() => setActiveTab(n.label as "Feed" | "Conversas" | "Minhas Organizações" | "Explorar Organizações" | "Criar Organização" | "Painel da Organização")}>
          {n.icon}
          {/* Badge vermelho para Conversas */}
          {n.label === "Conversas" && conversas.some((c) => c.unread) && (
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "red",
                marginLeft: 4,
              }}
            />
          )}
        </Button>
      </Tooltip>
    </NavbarItem>
  ))}
</div>


          {/* Menu Mobile */}
          <div className="flex sm:hidden">
            <Dropdown>
              <DropdownTrigger>
                <Button>
                  <HiOutlineMenu className="w-5 h-5" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                {navigation.map((n) => (
                <DropdownItem
  key={n.label}
  onPress={() => setActiveTab(n.label as "Feed" | "Conversas" | "Minhas Organizações" | "Explorar Organizações" | "Criar Organização" | "Painel da Organização")}
  className="flex items-center justify-between w-full"
>
                    {/* Ícone + Texto lado a lado */}
                    <div className="flex items-center gap-2">
                      {n.icon}
                      <span>{n.label}</span>
                    </div>

                    {/* Badge vermelho para Conversas */}
                    {n.label === "Conversas" && conversas.some((c) => c.unread) && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "red",
                        }}
                      />
                    )}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        </NavbarContent>

        {/* Navbar direita */}
        <NavbarContent justify="end">
          <Button color="danger" onPress={handleLogout}>
            <HiOutlineLogout className="w-5 h-5" />
          </Button>

          {/* Avatar com dropdown */}
          <Dropdown>
            <DropdownTrigger>
              <div className="group h-12 w-12 rounded-full overflow-hidden border-2 border-white/30 bg-gray-700 flex items-center justify-center relative cursor-pointer">
                <img
                  src={profilePhoto || "/default-avatar.png"}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <HiOutlinePencil className="w-5 h-5" />
                </div>
              </div>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem key="edit-photo" onClick={() => inputRef.current?.click()}>Editar Foto</DropdownItem>
              <DropdownItem key="edit-name" onClick={handleEditName}>Editar Nome</DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={async (e) => {
              if (!e.target.files || e.target.files.length === 0) return;
              const file = e.target.files[0];
              const formData = new FormData();
              formData.append("image", file);

              try {
                const res = await fetch(
                  `https://api.imgbb.com/1/upload?key=b1356253eee00f53fbcbe77dad8acae8`,
                  { method: "POST", body: formData }
                );
                const data = await res.json();

                if (data.success) {
                  const newPhotoURL = data.data.url;
                  setProfilePhoto(newPhotoURL);

                  if (user) {
                    // Atualiza Auth
                    await updateProfile(user, { photoURL: newPhotoURL });

                    // Atualiza Firestore
                    const userDocRef = doc(db, "Users", user.uid);
                    await updateDoc(userDocRef, { photoURL: newPhotoURL });
                  }

                  addToast({
                    title: "Sucesso",
                    description: "Foto atualizada com sucesso!",
                    color: "success",
                  });
                } else {
                  addToast({
                    title: "Erro",
                    description: "Erro ao enviar imagem.",
                    color: "danger",
                  });
                }
              } catch {
                addToast({
                  title: "Erro",
                  description: "Erro ao enviar imagem.",
                  color: "danger",
                });
              }
            }}
          />

          {/* Modal para editar nome */}
          <Modal isOpen={showNameModal} onOpenChange={setShowNameModal}>
            <ModalContent>
              <ModalHeader>Editar Nome</ModalHeader>
              <ModalBody className="flex flex-col gap-2">
                <div>
                              <Code color="primary" className="mb-2">Seu nome atual</Code>
               <div className="flex items-center gap-2">
                
  {/* Tag em Code, alinhada à altura do input */}
  {profileNameTag && (
    <Code
      color="danger"
      className="flex items-center px-2 h-[38px] text-sm rounded" // h igual à altura do input
    >
      {profileNameTag}
    </Code>
  )}

  {/* Input com apenas o nome */}
  <Input
    type="text"
    value={profileName}
    disabled
    className="h-[38px]" // mesma altura que o Code
  />
</div>
                </div>
                <div>
                  <Code color="primary" className="mb-2">Seu novo nome</Code>
                  <Input
                    type="text"

                    onChange={(e) => setNewName(e.target.value)}

                  />
                </div>
              </ModalBody>
              <ModalFooter className="flex justify-end gap-2">
                <Button onPress={() => setShowNameModal(false)}><HiOutlineX className="w-4 h-4" /></Button>
                <Button color="primary" onPress={handleSubmitName}><HiOutlineSave className="w-4 h-4" /></Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </NavbarContent>
      </Navbar>

      {/* Conteúdo */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
        {activeTab === "Feed" && (
          <FeedWithChat
            posts={posts}
            user={user}
            text={text}
            setText={setText}
            handlePost={handlePost}
            toggleReaction={toggleReaction}
            conversas={conversas.map(c => ({
              ...c,
              lastMessage: c.lastMessage ?? "",
              unread: c.unread ?? false,
            }))}
            chatMessages={chatMessages.map(m => ({
              ...m,
              senderAvatar: m.senderAvatar ?? "",
            }))}
            showChatWith={showChatWith ? {
              ...showChatWith,
              otherUserAvatar: showChatWith.otherUserAvatar ?? "",
              lastMessage: showChatWith.lastMessage ?? "",
              unread: showChatWith.unread ?? false,
            } : null}
            // @ts-expect-error: Type mismatch due to different ChatOverview imports, but runtime shape is compatible
            setShowChatWith={setShowChatWith}
            sendMessage={sendMessage}
            chatText={chatText}
            setChatText={setChatText}
            currentUserId={user.uid}
            openChatFromConversa={openChatFromConversa}
             handleComment={handleComment} 
                   handleDeleteComment={handleDeleteComment} 
          />
        )}

        

        {activeTab === "Conversas" && (
          <Chat
            showChatWith={showChatWith ? {
              ...showChatWith,
              otherUserAvatar: showChatWith.otherUserAvatar ?? "",
              lastMessage: showChatWith.lastMessage ?? "",
              unread: showChatWith.unread ?? false,
            } : null}
            // @ts-expect-error: Type mismatch due to different ChatOverview imports, but runtime shape is compatible
            setShowChatWith={showChatWith}
            conversas={conversas.map(c => ({
              ...c,
              lastMessage: c.lastMessage ?? "",
              unread: c.unread ?? false,
            }))}
            chatMessages={chatMessages.map(m => ({
              ...m,
              senderAvatar: m.senderAvatar ?? "",
            }))}
            chatText={chatText}
            setChatText={setChatText}
            sendMessage={sendMessage}
            openChatFromConversa={openChatFromConversa}
          />
        )}

        {activeTab === "Minhas Organizações" && (
          <MinhasOrganizacoes 
            user={user}
            userOrganizations={userOrganizations}
            loading={userOrgsLoading}
          />
        )}

        {activeTab === "Explorar Organizações" && (
          <ExplorarOrganizacoes 
            user={user}
            organizations={publicOrganizations}
            loading={publicOrgsLoading}
          />
        )}

        {activeTab === "Criar Organização" && (
          <div>
            <CriarOrganizacao />
          </div>
        )}

        {activeTab === "Painel da Organização" && (
          <PainelOrganizacao 
            user={user}
            userOrg={userOrg}
            userMembership={userMembership}
            loading={userOrgsLoading || membershipLoading}
          />
        )}

        
      </div>
    </div>
  );
}