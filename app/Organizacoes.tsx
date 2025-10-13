"use client";

import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";

interface Organizacao {
  id: string;
  nome: string;
  creatorId: string;
  members: string[];
  maxMembros: number;
  tag?: string;
  pendingRequests?: string[];
}

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  tag?: string;
}

export default function Organizacoes() {
  const [user] = useAuthState(auth);
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [membersData, setMembersData] = useState<User[]>([]);
  const [myPendingRequest, setMyPendingRequest] = useState<string | null>(null); // uid da org onde estou pendente

  // Carrega organizações e verifica se o usuário já solicitou alguma
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Organizacoes"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organizacao));
      setOrgs(list);

      // Checa se há alguma solicitação pendente do usuário
      const pendingOrg = list.find((o) => o.pendingRequests?.includes(user?.uid || ""));
      setMyPendingRequest(pendingOrg?.id || null);
    });
    return () => unsub();
  }, [user]);

  // Seleciona organização e carrega membros
  const handleSelectOrg = async (org: Organizacao) => {
    setSelectedOrg(org);
    try {
      const membersDocs = await Promise.all(
        org.members.map((uid) => getDoc(doc(db, "Users", uid)))
      );

      const users: User[] = membersDocs.map((d) => ({ uid: d.id, ...d.data() } as User));
      users.sort((a, b) => (a.uid === org.creatorId ? -1 : b.uid === org.creatorId ? 1 : 0));
      setMembersData(users);
    } catch (err) {
      console.error(err);
      addToast({ title: "Erro", description: "Falha ao carregar membros", color: "danger" });
    }
  };

  // Solicitar participação
  const handleRequestToJoin = async (org: Organizacao) => {
    if (!user) return;

    if (org.members.includes(user.uid)) {
      return addToast({ title: "Aviso", description: "Você já é membro desta organização", color: "warning" });
    }

    if (myPendingRequest) {
      return addToast({ title: "Aviso", description: "Você já tem uma solicitação pendente", color: "warning" });
    }

    try {
      const orgRef = doc(db, "Organizacoes", org.id);
      await updateDoc(orgRef, {
        pendingRequests: arrayUnion(user.uid),
      });

      setMyPendingRequest(org.id);
      addToast({ title: "Solicitação enviada", description: "Aguardando aprovação do criador", color: "success" });
    } catch (err) {
      console.error(err);
      addToast({ title: "Erro", description: "Falha ao solicitar participação", color: "danger" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-lg font-semibold mb-4">Organizações</h2>

      {!selectedOrg && (
        <div className="flex flex-col gap-3">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="border p-3 rounded flex items-center justify-between cursor-pointer hover:bg-gray-50"
            >
          <button
  onClick={() => handleSelectOrg(org)}
  className="text-left w-full font-semibold hover:bg-gray-50 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <div>{org.nome}</div>
  <div className="text-xs text-gray-500">
    Membros: {org.members.length}/{org.maxMembros}
  </div>
</button>

              {user && !org.members.includes(user.uid) && (
                <Button
                  color="primary"
                  size="sm"
                  onPress={() => handleRequestToJoin(org)}
                  disabled={!!myPendingRequest}
                >
                  {myPendingRequest === org.id ? "Pendente" : "Solicitar Entrada"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedOrg && (
        <div className="mt-4">
          <Button color="secondary" onPress={() => setSelectedOrg(null)}>
            Voltar
          </Button>

          <h3 className="text-lg font-semibold mt-4 mb-2">
            Membros de {selectedOrg.nome}
          </h3>

          <ul className="list-disc pl-5 flex flex-col gap-1">
            {membersData.map((m) => (
              <li key={m.uid}>
                {m.displayName || m.email || m.uid} {m.uid === selectedOrg.creatorId && "(Criador)"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}