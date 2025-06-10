import { motion } from 'framer-motion';
import { useGameStore } from '../store';

export const PlayerListSidebar = () => {
  const { players, getCurrentPlayerId } = useGameStore();
  const currentPlayerId = getCurrentPlayerId();
  
  // Show all players including current user
  const allPlayers = players;

  if (allPlayers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Players</h3>
        <span className="text-sm text-gray-500">
          {allPlayers.length} player{allPlayers.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {allPlayers.map((player) => (
          <div
            key={player.id}
            className={`p-3 border border-gray-200 rounded-lg transition-colors ${
              player.id === currentPlayerId ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{player.avatar}</span>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{player.name}</span>
                    {player.id === currentPlayerId && (
                      <span className="text-xs text-blue-600">(You)</span>
                    )}
                    {player.isHost && <span className="text-xs">👑</span>}
                    {player.isSpectator && <span className="text-xs">👁️</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {player.votedInCurrentRound ? 'Has voted ✅' : 'Not voted ⏳'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  player.isOnline ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-gray-500">
                  {player.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};