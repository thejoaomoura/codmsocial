"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Card, CardBody } from "@heroui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from "@heroui/drawer";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Input } from "@heroui/input";
import { HiArrowRight, HiOutlineSearch, HiMicrophone } from "react-icons/hi";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import TypingIndicator from "./components/TypingIndicator";
import AudioRecorder from "./components/AudioRecorder";
import AudioPlayer from "./components/AudioPlayer";
import { ChatMessage, ChatOverview } from "./types";
import { db } from "./firebase";

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
  isTyping?: { userId: string; userName: string; timestamp: number };
  onChatTextChange?: (text: string) => void;
  userName?: string;
  userAvatar?: string;
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
  isTyping,
  onChatTextChange,
  userName,
  userAvatar,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  // Função para enviar áudio
  const sendAudioMessage = async (audioBlob: Blob, duration: number) => {
    if (!showChatWith || !userName) return;

    try {
      // Converter o áudio para base64 string
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const audioDataString = reader.result as string;

        // Salvar mensagem do áudio como string
        const chatId = [userId, showChatWith.otherUserId].sort().join('_');
        await addDoc(collection(db, `Chats/${chatId}/Messages`), {
          senderId: userId,
          senderName: userName,
          senderAvatar: userAvatar || '',
          text: '',
          audioData: audioDataString, // Salvando o áudio como data string
          audioDuration: duration,
          messageType: 'audio',
          createdAt: serverTimestamp(),
        });

        setHasRecordedAudio(false);
      };
    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
    }
  };

  const handleAudioRecorded = (audioBlob: Blob, duration: number) => {
    setHasRecordedAudio(true);
    // Armazenar temporariamente os dados do áudio
    (window as any).tempAudioData = { audioBlob, duration };
  };

  const handleSendAudio = async (audioBlob: Blob, duration: number) => {
    if (!showChatWith || !audioBlob) return;
    
    // Limpar dados temporários
    (window as any).tempAudioData = null;
    
    await sendAudioMessage(audioBlob, duration);
    setHasRecordedAudio(false);
  };

   const router = useRouter();

  useEffect(() => {
    setIsOpen(!!showChatWith);
  }, [showChatWith]);

  const filteredConversas = useMemo(() => {
    if (!searchTerm) return conversas;

    return conversas.filter((c) =>
      c.otherUserName.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [conversas, searchTerm]);

  const columns = [
    { name: "Usuário", uid: "user" },
    { name: "Última Mensagem", uid: "lastMessage" },
    { name: "Não Lida", uid: "unread" },
  ];

  const renderCell = useCallback((c: ChatOverview, columnKey: string) => {
    switch (columnKey) {
      case "user":
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar
              alt={c.otherUserName}
              aria-label={`Avatar de ${c.otherUserName}`}
              src={c.otherUserAvatar}
              className="cursor-pointer"
              onClick={() => router.push(`/perfil/${c.otherUserId}`)}
            />
            <span>{c.otherUserName}</span>
          </div>
        );
      case "lastMessage":
        return (
          <div
            style={{
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.lastMessage || "—"}
          </div>
        );
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
      default:
        return null;
    }
  }, [router]);

  return (
    <>
      {/* Card com Search e Tabela */}
      <Card style={{ marginBottom: 16 }}>
        <CardBody>
          <Input
            isClearable
            aria-label="Campo de busca para filtrar conversas"
            placeholder="Buscar usuário nas conversas..."
            startContent={
              <HiOutlineSearch style={{ fontSize: 18, color: "#6b7280" }} />
            }
            style={{ marginBottom: 0 }}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <Table className="mt-2" aria-label="Lista de conversas">
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn key={column.uid}>{column.name}</TableColumn>
              )}
            </TableHeader>
            <TableBody
              emptyContent="Nenhuma conversa encontrada"
              items={filteredConversas}
            >
              {(c) => (
                <TableRow
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => openChatFromConversa(c)}
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
        placement="right"
        onOpenChange={(open) => setIsOpen(open)} // chamado ao clicar no X ou fora do drawer
      >
        <DrawerContent>
          <DrawerHeader
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Avatar
              alt={showChatWith?.otherUserName}
              aria-label={`Avatar de ${showChatWith?.otherUserName}`}
              src={showChatWith?.otherUserAvatar}
              className="cursor-pointer"
              onClick={() => showChatWith && router.push(`/perfil/${showChatWith.otherUserId}`)}
            />
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
            {chatMessages.map((m, index) => {
              const isSender = m.senderId !== showChatWith?.otherUserId;

              return (
                <div
                  key={
                    m.id || `msg-${index}-${m.createdAt?.seconds || Date.now()}`
                  }
                  style={{
                    display: "flex",
                    justifyContent: isSender ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      padding: m.messageType === 'audio' ? 0 : 8,
                      borderRadius: 8,
                      maxWidth: "70%",
                      background: m.messageType === 'audio' ? "transparent" : (isSender ? "#006affff" : "#ffffffff"),
                      color: isSender ? "white" : "black",
                    }}
                  >
                    {/* Renderizar áudio ou texto */}
                    {m.messageType === 'audio' && (m.audioUrl || m.audioData) ? (
                      <AudioPlayer
                        audioUrl={(m.audioUrl || m.audioData)!}
                        duration={m.audioDuration}
                      />
                    ) : (
                      <div>{m.text}</div>
                    )}
                    
                    {/* Timestamp apenas para mensagens de texto */}
                    {m.messageType !== 'audio' && (
                      <div
                        style={{ fontSize: 10, textAlign: "right", marginTop: 4 }}
                      >
                        {m.createdAt?.toDate
                          ? new Date(m.createdAt.toDate()).toLocaleTimeString()
                          : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Indicador de digitação */}
            {isTyping && isTyping.userId !== userId && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: 8,
                    borderRadius: 12,
                    maxWidth: "70%",
                    background: "hsl(var(--heroui-default-100))",
                    border: "1px solid hsl(var(--heroui-default-200))",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "hsl(var(--heroui-default-600))",
                      marginBottom: 4,
                    }}
                  >
                    {showChatWith?.otherUserName} está digitando...
                  </div>
                  <TypingIndicator
                    isVisible={!!isTyping && isTyping.userId !== userId}
                  />
                </div>
              </div>
            )}
          </DrawerBody>

          <DrawerFooter style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            {/* AudioRecorder que substitui o input quando ativo */}
            {(isRecording || hasRecordedAudio) ? (
              <AudioRecorder
                onAudioRecorded={handleAudioRecorded}
                onSendAudio={handleSendAudio}
                onRecordingStateChange={(recording) => {
                  setIsRecording(recording);
                  if (!recording) {
                    // Pequeno delay para verificar se realmente cancelou
                    setTimeout(() => {
                      if (!(window as any).tempAudioData) {
                        setHasRecordedAudio(false);
                      }
                    }, 100);
                  }
                }}
              />
            ) : (
              <>
                {/* AudioRecorder compacto no lado esquerdo */}
                <AudioRecorder
                  onAudioRecorded={handleAudioRecorded}
                  onSendAudio={handleSendAudio}
                  onRecordingStateChange={(recording) => {
                    setIsRecording(recording);
                    if (recording) {
                      setHasRecordedAudio(false);
                    }
                  }}
                />
                
                {/* Input de texto no centro */}
                <input
                  aria-label="Campo para digitar mensagem"
                  placeholder="Digite sua mensagem..."
                  style={{ flex: 1, padding: 8, borderRadius: 4 }}
                  value={chatText}
                  onChange={(e) => {
                    setChatText(e.target.value);
                    onChatTextChange?.(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                />
                
                {/* Botão de enviar no lado direito */}
                <Button
                  aria-label="Enviar mensagem"
                  color="primary"
                  onPress={sendMessage}
                  isDisabled={!chatText.trim()}
                >
                  <HiArrowRight className="w-3 h-3" />
                </Button>
              </>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default Chat;
