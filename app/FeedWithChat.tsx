import React, { useState, useEffect } from "react";
import Chat, { ChatOverview, ChatMessage } from "./Chat";
import { Post } from "./types";
import { doc, deleteDoc, getDoc, onSnapshot, collection } from "firebase/firestore";
import { db } from "./firebase";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from "@heroui/drawer";
import { HiHeart, HiOutlineArrowRight, HiOutlineChat, HiOutlineHeart, HiOutlineTrash, HiOutlineUsers, HiOutlineX } from "react-icons/hi";
import { Tooltip } from "@heroui/tooltip";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Listbox, ListboxSection, ListboxItem } from "@heroui/listbox";
import { Input } from "@heroui/input";
import { Code } from "@heroui/code";
import AnimatedHeart from "./AnimatedHeart";


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
    const [showChatDrawer, setShowChatDrawer] = useState(false);
    const [localPosts, setLocalPosts] = useState<(Post & { commentInput?: string })[]>(posts);
    const [users, setUsers] = useState<{ uid: string; avatar: string; name: string; createdAt?: Date; }[]>([]);

    useEffect(() => {
        setLocalPosts(posts);
    }, [posts]);


    useEffect(() => {
        // Reseta conversa aberta ao trocar de usuário
        setShowChatWith(null);
        setShowChatDrawer(false);
    }, [currentUserId]);


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

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [postToDeleteId, setPostToDeleteId] = useState<string | null>(null);
    // Adicione no começo do componente FeedWithChat
    const [showLikesModal, setShowLikesModal] = useState(false);
    const [likesUsers, setLikesUsers] = useState<
        { uid: string; name: string; avatar: string }[]
    >([]);

    const fetchUserInfo = async (uid: string) => {
        try {
            const docRef = doc(db, "Users", uid); // ou "usuarios", se sua coleção tiver outro nome
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                return { uid, name: "Usuário desconhecido", avatar: "/default-avatar.png" };
            }
            const data = snap.data();
            return {
                uid,
                name: data.displayName || "Sem nome",
                avatar: data.photoURL || "/default-avatar.png",
            };
        } catch (error) {
            console.error("Erro ao buscar usuário:", error);
            return { uid, name: "Erro ao carregar", avatar: "/default-avatar.png" };
        }
    };

    const openLikesModal = async (p: Post) => {
        if (!p.reactions || p.reactions.length === 0) {
            setLikesUsers([]);
            setShowLikesModal(true);
            return;
        }

        // Busca todos os usuários que deram like
        const users = await Promise.all(p.reactions.map((uid) => fetchUserInfo(uid)));
        setLikesUsers(users);
        setShowLikesModal(true);
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
                    createdAt: data.createdAt?.toDate?.() || new Date(0), // converte Firestore Timestamp para Date
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
                    <Code color="danger" className="flex items-center">
                        <HiOutlineUsers className="mr-2" /> Novos usuários
                    </Code>
                </div>

                <CardBody className="p-0">
                    <div className="flex gap-4 overflow-x-auto" style={{ padding: "8px" }}>
                        {users

                            .filter((u) => {
                                const now = new Date();
                                return u.createdAt && now.getTime() - u.createdAt.getTime() < 24 * 60 * 60 * 1000;
                            })
                            .map((u) => (
                                <Tooltip key={u.uid} content={u.name} placement="top">
                                    <Avatar
                                        isBordered
                                        src={u.avatar}
                                        className="flex-shrink-0 cursor-pointer"
                                        style={{ width: 45, height: 45 }}
                                    />
                                </Tooltip>
                            ))}
                    </div>
                </CardBody>
            </Card>
            {/* Criar Post */}
            <section className="mb-3">

                <Card>
                    <CardBody>
                        <Input
                            placeholder="O que você está pensando?"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <div className="flex justify-between mt-3">
                            <Button onClick={handlePost} size="sm" color="primary">
                                <HiOutlineArrowRight className="w-4 h-4" />
                            </Button>


                            <Button
                                onClick={() => window.dispatchEvent(new CustomEvent("goToConversas"))}
                                size="sm"
                            >
                                <HiOutlineChat className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </section>

            {/* Lista de Posts */}
            {localPosts.length === 0 ? (
                <div></div>
            ) : (
                localPosts.map((p) => {
                    const liked = p.reactions?.includes(user.uid);
                    const isOwner = p.authorId === currentUserId;

                    return (
                        <Card key={p.id} className="mb-3">
                            <CardHeader className="flex items-center gap-3">
                                {p.authorId !== user.uid ? (
                                    <Tooltip content="Enviar mensagem" placement="top">
                                        <Avatar
                                            src={p.authorAvatar || "/default-avatar.png"}
                                            alt={p.authorName}
                                            className="h-10 w-10 cursor-pointer"
                                            onClick={() => openChatFromFeed(p)}
                                        />
                                    </Tooltip>
                                ) : (
                                    <Avatar
                                        src={p.authorAvatar || "/default-avatar.png"}
                                        alt={p.authorName}
                                        className="h-10 w-10"
                                    />
                                )}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{p.authorName}</span>
                                            <span className="text-xs text-gray-400">
                                                {p.createdAt?.toDate
                                                    ? new Date(p.createdAt.toDate()).toLocaleString()
                                                    : ""}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">

                                            {isOwner && (
                                                <Button
                                                    onClick={() => handleDeleteClick(p.id, p.authorId)}
                                                    color="danger"
                                                    size="sm"
                                                >
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </Button>


                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardBody>
                                <p className="text-gray-200 italic whitespace-pre-wrap ml-1">{p.text}</p>
                            </CardBody>
                            <CardFooter>
                                <div className="flex flex-col w-full mt-0">
                                    {/* Botões de reação */}
                                    <div className="flex items-center">
                                        <Button
                                            onPress={() => toggleReaction(p)}
                                            size="sm"
                                            className={`flex items-center justify-center ${p.reactions?.includes(user?.uid || "")
                                                    ? "bg-red-500 text-white"
                                                    : ""
                                                }`}
                                        >
                                            <HiHeart className="w-4 h-4 mr-1" />
                                        </Button>

                                        <Button size="sm" className="ml-2" onPress={() => openLikesModal(p)}>
                                            <HiOutlineUsers className="w-4 h-4 mr-1" />
                                        </Button>

                                        {p.authorId !== user.uid && (
                                            <Button
                                                onClick={() => openChatFromFeed(p)}
                                                size="sm"
                                                className="ml-2"
                                            >
                                                <HiOutlineChat className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Campo de comentário */}
                                    <div className="mt-3 flex w-full">
                                        <div className="flex items-center w-full">
                                            <Input
                                                placeholder="Escreva um comentário..."
                                                value={p.commentInput || ""}
                                                onChange={(e) =>
                                                    setLocalPosts((prev) =>
                                                        prev.map((post) =>
                                                            post.id === p.id
                                                                ? { ...post, commentInput: e.target.value }
                                                                : post
                                                        )
                                                    )
                                                }
                                                className="flex-1 mr-2 h-10" // força a altura do input
                                            />
                                            <Button
                                                size="sm"
                                                className="h-10 flex items-center justify-center" // mesma altura do input
                                                onClick={() => {
                                                    handleComment(p.id, p.commentInput || "");
                                                    // limpa o input
                                                    setLocalPosts((prev) =>
                                                        prev.map((post) =>
                                                            post.id === p.id ? { ...post, commentInput: "" } : post
                                                        )
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
                                                p.comments.slice().reverse().map((c, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex flex-col  pb-2 last:border-none"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Avatar
                                                                src={c.authorAvatar || "/default-avatar.png"}
                                                                size="sm"

                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] text-gray-200 -mt-0">
                                                                    {c.authorName}
                                                                </span>
                                                                <span className="text-[8px] text-gray-500 italic -mt-5 ml-12">
                                                                    {c.createdAt?.toDate
                                                                        ? (() => {
                                                                            const commentDate = new Date(c.createdAt.toDate());
                                                                            const today = new Date();

                                                                            // Zera horas/minutos/segundos para comparar só a data
                                                                            const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                                                            const commentZero = new Date(commentDate.getFullYear(), commentDate.getMonth(), commentDate.getDate());

                                                                            const diffTime = todayZero.getTime() - commentZero.getTime();
                                                                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                                                                            if (diffDays === 0) return "Hoje";
                                                                            if (diffDays === 1) return "1 d";
                                                                            return `${diffDays} d`;
                                                                        })()
                                                                        : ""}

                                                                </span>
                                                                <span className="text-xs text-gray-400 italic mt-3">
                                                                    {c.text}
                                                                </span>
                                                            </div>

                                                              {c.authorId === user.uid && (
        <Button
          color="danger"
          className="ml-auto"
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
            <Drawer isOpen={showChatDrawer} placement="right" onClose={() => setShowChatDrawer(false)}>
                <DrawerContent>
                    <DrawerHeader className="flex justify-between items-center">
                        <h2 className="font-bold text-white">Conversas</h2>
                        <Button size="sm" onClick={() => setShowChatDrawer(false)}>
                            <HiOutlineX className="w-4 h-4" />
                        </Button>
                    </DrawerHeader>

                    <DrawerBody>
                        <Chat
                            userId={user.id}
                            showChatWith={showChatWith}
                            setShowChatWith={setShowChatWith}
                            chatMessages={chatMessages}
                            chatText={chatText}
                            setChatText={setChatText}
                            sendMessage={sendMessage}
                            conversas={conversas}
                            openChatFromConversa={(c) => {
                                openChatFromConversa(c);
                                setShowChatWith(c);
                                setShowChatDrawer(true);
                            }}
                            deleteConversa={deleteConversa}
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
                        <AnimatedHeart />
                        <span className="text-md italic text-gray-300 mt-0.5">
                            {likesUsers.length} {likesUsers.length === 1 ? "" : ""}
                        </span>
                    </ModalHeader>
                    <ModalBody>
                        {likesUsers.length === 0 ? (
                            <p>Ninguém deu amei ainda.</p>
                        ) : (
                            <Listbox
                                aria-label="Lista de usuários que curtiram"
                                classNames={{
                                    base: "w-full max-w-[280px]",
                                    list: "max-h-[300px] overflow-y-auto",
                                }}
                            >
                                {likesUsers.map((u) => (
                                    <ListboxItem key={u.uid} textValue={u.name}>
                                        <div className="flex items-center gap-2">
                                            <Avatar
                                                src={u.avatar || "/default-avatar.png"}
                                                alt={u.name}
                                                size="sm"
                                                className="shrink-0"
                                            />
                                            <span className="text-sm">{u.name}</span>
                                        </div>
                                    </ListboxItem>
                                ))}
                            </Listbox>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button onPress={() => setShowLikesModal(false)}><HiOutlineX className="w-4 h-4" /></Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <ModalContent>
                    <ModalHeader>Confirmação</ModalHeader>
                    <ModalBody>
                        Tem certeza que deseja apagar este post?
                    </ModalBody>
                    <ModalFooter className="flex justify-end gap-2">
                        <Button onPress={() => setShowDeleteModal(false)}>        <HiOutlineX className="w-4 h-4" /></Button>
                        <Button color="danger" onPress={confirmDelete}><HiOutlineTrash className="w-4 h-4" /></Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>


    );

};

export default FeedWithChat;