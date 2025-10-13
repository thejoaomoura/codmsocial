"use client";

import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { HiOutlineSave, HiOutlineCheck, HiOutlineX, HiOutlineUserRemove, HiOutlineUserAdd, HiOutlineUsers } from "react-icons/hi";
import { addToast } from "@heroui/toast";
import { Card } from "@heroui/card";
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@heroui/table";
import { Avatar } from "@heroui/avatar";
import { Code } from "@heroui/code";


interface Organizacao {
  id: string;
  nome: string;
  tag?: string;
  creatorId: string;
  members: string[];
  maxMembros: number;
  pendingRequests?: string[];
}

interface User {
  uid: string;
  photoURL: string;
  displayName?: string;
  email?: string;
  tag?: string;
}

export default function CriarOuGerenciarOrganizacao() {
  const [user] = useAuthState(auth);
  const [nome, setNome] = useState("");
  const [tag, setTag] = useState("");
  const [myOrg, setMyOrg] = useState<Organizacao | null>(null);
  const [membersData, setMembersData] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const maxMembros = 100;

  // Carrega organização do usuário (criador ou membro)
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, "Organizacoes"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organizacao));
      const orgDoUsuario = list.find((o) => o.creatorId === user.uid || o.members.includes(user.uid));
      setMyOrg(orgDoUsuario || null);
    });

    return () => unsub();
  }, [user]);

  // Carrega os usuários pendentes
  useEffect(() => {
    if (!myOrg?.pendingRequests?.length) {
      setPendingUsers([]);
      return;
    }

    const loadPendingUsers = async () => {
      try {
        const docs = await Promise.all(
          myOrg.pendingRequests!.map((uid) => getDoc(doc(db, "Users", uid)))
        );
        const users: User[] = docs.map((d) => ({ uid: d.id, ...d.data() } as User));
        setPendingUsers(users);
      } catch (err) {
        console.error(err);
        addToast({ title: "Erro", description: "Falha ao carregar usuários pendentes", color: "danger" });
      }
    };

    loadPendingUsers();
  }, [myOrg?.pendingRequests]);

  // Criar organização
  const handleCreate = async () => {
    if (!user || !nome.trim() || !tag.trim()) {
      return addToast({ title: "Erro", description: "Nome e tag são obrigatórios", color: "danger" });
    }

    try {
      const orgRef = await addDoc(collection(db, "Organizacoes"), {
        nome: nome.trim(),
        tag: tag.trim(),
        creatorId: user.uid,
        members: [user.uid],
        maxMembros,
        createdAt: serverTimestamp(),
        pendingRequests: [],
      });

      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, { tag: tag.trim() });

      addToast({ title: "Sucesso", description: "Organização criada!", color: "success" });
      setNome("");
      setTag("");
    } catch (err) {
      console.error(err);
      addToast({ title: "Erro", description: "Falha ao criar organização", color: "danger" });
    }
  };

  // Aprovar membro
  const handleApprove = async (userId: string) => {
    if (!myOrg || !user) return;
    if (myOrg.members.length >= myOrg.maxMembros) {
      return addToast({ title: "Erro", description: "Número máximo de membros atingido", color: "danger" });
    }

    try {
      const orgRef = doc(db, "Organizacoes", myOrg.id);
      const userRef = doc(db, "Users", userId);

      await updateDoc(orgRef, {
        members: arrayUnion(userId),
        pendingRequests: arrayRemove(userId),
      });

      await updateDoc(userRef, { tag: myOrg.tag || null });

      addToast({ title: "Aprovado", description: "Usuário adicionado à organização", color: "success" });
    } catch (err) {
      console.error(err);
      addToast({ title: "Erro", description: "Falha ao aprovar usuário", color: "danger" });
    }
  };

  // Rejeitar membro
  const handleReject = async (userId: string) => {
    if (!myOrg) return;
    try {
      const orgRef = doc(db, "Organizacoes", myOrg.id);
      await updateDoc(orgRef, { pendingRequests: arrayRemove(userId) });
      addToast({ title: "Rejeitado", description: "Usuário removido da fila", color: "warning" });
    } catch (err) {
      console.error(err);
      addToast({ title: "Erro", description: "Falha ao rejeitar usuário", color: "danger" });
    }
  };

  // Buscar membros completos
  const loadMembers = async () => {
    if (!myOrg) return;

    try {
      const membersDocs = await Promise.all(myOrg.members.map((uid) => getDoc(doc(db, "Users", uid))));
      const users: User[] = membersDocs.map((d) => ({ uid: d.id, ...d.data() } as User));
      // Criador sempre em primeiro
      users.sort((a, b) => (a.uid === myOrg.creatorId ? -1 : b.uid === myOrg.creatorId ? 1 : 0));
      setMembersData(users);
    } catch (err) {
      console.error(err);
      addToast({ title: "Erro", description: "Falha ao carregar membros", color: "danger" });
    }
  };

  // Remover membro
  const handleRemoveMember = async (uid: string) => {
    if (!myOrg) return;

    if (uid === myOrg.creatorId) {
      return addToast({ title: "Erro", description: "Não é possível remover o criador", color: "danger" });
    }

    try {
      const orgRef = doc(db, "Organizacoes", myOrg.id);
      const userRef = doc(db, "Users", uid);

      await updateDoc(orgRef, { members: arrayRemove(uid) });
      await updateDoc(userRef, { tag: null });

      addToast({ title: "Removido", description: "Membro removido da organização", color: "warning" });

      loadMembers();
    } catch (err) {
      console.error(err);
      addToast({ title: "Erro", description: "Falha ao remover membro", color: "danger" });
    }
  };

  // Carrega membros automaticamente assim que myOrg mudar
