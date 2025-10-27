import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  doc,
  deleteDoc,
  getDoc,
  onSnapshot,
  collection,
  updateDoc,
} from "firebase/firestore";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from "@heroui/drawer";
import {
  HiOutlineArrowRight,
  HiOutlineChat,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlineX,
} from "react-icons/hi";
import { Tooltip } from "@heroui/tooltip";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Listbox, ListboxItem } from "@heroui/listbox";
import { Input } from "@heroui/input";
import { Code } from "@heroui/code";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Chip } from "@heroui/chip";

import { db } from "./firebase";
import { Post, PostReaction, ChatOverview, ChatMessage } from "./types";
import Chat from "./Chat";
import { useRouter } from "next/navigation";
import { usePresence } from "./hooks/usePresence";

interface FeedProps {
  posts: Post[];
  user: any;
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  handlePost: () => void;
  toggleReaction: (post: Post) => void;
  conversas: ChatOverview[];
  chatMessages: ChatMessage[];
  sendMessage: () => void;
  chatText: string;
  setChatText: React.Dispatch<React.SetStateAction<string>>;
  currentUserId: string;
  openChatFromConversa: (c: ChatOverview) => void;
  showChatWith: ChatOverview | null;
  setShowChatWith: React.Dispatch<React.SetStateAction<ChatOverview | null>>;
  deleteConversa: (id: string) => void; // função local
  handleComment: (postId: string, text: string) => Promise<void>;
  handleDeleteComment: (postId: string, comment: any) => void;
}

interface User {
  uid: string;
  name: string;
  organizationTag: string;
  avatar: string;
  createdAt?: Date;
  isOnline?: boolean;
  presence?: "online" | "away" | "offline";
  lastSeen?: any;
  privacy?: {
    lastSeen: "everyone" | "contacts" | "nobody" | "mutual";
  };
}

interface LikesUser {
  uid: string;
  name: string;
  organizationTag: string;
  avatar: string;
  reactionEmoji: string;
  reactionName: string;
}

