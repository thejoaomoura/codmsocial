"use client";

import React, { useEffect, useState } from "react";

import Perfil from "../../components/Perfil";

interface PerfilPageProps {
  params: Promise<{ uid: string }>;
}

const PerfilPage: React.FC<PerfilPageProps> = ({ params }) => {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    // "Desembrulha" a promise
    params.then((p) => setUid(p.uid));
  }, [params]);

  if (!uid) return <div>Carregando...</div>;

  return <Perfil userId={uid} />;
};

export default PerfilPage;
