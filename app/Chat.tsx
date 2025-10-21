"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Card, CardBody } from "@heroui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from "@heroui/drawer";
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@heroui/table";
import { Switch } from "@heroui/switch";
import { Input } from "@heroui/input";
import { HiArrowRight, HiOutlineSearch } from "react-icons/hi";
import {
  readConversationNotificationPreference,
  writeConversationNotificationPreference,
} from "./chatNotificationPreferences";

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: any;
}

export interface ChatOverview {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  unread: boolean;
}

interface ChatProps {
  userId: string;
  showChatWith: ChatOverview | null;
  setShowChatWith: React.Dispatch<React.SetStateAction<ChatOverview | null>>;
  chatMessages?: ChatMessage[];
  chatText: string;
  setChatText: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => void;
  conversas?: ChatOverview[];
  openChatFromConversa: (c: ChatOverview) => void;
  deleteConversa: (id: string) => void; // deletar apenas para este usuário
}

const Chat: React.FC<ChatProps> = ({
  userId,
  showChatWith,
  setShowChatWith,
  chatMessages = [],
  chatText,
  setChatText,
  sendMessage,
  conversas = [],
  openChatFromConversa,
  deleteConversa,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>(() =>
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "default"
    );
  const currentConversationId = showChatWith?.id ?? null;
  const hasNotificationSupport =
    typeof window !== "undefined" && "Notification" in window;
  const previousMessagesRef = useRef<ChatMessage[]>(chatMessages);
  const previousConversationIdRef = useRef<string | null>(currentConversationId);
  const [isConversationNotificationsEnabled, setIsConversationNotificationsEnabled] =
    useState(true);

  const ensureServiceWorker = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    try {
      const existingRegistration = await navigator.serviceWorker.getRegistration(
        "/notification-sw.js"
      );

      if (!existingRegistration) {
        await navigator.serviceWorker.register("/notification-sw.js");
      }
    } catch (error) {
      console.error("Erro ao registrar o service worker de notificações", error);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!hasNotificationSupport) return;

    if (Notification.permission === "default") {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
      } catch (error) {
        console.error("Erro ao solicitar permissão de notificações", error);
      }
    } else {
      setNotificationPermission(Notification.permission);
    }
  }, [hasNotificationSupport]);

  const showNotification = useCallback(
    async (message: ChatMessage) => {
      if (!hasNotificationSupport) return;
      if (notificationPermission !== "granted") return;
      if (!isConversationNotificationsEnabled) return;

      const title = `Nova mensagem de ${message.senderName}`;
      const options: NotificationOptions = {
        body: message.text,
        icon: message.senderAvatar,
        data: {
          chatUserId: showChatWith?.otherUserId,
        },
      };

      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, options);
          return;
        } catch (error) {
          console.error("Erro ao exibir notificação pelo service worker", error);
        }
      }

      try {
        new Notification(title, options);
      } catch (error) {
        console.error("Erro ao exibir notificação direta", error);
      }
    },
    [
      hasNotificationSupport,
      isConversationNotificationsEnabled,
      notificationPermission,
      showChatWith?.otherUserId,
    ]
  );

  useEffect(() => {
    setIsOpen(!!showChatWith);
  }, [showChatWith]);

  useEffect(() => {
    ensureServiceWorker();
    requestNotificationPermission();
  }, [ensureServiceWorker, requestNotificationPermission]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsConversationNotificationsEnabled(true);
      return;
    }

    const preference = readConversationNotificationPreference(
      currentConversationId,
      window.localStorage
    );
    setIsConversationNotificationsEnabled(preference);
  }, [currentConversationId]);

  const handleToggleConversationNotifications = useCallback(
    (enabled: boolean) => {
      setIsConversationNotificationsEnabled(enabled);

      if (typeof window !== "undefined") {
        writeConversationNotificationPreference(
          currentConversationId,
          enabled,
          window.localStorage
        );
      }

      if (enabled && notificationPermission === "default") {
        void requestNotificationPermission();
      }
    },
    [
      currentConversationId,
      notificationPermission,
      requestNotificationPermission,
    ]
  );

  useEffect(() => {
    const previousConversationId = previousConversationIdRef.current;
    const isSameConversation = previousConversationId === currentConversationId;
    const previousMessages = isSameConversation ? previousMessagesRef.current ?? [] : [];

    if (chatMessages.length > previousMessages.length) {
      const newMessages = chatMessages.slice(previousMessages.length);
      newMessages.forEach((message) => {
        void showNotification(message);
      });
    }

    previousMessagesRef.current = chatMessages;
    previousConversationIdRef.current = currentConversationId;
  }, [chatMessages, currentConversationId, showNotification]);

  const filteredConversas = useMemo(() => {
    if (!filterValue) return conversas;
    return conversas.filter((c) =>
      c.otherUserName.toLowerCase().includes(filterValue.toLowerCase())
    );
  }, [conversas, filterValue]);

  const columns = [
    { name: "Usuário", uid: "user" },
    { name: "Última Mensagem", uid: "lastMessage" },
    { name: "Não Lida", uid: "unread" },
  ];

  const renderCell = useCallback(
    (c: ChatOverview, columnKey: string) => {
      switch (columnKey) {
        case "user":
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar src={c.otherUserAvatar} alt={c.otherUserName} />
            </div>
          );
        case "lastMessage":
          return c.lastMessage || "—";
        case "unread":
          return c.unread ? (
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "red",
                display: "inline-block",
              }}
            />
          ) : null;
      }
    },
    [deleteConversa, openChatFromConversa]
  );

  return (
    <>
      {/* Card com Search e Tabela */}
      <Card style={{ marginBottom: 16 }}>
        <CardBody>
          <Input
            placeholder="Buscar usuário nas conversas..."
            value={filterValue}
            onValueChange={setFilterValue}
            isClearable
            style={{ marginBottom: 0 }}
            startContent={<HiOutlineSearch style={{ fontSize: 18, color: "#6b7280" }} />}
          />
          <Table className="mt-2">
            <TableHeader columns={columns}>
              {(column) => <TableColumn key={column.uid}>{column.name}</TableColumn>}
            </TableHeader>
            <TableBody items={filteredConversas} emptyContent="Nenhuma conversa encontrada">
              {(c) => (
                <TableRow
                  key={c.id}
                  onClick={() => openChatFromConversa(c)}
                  style={{ cursor: "pointer" }}
                >
                  {(columnKey) => (
                    <TableCell>{renderCell(c, columnKey as string)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
      <Drawer
        isOpen={isOpen}
        onOpenChange={(open) => setIsOpen(open)} // chamado ao clicar no X ou fora do drawer
        placement="right"
      >
        <DrawerContent>
          <DrawerHeader
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar src={showChatWith?.otherUserAvatar} alt={showChatWith?.otherUserName} />
              <span>{showChatWith?.otherUserName}</span>
            </div>
            {hasNotificationSupport && (
              <Switch
                size="sm"
                isSelected={isConversationNotificationsEnabled}
                isDisabled={!hasNotificationSupport}
                onValueChange={handleToggleConversationNotifications}
                aria-label="Alternar notificações desta conversa"
              >
                Notificações
              </Switch>
            )}
          </DrawerHeader>

          <DrawerBody
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              overflowY: "auto",
            }}
          >
            {chatMessages.length === 0 && <div>Nenhuma mensagem ainda...</div>}
            {chatMessages.map((m) => {
              const isSender = m.senderId !== showChatWith?.otherUserId;
              return (
                <div
                  key={m.id || Math.random()}
                  style={{
                    display: "flex",
                    justifyContent: isSender ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      maxWidth: "70%",
                      background: isSender ? "#006affff" : "#ffffffff",
                      color: isSender ? "white" : "black",
                    }}
                  >
                    <div>{m.text}</div>
                    <div style={{ fontSize: 10, textAlign: "right", marginTop: 4 }}>
                      {m.createdAt?.toDate
                        ? new Date(m.createdAt.toDate()).toLocaleTimeString()
                        : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </DrawerBody>

          <DrawerFooter style={{ display: "flex", gap: 8 }}>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Digite sua mensagem..."
              style={{ flex: 1, padding: 8, borderRadius: 4 }}
            />
            <Button color="primary" onPress={sendMessage}>
              <HiArrowRight className="w-3 h-3" />
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default Chat;