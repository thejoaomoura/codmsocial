/**
 * Script de Seed para Sistema de Ranking
 * 
 * Este script popula o Firestore com dados mock para testar o sistema de ranking.
 * 
 * Para executar:
 * 1. Certifique-se de ter as credenciais do Firebase configuradas
 * 2. Execute: npx ts-node scripts/seedRankingData.ts
 */

// @ts-nocheck - Ignorar erros de tipagem para script de teste

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, Timestamp, doc, writeBatch, query, where, getDocs, orderBy, updateDoc } from "firebase/firestore";
import {
  Season,
  SeasonConfig,
  DailyInteraction,
  ExternalEventParticipation,
  DEFAULT_SEASON_CONFIG,
  EventTier,
} from "../app/types";

// Configuração do Firebase (use suas credenciais reais)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== DADOS MOCK =====

// Usuários mock (reduzido para evitar problemas)
const mockUsers = [
  {
    id: "user1",
    name: "ProPlayer_BR",
    avatar: "https://i.pravatar.cc/150?img=1",
    organizationTag: "ELITE",
  },
  {
    id: "user2",
    name: "SnipeKing",
    avatar: "https://i.pravatar.cc/150?img=2",
    organizationTag: "HAWK",
  },
  {
    id: "user3",
    name: "TacticalMind",
    avatar: "https://i.pravatar.cc/150?img=3",
    organizationTag: "ELITE",
  },
  {
    id: "user4",
    name: "RushMaster",
    avatar: "https://i.pravatar.cc/150?img=4",
    organizationTag: "STORM",
  },
  {
    id: "user5",
    name: "ClutchGod",
    avatar: "https://i.pravatar.cc/150?img=5",
    organizationTag: "HAWK",
  },
];

// Eventos externos mock (reduzido)
const mockEvents = [
  {
    id: "event1",
    name: "Copa Nacional CODM 2025",
    tier: "major" as EventTier,
    date: new Date("2025-01-15"),
  },
  {
    id: "event2",
    name: "Torneio Regional Sul",
    tier: "regional" as EventTier,
    date: new Date("2025-01-22"),
  },
];

// ===== FUNÇÕES AUXILIARES =====

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBool(probability: number = 0.5): boolean {
  return Math.random() < probability;
}

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ===== FUNÇÕES DE SEED =====

async function createSeason(): Promise<string> {
  console.log("📅 Criando temporada...");

  const now = new Date();
  const endDate = new Date(now);

  endDate.setDate(endDate.getDate() + 90); // 90 dias de duração

  const seasonData = {
    seasonNumber: 1,
    name: "Temporada 1 - Ascensão",
    startDate: now,
    endDate: endDate,
    status: "active",
    durationDays: 90,
    config: DEFAULT_SEASON_CONFIG,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "seasons"), seasonData);

  console.log(`✅ Temporada criada com ID: ${docRef.id}`);

  return docRef.id;
}

async function createDailyInteractions(
  seasonId: string,
  config: SeasonConfig,
): Promise<void> {
  console.log("💬 Criando interações diárias...");

  // Criar apenas 1 interação por usuário para simplificar
  for (const user of mockUsers) {
    const today = new Date();
    const dateString = getDateString(today);

    const postsCreated = 2;
    const commentsMade = 5;
    const reactionsReceived = 10;
    const reactionsGiven = 8;

    // Calcular pontos
    const rawPoints =
      postsCreated * config.weights.postCreated +
      commentsMade * config.weights.commentMade +
      reactionsReceived * config.weights.reactionReceived +
      reactionsGiven * config.weights.reactionGiven;

    const cappedPoints = Math.min(rawPoints, config.dailyInteractionCap);
    const weightedPoints = cappedPoints * config.interactionWeight;

    const interactionData = {
      userId: user.id,
      seasonId,
      date: dateString,
      interactions: {
        postsCreated,
        commentsMade,
        reactionsReceived,
        reactionsGiven,
      },
      rawPoints,
      cappedPoints,
      weightedPoints,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, "dailyInteractions"), interactionData);
  }

  console.log(`✅ ${mockUsers.length} interações diárias criadas`);
}

async function createEventParticipations(
  seasonId: string,
  config: SeasonConfig,
): Promise<void> {
  console.log("🏆 Criando participações em eventos...");

  // Criar apenas 1 participação por usuário para simplificar
  for (let i = 0; i < mockUsers.length; i++) {
    const user = mockUsers[i];
    const event = mockEvents[0]; // Usar apenas o primeiro evento
    
    const placement = i + 1;
    const participated = true;

    // Calcular pontos
    let basePoints = 0;
    if (placement === 1) basePoints = config.eventPlacementPoints.first;
    else if (placement === 2) basePoints = config.eventPlacementPoints.second;
    else if (placement === 3) basePoints = config.eventPlacementPoints.third;
    else basePoints = config.eventPlacementPoints.participation;

    const tierMultiplier = config.eventTierMultipliers[event.tier];
    const finalPoints = Math.round(basePoints * tierMultiplier);

    const participationData = {
      userId: user.id,
      seasonId,
      eventId: event.id,
      eventName: event.name,
      eventTier: event.tier,
      placement,
      participated,
      basePoints,
      tierMultiplier,
      finalPoints,
        eventDate: event.date,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "externalEventParticipations"), participationData);
  }

  console.log(`✅ ${mockUsers.length} participações em eventos criadas`);
}

