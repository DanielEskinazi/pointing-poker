import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useGameStore } from '../store';
import type { CardValue } from '../types';

const PRESET_CONFIGS = {
  fibonacci: [1, 2, 3, 5, 8, 13, 21, 34],
  modified: [0, 0.5, 1, 2, 3, 5, 8, 13],
  tShirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
} as const;

export function GameConfig() {
  const [customValues, setCustomValues] = useState<string>('');
  const { setCardValues, setIsConfigured, createSession } = useGameStore();

  const handlePresetSelect = (values: CardValue[]) => {
    const sessionId = createSession();
    setCardValues(values);
    setIsConfigured(true);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = customValues
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => (isNaN(Number(v)) ? v : Number(v))) as CardValue[];
    
    if (values.length > 0) {
      const sessionId = createSession();
      setCardValues(values);
      setIsConfigured(true);
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
        <h2 className="text-2xl font-bold">Game Configuration</h2>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Preset Card Values</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handlePresetSelect(PRESET_CONFIGS.fibonacci)}
              className="p-4 border rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium mb-2">Fibonacci</div>
              <div className="text-sm text-gray-600">
                {PRESET_CONFIGS.fibonacci.join(', ')}
              </div>
            </button>
            <button
              onClick={() => handlePresetSelect(PRESET_CONFIGS.modified)}
              className="p-4 border rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium mb-2">Modified</div>
              <div className="text-sm text-gray-600">
                {PRESET_CONFIGS.modified.join(', ')}
              </div>
            </button>
            <button
              onClick={() => handlePresetSelect(PRESET_CONFIGS.tShirt)}
              className="p-4 border rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium mb-2">T-Shirt Sizes</div>
              <div className="text-sm text-gray-600">
                {PRESET_CONFIGS.tShirt.join(', ')}
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
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Use Custom Values
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}