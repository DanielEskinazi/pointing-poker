import { motion } from 'framer-motion';
import type { Player } from '../types';

interface PlayerAvatarProps {
  player: Player;
  showHostControls?: boolean;
  isCurrentUserHost?: boolean;
  onRemovePlayer?: (playerId: string) => void;
  onPromotePlayer?: (playerId: string) => void;
  onToggleSpectator?: (playerId: string) => void;
}

export function PlayerAvatar({ 
  player, 
  showHostControls = false,
  isCurrentUserHost = false,
  onRemovePlayer,
  onPromotePlayer,
  onToggleSpectator
}: PlayerAvatarProps) {
  const getStatusColor = () => {
    if (!player.isOnline) return 'bg-red-500'; // Offline
    const lastSeen = new Date(player.lastSeenAt || Date.now());
    const timeDiff = Date.now() - lastSeen.getTime();
    
    if (timeDiff < 30 * 1000) return 'bg-green-500'; // Online (active in last 30s)
    if (timeDiff < 5 * 60 * 1000) return 'bg-yellow-500'; // Away (active in last 5 min)
    return 'bg-red-500'; // Offline
  };

  const getStatusLabel = () => {
    if (!player.isOnline) return 'Offline';
    const lastSeen = new Date(player.lastSeenAt || Date.now());
    const timeDiff = Date.now() - lastSeen.getTime();
    
    if (timeDiff < 30 * 1000) return 'Online';
    if (timeDiff < 5 * 60 * 1000) return 'Away';
    return 'Offline';
  };

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
        
        {/* Status indicator */}
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor()} rounded-full border-2 border-white`} />
        
        {/* Host indicator */}
        {player.isHost && (
          <div className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">
            👑
          </div>
        )}
        
        {/* Spectator indicator */}
        {player.isSpectator && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs">
            👁️
          </div>
        )}
        
        {/* Vote indicator */}
        {player.selectedCard && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs"
          >
            ✓
          </motion.div>
        )}
      </div>
      
      <div className="text-center">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">{player.name}</span>
          {player.isHost && <span className="text-xs">👑</span>}
          {player.isSpectator && <span className="text-xs">👁️</span>}
        </div>
        <div className="text-xs text-gray-500">{getStatusLabel()}</div>
        {player.lastSeenAt && (
          <div className="text-xs text-gray-400">
            {new Date(player.lastSeenAt).toLocaleTimeString()}
          </div>
        )}
      </div>
      
      {/* Host controls */}
      {showHostControls && isCurrentUserHost && !player.isHost && (
        <div className="flex gap-1 mt-1">
          <button
            onClick={() => onPromotePlayer?.(player.id)}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            title="Make Host"
          >
            👑
          </button>
          <button
            onClick={() => onToggleSpectator?.(player.id)}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            title={player.isSpectator ? "Make Voter" : "Make Spectator"}
          >
            {player.isSpectator ? "🗳️" : "👁️"}
          </button>
          <button
            onClick={() => onRemovePlayer?.(player.id)}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            title="Remove Player"
          >
            ❌
          </button>
        </div>
      )}
      
      {/* Vote result */}
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