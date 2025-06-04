import { motion } from 'framer-motion';
import { PlayerAvatar } from './PlayerAvatar';
import type { Player } from '../types';

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  isHost?: boolean;
  onRemovePlayer?: (playerId: string) => void;
  onPromotePlayer?: (playerId: string) => void;
  onToggleSpectator?: (playerId: string) => void;
}

export function PlayerList({ 
  players, 
  currentPlayerId,
  isHost = false,
  onRemovePlayer,
  onPromotePlayer,
  onToggleSpectator
}: PlayerListProps) {
  const onlinePlayers = players.filter(p => p.isOnline);
  const offlinePlayers = players.filter(p => !p.isOnline);
  const currentPlayer = players.find(p => p.id === currentPlayerId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Players ({onlinePlayers.length} online)
        </h3>
        {isHost && (
          <div className="text-sm text-gray-600">
            You are the host
          </div>
        )}
      </div>

      {/* Current Player */}
      {currentPlayer && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600 mb-2">You</div>
          <PlayerAvatar 
            player={currentPlayer}
            showHostControls={false}
          />
        </div>
      )}

      {/* Online Players */}
      {onlinePlayers.filter(p => p.id !== currentPlayerId).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            Online ({onlinePlayers.filter(p => p.id !== currentPlayerId).length})
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {onlinePlayers
              .filter(p => p.id !== currentPlayerId)
              .map((player) => (
                <div key={player.id} className="p-3 border border-gray-200 rounded-lg">
                  <PlayerAvatar 
                    player={player}
                    showHostControls={isHost}
                    isCurrentUserHost={isHost}
                    onRemovePlayer={onRemovePlayer}
                    onPromotePlayer={onPromotePlayer}
                    onToggleSpectator={onToggleSpectator}
                  />
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {player.isHost && 'Host • '}
                    {player.isSpectator && 'Spectator • '}
                    {player.votedInCurrentRound ? 'Voted ✅' : 'Not voted ⏳'}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Offline Players */}
      {offlinePlayers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
            Offline ({offlinePlayers.length})
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {offlinePlayers.map((player) => (
              <div key={player.id} className="p-3 border border-gray-200 rounded-lg opacity-50">
                <PlayerAvatar 
                  player={player}
                  showHostControls={isHost}
                  isCurrentUserHost={isHost}
                  onRemovePlayer={onRemovePlayer}
                  onPromotePlayer={onPromotePlayer}
                  onToggleSpectator={onToggleSpectator}
                />
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {player.isHost && 'Host • '}
                  {player.isSpectator && 'Spectator • '}
                  Last seen: {player.lastSeenAt ? new Date(player.lastSeenAt).toLocaleTimeString() : 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {players.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">👥</div>
          <div>No players in this session yet</div>
        </div>
      )}

      {/* Session stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total players: {players.length}</span>
          <span>Voters: {players.filter(p => !p.isSpectator).length}</span>
          <span>Spectators: {players.filter(p => p.isSpectator).length}</span>
        </div>
      </div>
    </motion.div>
  );
}