async function calculateUserScores(seasonId: string): Promise<void> {
  console.log("🔢 Calculando scores dos usuários...");

  for (let i = 0; i < mockUsers.length; i++) {
    const user = mockUsers[i];
    
    // Valores fixos para simplificar
    const interactionScore = 15.5 + (i * 2); // Score variado por usuário
    const eventScore = 100 - (i * 10); // Score variado por usuário
    const totalScore = interactionScore + eventScore;

    const stats = {
      totalPosts: 2,
      totalComments: 5,
      totalReactionsReceived: 10,
      totalReactionsGiven: 8,
      eventsParticipated: 1,
      bestEventPlacement: i + 1,
      totalWins: i === 0 ? 1 : 0, // Primeiro usuário ganha
      activeDays: 1,
    };

    // Salvar score do usuário
    const userScoreData = {
      userId: user.id,
      seasonId,
      userName: user.name,
      userAvatar: user.avatar,
      organizationTag: user.organizationTag || undefined,
      interactionScore: Math.round(interactionScore * 10) / 10,
      eventScore,
      totalScore: Math.round(totalScore * 10) / 10,
      stats,
      rank: 0, // Será calculado depois
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };

    await addDoc(collection(db, "userSeasonScores"), userScoreData);
  }

  console.log(`✅ Scores calculados para ${mockUsers.length} usuários`);
}

async function calculateRanks(seasonId: string): Promise<void> {
  console.log("🏅 Calculando ranks...");

  // Buscar todos os scores
  const scoresQuery = query(
    collection(db, "userSeasonScores"),
    where("seasonId", "==", seasonId),
    orderBy("totalScore", "desc")
  );
  const scoresSnapshot = await getDocs(scoresQuery);

  const batch = writeBatch(db);

  scoresSnapshot.docs.forEach((docSnapshot, index) => {
    batch.update(docSnapshot.ref, {
      rank: index + 1,
      lastUpdated: serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`✅ Ranks calculados para ${scoresSnapshot.size} usuários`);
}

// ===== FUNÇÃO PRINCIPAL =====

async function seed() {
  try {
    console.log("\n🌱 Iniciando seed do sistema de ranking...\n");

    // Criar apenas uma temporada simples
    console.log("📅 Criando temporada...");
    const now = new Date();
    const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 dias
    
    const seasonData = {
      seasonNumber: 1,
      name: "Temporada 1 - Ascensão",
      startDate: Timestamp.fromDate(now),
      endDate: Timestamp.fromDate(endDate),
      status: "active",
      durationDays: 90,
      config: DEFAULT_SEASON_CONFIG,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const seasonRef = await addDoc(collection(db, "seasons"), seasonData);
    const seasonId = seasonRef.id;
    console.log(`✅ Temporada criada com ID: ${seasonId}`);

    // Criar apenas scores simples sem interações complexas
    console.log("🔢 Criando scores dos usuários...");
    for (let i = 0; i < mockUsers.length; i++) {
      const user = mockUsers[i];
      const score = 100 - (i * 10); // Score decrescente
      
      const userScoreData = {
        userId: user.id,
        seasonId,
        userName: user.name,
        userAvatar: user.avatar,
        organizationTag: user.organizationTag || undefined,
        interactionScore: Math.round((score * 0.6) * 10) / 10,
        eventScore: Math.round((score * 0.4) * 10) / 10,
        totalScore: Math.round(score * 10) / 10,
        stats: {
          totalPosts: 5,
          totalComments: 10,
          totalReactionsReceived: 20,
          totalReactionsGiven: 15,
          eventsParticipated: 1,
          bestEventPlacement: i + 1,
          totalWins: i === 0 ? 1 : 0,
          activeDays: 7,
        },
        rank: i + 1,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      };

      await addDoc(collection(db, "userSeasonScores"), userScoreData);
    }

    console.log(`✅ ${mockUsers.length} usuários com scores criados`);
    console.log("\n✨ Seed concluído com sucesso!\n");
    console.log("🎮 Acesse a aba 'Ranking' no sistema para ver os resultados!\n");
  } catch (error) {
    console.error("\n❌ Erro durante o seed:", error);
    throw error;
  }
}

// Executar seed
seed()
  .then(() => {
    console.log("✅ Script finalizado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script falhou:", error);
    process.exit(1);
  });

export { seed, mockUsers, mockEvents };

