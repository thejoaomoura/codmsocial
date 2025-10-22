import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  limit,
} from "firebase/firestore";

import { db } from "../firebase";
import { Organization, Membership } from "../types";

// Função helper para logs apenas em desenvolvimento
function devLog(...args: any[]) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.log(...args);
  }
}

function devError(...args: any[]) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.error(...args);
  }
}

export const useOrganizations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "organizations"),
      where("visibility", "==", "public"),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orgs: Organization[] = [];

        snapshot.forEach((doc) => {
          orgs.push({ id: doc.id, ...doc.data() } as Organization);
        });
        setOrganizations(orgs);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar organizações:", err);
        setError("Falha ao carregar organizações");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { organizations, loading, error };
};

export const useUserOrganizations = (userId: string | null) => {
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    devLog("useUserOrganizations - userId:", userId);
    
    if (!userId) {
      devLog("useUserOrganizations - No userId, setting empty array");
      setUserOrganizations([]);
      setLoading(false);

      return;
    }

    const loadUserOrganizations = async () => {
      try {
        devLog("useUserOrganizations - Starting to load organizations for userId:", userId);
        setLoading(true);

        // Buscar organizações onde o usuário é owner
        const ownerQuery = query(
          collection(db, "organizations"),
          where("ownerId", "==", userId),
        );

        const ownerSnapshot = await getDocs(ownerQuery);

        const ownerOrgs: Organization[] = [];

        ownerSnapshot.forEach((doc) => {
          ownerOrgs.push({ id: doc.id, ...doc.data() } as Organization);
        });

        // Buscar organizações onde o usuário é membro (via coleção global memberships)
        devLog("useUserOrganizations - Searching for memberships where user is member");

        const membershipsQuery = query(
          collection(db, "memberships"),
          where("userId", "==", userId),
          where("status", "==", "accepted"),
        );

        const membershipsSnapshot = await getDocs(membershipsQuery);

        devLog("useUserOrganizations - Found memberships:", membershipsSnapshot.size);
          
        const memberOrgs: Organization[] = [];

        // Para cada membership, buscar a organização correspondente
        for (const membershipDoc of membershipsSnapshot.docs) {
          const membershipData = membershipDoc.data() as Membership;

          devLog("useUserOrganizations - Processing membership for org:", membershipData.organizationId);

          try {
            const orgDoc = await getDoc(
              doc(db, "organizations", membershipData.organizationId),
            );

            if (orgDoc.exists()) {
              const orgData = {
                id: orgDoc.id,
                ...orgDoc.data(),
              } as Organization;

              memberOrgs.push(orgData);
              devLog(
                "useUserOrganizations - Added member organization:",
                orgData.name,
              );
            } else {
              devError(
                "useUserOrganizations - Organization not found:",
                membershipData.organizationId,
              );
            }
          } catch (orgError) {
            devError(
              "useUserOrganizations - Error fetching organization:",
              membershipData.organizationId,
              orgError,
            );
          }
        }

        // Combinar organizações (owner + member) e remover duplicatas
        const allOrgs = [...ownerOrgs, ...memberOrgs];
        const uniqueOrgs = allOrgs.filter(
          (org, index, self) =>
            index === self.findIndex((o) => o.id === org.id),
        );

        //console.log('useUserOrganizations - Final organizations (owner + member):', uniqueOrgs.length);
        //console.log('useUserOrganizations - Organizations:', uniqueOrgs.map(org => ({ id: org.id, name: org.name })));
        setUserOrganizations(uniqueOrgs);
        setLoading(false);
      } catch (err) {
        console.error(
          "useUserOrganizations - Erro ao carregar organizações do usuário:",
          err,
        );
        setError("Falha ao carregar suas organizações");
        setLoading(false);
      }
    };

    loadUserOrganizations();
  }, [userId]);

  return { userOrganizations, loading, error };
};

export const useOrganization = (orgId: string | null) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setOrganization(null);
      setLoading(false);

      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "organizations", orgId),
      (doc) => {
        if (doc.exists()) {
          setOrganization({ id: doc.id, ...doc.data() } as Organization);
        } else {
          setOrganization(null);
          setError("Organização não encontrada");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar organização:", err);
        setError("Falha ao carregar organização");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [orgId]);

  return { organization, loading, error };
};

export const useOrganizationBySlug = (slug: string | null) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setOrganization(null);
      setLoading(false);

      return;
    }

    const q = query(
      collection(db, "organizations"),
      where("slug", "==", slug),
      limit(1),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];

          setOrganization({ id: doc.id, ...doc.data() } as Organization);
        } else {
          setOrganization(null);
          setError("Organização não encontrada");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar organização por slug:", err);
        setError("Falha ao carregar organização");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [slug]);

  return { organization, loading, error };
};