useEffect(() => {
  if (!myOrg) return;

  const loadMembers = async () => {
    try {
      const membersDocs = await Promise.all(
        myOrg.members.map((uid) => getDoc(doc(db, "Users", uid)))
      );
      const users: User[] = membersDocs.map((d) => ({ uid: d.id, ...d.data() } as User));

      // Criador sempre primeiro
      users.sort((a, b) => (a.uid === myOrg.creatorId ? -1 : b.uid === myOrg.creatorId ? 1 : 0));
      setMembersData(users);
    } catch (err) {
      console.error(err);
      addToast({ title: "Erro", description: "Falha ao carregar membros", color: "danger" });
    }
  };

  loadMembers();
}, [myOrg]);

 // Render
if (myOrg) {
  if (user?.uid === myOrg.creatorId) {
    // Criador vê o painel completo
    return (
      <Card className="max-w-2xl mx-auto p-4">
        <h2 className="text-lg font-semibold mb-4">{myOrg.nome}</h2>

    <div className="w-max mb-2">
                    <Code color="primary" className="flex items-center">
                        <HiOutlineUserAdd className="mr-2" /> Solicitações
                    </Code>
                </div>
  {/* Solicitações */}
          {pendingUsers.length ? (
            <Table className="mb-4">
              <TableHeader>
                <TableColumn>Avatar</TableColumn>
                <TableColumn>Nome</TableColumn>
                <TableColumn>Email</TableColumn>
                <TableColumn>Ações</TableColumn>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell>
                      <Avatar src={u.photoURL || "/default-avatar.png"} alt={u.displayName || u.email || "Usuário"} />
                    </TableCell>
                    <TableCell>{u.displayName || u.uid}</TableCell>
                    <TableCell>{u.email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button color="success" size="sm" onPress={() => handleApprove(u.uid)}>
                          <HiOutlineCheck className="w-4 h-4" />
                        </Button>
                        <Button color="danger" size="sm" onPress={() => handleReject(u.uid)}>
                          <HiOutlineX className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="mb-4">Nenhuma solicitação pendente.</div>
          )}

              <div className="w-max mb-2">
                    <Code color="danger" className="flex items-center">
                        <HiOutlineUsers className="mr-2" /> Membros
                    </Code>
                </div>
   {membersData.length > 0 && (
  <Table className="mt-2">
    <TableHeader>
      <TableColumn>Avatar</TableColumn>
      <TableColumn>Nome</TableColumn>
      <TableColumn>Email</TableColumn>
      <TableColumn>Ações</TableColumn>
    </TableHeader>
    <TableBody>
      {membersData.map((m) => (
        <TableRow key={m.uid}>
          <TableCell>
            <Avatar src={m.photoURL || "/default-avatar.png"} alt={m.displayName || m.email || "Usuário"} />
          </TableCell>
          <TableCell>
            {m.displayName} {m.uid === myOrg?.creatorId && <strong>(Criador)</strong>}
          </TableCell>
          <TableCell>{m.email || "-"}</TableCell>
          <TableCell>
            {m.uid !== myOrg?.creatorId && (
              <Button color="danger" size="sm" onPress={() => handleRemoveMember(m.uid)}>
                <HiOutlineUserRemove className="w-4 h-4" />
              </Button>
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)}
   
      </Card>
    );
  } else {
    // Membro comum vê apenas mensagem
    return (
      <div className="max-w-md mx-auto p-4">
        <h2 className="text-lg font-semibold mb-4">
          Você já pertence à organização: {myOrg.nome}
        </h2>
      </div>
    );
  }
}

// Caso contrário, criar organização
return (
  <Card className="max-w-md mx-auto p-4">
    <h2 className="text-lg font-semibold mb-4">Criar Organização</h2>

    <Input
      type="text"
      placeholder="Nome da organização"
      value={nome}
      onChange={(e) => setNome(e.target.value)}
      className="mb-3"
    />

    <Input
      type="text"
      placeholder="Tag da organização"
      value={tag}
      onChange={(e) => setTag(e.target.value)}
      className="mb-3"
    />

    <Button color="primary" onPress={handleCreate}>
      <HiOutlineSave className="w-4 h-4 mr-1" /> Criar
    </Button>
  </Card>
);
}