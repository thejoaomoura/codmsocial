"use client";

import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { Spinner } from "@heroui/spinner";
import { Tabs, Tab } from "@heroui/tabs";
import { Progress } from "@heroui/progress";
import {
  HiOutlineTrophy,
  HiOutlineChartBar,
  HiOutlineStar,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
} from "react-icons/hi2";
import { User } from "firebase/auth";

import { useActiveSeason } from "../hooks/useSeasons";
import { useSeasonRanking, useUserScore } from "../hooks/useRanking";
import { UserSeasonScore } from "../types";
import { getDaysRemaining } from "../utils/scoreCalculation";

interface RankingSystemProps {
  user: User | null;
}

const RankingSystem: React.FC<RankingSystemProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState("ranking");

  // Buscar temporada ativa
  const { season, loading: seasonLoading } = useActiveSeason();

  // Buscar ranking completo
  const { ranking, loading: rankingLoading } = useSeasonRanking(
    season?.id || null,
    100,
  );

  // Buscar score do usuário atual
  const { score: userScore, loading: userScoreLoading } = useUserScore(
    user?.uid || null,
    season?.id || null,
  );

  if (seasonLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!season) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">
            Sistema em Implementação
          </h3>
          <p className="text-gray-500 mb-4">
            O sistema de ranking ainda está sendo desenvolvido.
          </p>
          <p className="text-gray-400 text-sm">
            Não há dados de temporada disponíveis no momento.
          </p>
        </CardBody>
      </Card>
    );
  }

  const daysRemaining = getDaysRemaining(season);
  const progressPercentage =
    ((season.durationDays - daysRemaining) / season.durationDays) * 100;

  return (
    <div className="space-y-6">
      {/* Header da Temporada */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <HiOutlineTrophy className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{season.name}</h2>
                <p className="text-gray-600">
                  Temporada {season.seasonNumber} • Sistema de Ranking v1
                </p>
              </div>
            </div>
            <Chip color="success" size="lg" variant="flat">
              ATIVA
            </Chip>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progresso da Temporada</span>
              <span className="font-medium">
                {daysRemaining} dias restantes
              </span>
            </div>
            <Progress
              aria-label="Progresso da temporada"
              color="primary"
              size="md"
              value={progressPercentage}
            />
          </div>
        </CardBody>
      </Card>

      {/* Score do Usuário (se logado) */}
      {user && userScore && (
        <Card className="bg-gradient-to-r from-primary-50 to-secondary-50">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  className="w-16 h-16"
                  name={userScore.userName}
                  src={userScore.userAvatar}
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold">{userScore.userName}</h3>
                    {userScore.organizationTag && (
                      <Chip color="primary" size="sm" variant="flat">
                        [{userScore.organizationTag}]
                      </Chip>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <HiOutlineTrophy className="w-5 h-5 text-warning-500" />
                      <span className="text-2xl font-bold text-primary-600">
                        #{userScore.rank}
                      </span>
                    </div>
                    {userScore.previousRank &&
                      userScore.previousRank !== userScore.rank && (
                        <div className="flex items-center gap-1">
                          {userScore.rank < userScore.previousRank ? (
                            <>
                              <HiOutlineArrowUp className="w-4 h-4 text-success-500" />
                              <span className="text-sm text-success-600 font-medium">
                                +{userScore.previousRank - userScore.rank}
                              </span>
                            </>
                          ) : (
                            <>
                              <HiOutlineArrowDown className="w-4 h-4 text-danger-500" />
                              <span className="text-sm text-danger-600 font-medium">
                                -{userScore.rank - userScore.previousRank}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">
                  Pontuação Total
                </div>
                <div className="text-3xl font-bold text-primary-600">
                  {userScore.totalScore.toFixed(1)}
                </div>
                <div className="flex gap-3 mt-2 text-xs">
                  <div>
                    <span className="text-gray-500">Interação: </span>
                    <span className="font-medium">
                      {userScore.interactionScore.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Eventos: </span>
                    <span className="font-medium">{userScore.eventScore}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estatísticas do Usuário */}
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {userScore.stats.totalPosts}
                </div>
                <div className="text-xs text-gray-600">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {userScore.stats.eventsParticipated}
                </div>
                <div className="text-xs text-gray-600">Eventos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {userScore.stats.totalWins}
                </div>
                <div className="text-xs text-gray-600">Vitórias</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {userScore.stats.activeDays}
                </div>
                <div className="text-xs text-gray-600">Dias Ativos</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tabs de Conteúdo */}
      <Tabs
        className="w-full"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
      >
        <Tab
          key="ranking"
          title={
            <div className="flex items-center gap-2">
              <HiOutlineChartBar className="w-4 h-4" />
              Ranking
            </div>
          }
        >
          {rankingLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <RankingTable currentUserId={user?.uid} ranking={ranking} />
          )}
        </Tab>

        <Tab
          key="rules"
          title={
            <div className="flex items-center gap-2">
              <HiOutlineStar className="w-4 h-4" />
              Regras
            </div>
          }
        >
          <RulesPanel config={season.config} />
        </Tab>
      </Tabs>
    </div>
  );
};

// ===== COMPONENTE DE TABELA DE RANKING =====

interface RankingTableProps {
  ranking: UserSeasonScore[];
  currentUserId?: string;
}

const RankingTable: React.FC<RankingTableProps> = ({
  ranking,
  currentUserId,
}) => {
  const getMedalColor = (rank: number) => {
    if (rank === 1) return "warning";
    if (rank === 2) return "default";
    if (rank === 3) return "warning";

    return "default";
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";

    return null;
  };

  if (ranking.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <HiOutlineChartBar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Nenhum jogador no ranking ainda. Seja o primeiro!
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {ranking.map((score) => {
        const isCurrentUser = score.userId === currentUserId;
        const medal = getMedalEmoji(score.rank);

        return (
          <Card
            key={score.id}
            className={`${isCurrentUser ? "ring-2 ring-primary border-primary" : ""}`}
          >
            <CardBody className="py-3">
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex items-center justify-center w-12">
                  {medal ? (
                    <span className="text-2xl">{medal}</span>
                  ) : (
                    <span className="text-xl font-bold text-gray-600">
                      #{score.rank}
                    </span>
                  )}
                </div>

                {/* Avatar e Nome */}
                <Avatar
                  name={score.userName}
                  size="md"
                  src={score.userAvatar}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{score.userName}</span>
                    {score.organizationTag && (
                      <Chip color="primary" size="sm" variant="flat">
                        [{score.organizationTag}]
                      </Chip>
                    )}
                    {isCurrentUser && (
                      <Chip color="secondary" size="sm" variant="flat">
                        Você
                      </Chip>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-600 mt-1">
                    <span>🔥 {score.stats.activeDays}d ativos</span>
                    <span>🏆 {score.stats.totalWins} vitórias</span>
                    <span>🎮 {score.stats.eventsParticipated} eventos</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">
                    {score.totalScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {score.interactionScore.toFixed(1)} + {score.eventScore}
                  </div>
                </div>

                {/* Mudança de Rank */}
                {score.previousRank && score.previousRank !== score.rank && (
                  <div className="w-8">
                    {score.rank < score.previousRank ? (
                      <HiOutlineArrowTrendingUp className="w-6 h-6 text-success-500" />
                    ) : (
                      <HiOutlineArrowTrendingDown className="w-6 h-6 text-danger-500" />
                    )}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};

// ===== COMPONENTE DE PAINEL DE REGRAS =====

interface RulesPanelProps {
  config: any;
}

const RulesPanel: React.FC<RulesPanelProps> = ({ config }) => {
  return (
    <div className="space-y-6">
      {/* Fórmula */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">📐 Fórmula de Pontuação v1</h3>
        </CardHeader>
        <CardBody>
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <code className="text-sm">
              ScoreTotal = min(InteraçãoDiária, {config.dailyInteractionCap}) ×{" "}
              {config.interactionWeight} + PontosEvento
            </code>
          </div>
          <p className="text-gray-600 text-sm">
            Seu score total é a soma dos pontos de interação diária (com limite
            e peso aplicados) mais os pontos conquistados em eventos externos.
          </p>
        </CardBody>
      </Card>

      {/* Interações Diárias */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">💬 Pontos por Interação</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Post criado</span>
              <Chip color="primary" size="sm">
                +{config.weights.postCreated} pts
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>Comentário feito</span>
              <Chip color="primary" size="sm">
                +{config.weights.commentMade} pts
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>Reação recebida</span>
              <Chip color="success" size="sm">
                +{config.weights.reactionReceived} pts
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>Reação dada</span>
              <Chip color="default" size="sm">
                +{config.weights.reactionGiven} pts
              </Chip>
            </div>
          </div>
          <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-sm text-warning-800">
              ⚠️ Limite diário: {config.dailyInteractionCap} pontos • Peso
              aplicado: {config.interactionWeight * 100}%
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Eventos */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">🏆 Pontos por Eventos</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>🥇 1º Lugar</span>
              <Chip color="warning" size="sm">
                {config.eventPlacementPoints.first} pts
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>🥈 2º Lugar</span>
              <Chip color="default" size="sm">
                {config.eventPlacementPoints.second} pts
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>🥉 3º Lugar</span>
              <Chip color="warning" size="sm">
                {config.eventPlacementPoints.third} pts
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>4º-8º Lugar</span>
              <Chip color="primary" size="sm">
                {config.eventPlacementPoints.eighth}-
                {config.eventPlacementPoints.fourth} pts
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>Participação</span>
              <Chip color="default" size="sm">
                {config.eventPlacementPoints.participation} pts
              </Chip>
            </div>
          </div>

          <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm font-medium text-primary-800 mb-2">
              Multiplicadores por Tier:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>🌟 Major: ×{config.eventTierMultipliers.major}</div>
              <div>🗺️ Regional: ×{config.eventTierMultipliers.regional}</div>
              <div>📍 Local: ×{config.eventTierMultipliers.local}</div>
              <div>👥 Community: ×{config.eventTierMultipliers.community}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Anti-Gaming */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">🛡️ Limites Anti-Spam</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Posts por dia</span>
              <span className="font-medium">
                máx. {config.antiSpam.maxPostsPerDay}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Comentários por dia</span>
              <span className="font-medium">
                máx. {config.antiSpam.maxCommentsPerDay}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Reações por dia</span>
              <span className="font-medium">
                máx. {config.antiSpam.maxReactionsPerDay}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Critérios de Desempate */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">⚖️ Critérios de Desempate</h3>
        </CardHeader>
        <CardBody>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Total de Pontos (maior)</li>
            <li>Pontos de Eventos (maior)</li>
            <li>Número de Vitórias (maior)</li>
            <li>Melhor Colocação em Eventos (menor número = melhor)</li>
            <li>Eventos Participados (maior)</li>
            <li>Pontos de Interação (maior)</li>
            <li>Dias Ativos (maior)</li>
          </ol>
        </CardBody>
      </Card>
    </div>
  );
};

export default RankingSystem;
