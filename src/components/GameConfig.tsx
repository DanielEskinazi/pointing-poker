import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useGameStore } from '../store';
import { useCreateSession } from '../hooks/api/useSession';
import type { CardValue } from '../types';

// Valid card values that match backend validation
// Backend accepts: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕']
const PRESET_CONFIGS = {
  fibonacci: ['1', '2', '3', '5', '8', '13', '21', '34'],
  modified: ['0', '1', '2', '3', '5', '8', '13'],
  special: ['1', '2', '3', '5', '8', '?', '☕'], // Using valid special characters
} as const;

export function GameConfig() {
  const [customValues, setCustomValues] = useState<string>('');
  const [hostName, setHostName] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const { setCardValues, setIsConfigured, joinSession } = useGameStore();
  const createSession = useCreateSession();

  const handleCreateSession = async (values: CardValue[], name: string) => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsCreating(true);
    try {
      // Ensure all values are strings for backend validation
      const cardValues = values.map(v => v.toString());
      
      const result = await createSession.mutateAsync({
        name: 'Planning Poker Session',
        hostName: name.trim(),
        hostAvatar: '👤',
        config: {
          cardValues,
          timerSeconds: 60,
          allowSpectators: true,
          autoRevealCards: false
        }
      });

      // Update local state
      setCardValues(values);
      setIsConfigured(true);
      joinSession(result.data.session.id);
      
      // Store host player ID
      localStorage.setItem(`player_${result.data.session.id}`, result.data.session.players[0].id);
      
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('session', result.data.session.id);
      window.history.pushState({}, '', url.toString());
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePresetSelect = (values: CardValue[]) => {
    handleCreateSession(values, hostName);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const VALID_CARD_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
    
    const inputValues = customValues
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
    
    // Validate that all values are in the allowed list
    const invalidValues = inputValues.filter(v => !VALID_CARD_VALUES.includes(v));
    if (invalidValues.length > 0) {
      alert(`Invalid card values: ${invalidValues.join(', ')}.\nAllowed values: ${VALID_CARD_VALUES.join(', ')}`);
      return;
    }
    
    if (inputValues.length > 0) {
      handleCreateSession(inputValues as CardValue[], hostName);
    } else {
      alert('Please enter at least one card value');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto bg-white rounded-xl p-8 shadow-lg mt-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold">Create New Session</h2>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isCreating}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Preset Card Values</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handlePresetSelect(PRESET_CONFIGS.fibonacci)}
              className="p-4 border rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              disabled={isCreating || !hostName.trim()}
            >
              <div className="font-medium mb-2">Fibonacci</div>
              <div className="text-sm text-gray-600">
                {PRESET_CONFIGS.fibonacci.join(', ')}
              </div>
            </button>
            <button
              onClick={() => handlePresetSelect(PRESET_CONFIGS.modified)}
              className="p-4 border rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              disabled={isCreating || !hostName.trim()}
            >
              <div className="font-medium mb-2">Modified</div>
              <div className="text-sm text-gray-600">
                {PRESET_CONFIGS.modified.join(', ')}
              </div>
            </button>
            <button
              onClick={() => handlePresetSelect(PRESET_CONFIGS.special)}
              className="p-4 border rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              disabled={isCreating || !hostName.trim()}
            >
              <div className="font-medium mb-2">Special Cards</div>
              <div className="text-sm text-gray-600">
                {PRESET_CONFIGS.special.join(', ')}
              </div>
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Custom Card Values</h3>
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter values separated by commas
              </label>
              <input
                type="text"
                value={customValues}
                onChange={(e) => setCustomValues(e.target.value)}
                placeholder="1, 2, 3, 5, 8, 13"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isCreating}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={isCreating || !hostName.trim()}
            >
              {isCreating ? 'Creating Session...' : 'Use Custom Values'}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}