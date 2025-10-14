import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Membership, User, OrganizationRole } from '../types';

export const useMemberships = (orgId: string | null) => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `organizations/${orgId}/memberships`),
      where('status', '==', 'accepted')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const members: Membership[] = [];
        snapshot.forEach((doc) => {
          members.push({ ...doc.data() } as Membership);
        });
        setMemberships(members);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar memberships:', err);
        setError('Falha ao carregar membros');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgId]);

  return { membersWithData: memberships, loading, error };
};

export const useUserMembership = (orgId: string | null, userId: string | null) => {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useUserMembership - orgId:', orgId, 'userId:', userId);
    
    if (!orgId || !userId) {
      console.log('useUserMembership - Missing orgId or userId, setting null');
      setMembership(null);
      setLoading(false);
      return;
    }

    console.log('useUserMembership - Setting up listener for membership document');
    const membershipDocPath = `organizations/${orgId}/memberships/${userId}`;
    console.log('useUserMembership - Document path:', membershipDocPath);

    const unsubscribe = onSnapshot(
      doc(db, membershipDocPath),
      (doc) => {
        console.log('useUserMembership - Document snapshot received, exists:', doc.exists());
        if (doc.exists()) {
          const membershipData = { ...doc.data() } as Membership;
          console.log('useUserMembership - Membership data:', membershipData);
          setMembership(membershipData);
        } else {
          console.log('useUserMembership - No membership document found');
          setMembership(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('useUserMembership - Erro ao carregar membership do usuário:', err);
        setError('Falha ao carregar informações de membro');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgId, userId]);

  return { membership, loading, error };
};

export const usePendingMemberships = (orgId: string | null) => {
  const [pendingMemberships, setPendingMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setPendingMemberships([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `organizations/${orgId}/memberships`),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const pending: Membership[] = [];
        snapshot.forEach((doc) => {
          pending.push({ ...doc.data() } as Membership);
        });
        setPendingMemberships(pending);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar memberships pendentes:', err);
        setError('Falha ao carregar solicitações pendentes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orgId]);

  return { pendingMemberships, loading, error };
};

export const useMembersWithUserData = (orgId: string | null) => {
  const { membersWithData: memberships, loading: membershipsLoading, error: membershipsError } = useMemberships(orgId);
  const [membersWithData, setMembersWithData] = useState<(Membership & { userData: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (membershipsLoading) return;
    if (membershipsError) {
      setError(membershipsError);
      setLoading(false);
      return;
    }

    const loadUserData = async () => {
      try {
        setLoading(true);
        
        const membersWithUserData = await Promise.all(
          memberships.map(async (membership) => {
            const userDoc = await getDoc(doc(db, 'Users', membership.userId));
            const userData = userDoc.exists() ? { uid: userDoc.id, ...userDoc.data() } as User : null;
            
            return {
              ...membership,
              userData: userData || {
                uid: membership.userId,
                name: 'Usuário não encontrado',
                tag: '',
                avatar: '',
                displayName: 'Usuário não encontrado',
                email: ''
              }
            };
          })
        );

        // Ordenar: Owner primeiro, depois por data de entrada
        membersWithUserData.sort((a, b) => {
          if (a.role === 'owner') return -1;
          if (b.role === 'owner') return 1;
          return new Date(a.joinedAt?.toDate()).getTime() - new Date(b.joinedAt?.toDate()).getTime();
        });

        setMembersWithData(membersWithUserData);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados dos usuários:', err);
        setError('Falha ao carregar dados dos membros');
        setLoading(false);
      }
    };

    if (memberships.length > 0) {
      loadUserData();
    } else {
      setMembersWithData([]);
      setLoading(false);
    }
  }, [memberships, membershipsLoading, membershipsError]);

  return { membersWithData, loading, error };
};