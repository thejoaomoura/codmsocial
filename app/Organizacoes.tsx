"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Avatar } from "@heroui/avatar";
import { Code } from "@heroui/code";
import { Card } from "@heroui/card";

import { auth } from "./firebase";
import { db } from "./firebase";

interface Organizacao {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  maxMembers: number;
  tag?: string;
  pendingRequests?: string[];
  visibility?: string;
}

interface User {
  uid: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  tag?: string;
}

export default function Organizacoes() {
  const [user] = useAuthState(auth);
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [membersData, setMembersData] = useState<Record<string, User[]>>({});
  const [myPendingRequest, setMyPendingRequest] = useState<string | null>(null);

  // Carrega organizações e membros de todas de uma vez
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "organizations"), async (snap) => {
      const list: Organizacao[] = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Organizacao,
      );

      setOrgs(list);

      // Verifica se há solicitação pendente
      const pendingOrg = list.find((o) =>
        o.pendingRequests?.includes(user?.uid || ""),
      );

      setMyPendingRequest(pendingOrg?.id || null);

      // Pré-carrega membros de todas organizações
      const allMembers: Record<string, User[]> = {};

      await Promise.all(
        list.map(async (org) => {
          if (org.members && org.members.length > 0) {
            const docs = await Promise.all(
              org.members.map((uid) => getDoc(doc(db, "Users", uid))),
            );
            const users: User[] = docs.map(
              (d) => ({ uid: d.id, ...d.data() }) as User,
            );

            // Criador sempre primeiro
            users.sort((a, b) =>
              a.uid === org.ownerId ? -1 : b.uid === org.ownerId ? 1 : 0,
            );
            allMembers[org.id] = users;
          } else {
            // Se não há membros definidos, adicionar apenas o owner
            const ownerDoc = await getDoc(doc(db, "Users", org.ownerId));

            if (ownerDoc.exists()) {
              allMembers[org.id] = [
                { uid: ownerDoc.id, ...ownerDoc.data() } as User,
              ];
            }
          }
        }),
      );
      setMembersData(allMembers);
    });

    return () => unsub();
  }, [user]);

  // Solicitar participação
  const handleRequestToJoin = async (org: Organizacao) => {
    if (!user) return;

    if (org.members && org.members.includes(user.uid)) {
      return addToast({
        title: "Aviso",
        description: "Você já é membro desta organização",
        color: "warning",
      });
    }

    if (myPendingRequest) {
      return addToast({
        title: "Aviso",
        description: "Você já tem uma solicitação pendente",
        color: "warning",
      });
    }

    try {
      const orgRef = doc(db, "organizations", org.id);

      await updateDoc(orgRef, {
        pendingRequests: arrayUnion(user.uid),
      });

      setMyPendingRequest(org.id);
      addToast({
        title: "Solicitação enviada",
        description: "Aguardando aprovação do criador",
        color: "success",
      });
    } catch (err) {
      console.error(err);
      addToast({
        title: "Erro",
        description: "Falha ao solicitar participação",
        color: "danger",
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto p-4">
      <h2 className="text-lg font-semibold mb-4">Organizações</h2>

      <Accordion variant="bordered">
        {orgs.map((org) => (
          <AccordionItem
            key={org.id}
            aria-label={`org-${org.name}`}
            title={
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="font-semibold">{org.name}</div>
                  <div className="text-xs text-gray-500">
                    Membros: {org.members?.length || 1}/{org.maxMembers}
                  </div>
                </div>
              </div>
            }
          >
            <ul className="list-none pl-0 flex flex-col gap-2 mt-2">
              {membersData[org.id]?.map((m) => (
                <li key={m.uid} className="flex items-center gap-2 mb-2 -mt-3">
                  <Avatar
                    alt={m.displayName || m.email || "Usuário"}
                    src={m.photoURL || "/default-avatar.png"}
                  />
                  <span>
                    <Code color="danger">{m.tag}</Code>{" "}
                    {m.displayName || m.email || m.uid}{" "}
                    {m.uid === org.ownerId && <strong>(Criador)</strong>}
                  </span>
                </li>
              ))}
              {user && !(org.members && org.members.includes(user.uid)) && (
                <Button
                  color="primary"
                  disabled={!!myPendingRequest}
                  size="sm"
                  onPress={() => handleRequestToJoin(org)}
                >
                  {myPendingRequest === org.id
                    ? "Pendente"
                    : "Solicitar Entrada"}
                </Button>
              )}
            </ul>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}
