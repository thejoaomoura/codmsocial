export interface PostComment {
  authorId: string;
  authorTag: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: any;
  // Campos de presença
  presence?: "online" | "away" | "offline";
  isOnline?: boolean;
  lastSeen?: any;
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
  // Campos de presença
  presence?: "online" | "away" | "offline";
  isOnline?: boolean;
  lastSeen?: any;
}

export interface User {
  uid: string;
  name: string;
  organizationTag: string;
  avatar: string;
  createdAt?: Date;
  displayName?: string;
  email?: string;
  photoURL?: string;
  stats?: {
    organizationsCount: number;
    eventsParticipated: number;
  };
  // Campos de presença
  isOnline?: boolean;
  presence?: "online" | "away" | "offline";
  lastSeen?: any; // Timestamp
  privacy?: {
    lastSeen: "everyone" | "contacts" | "nobody" | "mutual";
  };
}

export interface ChatOverview {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string; // pode ser undefined
  lastMessage?: string; // pode ser undefined
  unread?: boolean; // opcional
  // Campos de presença
  presence?: "online" | "away" | "offline";
  isOnline?: boolean;
  lastSeen?: any;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: any; // serverTimestamp
  audioUrl?: string; // URL do áudio 
  audioData?: string; // Data string do áudio (base64)
  audioDuration?: number; // duração em segundos
  messageType?: 'text' | 'audio'; // tipo da mensagem
}

// ===== SISTEMA DE CARGOS E ORGANIZAÇÕES =====

export type OrganizationRole =
  | "owner"
  | "moderator"
  | "manager"
  | "pro"
  | "ranked";

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
  hasPendingRequest?: boolean;
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

export type EventVisibility = "public" | "private";

export type GameMode = "BR" | "MP";

export type RegistrationState =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn";

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
  visibility: EventVisibility; // público ou privado
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

// ===== SISTEMA DE RANKING E TEMPORADAS =====

export type SeasonStatus = "active" | "completed" | "archived";

export type EventTier = "major" | "regional" | "local" | "community";

export type InteractionType =
  | "post_created"
  | "comment_made"
  | "reaction_received"
  | "reaction_given"
  | "event_participation";

export interface Season {
  id: string;
  seasonNumber: number; // Temporada 1, 2, 3, etc.
  name: string; // ex: "Temporada 1 - Ascensão"
  startDate: any; // Timestamp
  endDate: any; // Timestamp
  status: SeasonStatus;
  durationDays: number; // 60-90 dias
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  config: SeasonConfig;
}

export interface SeasonConfig {
  // Configurações de interação diária
  dailyInteractionCap: number; // Cap de pontos por dia (ex: 20)
  interactionWeight: number; // Peso da interação (ex: 0.6 = 60%)

  // Pesos por tipo de interação
  weights: {
    postCreated: number; // ex: 2
    commentMade: number; // ex: 1
    reactionReceived: number; // ex: 0.5
    reactionGiven: number; // ex: 0.2
  };

  // Configurações de eventos
  eventTierMultipliers: {
    major: number; // ex: 1.5
    regional: number; // ex: 1.2
    local: number; // ex: 1.0
    community: number; // ex: 0.8
  };

  // Pontos por colocação em eventos
  eventPlacementPoints: {
    first: number; // ex: 100
    second: number; // ex: 80
    third: number; // ex: 65
    fourth: number; // ex: 55
    fifth: number; // ex: 45
    sixth: number; // ex: 35
    seventh: number; // ex: 25
    eighth: number; // ex: 20
    participation: number; // ex: 15 (para quem participou mas não ficou no top 8)
  };

  // Anti-gaming
  antiSpam: {
    maxPostsPerDay: number; // ex: 10
    maxCommentsPerDay: number; // ex: 20
    maxReactionsPerDay: number; // ex: 50
    duplicateTextThreshold: number; // similaridade % para considerar spam (ex: 80)
  };
}

export interface DailyInteraction {
  id?: string;
  userId: string;
  seasonId: string;
  date: string; // formato: YYYY-MM-DD
  interactions: {
    postsCreated: number;
    commentsMade: number;
    reactionsReceived: number;
    reactionsGiven: number;
  };
  rawPoints: number; // pontos antes do cap
  cappedPoints: number; // pontos depois do cap
  weightedPoints: number; // pontos finais com peso aplicado
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface ExternalEventParticipation {
  id?: string;
  userId: string;
  seasonId: string;
  eventId: string; // ID do evento externo
  eventName: string;
  eventTier: EventTier;
  placement: number; // colocação final (1, 2, 3, etc.)
  participated: boolean; // true se participou
  basePoints: number; // pontos base pela colocação
  tierMultiplier: number; // multiplicador do tier
  finalPoints: number; // pontos finais (base * multiplier)
  eventDate: any; // Timestamp
  createdAt: any; // Timestamp
}

export interface UserSeasonScore {
  id?: string;
  userId: string;
  seasonId: string;
  userName: string;
  userAvatar?: string;
  organizationTag?: string;

  // Componentes do score
  interactionScore: number; // soma de todos os weightedPoints das DailyInteractions
  eventScore: number; // soma de todos os finalPoints das ExternalEventParticipations
  totalScore: number; // interactionScore + eventScore

  // Estatísticas para desempate e exibição
  stats: {
    totalPosts: number;
    totalComments: number;
    totalReactionsReceived: number;
    totalReactionsGiven: number;
    eventsParticipated: number;
    bestEventPlacement: number | null; // melhor colocação em eventos (1 = primeiro)
    totalWins: number; // quantas vezes ficou em 1º lugar
    activeDays: number; // quantos dias teve interação
  };

  // Ranking
  rank: number; // posição no ranking (1, 2, 3, etc.)
  previousRank?: number; // posição na última atualização

  // Controle
  lastUpdated: any; // Timestamp
  createdAt: any; // Timestamp
}

export interface ScoreHistory {
  id?: string;
  userId: string;
  seasonId: string;
  date: string; // formato: YYYY-MM-DD
  totalScore: number;
  rank: number;
  createdAt: any; // Timestamp
}

// Configuração padrão v1 da fórmula
export const DEFAULT_SEASON_CONFIG: SeasonConfig = {
  dailyInteractionCap: 20,
  interactionWeight: 0.6,
  weights: {
    postCreated: 2,
    commentMade: 1,
    reactionReceived: 0.5,
    reactionGiven: 0.2,
  },
  eventTierMultipliers: {
    major: 1.5,
    regional: 1.2,
    local: 1.0,
    community: 0.8,
  },
  eventPlacementPoints: {
    first: 100,
    second: 80,
    third: 65,
    fourth: 55,
    fifth: 45,
    sixth: 35,
    seventh: 25,
    eighth: 20,
    participation: 15,
  },
  antiSpam: {
    maxPostsPerDay: 10,
    maxCommentsPerDay: 20,
    maxReactionsPerDay: 50,
    duplicateTextThreshold: 80,
  },
};
