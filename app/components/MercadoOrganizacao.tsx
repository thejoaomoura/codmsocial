"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Avatar } from "@heroui/avatar";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineClock,
  HiOutlineLogout,
} from "react-icons/hi";

import { db } from "../firebase";

interface LogMercado {
  displayName: string;
  photoURL?: string;
  status: "Aceitou" | "Recusou" | "Solicitou" | "Saiu";
  organizationName?: string;
  organizationLogo?: string;
  createdAt?: any;
}

const MercadoOrganizacao = () => {
  const [logs, setLogs] = useState<LogMercado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const logsRef = collection(db, "logMercado");
        const logsQuery = query(
          logsRef,
          orderBy("createdAt", "desc"),
          limit(50),
        );
        const snapshot = await getDocs(logsQuery);

        const logsData: LogMercado[] = snapshot.docs.map((doc) => ({
          ...(doc.data() as LogMercado),
          createdAt: (doc.data() as any).createdAt?.toDate?.() || new Date(),
        }));

        setLogs(logsData);
      } catch (error) {
        console.error("Erro ao buscar logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) return <div>Carregando logs...</div>;

  if (logs.length === 0) return <p>Nenhum log encontrado.</p>;

  return (
    <Card
      className="space-y-6"
      style={{ maxHeight: "600px", overflowY: "auto", position: "relative" }}
    >
      <div className="mb-6 ml-12">
        <h2 className="text-2xl font-bold ml-5 mt-3">Atividades Recentes</h2>
        <p className="text-gray-600 ml-5">
          Acompanhe as movimentações e atividades das organizações
        </p>
      </div>

  
      {logs.map((log, index) => (
        
        <div key={index} className="flex items-start mb-8 relative">
          {/* Marcador da timeline */}
                     <div className="absolute top-0 left-10 w-[2px] bg-gray-300 h-full" />
          <div className="flex flex-col items-center">
    
            <div
              className={`w-4 h-4 rounded-full border-2 ml-3 mt-3 ${
                log.status === "Aceitou"
                  ? "border-green-500 bg-green-500"
                  : log.status === "Recusou"
                    ? "border-red-500 bg-red-500"
                    : log.status === "Saiu"
                      ? "border-orange-500 bg-orange-500"
                      : "border-blue-500 bg-blue-500"
              } z-10`}
            />
          </div>

          {/* Card do evento */}
          <Card className="w-full shadow-md mr-5 ml-5">
           
            <CardBody className="-mt-1">
              {log.status === "Aceitou" ||
              log.status === "Recusou" ||
              log.status === "Saiu" ? (
                <>
                  {/* Organização em cima */}
                  {log.organizationName && (
                    <div className="flex flex-col gap-1 mb-2">
                      <div className="flex items-center gap-3">
                        {log.organizationLogo && (
                          <Avatar
                            alt={log.organizationName}
                            size="sm"
                            src={log.organizationLogo}
                          />
                        )}
                        <p className="font-medium">{log.organizationName}</p>
                      </div>
                    </div>
                  )}

                  {/* Chip no meio */}
                  <Chip
                    className="text-xs px-2 py-[2px] self-start ml-10 mb-2"
                    startContent={
                      log.status === "Aceitou" ? (
                        <HiOutlineCheck className="w-4 h-4 text-green-600" />
                      ) : log.status === "Recusou" ? (
                        <HiOutlineX className="w-4 h-4 text-red-600" />
                      ) : log.status === "Saiu" ? (
                        <HiOutlineLogout className="w-4 h-4 text-orange-600" />
                      ) : (
                        <HiOutlineClock className="w-4 h-4 text-blue-600" />
                      )
                    }
                    variant="faded"
                  >
                    {log.status}
                  </Chip>

                  {/* Usuário embaixo */}
                  <div className="flex items-center gap-3">
                    <Avatar
                      alt={log.displayName}
                      className="-mt-2"
                      src={log.photoURL}
                    />
                    <div>
                      <p className="font-semibold">{log.displayName}</p>
                      <p className="text-xs text-gray-500 px-4 pb-3 -ml-4 mt-1">
                        {log.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                // Caso padrão (Solicitou)
                <div>
                  <div className="flex items-center gap-3">
                    <Avatar
                      alt={log.displayName}
                      className="-mt-2"
                      src={log.photoURL}
                    />
                    <div>
                      <p className="font-semibold">{log.displayName}</p>
                      <p className="text-xs text-gray-500 px-4 pb-3 -ml-4 mt-1">
                        {log.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {/* Chip abaixo da organização */}
                  <Chip
                    className="text-xs px-2 py-[2px] self-start ml-10"
                    startContent={
                      <HiOutlineClock className="w-4 h-4 text-blue-600" />
                    }
                    variant="faded"
                  >
                    {log.status}
                  </Chip>

                  {log.organizationName && (
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex items-center gap-3">
                        {log.organizationLogo && (
                          <Avatar
                            alt={log.organizationName}
                            size="sm"
                            src={log.organizationLogo}
                          />
                        )}
                        <p className="font-medium">{log.organizationName}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      ))}
    </Card>
  );
};

export default MercadoOrganizacao;
