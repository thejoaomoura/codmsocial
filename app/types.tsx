export interface PostComment {
  authorId: string;
  authorTag: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: any;
}

export interface PostReaction {
  userId: string;
  emoji: string;
  name: string;
  createdAt: any;
}

export interface PostReaction {
  name: string;
  emoji: string;
}

export interface Post {
  id: string;
  authorName: string;
  authorTag: string;
  authorId: string;
  authorAvatar: string;
  text: string;
  createdAt: any;
  // Agora reactions é um objeto onde a chave é o uid do usuário
  reactions: Record<string, PostReaction>;
  detailedReactions?: PostReaction[];
  comments: PostComment[];
}

export interface User {
  uid: string;
  name: string;
  tag: string;
  avatar: string;
  createdAt?: Date;
  displayName?: string;
  email?: string;
  photoURL?: string;
  stats?: {
    organizationsCount: number;
    eventsParticipated: number;
  };
}

export interface ChatOverview {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string; // pode ser undefined
  lastMessage?: string;     // pode ser undefined
  unread?: boolean;         // opcional
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: any; // serverTimestamp
}

// ===== SISTEMA DE CARGOS E ORGANIZAÇÕES =====

export type OrganizationRole = "owner" | "moderator" | "manager" | "pro" | "ranked";

export type MembershipStatus = "pending" | "accepted" | "removed" | "banned";

export type OrganizationVisibility = "public" | "private";

export type GameType = "CODM" | "multi";

export interface RoleHistoryEntry {
  role: OrganizationRole;
  changedAt: any; // Timestamp
  changedBy: string; // userId
  reason?: string;
}

export interface Organization {
  id: string;
  name: string;
  tag: string; // tag única da organização
  slug: string; // único globalmente
  ownerId: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  logoURL?: string;
  region: string; // "BR", "NA", "EU", etc.
  game: GameType;
  visibility: OrganizationVisibility;
  memberCount: number; // denormalizado para performance
  description?: string; // descrição da organização
  maxMembers: number; // limite máximo de membros
  settings: {
    allowPublicJoin: boolean;
    requireApproval: boolean;
  };
}

export interface Membership {
  id?: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: MembershipStatus;
  joinedAt: any; // Timestamp
  updatedAt: any; // Timestamp
  invitedBy: string; // userId de quem convidou
  invitedAt?: any; // Timestamp de quando foi convidado
  roleHistory: RoleHistoryEntry[];
  displayName?: string; // Nome de exibição do usuário
  photoURL?: string; // URL da foto do usuário
}

// ===== EVENTOS E COMPETIÇÕES (FASE 2) =====

export type EventType = "scrim" | "tournament";

export type EventStatus = "draft" | "open" | "closed" | "finished";

export type GameMode = "BR" | "MP";

export type RegistrationState = "pending" | "approved" | "rejected" | "withdrawn";

export interface Event {
  id: string;
  type: EventType;
  hostOrgId: string; // organização que criou o evento
  name: string;
  description: string;
  gameMode: GameMode;
  teamSize: number; // 3, 4, 5
  rosterMin: number;
  rosterMax: number;
  startsAt: any; // Timestamp
  checkinWindow?: number; // minutos antes do início
  rulesURL?: string;
  status: EventStatus;
  createdBy: string; // userId do manager/moderator/owner
  createdAt: any; // Timestamp
  maxTeams?: number;
  prizePool?: string;
  region: string;
}

export interface EventRegistration {
  id?: string; // ID do documento
  eventId: string;
  orgId: string;
  managerId: string; // quem inscreveu a organização
  roster: string[]; // array de userIds
  substitutes?: string[]; // reservas
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  state: RegistrationState;
  notes?: string; // observações do manager
  approvedBy?: string; // userId de quem aprovou (se aplicável)
  approvedAt?: any; // Timestamp
}

// ===== UTILITÁRIOS E VALIDAÇÕES =====

export interface RolePermissions {
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canChangeRoles: boolean;
  canManageOrganization: boolean;
  canCreateEvents: boolean;
  canRegisterForEvents: boolean;
  canManageEventRegistrations: boolean;
  canViewEvents?: boolean; // Permissão para visualizar eventos (read-only)
  canViewOwnRosterStatus?: boolean; // Permissão para ver próprio status no roster
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  invitedUserId: string;
  invitedEmail: string;
  invitedBy: OrganizationRole;
  message?: string | null;
  createdAt: any; // Timestamp
  status: "pending" | "accepted" | "rejected" | "expired";
  expiresAt: any; // Timestamp
}
