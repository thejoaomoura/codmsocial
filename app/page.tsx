"use client";

import React, { useEffect, useState, useRef } from "react";
import { Navbar, NavbarContent, NavbarItem } from "@heroui/navbar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Button } from "@heroui/button";
import {
  HiOutlineInbox,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineNewspaper,
  HiOutlinePencil,
  HiOutlineSave,
  HiOutlineX,
} from "react-icons/hi";
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
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from "firebase/auth";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { addToast } from "@heroui/toast";
import { Code } from "@heroui/code";
import { Input } from "@heroui/input";
import { Tooltip } from "@heroui/tooltip";
import {
  HiOutlineBriefcase,
  HiOutlineGlobe,
  HiOutlineCog,
  HiOutlineShieldCheck,
} from "react-icons/hi";
import { Breadcrumbs, BreadcrumbItem } from "@heroui/breadcrumbs";
import { HiOutlineBuildingStorefront, HiOutlineTrophy } from "react-icons/hi2";

import { db, auth, provider } from "./firebase";
import CriarOrganizacao from "./CriarOrganizacao";
import {
  useUserOrganizations,
  useOrganizations,
} from "./hooks/useOrganizations";
import { useUserMembership } from "./hooks/useMemberships";
import { useRoleManagement } from "./hooks/useRoleManagement";

// Componentes para as novas funcionalidades
import MinhasOrganizacoes from "./components/MinhasOrganizacoes";
import ExplorarOrganizacoes from "./components/ExplorarOrganizacoes";
import PainelOrganizacao from "./components/PainelOrganizacao";
import { Post, ChatOverview, ChatMessage } from "./types";
import Login from "./Login";
import Chat from "./Chat";
import FeedWithChat from "./FeedWithChat";
import MercadoOrganizacao from "./components/MercadoOrganizacao";
import RankingSystem from "./components/RankingSystem";
import Perfil from "./components/Perfil"; // importa o componente

