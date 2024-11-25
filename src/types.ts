export type CardValue = number | '?' | 'coffee';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  selectedCard: CardValue | null;
  isRevealed: boolean;
}

export interface GameState {
  players: Player[];
  isRevealing: boolean;
  timer: number;
  currentStory: string;
  cardValues: CardValue[];
  isConfigured: boolean;
}