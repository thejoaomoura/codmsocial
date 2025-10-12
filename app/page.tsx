"use client";

import React, { useEffect, useState, useRef } from "react";
import FeedWithChat from "./FeedWithChat";
import Chat from "./Chat";
import Login from "./Login";
import { Post, ChatOverview, ChatMessage } from "./types";

import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Avatar } from "@heroui/avatar";  
import { Button } from "@heroui/button";
import { HiOutlineLogout, HiOutlineMenu, HiOutlinePencil } from "react-icons/hi";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
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
} from "firebase/firestore";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBZl9_FYc-wndFiFSrzN8RNJHrlR6VV5MY",
  authDomain: "coach-bc3b3.firebaseapp.com",
  projectId: "coach-bc3b3",
  storageBucket: "coach-bc3b3.appspot.com",
  messagingSenderId: "672742580848",
  appId: "1:672742580848:web:34dfa4f35be4a470950ab5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const navigation = ["Feed", "Conversas"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"Feed" | "Conversas">("Feed");
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

  // Evento externo para abrir conversas
  useEffect(() => {
    const listener = () => setActiveTab("Conversas");
    window.addEventListener("goToConversas", listener);
    return () => window.removeEventListener("goToConversas", listener);
  }, []);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setProfileName(u.displayName || "");
        setProfilePhoto(u.photoURL || "");
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
  lastMessage: data.lastMessage ?? "", // nunca undefined
  unread: unread || false,
});
      });
      setConversas(list);
    });
    return () => unsub();
  }, [user]);

  const handleGoogleLogin = async () => await signInWithPopup(auth, provider);
  const handleLogout = async () => await signOut(auth);

  const handlePost = async () => {
    if (!user || !text.trim()) return;
    await addDoc(collection(db, "Posts"), {
      authorName: user.displayName || user.email?.split("@")[0],
      authorId: user.uid,
      authorAvatar: user.photoURL || "",
      text: text.trim(),
      createdAt: serverTimestamp(),
      reactions: [],
    });
    setText("");
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

  onSnapshot(query(chatCol, orderBy("createdAt")), (snap) => {
    const msgs = snap.docs.map((d) => d.data() as ChatMessage);
    setChatMessages(msgs);
  });

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

    await addDoc(chatCol, {
      senderId: user.uid,
      senderName: user.displayName || user.email?.split("@")[0],
      senderAvatar: user.photoURL || "",
      text: chatText.trim(),
      createdAt: serverTimestamp(),
    });

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

    setChatText("");
  };

  const handleProfileSave = async () => {
    if (!user) return;
    try {
      await updateProfile(user, {
        displayName: profileName,
        photoURL: profilePhoto || undefined,
      });
      setUser({ ...user, displayName: profileName, photoURL: profilePhoto });
      alert("Perfil atualizado!");
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      alert("Erro ao atualizar perfil.");
    }
  };

  if (!user) return <Login handleGoogleLogin={handleGoogleLogin} />;

  return (
    <div>
      {/* Navbar */}
      <Navbar>
        {/* Navbar esquerda */}
        <NavbarContent justify="start">
        <NavbarContent justify="start">
  {/* Menu Desktop */}
  <div className="hidden sm:flex gap-2">
    {navigation.map((n) => (
      <NavbarItem key={n} isActive={activeTab === n}>
        <Button onPress={() => setActiveTab(n as "Feed" | "Conversas")}>
          {n}
          {n === "Conversas" && conversas.some((c) => c.unread) && (
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
      </NavbarItem>
    ))}
  </div>

  {/* Menu Mobile */}
  <div className="flex sm:hidden">
    <Dropdown>
      <DropdownTrigger>
        <Button><HiOutlineMenu className="w-5 h-5"/></Button>
      </DropdownTrigger>
      <DropdownMenu>
        {navigation.map((n) => (
          <DropdownItem key={n} onPress={() => setActiveTab(n as "Feed" | "Conversas")}>
            {n}
            {n === "Conversas" && conversas.some((c) => c.unread) && (
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
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  </div>
</NavbarContent>
        </NavbarContent>


        {/* Navbar direita */}
        <NavbarContent justify="end">
<Button color="danger" onPress={handleLogout}>
  <HiOutlineLogout className="w-5 h-5" />
</Button>

   <div className="group h-12 w-12 rounded-full overflow-hidden border-2 border-white/30 bg-gray-700 flex items-center justify-center relative">
            <img
              src={profilePhoto || "/default-avatar.png"}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
<button
  onClick={() => inputRef.current?.click()}
  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
>
  <HiOutlinePencil className="w-5 h-5" />
</button>
          </div>
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
                if (data.success) setProfilePhoto(data.data.url);
                else alert("Erro ao enviar imagem.");
              } catch (err) {
                alert("Erro ao enviar imagem.");
              }
            }}
          />
        

     
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
      </div>
    </div>
  );
}