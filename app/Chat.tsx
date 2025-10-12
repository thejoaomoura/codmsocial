"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Card, CardBody } from "@heroui/card";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from "@heroui/drawer";
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@heroui/table";
import { Input } from "@heroui/input";
import { HiArrowRight, HiOutlineSearch } from "react-icons/hi";

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

  useEffect(() => {
    setIsOpen(!!showChatWith);
  }, [showChatWith]);

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
            placeholder="Buscar usuário..."
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
                {(columnKey) => <TableCell>{renderCell(c, columnKey as string)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
<Drawer
  isOpen={isOpen}
  onOpenChange={(open) => {
    setIsOpen(open);
    if (!open) {
      setShowChatWith(null); // Reseta a conversa quando fechar
    }
  }}
  placement="right"
>
  <DrawerContent>
    <DrawerHeader style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Avatar src={showChatWith?.otherUserAvatar} alt={showChatWith?.otherUserName} />
      <span>{showChatWith?.otherUserName}</span>
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
            style={{ display: "flex", justifyContent: isSender ? "flex-end" : "flex-start" }}
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
                {m.createdAt?.toDate ? new Date(m.createdAt.toDate()).toLocaleTimeString() : ""}
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