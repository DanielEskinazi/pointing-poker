export type CardValue = number | '?' | 'coffee';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  selectedCard: CardValue | null;
  isRevealed: boolean;
  isSpectator?: boolean;
}

export interface GameState {
  players: Player[];
  isRevealing: boolean;
  timer: number;
  currentStory: string;
  cardValues: CardValue[];
  isConfigured: boolean;
}

export interface Session {
  id: string;
  name: string;
  hostId: string | null;
  config: {
    cardValues: string[];
    allowSpectators: boolean;
    autoRevealCards: boolean;
    timerSeconds: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  players?: Array<{
    id: string;
    name: string;
    avatar: string;
    isSpectator: boolean;
    isActive: boolean;
    joinedAt: string;
    lastSeenAt: string;
  }>;
  playerCount?: number;
}

export interface Vote {
  id: string;
  playerId: string;
  sessionId: string;
  storyId?: string;
  value: CardValue;
  createdAt: string;
}

export interface VotingState {
  votes: Vote[];
  isRevealed: boolean;
  consensus?: CardValue;
}

export interface RevealResult {
  votes: Vote[];
  consensus?: CardValue;
  statistics: {
    average: number;
    median: number;
    mode: CardValue[];
  };
}

export interface StoryData {
  id: string;
  title: string;
  description?: string;
}

export interface CreateSessionDto {
  name: string;
  hostName: string;
  hostAvatar?: string;
  password?: string;
  config?: {
    cardValues: string[];
    allowSpectators?: boolean;
    autoRevealCards?: boolean;
    timerSeconds?: number;
  };
}

export interface JoinSessionDto {
  playerName: string;
  avatar?: string;
}

export interface UpdatePlayerDto {
  name?: string;
  avatar?: string;
}

export interface SubmitVoteDto {
  playerId: string;
  value: CardValue;
  storyId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}