import { useState } from 'react';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store';

const AVATARS = ['👩‍💻', '👨‍💻', '🧙‍♂️', '🦄', '🚀', '🎮', '🤖', '🦸‍♂️'];

export function JoinGame() {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const addPlayer = useGameStore((state) => state.addPlayer);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      addPlayer({
        id: crypto.randomUUID(),
        name: name.trim(),
        avatar: selectedAvatar,
        selectedCard: null,
        isRevealed: false,
      });
      setName('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 shadow-lg mb-8"
    >
      <h2 className="text-xl font-semibold mb-4">Join Game</h2>
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose Avatar
          </label>
          <div className="flex gap-2 flex-wrap">
            {AVATARS.map((avatar) => (
              <button
                key={avatar}
                type="button"
                onClick={() => setSelectedAvatar(avatar)}
                className={`w-10 h-10 text-xl flex items-center justify-center rounded-full transition-all ${
                  selectedAvatar === avatar
                    ? 'bg-blue-100 ring-2 ring-blue-500'
                    : 'hover:bg-gray-100'
                }`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Join Game
        </button>
      </form>
    </motion.div>
  );
}