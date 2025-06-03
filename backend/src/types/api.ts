// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

// Session API Types
export interface CreateSessionDto {
  name: string;
  password?: string;
  config: SessionConfig;
  host: {
    name: string;
    avatar?: string;
  };
}

export interface JoinSessionDto {
  name: string;
  avatar: string;
  password?: string;
  isSpectator?: boolean;
}

export interface UpdateSessionDto {
  name?: string;
  config?: Partial<SessionConfig>;
}

export interface SessionConfig {
  cardValues: string[];
  allowSpectators: boolean;
  autoRevealCards: boolean;
  timerSeconds: number;
}

export interface SessionResponse {
  id: string;
  name: string;
  hostId: string;
  config: SessionConfig;
  isActive: boolean;
  cardsRevealed?: boolean;
  createdAt: Date;
  expiresAt: Date;
  players: PlayerResponse[];
  playerCount: number;
}

export interface PlayerResponse {
  id: string;
  name: string;
  avatar: string;
  isSpectator: boolean;
  isActive: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
}

export interface JoinSessionResponse {
  playerId: string;
  sessionId: string;
  token: string;
}

export interface CreateSessionResponse {
  session: SessionResponse;
  joinUrl: string;
  hostToken: string;
}

// Authentication Types
export interface TokenPayload {
  sessionId: string;
  playerId: string;
  isHost: boolean;
  iat?: number;
  exp?: number;
}

// Database Types
export interface CreateSessionData {
  id: string;
  name: string;
  passwordHash?: string;
  hostId: string;
  config: SessionConfig;
  expiresAt: Date;
}

export interface CreatePlayerData {
  id?: string;
  sessionId: string;
  name: string;
  avatar: string;
  isSpectator: boolean;
}

// Voting API Types
export interface SubmitVoteDto {
  sessionId: string;
  storyId: string;
  playerId: string;
  value: string;
  confidence?: number;
}

export interface Vote {
  id: string;
  playerId: string;
  playerName: string;
  value: string;
  confidence?: number;
  timestamp: Date;
}

export interface VoteResponse {
  playerId: string;
  playerName: string;
  hasVoted: boolean;
  value: string | null;
  confidence?: number | null;
  timestamp: Date;
}

export interface ConsensusResult {
  value: string;
  agreement: number;
  average: number | null;
  distribution: Record<string, number>;
  totalVotes: number;
}

export interface StatisticsResult {
  min: number;
  max: number;
  median: number;
  standardDeviation: number;
  confidenceAverage: number;
}

export interface VotingResponse {
  votes: VoteResponse[];
  revealed: boolean;
  consensus: ConsensusResult | null;
}

export interface RevealCardsResponse {
  votes: Vote[];
  consensus: ConsensusResult | null;
  statistics: StatisticsResult | null;
}

// Player API Types
export interface UpdatePlayerDto {
  name?: string;
  avatar?: string;
  isSpectator?: boolean;
}

export interface PlayerWithVoteResponse {
  id: string;
  name: string;
  avatar: string;
  isSpectator: boolean;
  isActive: boolean;
  hasVoted: boolean;
  lastSeenAt: Date;
}

// Story Types  
export interface StoryData {
  title: string;
  description?: string;
}