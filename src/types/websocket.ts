export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface QueuedEvent {
  event: string;
  data: unknown;
  timestamp: number;
}

export interface QueuedAction {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
}

// Client -> Server events (matching backend)
export enum ClientEvents {
  SESSION_JOIN = 'session:join',
  SESSION_LEAVE = 'session:leave',
  PLAYER_UPDATE = 'player:update',
  VOTE_SUBMIT = 'vote:submit',
  VOTE_CHANGE = 'vote:change',
  CARDS_REVEAL = 'cards:reveal',
  GAME_RESET = 'game:reset',
  STORY_UPDATE = 'story:update',
  STORY_CREATE = 'story:create',
  STORY_DELETE = 'story:delete',
  TIMER_START = 'timer:start',
  TIMER_STOP = 'timer:stop',
  HEARTBEAT = 'heartbeat'
}

// Server -> Client events (matching backend)
export enum ServerEvents {
  SESSION_JOINED = 'session:joined',
  SESSION_ERROR = 'session:error',
  PLAYER_RECONNECTED = 'player:reconnected',
  PLAYER_JOINED = 'player:joined',
  PLAYER_LEFT = 'player:left',
  PLAYER_UPDATED = 'player:updated',
  VOTE_SUBMITTED = 'vote:submitted',
  VOTE_CHANGED = 'vote:changed',
  CARDS_REVEALED = 'cards:revealed',
  GAME_RESET = 'game:reset',
  STORY_UPDATED = 'story:updated',
  STORY_CREATED = 'story:created',
  STORY_DELETED = 'story:deleted',
  TIMER_UPDATED = 'timer:updated',
  CONNECTION_ERROR = 'connection:error',
  RATE_LIMIT_EXCEEDED = 'rate:limit',
  HEARTBEAT_RESPONSE = 'heartbeat:response'
}

// Backend compatible interfaces
export interface PlayerInfo {
  id: string;
  name: string;
  avatar: string;
  isSpectator: boolean;
  isActive: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
}

export interface VoteResult {
  playerId: string;
  playerName: string;
  value: string;
  confidence?: number;
}

export interface ConsensusData {
  hasConsensus: boolean;
  suggestedValue?: string;
  averageValue?: number;
  deviation?: number;
}

export interface StoryInfo {
  id: string;
  title: string;
  description?: string;
  finalEstimate?: string;
  orderIndex: number;
  isActive: boolean;
}

export interface TimerState {
  isRunning: boolean;
  duration: number;
  remainingTime: number;
  startedAt?: Date;
}

// Legacy interfaces for backward compatibility
export interface PlayerJoinedData {
  player: PlayerInfo;
  playerCount: number;
}

export interface PlayerLeftData {
  playerId: string;
  playerCount: number;
}

export interface PlayerUpdatedData {
  player: PlayerInfo;
}

export interface VoteSubmittedData {
  playerId: string;
  hasVoted: boolean;
  voteCount: number;
  totalPlayers: number;
}

export interface CardsRevealedData {
  storyId: string;
  votes: VoteResult[];
  consensus: ConsensusData;
}

export interface StoryUpdatedData {
  story: StoryInfo;
}

export interface TimerUpdatedData {
  timer: TimerState;
}

export interface SessionStateData {
  sessionId: string;
  player: PlayerInfo;
  players: PlayerInfo[];
  currentStory?: StoryInfo;
  timer?: TimerState;
}

// Client event payload types (matching backend)
export interface ClientEventPayloads {
  [ClientEvents.SESSION_JOIN]: {
    sessionId: string;
    playerId?: string;
    playerName?: string;
    avatar?: string;
    isSpectator?: boolean;
  };
  [ClientEvents.SESSION_LEAVE]: {
    sessionId: string;
  };
  [ClientEvents.PLAYER_UPDATE]: {
    name?: string;
    avatar?: string;
    isSpectator?: boolean;
  };
  [ClientEvents.VOTE_SUBMIT]: {
    storyId: string;
    value: string;
    confidence?: number;
  };
  [ClientEvents.VOTE_CHANGE]: {
    storyId: string;
    value: string;
    confidence?: number;
  };
  [ClientEvents.CARDS_REVEAL]: {
    storyId: string;
  };
  [ClientEvents.GAME_RESET]: {
    storyId: string;
  };
  [ClientEvents.STORY_UPDATE]: {
    storyId: string;
    title?: string;
    description?: string;
    finalEstimate?: string;
  };
  [ClientEvents.STORY_CREATE]: {
    title: string;
    description?: string;
    orderIndex?: number;
  };
  [ClientEvents.STORY_DELETE]: {
    storyId: string;
  };
  [ClientEvents.TIMER_START]: {
    duration: number;
  };
  [ClientEvents.TIMER_STOP]: Record<string, never>;
  [ClientEvents.HEARTBEAT]: {
    timestamp: number;
  };
}

// Server event payload types (matching backend)
export interface ServerEventPayloads {
  [ServerEvents.SESSION_JOINED]: {
    sessionId: string;
    player: PlayerInfo;
    players: PlayerInfo[];
    currentStory?: StoryInfo;
    timer?: TimerState;
  };
  [ServerEvents.SESSION_ERROR]: {
    error: string;
    code?: string;
  };
  [ServerEvents.PLAYER_RECONNECTED]: {
    player: PlayerInfo;
    sessionState: {
      players: PlayerInfo[];
      currentStory?: StoryInfo;
      timer?: TimerState;
      votesRevealed: boolean;
    };
  };
  [ServerEvents.PLAYER_JOINED]: {
    player: PlayerInfo;
    playerCount: number;
  };
  [ServerEvents.PLAYER_LEFT]: {
    playerId: string;
    playerCount: number;
  };
  [ServerEvents.PLAYER_UPDATED]: {
    player: PlayerInfo;
  };
  [ServerEvents.VOTE_SUBMITTED]: {
    playerId: string;
    hasVoted: boolean;
    voteCount: number;
    totalPlayers: number;
  };
  [ServerEvents.VOTE_CHANGED]: {
    playerId: string;
    hasVoted: boolean;
  };
  [ServerEvents.CARDS_REVEALED]: {
    storyId: string;
    votes: VoteResult[];
    consensus: ConsensusData;
  };
  [ServerEvents.GAME_RESET]: {
    storyId: string;
  };
  [ServerEvents.STORY_UPDATED]: {
    story: StoryInfo;
  };
  [ServerEvents.STORY_CREATED]: {
    story: StoryInfo;
  };
  [ServerEvents.STORY_DELETED]: {
    storyId: string;
  };
  [ServerEvents.TIMER_UPDATED]: {
    timer: TimerState;
  };
  [ServerEvents.CONNECTION_ERROR]: {
    error: string;
    code?: string;
  };
  [ServerEvents.RATE_LIMIT_EXCEEDED]: {
    event: string;
    retryAfter: number;
  };
  [ServerEvents.HEARTBEAT_RESPONSE]: {
    timestamp: number;
    serverTime: number;
  };
}