const navigation = [
  { label: "Feed", icon: <HiOutlineNewspaper className="w-5 h-5" /> },
  { label: "Conversas", icon: <HiOutlineInbox className="w-5 h-5" /> },
  {
    label: "Ranking",
    icon: <HiOutlineTrophy className="w-5 h-5" />,
  },
  {
    label: "Minhas Organizações",
    icon: <HiOutlineBriefcase className="w-5 h-5" />,
  },
  {
    label: "Explorar Organizações",
    icon: <HiOutlineGlobe className="w-5 h-5" />,
  },
  { label: "Criar Organização", icon: <HiOutlineCog className="w-5 h-5" /> },
  {
    label: "Painel da Organização",
    icon: <HiOutlineShieldCheck className="w-5 h-5" />,
  },
  {
    label: "Atividades Recentes",
    icon: <HiOutlineBuildingStorefront className="w-5 h-5" />,
  },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "Feed"
    | "Conversas"
    | "Ranking"
    | "Minhas Organizações"
    | "Explorar Organizações"
    | "Criar Organização"
    | "Painel da Organização"
    | "Atividades Recentes"
    | "Perfil"
  >("Feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [conversas, setConversas] = useState<ChatOverview[]>([]);
  const [activeChatOverview, setActiveChatOverview] =
  useState<ChatOverview | null>(null);
  const [showChatWith, setShowChatWith] = useState<ChatOverview | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");

  // Estados para typing indicator
  const [isTyping, setIsTyping] = useState<{
    [chatId: string]: { userId: string; userName: string; timestamp: number };
  }>({});
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Ref para armazenar o unsubscribe do listener de mensagens atual
  const messagesUnsubscribeRef = useRef<(() => void) | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTag, setNewTag] = useState("");

  // Cleanup dos listeners ao desmontar o componente
  useEffect(() => {
    return () => {
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current();
      }
    };
  }, []);

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

    return () =>
      window.removeEventListener("changeTab", handleTabChange as EventListener);
  }, []);

  const [profileNameTag, setProfileNameTag] = useState("");

  // Hooks para organizações - só executar se user estiver logado
  const { userOrganizations, loading: userOrgsLoading } = useUserOrganizations(
    user?.uid || null,
  );
  const { userOrganizations: publicOrganizations, loading: publicOrgsLoading } =
    useOrganizations();
  const { getRoleName, getRoleEmoji } = useRoleManagement();

  // Estado para organização selecionada no painel
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(
    undefined,
  );

  // Pegar a organização selecionada ou a primeira disponível
  const userOrg = selectedOrgId
    ? userOrganizations?.find((org) => org.id === selectedOrgId) || null
    : userOrganizations?.[0] || null;

  const { membership: userMembership, loading: membershipLoading } =
    useUserMembership(userOrg?.id || null, user?.uid || null);

  // Atualizar organização selecionada quando as organizações carregarem
  useEffect(() => {
    if (userOrganizations && userOrganizations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(userOrganizations[0].id);
    }
  }, [userOrganizations, selectedOrgId]);

  useEffect(() => {
    console.log("Setting up auth listener...");
    const unsub = onAuthStateChanged(auth, async (u) => {
      //console.log('Auth state changed:', u ? `User logged in: ${u.uid}` : 'User logged out');
      setUser(u);
      if (u) {
        const userDocRef = doc(db, "Users", u.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          setProfileName(userData.displayName || "");
          setProfileNameTag(userData.organizationTag || ""); // nova state para a tag
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
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);

      setPosts(docs);
    });

    return () => unsub();
  }, []);

  // Conversas
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, "Chats"), (snap) => {
      const list: ChatOverview[] = [];
      const seenIds = new Set<string>(); // Prevenir duplicatas

      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;

        if (!data.participants?.includes(user.uid)) return;

        const otherUid = data.participants.find(
          (uid: string) => uid !== user.uid,
        );

        if (!otherUid || seenIds.has(docSnap.id)) return; // Evitar duplicatas

        seenIds.add(docSnap.id);

        const otherName = data.names?.[otherUid] || otherUid;
        const otherAvatar = data.avatars?.[otherUid] || "";
        const unread = data.unreadBy?.includes(user.uid) || false;

        list.push({
          id: docSnap.id,
          otherUserId: otherUid,
          otherUserName: otherName,
          otherUserAvatar: otherAvatar || "",
          lastMessage: data.lastMessage ?? "",
          unread: unread,
        });
      });

      // Ordenar por última mensagem (mais recentes primeiro)
      list.sort((a, b) => {
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;

        return 0;
      });

      setConversas(list);
    });

    return () => unsub();
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      console.log("handleGoogleLogin - Iniciando login com Google...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("handleGoogleLogin - Login bem-sucedido, usuário:", user.uid);

      const userRef = doc(db, "Users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log("handleGoogleLogin - Novo usuário, criando documento...");
        // Novo usuário: salva createdAt
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(), // <-- timestamp para 24h
        });
        console.log("handleGoogleLogin - Documento do usuário criado");
      } else {
        console.log(
          "handleGoogleLogin - Usuário existente, atualizando dados...",
        );
        // Usuário já existe: atualiza dados sem alterar createdAt
        await updateDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
        console.log("handleGoogleLogin - Dados do usuário atualizados");
      }
    } catch (error: any) {
      // Tratar erros de popup cancelado pelo usuário sem mostrar erro
      if (
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/cancelled-popup-request"
      ) {
        // Usuário cancelou o login voluntariamente, não mostrar erro
        console.log("Login cancelado pelo usuário");

        return;
      }

      // Para outros erros, mostrar mensagem
      console.error("Erro no login:", error);
      addToast({
        title: "Erro no Login",
        description: "Erro ao fazer login. Tente novamente.",
        color: "danger",
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
      authorName:
        userData.displayName || user.displayName || user.email?.split("@")[0],
      authorTag: userData.organizationTag || null, // envia tag separada se existir
      authorId: user.uid,
      authorAvatar: userData.photoURL || user.photoURL || "",
      text: text.trim(),
      createdAt: serverTimestamp(),
      reactions: {},
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
        userTag = userSnap.data().organizationTag || "";
      }
    } catch (error) {
      console.error("Erro ao buscar tag do usuário:", error);
    }

    const newComment = {
      authorId: user.uid,
      authorName:
        profileName ||
        user.displayName ||
        user.email?.split("@")[0] ||
        "Anonymous",
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

  const toggleReaction = async (
    post: Post,
    reaction?: { name: string; emoji: string },
  ) => {
    if (!user || !post.id) return;

    const pRef = doc(db, "Posts", post.id);

    // Clona o objeto de reações
    const reactions = { ...(post.reactions || {}) };

    if (reactions[user.uid]) {
      // Se já reagiu, remove a reação
      delete reactions[user.uid];
    } else if (reaction) {
      // Adiciona a nova reação
      reactions[user.uid] = {
        userId: user.uid,
        name: reaction.name,
        emoji: reaction.emoji,
        createdAt: new Date(),
      };
    }

    await updateDoc(pRef, { reactions });
  };

  // Função para atualizar status de digitação
  const updateTypingStatus = async (isTypingNow: boolean) => {
    if (!user || !showChatWith) return;

    const chatId = [user.uid, showChatWith.otherUserId].sort().join("_");
    const typingDoc = doc(db, "Chats", chatId, "Typing", user.uid);

    try {
      if (isTypingNow) {
        await setDoc(typingDoc, {
          userId: user.uid,
          userName: user.displayName || user.email?.split("@")[0],
          timestamp: serverTimestamp(),
          isTyping: true,
        });
      } else {
        await updateDoc(typingDoc, {
          isTyping: false,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar status de digitação:", error);
    }
  };

  // Função para lidar com mudanças no texto do chat
  const handleChatTextChange = (newText: string) => {
    setChatText(newText);

    if (!user || !showChatWith) return;

    // Limpar timeout anterior
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    if (newText.trim()) {
      // Usuário está digitando
      updateTypingStatus(true);

      // Definir timeout para parar de mostrar "digitando" após 2 minutos
      const timeout = setTimeout(() => {
        updateTypingStatus(false);
      }, 120000); // 2 minutos

      setTypingTimeout(timeout);
    } else {
      // Campo vazio, parar de mostrar "digitando"
      updateTypingStatus(false);
    }
  };

  const openChatFromConversa = (c: ChatOverview): void => {
    if (!user) return;

    // Limpar listener anterior se existir
    if (messagesUnsubscribeRef.current) {
      messagesUnsubscribeRef.current();
      messagesUnsubscribeRef.current = null;
    }

    setActiveTab("Conversas");
    setActiveChatOverview(c);

    const chatId = [user.uid, c.otherUserId].sort().join("_");
    const chatCol = collection(db, "Chats", chatId, "Messages");
    const typingCol = collection(db, "Chats", chatId, "Typing");

    // Configurar listener em tempo real para mensagens com ordenação correta
    const messagesUnsubscribe = onSnapshot(
      query(chatCol, orderBy("createdAt", "asc")),
      (snap) => {
        console.log("Mensagens recebidas:", snap.docs.length);
        const msgs = snap.docs.map((d) => {
          const data = d.data() as ChatMessage;

          console.log("Mensagem:", data);

          return { ...data, id: d.id }; // Adicionar ID do documento
        });

        setChatMessages(msgs);
      },
      (error) => {
        console.error("Erro no listener de mensagens:", error);
      },
    );

    // Configurar listener para status de digitação
    const typingUnsubscribe = onSnapshot(typingCol, (snap) => {
      const typingData: {
        [userId: string]: {
          userId: string;
          userName: string;
          timestamp: number;
        };
      } = {};

      snap.forEach((doc) => {
        const data = doc.data();

        if (data.isTyping && data.userId !== user.uid) {
          // Verificar se o timestamp não é muito antigo (mais de 2 minutos)
          const now = Date.now();
          const typingTime = data.timestamp?.toDate?.()?.getTime() || 0;

          if (now - typingTime < 120000) {
            // 2 minutos
            typingData[data.userId] = {
              userId: data.userId,
              userName: data.userName,
              timestamp: typingTime,
            };
          }
        }
      });

      setIsTyping((prev) => {
        const newState = { ...prev };

        if (Object.keys(typingData).length > 0) {
          newState[chatId] = Object.values(typingData)[0];
        } else {
          delete newState[chatId];
        }

        return newState;
      });
    });

    // Combinar os unsubscribes
    const combinedUnsubscribe = () => {
      messagesUnsubscribe();
      typingUnsubscribe();
    };

    // Armazenar o unsubscribe para limpeza posterior
    messagesUnsubscribeRef.current = combinedUnsubscribe;

    // Marcar mensagens como lidas imediatamente
    const chatDoc = doc(db, "Chats", chatId);

    getDoc(chatDoc).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;

      if (data.unreadBy?.includes(user.uid)) {
        updateDoc(chatDoc, {
          unreadBy: data.unreadBy.filter((uid: string) => uid !== user.uid),
        }).then(() => {
          // Atualizar o estado local imediatamente para feedback visual
          setConversas((prev) =>
            prev.map((conv) =>
              conv.id === c.id ? { ...conv, unread: false } : conv,
            ),
          );
        });
      }
    });

    setShowChatWith({ ...c, unread: false }); // Marcar como lida localmente
  };

  const sendMessage = async () => {
    if (!user || !chatText.trim() || !showChatWith) return;

    const chatId = [user.uid, showChatWith.otherUserId].sort().join("_");
    const chatDoc = doc(db, "Chats", chatId);
    const chatCol = collection(db, "Chats", chatId, "Messages");

    try {
      console.log("Enviando mensagem para chatId:", chatId);

      // Parar de mostrar "digitando" antes de enviar
      updateTypingStatus(false);

      // Limpar timeout se existir
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }

      // Adicionar mensagem à subcoleção
      await addDoc(chatCol, {
        senderId: user.uid,
        senderName: user.displayName || user.email?.split("@")[0],
        senderAvatar: user.photoURL || "",
        text: chatText.trim(),
        createdAt: serverTimestamp(),
      });

      console.log("Mensagem enviada com sucesso");

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
        { merge: true },
      );

      console.log("Documento do chat atualizado");
      setChatText("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      addToast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        color: "danger",
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
      (docSnap) =>
        docSnap.data().displayName?.toLowerCase() === newName.toLowerCase(),
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
        { merge: true },
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

    const q = query(
      collection(db, "Users"),
      where("displayName", "==", newName.trim()),
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      return addToast({
        title: "Erro",
        description: "Este nome já está em uso.",
        color: "danger",
      });
    }

    try {
      const userRef = doc(db, "Users", user!.uid);

      // Verifica se o documento do usuário existe
      const userDocSnap = await getDoc(userRef);

      if (userDocSnap.exists()) {
        await updateDoc(userRef, { displayName: newName.trim() });
      } else {
        // Documento não existe, cria um novo com setDoc
        await setDoc(userRef, {
          displayName: newName.trim(),
          photoURL: user!.photoURL || "",
          organizationTag: "",
          createdAt: serverTimestamp(),
        });
      }

      // Atualiza também no Firebase Auth
      await updateProfile(user!, { displayName: newName.trim() });

      setProfileName(newName.trim());
      setShowNameModal(false);

      addToast({
        title: "Sucesso",
        description: "Nome atualizado com sucesso!",
        color: "success",
      });
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      addToast({
        title: "Erro",
        description: "Erro ao atualizar nome. Tente novamente.",
        color: "danger",
      });
    }
  };

  if (!user) return <Login handleGoogleLogin={handleGoogleLogin} />;

  // Filtrar navegação baseado no status do usuário
  const filteredNavigation = navigation.filter((n) => {
    // Se o usuário já é membro de uma organização, não mostrar "Criar Organização"
    if (
      n.label === "Criar Organização" &&
      userOrganizations &&
      userOrganizations.length > 0
    ) {
      return false;
    }

    return true;
  });

  return (
    <div>
      {/* Navbar */}
      <Navbar>
        {/* Navbar esquerda */}
        <NavbarContent justify="start">
          <div className="hidden sm:flex gap-2">
            {filteredNavigation.map((n) => (
              <NavbarItem key={n.label} isActive={activeTab === n.label}>
                <Tooltip content={n.label} placement="bottom">
                  <Button
                    onPress={() =>
                      setActiveTab(
                        n.label as
                          | "Feed"
                          | "Conversas"
                          | "Ranking"
                          | "Minhas Organizações"
                          | "Explorar Organizações"
                          | "Criar Organização"
                          | "Painel da Organização"
                          | "Atividades Recentes",
                      )
                    }
                  >
                    {n.icon}
                    {/* Badge vermelho para Conversas */}
                    {n.label === "Conversas" &&
                      conversas.some((c) => c.unread) && (
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
                {filteredNavigation.map((n) => (
                  <DropdownItem
                    key={n.label}
                    className="flex items-center justify-between w-full"
                    onPress={() =>
                      setActiveTab(
                        n.label as
                          | "Feed"
                          | "Conversas"
                          | "Ranking"
                          | "Minhas Organizações"
                          | "Explorar Organizações"
                          | "Criar Organização"
                          | "Painel da Organização"
                          | "Atividades Recentes",
                      )
                    }
                  >
                    {/* Ícone + Texto lado a lado */}
                    <div className="flex items-center gap-2">
                      {n.icon}
                      <span>{n.label}</span>
                    </div>

                    {/* Badge vermelho para Conversas */}
                    {n.label === "Conversas" &&
                      conversas.some((c) => c.unread) && (
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
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  src={profilePhoto || "/default-avatar.png"}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <HiOutlinePencil className="w-5 h-5" />
                </div>
              </div>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem
                key="edit-photo"
                onClick={() => inputRef.current?.click()}
              >
                Editar Foto
              </DropdownItem>
              <DropdownItem key="edit-name" onClick={handleEditName}>
                Editar Nome
              </DropdownItem>
              <DropdownItem
                key="my-profile"
                onClick={() => setActiveTab("Perfil")}
              >
                Meu Perfil
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <input
            ref={inputRef}
            accept="image/*"
            style={{ display: "none" }}
            type="file"
            onChange={async (e) => {
              if (!e.target.files || e.target.files.length === 0) return;
              const file = e.target.files[0];
              const formData = new FormData();

              formData.append("image", file);

              try {
                const res = await fetch(
                  `https://api.imgbb.com/1/upload?key=b1356253eee00f53fbcbe77dad8acae8`,
                  { method: "POST", body: formData },
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
                  <Code className="mb-2" color="primary">
                    Seu nome atual
                  </Code>
                  <div className="flex items-center gap-2">
                    {/* Tag em Code, alinhada à altura do input */}
                    {profileNameTag && (
                      <Code
                        className="flex items-center px-2 h-[38px] text-sm rounded" // h igual à altura do input
                        color="danger"
                      >
                        {profileNameTag}
                      </Code>
                    )}

                    {/* Input com apenas o nome */}
                    <Input
                      disabled
                      className="h-[38px]" // mesma altura que o Code
                      type="text"
                      value={profileName}
                    />
                  </div>
                </div>
                <div>
                  <Code className="mb-2" color="primary">
                    Seu novo nome
                  </Code>
                  <Input
                    type="text"
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </ModalBody>
              <ModalFooter className="flex justify-end gap-2">
                <Button onPress={() => setShowNameModal(false)}>
                  <HiOutlineX className="w-4 h-4" />
                </Button>
                <Button color="primary" onPress={handleSubmitName}>
                  <HiOutlineSave className="w-4 h-4" />
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </NavbarContent>
      </Navbar>
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          marginTop: 10,
          marginBottom: -10,
          paddingLeft: 40,
        }}
      >
        <Breadcrumbs>
          {/* Sempre Home */}
          <BreadcrumbItem
            startContent={<HiOutlineNewspaper />}
            onPress={() => setActiveTab("Feed")}
          >
            Feed
          </BreadcrumbItem>

          {/* Aba ativa */}
          {activeTab && activeTab !== "Feed" && (
            <BreadcrumbItem isCurrent>{activeTab}</BreadcrumbItem>
          )}
        </Breadcrumbs>
      </div>
      {/* Conteúdo */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
        {activeTab === "Feed" && (
          <FeedWithChat
            chatMessages={chatMessages.map((m) => ({
              ...m,
              senderAvatar: m.senderAvatar ?? "",
            }))}
            chatText={chatText}
            conversas={conversas.map((c) => ({
              ...c,
              lastMessage: c.lastMessage ?? "",
              unread: c.unread ?? false,
            }))}
            currentUserId={user.uid}
            deleteConversa={(id: string) => {
              // Implementar lógica de deletar conversa se necessário
              console.log("Deletar conversa:", id);
            }}
            handleComment={handleComment}
            handleDeleteComment={handleDeleteComment}
            handlePost={handlePost}
            openChatFromConversa={openChatFromConversa}
            posts={posts}
            sendMessage={sendMessage}
            setChatText={setChatText}
            setShowChatWith={setShowChatWith}
            setText={setText}
            showChatWith={
              showChatWith
                ? {
                    ...showChatWith,
                    otherUserAvatar: showChatWith.otherUserAvatar ?? "",
                    lastMessage: showChatWith.lastMessage ?? "",
                    unread: showChatWith.unread ?? false,
                  }
                : null
            }
            text={text}
            toggleReaction={toggleReaction}
            user={user}
          />
        )}

        {activeTab === "Conversas" && (
          <Chat
            chatMessages={chatMessages.map((m) => ({
              ...m,
              senderAvatar: m.senderAvatar ?? "",
            }))}
            chatText={chatText}
            conversas={conversas.map((c) => ({
              ...c,
              lastMessage: c.lastMessage ?? "",
              unread: c.unread ?? false,
            }))}
            deleteConversa={(id: string) => {
              // Implementar lógica de deletar conversa se necessário
              console.log("Deletar conversa:", id);
            }}
            isTyping={
              showChatWith
                ? isTyping[
                    `${user?.uid}_${showChatWith.otherUserId}`
                      .split("_")
                      .sort()
                      .join("_")
                  ] || undefined
                : undefined
            }
            openChatFromConversa={openChatFromConversa}
            sendMessage={sendMessage}
            setChatText={setChatText}
            setShowChatWith={setShowChatWith}
            showChatWith={
              showChatWith
                ? {
                    ...showChatWith,
                    otherUserAvatar: showChatWith.otherUserAvatar ?? "",
                    lastMessage: showChatWith.lastMessage ?? "",
                    unread: showChatWith.unread ?? false,
                  }
                : null
            }
            userId={user?.uid || ""}
            onChatTextChange={handleChatTextChange}
          />
        )}

        {activeTab === "Ranking" && <RankingSystem user={user} />}

        {activeTab === "Minhas Organizações" && (
          <MinhasOrganizacoes
            loading={userOrgsLoading}
            selectedOrgId={selectedOrgId}
            user={user}
            userOrganizations={userOrganizations}
            onSelectOrganization={setSelectedOrgId}
          />
        )}

        {activeTab === "Explorar Organizações" && (
          <ExplorarOrganizacoes
            loading={publicOrgsLoading}
            organizations={publicOrganizations}
            user={user}
          />
        )}

        {activeTab === "Criar Organização" && (
          <div>
            <CriarOrganizacao />
          </div>
        )}

        {activeTab === "Painel da Organização" && (
          <PainelOrganizacao
            loading={userOrgsLoading || membershipLoading}
            selectedOrgId={selectedOrgId}
            user={user}
            userMembership={userMembership}
            userOrg={userOrg}
            userOrganizations={userOrganizations}
            onSelectOrganization={setSelectedOrgId}
          />
        )}

        {activeTab === "Atividades Recentes" && <MercadoOrganizacao />}
                {activeTab === "Perfil" && <Perfil  />}
      </div>
    </div>
  );
}