const FeedWithChat: React.FC<FeedProps> = ({
  posts,
  user,
  text,
  setText,
  handlePost,
  toggleReaction,
  conversas,
  chatMessages,
  sendMessage,
  chatText,
  setChatText,
  currentUserId,
  openChatFromConversa,
  showChatWith,
  setShowChatWith,
  deleteConversa,
  handleComment,
  handleDeleteComment,
}) => {
  // Inicializa o sistema de presença
  usePresence();

  const router = useRouter();

  // Lista de reações do Feed
  const feedReactions = [
    { name: "Curtir", emoji: "👍" },
    { name: "Amei", emoji: "❤️" },
    { name: "Haha", emoji: "😂" },
    { name: "Uau", emoji: "😮" },
    { name: "Triste", emoji: "😢" },
    { name: "Grr", emoji: "😡" },
    { name: "Fogo", emoji: "🔥" }
  ];

  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [localPosts, setLocalPosts] =
    useState<(Post & { commentInput?: string })[]>(posts);
  const [users, setUsers] = useState<
    {
      uid: string;
      avatar: string;
      name: string;
      organizationTag: string;
      createdAt?: Date;
    }[]
  >([]);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(
    null,
  );
  const [reactionTimeout, setReactionTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [pickerPosition, setPickerPosition] = useState<{
    top: number;
    left: number;
    width?: number;
  } | null>(null);

  // Refs para cada botão de reação
  const reactionButtonRefs = useRef<{ [key: string]: HTMLDivElement | null }>(
    {},
  );

  // Constantes para o picker
  const PICKER_W_MOBILE = 340; 
  const PICKER_W_DESKTOP = 460; 
  const PICKER_H = 60; // altura aproximada do picker
  const GAP = 10; // espaço entre botão e picker
  const MARGIN = 16; // margem das bordas

  // Detecta dispositivos touch
  const isTouchDevice = () => {
    if (typeof window === "undefined") return false;

    return window.matchMedia("(pointer: coarse)").matches;
  };

  // Função para calcular posição dinâmica do picker
  const calculatePickerPosition = (postId: string) => {
    const btn = reactionButtonRefs.current[postId];

    if (!btn) return null;

    const rect = btn.getBoundingClientRect(); // relativo à viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const pickerWidth = vw < 768 ? PICKER_W_MOBILE : PICKER_W_DESKTOP;

    let left = rect.left + rect.width / 2;
    // tenta colocar ACIMA primeiro
    let top = rect.top - GAP - PICKER_H;

    if (top < MARGIN) top = rect.bottom + GAP;

    // se não couber abaixo (teclado aberto / viewport pequena), força dentro do viewport
    if (top + PICKER_H > vh - MARGIN)
      top = Math.max(MARGIN, vh - MARGIN - PICKER_H);

    // clamp horizontal (considera safe-area dos iPhones)
    const minX = MARGIN + pickerWidth / 2;
    const maxX = vw - MARGIN - pickerWidth / 2;

    left = Math.min(Math.max(left, minX), maxX);

    return { top, left, width: pickerWidth };
  };

  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  // Adicionar listener para fechar picker em touch fora dele
  useEffect(() => {
    if (!showReactionPicker || !isTouchDevice()) return;

    const handleTouchOutside = (e: TouchEvent) => {
      const target = e.target as Element;
      const picker = document.querySelector("[data-reaction-picker]");
      const button = reactionButtonRefs.current[showReactionPicker];

      if (
        picker &&
        !picker.contains(target) &&
        button &&
        !button.contains(target)
      ) {
        setShowReactionPicker(null);
        setPickerPosition(null);
      }
    };

    document.addEventListener("touchstart", handleTouchOutside);

    return () => document.removeEventListener("touchstart", handleTouchOutside);
  }, [showReactionPicker]);
  useEffect(() => {
    if (!showReactionPicker) return;

    const handler = () => {
      const id = showReactionPicker as string;

      setPickerPosition(calculatePickerPosition(id));
    };

    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);

    // primeira posição
    handler();

    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, [showReactionPicker]);

  useEffect(() => {
    // Reseta conversa aberta ao trocar de usuário
    setShowChatWith(null);
    setShowChatDrawer(false);
  }, [currentUserId]);

  const getReactionSummary = (
    reactions: Record<string, PostReaction> | undefined,
  ) => {
    if (!reactions) return {};

    const summary: Record<string, number> = {};

    Object.values(reactions).forEach((reaction) => {
      summary[reaction.emoji] = (summary[reaction.emoji] || 0) + 1;
    });

    return summary;
  };

  const openChatFromFeed = (p: Post) => {
    const convo: ChatOverview = {
      id: p.id,
      otherUserId: p.authorId,
      otherUserName: p.authorName,
      otherUserAvatar: p.authorAvatar,
      lastMessage: p.text,
      unread: false,
    };

    openChatFromConversa(convo);
    setShowChatDrawer(true);
  };

  const handleOpenChat = (u: User) => {
    const chatOverview: ChatOverview = {
      id: u.uid,
      otherUserId: u.uid,
      otherUserName: u.name,
      otherUserAvatar: u.avatar,
      lastMessage: "",
      unread: false,
    };

    openChatFromConversa(chatOverview);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDeleteId, setPostToDeleteId] = useState<string | null>(null);
  // Adicione no começo do componente FeedWithChat
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesUsers, setLikesUsers] = useState<LikesUser[]>([]);

  const fetchUserInfo = async (uid: string) => {
    const userRef = doc(db, "Users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return {
        uid,
        name: "Usuário desconhecido",
        organizationTag: "",
        avatar: "/default-avatar.png",
      };
    }

    const data = userSnap.data();

    return {
      uid,
      name: data.displayName || "Sem nome",
      organizationTag: data.organizationTag ?? "",
      avatar: data.photoURL || "/default-avatar.png",
    };
  };

  const openLikesModal = async (p: Post) => {
    const postReactions = p.reactions || {};
    const uids = Object.keys(postReactions);

    if (uids.length === 0) {
      setLikesUsers([]);
      setShowLikesModal(true);

      return;
    }

    // Busca os dados dos usuários que reagiram
    const users = await Promise.all(
      uids.map(async (uid) => {
        const userInfo = await fetchUserInfo(uid);
        const reaction = postReactions[uid];

        return {
          ...userInfo,
          reactionEmoji: reaction.emoji,
          reactionName: reaction.name,
        };
      }),
    );

    setLikesUsers(users);
    setShowLikesModal(true);
  };

  // Funções para o sistema de reações
  const handleReactionHover = (postId: string) => {
    // Em dispositivos touch, não usar hover timeouts
    if (isTouchDevice()) return;

    // Limpar timeout anterior se existir
    if (reactionTimeout) {
      clearTimeout(reactionTimeout);
      setReactionTimeout(null);
    }

    const timeout = setTimeout(() => {
      const position = calculatePickerPosition(postId);

      if (position) {
        setPickerPosition(position);
        setShowReactionPicker(postId);
      }
    }, 200); // Reduzido de 300ms para 200ms para abrir mais rápido

    setReactionTimeout(timeout);
  };

  const handleReactionLeave = () => {
    // Em dispositivos touch, não usar hover timeouts
    if (isTouchDevice()) return;

    if (reactionTimeout) {
      clearTimeout(reactionTimeout);
      setReactionTimeout(null);
    }

    // Delay maior para fechar o picker
    const timeout = setTimeout(() => {
      setShowReactionPicker(null);
      setPickerPosition(null);
    }, 500); // 500ms

    setReactionTimeout(timeout);
  };

  const handleReactionSelect = async (
    post: Post,
    reaction: { name: string; emoji: string },
  ) => {
    if (!user?.uid) return;

    const postRef = doc(db, "Posts", post.id);
    const postSnap = await getDoc(postRef);
    const postData = postSnap.exists() ? postSnap.data() : {};

    // Estrutura de reações atual
    const currentReactions = postData.reactions || {};

    // Se o usuário já reagiu com outra reação, substitui
    const updatedReactions = {
      ...currentReactions,
      [user.uid]: {
        emoji: reaction.emoji,
        name: reaction.name,
        createdAt: new Date().toISOString(),
      },
    };

    // Atualiza no Firestore
    await updateDoc(postRef, { reactions: updatedReactions });

    // Atualiza localmente o estado
    setLocalPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.id === post.id
          ? {
              ...p,
              reactions: updatedReactions,
            }
          : p,
      ),
    );

    setShowReactionPicker(null);
  };

  const getUserReaction = (post: Post) => {
    if (!user?.uid || !post.reactions) return null;
    const reaction = post.reactions[user.uid];

    return reaction ? { name: reaction.name, emoji: reaction.emoji } : null;
  };

  const handleDeleteClick = (postId: string, authorId: string) => {
    if (authorId !== currentUserId) {
      alert("Você só pode apagar seus próprios posts.");

      return;
    }
    setPostToDeleteId(postId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!postToDeleteId) return;
    try {
      setLocalPosts((prev) => prev.filter((p) => p.id !== postToDeleteId));
      await deleteDoc(doc(db, "Posts", postToDeleteId));
    } catch (err) {
      console.error(err);
      alert("Erro ao apagar post.");
    } finally {
      setShowDeleteModal(false);
      setPostToDeleteId(null);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Users"), (snap) => {
      const usersList = snap.docs.map((doc) => {
        const data = doc.data();

        return {
          uid: doc.id,
          name: data.displayName || "Sem nome",
          avatar: data.photoURL || "/default-avatar.png",
          organizationTag: data.organizationTag ?? "", // ✅ garante string, mesmo se não existir
          createdAt: data.createdAt?.toDate?.() || new Date(0),
        };
      });

      setUsers(usersList);
    });

    return () => unsub();
  }, []);

  return (
    <>
      <Card className="mb-3 p-2 overflow-visible">
        <div className="w-max mb-2">
          <Code className="flex items-center" color="danger">
            <HiOutlineUsers className="mr-2" /> Novos usuários
          </Code>
        </div>

        <CardBody className="p-0">
          <div
            className="flex gap-4 overflow-x-auto"
            style={{ padding: "8px" }}
          >
            {users
              .filter((u) => {
                const now = new Date();

                return (
                  u.createdAt &&
                  now.getTime() - u.createdAt.getTime() < 24 * 60 * 60 * 1000
                );
              })
              .map((u) =>
                u.uid === currentUserId ? (
                  // Usuário logado: apenas avatar sem dropdown
                  <Avatar
                    key={u.uid}
                    isBordered
                    className="flex-shrink-0 cursor-default opacity-80"
                    src={u.avatar}
                    style={{ width: 45, height: 45 }}
                  />
                ) : (
                  // Outros usuários: avatar com dropdown
                  <Dropdown key={u.uid}>
                    <DropdownTrigger>
                      <Avatar
                        isBordered
                        className="flex-shrink-0 cursor-pointer"
                        src={u.avatar}
                        style={{ width: 45, height: 45 }}
                      />
                    </DropdownTrigger>

                    <DropdownMenu className="p-0 min-w-[140px]">
                      <DropdownItem
                        key={`${u.uid}-name`}
                        isDisabled
                        className="flex items-center px-3 py-2 cursor-default text-sm font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <HiOutlineUser className="w-4 h-4" />
                          <span>{u.name}</span>
                        </div>
                      </DropdownItem>

                      <DropdownItem
                        key={`${u.uid}-conversar`}
                        className="flex items-center px-3 py-2"
                        onPress={() => handleOpenChat(u)}
                      >
                        <div className="flex items-center gap-2">
                          <HiOutlineChat className="w-4 h-4" />
                          <span>Conversar</span>
                        </div>
                      </DropdownItem>
                      {u.uid !== user.uid ? (
                        <DropdownItem
                          key={`${u.uid}-profile`}
                          className="flex items-center px-3 py-2"
                          onClick={() => router.push(`/perfil/${u.uid}`)}
                        >
                          <div className="flex items-center gap-2">
                            <HiOutlineUser className="w-4 h-4" />
                            <span>Visitar Perfil</span>
                          </div>
                        </DropdownItem>
                      ) : null}
                    </DropdownMenu>
                  </Dropdown>
                ),
              )}
          </div>
        </CardBody>
      </Card>
      {/* Criar Post */}
      <section className="mb-3">
        <Card>
          <CardBody>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                placeholder="O que você está pensando?"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <Button
                className="h-10 flex items-center justify-center" // mesma altura do input
                color="primary"
                size="sm"
                onClick={handlePost}
              >
                <HiOutlineArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Lista de Posts */}
      {localPosts.length === 0 ? (
        <div />
      ) : (
        localPosts.map((p) => {
          const liked =
            !!p.reactions && Object.keys(p.reactions).includes(user.uid);
          const isOwner = p.authorId === currentUserId;
          const reactionSummary = getReactionSummary(p.reactions);

          return (
            <Card key={p.id} className="mb-3">
              <CardHeader className="flex items-center gap-3">
                {p.authorId !== user.uid ? (
                  <Tooltip content="Visitar perfil" placement="top">
                  <div className="relative">
                    <Avatar
                      alt={p.authorName}
                      className="h-10 w-10 cursor-pointer"
                      src={p.authorAvatar || "/default-avatar.png"}
                      onClick={() => router.push(`/perfil/${p.authorId}`)}
                    />
                  </div>
                </Tooltip>
                ) : (
                  <div className="relative">
                    <Avatar
                      alt={p.authorName}
                      className="h-10 w-10"
                      src={p.authorAvatar || "/default-avatar.png"}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium flex items-center gap-1">
                        {p.authorTag && (
<span className="text-[14px] mr-0 ml-0 text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)] animate-pulse">
  {p.authorTag}
</span>
                        )}
                        {p.authorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {p.createdAt?.toDate
                          ? new Date(p.createdAt.toDate()).toLocaleString()
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(p.id, p.authorId)}
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardBody>
                <p className="text-gray-200 italic whitespace-pre-wrap ml-1">
                  {p.text}
                </p>
              </CardBody>
              <CardFooter className="overflow-visible">
                <div className="flex flex-col w-full mt-0 overflow-visible">
                  {Object.keys(reactionSummary).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {Object.entries(reactionSummary).map(([emoji, count]) => (
                        <Chip
                          key={emoji}
                          className="text-xs px-2 py-[2px]"
                          startContent={
                            <span className="text-sm">{emoji}</span>
                          }
                          variant="faded"
                        >
                          {count}
                        </Chip>
                      ))}
                    </div>
                  )}
                  {/* Botões de reação */}
                  <div className="flex items-center relative overflow-visible">
                    {/* Botão principal de reação com hover */}
                    <div
                      ref={(el) => {
                        reactionButtonRefs.current[p.id] = el;
                      }}
                      className="relative overflow-visible"
                      onMouseEnter={() => handleReactionHover(p.id)}
                      onMouseLeave={handleReactionLeave}
                      onTouchStart={() => {
                        if (isTouchDevice()) {
                          const position = calculatePickerPosition(p.id);

                          if (position) {
                            setPickerPosition(position);
                            setShowReactionPicker(p.id);
                          }
                        }
                      }}
                    >
                      <Button
                        className={`flex items-center justify-center transition-all duration-200 ${
                          getUserReaction(p)
                            ? "bg-red-500 text-white scale-105"
                            : "hover:scale-105"
                        }`}
                        size="sm"
                        onPress={() => toggleReaction(p)}
                      >
                        {getUserReaction(p) ? (
                          <span className="text-lg mr-1">
                            {getUserReaction(p)?.emoji}
                          </span>
                        ) : (
                          <></>
                        )}
                        <span className="text-xs">
                          {getUserReaction(p)
                            ? getUserReaction(p)?.name
                            : "Reagir"}
                        </span>
                      </Button>
                    </div>

                    <Button
                      className="ml-2"
                      size="sm"
                      onPress={() => openLikesModal(p)}
                    >
                      <HiOutlineUsers className="w-4 h-4 mr-1" />
                      {Object.keys(p.reactions || {}).length}
                    </Button>

                    {p.authorId !== user.uid && (
                      <Button
                        className="ml-2"
                        size="sm"
                        onClick={() => openChatFromFeed(p)}
                      >
                        <HiOutlineChat className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Campo de comentário */}
                  <div className="mt-3 flex w-full">
                    <div className="flex items-center w-full">
                      <Input
                        className="flex-1 mr-2 h-10" // força a altura do input
                        placeholder="Escreva um comentário..."
                        value={p.commentInput || ""}
                        onChange={(e) =>
                          setLocalPosts((prev) =>
                            prev.map((post) =>
                              post.id === p.id
                                ? { ...post, commentInput: e.target.value }
                                : post,
                            ),
                          )
                        }
                      />
                      <Button
                        className="h-10 flex items-center justify-center" // mesma altura do input
                        size="sm"
                        onClick={() => {
                          handleComment(p.id, p.commentInput || "");
                          // limpa o input
                          setLocalPosts((prev) =>
                            prev.map((post) =>
                              post.id === p.id
                                ? { ...post, commentInput: "" }
                                : post,
                            ),
                          );
                        }}
                      >
                        <HiOutlineArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Lista de comentários */}
                  <div className="mt-3 max-h-60 overflow-y-auto ounded-lg p-3 w-full">
                    <div className="flex flex-col gap-3 text-sm">
                      {p.comments?.length ? (
                        p.comments
                          .slice()
                          .reverse()
                          .map((c, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col  pb-2 last:border-none"
                            >
                              <div className="flex items-center gap-2">
            {c.authorId !== user.uid ? (
    <Tooltip content="Visitar perfil" placement="top">
      <div className="relative">
        <Avatar
          size="sm"
          src={c.authorAvatar || "/default-avatar.png"}
          className="cursor-pointer"
          onClick={() => router.push(`/perfil/${c.authorId}`)}
        />
      </div>
    </Tooltip>
  ) : (
    <div className="relative">
      <Avatar
        size="sm"
        src={c.authorAvatar || "/default-avatar.png"}
      />
    </div>
  )}
                                <div className="flex flex-col">
                                  <span className="text-[13px] text-gray-200 -mt-0">
                                    {c.authorTag && c.authorTag.trim() !== "" && (
<span className="text-[14px] mr-2 ml-0 text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)] animate-pulse">
   {c.authorTag}
</span>
                                    )}
                                    {c.authorName}
                                    <span className="text-[8px] text-gray-500 italic ml-1">
                                      {c.createdAt?.toDate
                                        ? (() => {
                                            const commentDate = new Date(
                                              c.createdAt.toDate(),
                                            );
                                            const today = new Date();

                                            // Zera horas/minutos/segundos para comparar só a data
                                            const todayZero = new Date(
                                              today.getFullYear(),
                                              today.getMonth(),
                                              today.getDate(),
                                            );
                                            const commentZero = new Date(
                                              commentDate.getFullYear(),
                                              commentDate.getMonth(),
                                              commentDate.getDate(),
                                            );

                                            const diffTime =
                                              todayZero.getTime() -
                                              commentZero.getTime();
                                            const diffDays = Math.floor(
                                              diffTime / (1000 * 60 * 60 * 24),
                                            );

                                            if (diffDays === 0) return "Hoje";
                                            if (diffDays === 1) return "1 d";

                                            return `${diffDays} d`;
                                          })()
                                        : ""}
                                    </span>
                                  </span>

                                  <span className="text-xs text-gray-400 italic mt-1">
                                    {c.text}
                                  </span>
                                </div>

                                {c.authorId === user.uid && (
                                  <Button
                                    className="ml-auto"
                                    color="danger"
                                    size="sm"
                                    onClick={() => handleDeleteComment(p.id, c)}
                                  >
                                    <HiOutlineTrash className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-center text-gray-500 italic">
                          Nenhum comentário ainda
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardFooter>
            </Card>
          );
        })
      )}

      {/* Drawer lateral do Chat */}
      <Drawer
        isOpen={showChatDrawer}
        placement="right"
        onClose={() => setShowChatDrawer(false)}
      >
        <DrawerContent>
          <DrawerHeader className="flex justify-between items-center">
            <h2 className="font-bold text-white">Conversas</h2>
            <Button size="sm" onClick={() => setShowChatDrawer(false)}>
              <HiOutlineX className="w-4 h-4" />
            </Button>
          </DrawerHeader>

          <DrawerBody>
            <Chat
              chatMessages={chatMessages}
              chatText={chatText}
              conversas={conversas}
              deleteConversa={deleteConversa}
              isTyping={undefined}
              openChatFromConversa={(c) => {
                openChatFromConversa(c);
                setShowChatWith(c);
                setShowChatDrawer(true);
              }}
              sendMessage={sendMessage}
              setChatText={setChatText}
              setShowChatWith={setShowChatWith}
              showChatWith={showChatWith}
              userId={user.id}
              onChatTextChange={undefined}
            />
          </DrawerBody>

          <DrawerFooter>
            <Button size="sm" onClick={() => setShowChatDrawer(false)}>
              <HiOutlineX className="w-4 h-4" />
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Modal isOpen={showLikesModal} onOpenChange={setShowLikesModal}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <span className="text-md italic text-gray-300 mt-0.5">Reacoes</span>
          </ModalHeader>
          <ModalBody>
            {likesUsers.length === 0 ? (
              <p>Sem reacao ainda.</p>
            ) : (
             <Listbox
  aria-label="Lista de usuários que curtiram"
  classNames={{
    base: "w-full max-w-[280px] -mt-3",
    list: "max-h-[300px] overflow-y-auto",
  }}
>
  {likesUsers.map((u) => (
   <ListboxItem key={u.uid} textValue={u.name}>
 {u.uid !== user.uid ? (
  <Tooltip content="Visitar perfil" placement="top">
    <button
      type="button"
      className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/20 rounded-md p-1 transition-colors"
      onClick={() => router.push(`/perfil/${u.uid}`)}
    >
      <Avatar
        alt={u.name}
        className="h-8 w-8 rounded-full"
        src={u.avatar || "/default-avatar.png"}
      />
      <span className="font-medium">{u.name}</span>
      <span className="ml-2 text-lg">{u.reactionEmoji}</span>
    </button>
  </Tooltip>
) : (
  <div className="flex items-center gap-2">
    <Avatar
      alt={u.name}
      className="h-8 w-8 rounded-full"
      src={u.avatar || "/default-avatar.png"}
    />
    <span className="font-medium">{u.name}</span>
    <span className="ml-2 text-lg">{u.reactionEmoji}</span>
  </div>
)}
    </ListboxItem>
      ))}
    </Listbox>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onPress={() => setShowLikesModal(false)}>
              <HiOutlineX className="w-4 h-4" />
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <ModalContent>
          <ModalHeader>Confirmação</ModalHeader>
          <ModalBody>Tem certeza que deseja apagar este post?</ModalBody>
          <ModalFooter className="flex justify-end gap-2">
            <Button onPress={() => setShowDeleteModal(false)}>
              {" "}
              <HiOutlineX className="w-4 h-4" />
            </Button>
            <Button color="danger" onPress={confirmDelete}>
              <HiOutlineTrash className="w-4 h-4" />
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Portal para o picker de reações */}
      {showReactionPicker &&
        pickerPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-reaction-picker
            className="fixed rounded-full px-4 py-3 shadow-2xl border border-gray-600/50 flex gap-1 z-[9999] backdrop-blur-sm animate-in fade-in-0 zoom-in-0 slide-in-from-bottom-2 duration-300 max-w-[95vw]"
            style={{
              top: pickerPosition.top,
              left: pickerPosition.left,
              width: pickerPosition.width,
              transform: "translateX(-50%)",
              // opcional: respeitar safe area no iOS
              paddingLeft: "max(16px, env(safe-area-inset-left))",
              paddingRight: "max(16px, env(safe-area-inset-right))",
            }}
            // no touch não use hover timeouts
            onMouseEnter={() => {
              if (!isTouchDevice() && reactionTimeout) {
                clearTimeout(reactionTimeout);
                setReactionTimeout(null);
              }
            }}
            onMouseLeave={() => {
              if (!isTouchDevice()) {
                const timeout = setTimeout(() => {
                  setShowReactionPicker(null);
                  setPickerPosition(null);
                }, 300);

                setReactionTimeout(timeout);
              }
            }}
          >
            {feedReactions.map((reaction, index) => (
              <button
                key={index}
                className="text-2xl md:text-3xl hover:scale-125 transition-all duration-200 p-1.5 md:p-2 rounded-full hover:bg-gray-700/50 transform hover:-translate-y-1 cursor-pointer flex-shrink-0"
                style={{
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                  minWidth: "40px",
                  minHeight: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={reaction.name}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const currentPost = localPosts.find(
                    (post) => post.id === showReactionPicker,
                  );

                  if (currentPost) {
                    handleReactionSelect(currentPost, reaction);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

export default FeedWithChat;
