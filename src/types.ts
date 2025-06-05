export type CardValue = number | '?' | 'coffee';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  selectedCard: CardValue | null;
  isRevealed: boolean;
  isSpectator?: boolean;
  isHost?: boolean;
  isOnline?: boolean;
  joinedAt?: string;
  lastSeenAt?: string;
  votedInCurrentRound?: boolean;
}

export interface TimerConfiguration {
  mode: 'countdown' | 'stopwatch' | 'none';
  duration: number; // seconds
  settings: {
    autoReveal: boolean;
    autoSkip: boolean;
    audioEnabled: boolean;
    warningAt: number[]; // seconds remaining for warnings
  };
}

export interface TimerState {
  mode: 'countdown' | 'stopwatch' | 'none';
  duration: number; // seconds
  remaining: number; // seconds
  isRunning: boolean;
  isPaused: boolean;
  startedAt: number | null; // timestamp
  pausedAt: number | null; // timestamp
  settings: {
    autoReveal: boolean;
    autoSkip: boolean;
    audioEnabled: boolean;
    warningAt: number[]; // seconds remaining for warnings
  };
}

export interface GameState {
  players: Player[];
  isRevealing: boolean;
  timer: number; // Legacy field - keep for compatibility
  timerState: TimerState;
  currentStory: string;
  stories: Story[];
  cardValues: CardValue[];
  isConfigured: boolean;
  voting: VotingFlowState;
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

export interface Story {
  id: string;
  title: string;
  description?: string;
  finalEstimate?: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface StoryData {
  id: string;
  title: string;
  description?: string;
}

export interface CreateStoryDto {
  title: string;
  description?: string;
}

export interface UpdateStoryDto {
  title?: string;
  description?: string;
  isActive?: boolean;
  finalEstimate?: string;
}

export interface ConsensusData {
  hasConsensus: boolean;
  suggestedValue?: CardValue;
  averageValue?: number;
  deviation?: number;
}

export interface VoteProgress {
  votedPlayers: string[];
  totalVotingPlayers: number;
  hasVoted: boolean;
}

export interface VotingFlowState {
  votes: Record<string, CardValue>;
  isRevealed: boolean;
  hasVoted: boolean;
  consensus: ConsensusData | null;
  votingResults: Vote[];
  currentStoryId: string | null;
  voteCount?: number; // Backend-provided vote count for sync
  totalPlayers?: number; // Backend-provided total player count for sync
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
  value: string; // Backend expects string
  storyId: string; // Backend requires this
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