import { motion } from 'framer-motion';
import type { Player } from '../types';

interface PlayerAvatarProps {
  player: Player;
}

export function PlayerAvatar({ player }: PlayerAvatarProps) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
          {player.avatar}
        </div>
        {player.selectedCard && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs"
          >
            ✓
          </motion.div>
        )}
      </div>
      <span className="text-sm font-medium">{player.name}</span>
      {player.isRevealed && player.selectedCard && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="px-3 py-1 bg-blue-100 rounded-full text-blue-800 text-sm font-medium"
        >
          {player.selectedCard}
        </motion.div>
      )}
    </motion.div>
  );
}