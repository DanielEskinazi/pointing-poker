export enum ClientEvents {
  // Connection
  SESSION_JOIN = 'session:join',
  SESSION_LEAVE = 'session:leave',
  
  // Player actions
  PLAYER_UPDATE = 'player:update',
  PLAYER_REMOVE = 'player:remove',
  PLAYER_PROMOTE = 'player:promote',
  PLAYER_ACTIVITY = 'player:activity',
  VOTE_SUBMIT = 'vote:submit',
  VOTE_CHANGE = 'vote:change',
  
  // Game flow
  CARDS_REVEAL = 'cards:reveal',
  GAME_RESET = 'game:reset',
  STORY_UPDATE = 'story:update',
  STORY_CREATE = 'story:create',
  STORY_DELETE = 'story:delete',
  STORY_ACTIVATE = 'story:activate',
  TIMER_START = 'timer:start',
  TIMER_STOP = 'timer:stop',
  
  // System
  HEARTBEAT = 'heartbeat'
}

export enum ServerEvents {
  // Connection
  SESSION_JOINED = 'session:joined',
  SESSION_ERROR = 'session:error',
  PLAYER_RECONNECTED = 'player:reconnected',
  
  // Player updates
  PLAYER_JOINED = 'player:joined',
  PLAYER_LEFT = 'player:left',
  PLAYER_UPDATED = 'player:updated',
  PLAYER_REMOVED = 'player:removed',
  PLAYER_PROMOTED = 'player:promoted',
  PLAYER_STATUS_CHANGED = 'player:status_changed',
  
  // Game state
  VOTE_SUBMITTED = 'vote:submitted',
  VOTE_CHANGED = 'vote:changed',
  CARDS_REVEALED = 'cards:revealed',
  GAME_RESET = 'game:reset',
  STORY_UPDATED = 'story:updated',
  STORY_CREATED = 'story:created',
  STORY_DELETED = 'story:deleted',
  STORY_ACTIVATED = 'story:activated',
  TIMER_UPDATED = 'timer:updated',
  
  // System
  CONNECTION_ERROR = 'connection:error',
  RATE_LIMIT_EXCEEDED = 'rate:limit',
  HEARTBEAT_RESPONSE = 'heartbeat:response'
}

// Player information interface
export interface PlayerInfo {
  id: string;
  name: string;
  avatar: string;
  isSpectator: boolean;
  isActive: boolean;
  isHost: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
}

// Vote result interface
export interface VoteResult {
  playerId: string;
  playerName: string;
  value: string;
  confidence?: number;
}

// Consensus data interface
export interface ConsensusData {
  hasConsensus: boolean;
  suggestedValue?: string;
  averageValue?: number;
  deviation?: number;
}

// Story information interface
export interface StoryInfo {
  id: string;
  title: string;
  description?: string;
  finalEstimate?: string;
  orderIndex: number;
  isActive: boolean;
}

// Timer state interface
export interface TimerState {
  isRunning: boolean;
  duration: number;
  remainingTime: number;
  startedAt?: Date;
}

// Type-safe event payloads for client events
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
  
  [ClientEvents.PLAYER_REMOVE]: {
    playerId: string;
  };
  
  [ClientEvents.PLAYER_PROMOTE]: {
    playerId: string;
  };
  
  [ClientEvents.PLAYER_ACTIVITY]: Record<string, never>;
  
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
  
  [ClientEvents.STORY_ACTIVATE]: {
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

// Type-safe event payloads for server events
export interface ServerEventPayloads {
  [ServerEvents.SESSION_JOINED]: {
    sessionId: string;
    player: PlayerInfo;
    players: PlayerInfo[];
    stories: StoryInfo[];
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
  
  [ServerEvents.PLAYER_REMOVED]: {
    playerId: string;
    removedBy: string;
    playerCount: number;
  };
  
  [ServerEvents.PLAYER_PROMOTED]: {
    newHost: PlayerInfo;
    previousHost?: PlayerInfo;
  };
  
  [ServerEvents.PLAYER_STATUS_CHANGED]: {
    playerId: string;
    isOnline: boolean;
    lastSeenAt: Date;
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
  
  [ServerEvents.STORY_ACTIVATED]: {
    story: StoryInfo;
    previousActiveStoryId?: string;
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

// Connection data interface
export interface SocketConnection {
  socketId: string;
  sessionId: string;
  playerId?: string;
  connectedAt: Date;
  lastActivity: Date;
  isAuthenticated: boolean;
}