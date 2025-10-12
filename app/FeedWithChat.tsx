import React, { useState, useEffect } from "react";
import Chat, { ChatOverview, ChatMessage } from "./Chat";
import { Post } from "./types";
import { doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from "@heroui/drawer";
import { HiHeart, HiOutlineArrowRight, HiOutlineChat, HiOutlineHeart, HiOutlineTrash, HiOutlineUsers, HiOutlineX } from "react-icons/hi";
import {Tooltip} from "@heroui/tooltip";
import {  Modal,  ModalContent,  ModalHeader,  ModalBody,  ModalFooter} from "@heroui/modal";
import {  Listbox,  ListboxSection,  ListboxItem} from "@heroui/listbox";
import { Input } from "@heroui/input";


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
}) => {
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [localPosts, setLocalPosts] = useState(posts);

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

  return (
    <>
      {/* Criar Post */}
      <section className="mb-6">
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
            <Card key={p.id}  className="mb-5">
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

                
          <Button
  onPress={() => toggleReaction(p)}
  size="sm"
  className={`flex items-center justify-center ${
    p.reactions?.includes(user?.uid || "") ? "bg-red-500 text-white" : ""
  }`}
>
<HiHeart className="w-4 h-4 mr-1" />
</Button>
<Button size="sm" className="ml-2" onPress={() => openLikesModal(p)}>
  <HiOutlineUsers className="w-4 h-4 mr-1" />
</Button>
{p.authorId !== user.uid && (
  <Button onClick={() => openChatFromFeed(p)} size="sm" className="ml-2">
    <HiOutlineChat className="w-4 h-4" />
  </Button>
)}
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
              Fechar
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
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

<Modal isOpen={showLikesModal} onOpenChange={setShowLikesModal}>
  <ModalContent>
    <ModalHeader className="flex items-center gap-2">
        <HiHeart className="w-6 h-6 mr-1" />
                   {likesUsers.length} {likesUsers.length === 1 ? "" : ""}
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
      <Button onPress={() => setShowLikesModal(false)}>Fechar</Button>
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
      <Button color="danger" onPress={confirmDelete}><HiOutlineTrash className="w-4 h-4"  /></Button>
    </ModalFooter>
  </ModalContent>
</Modal>
    </>

    
  );

};

export default FeedWithChat;