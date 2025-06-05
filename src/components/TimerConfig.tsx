import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Play, Settings2, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '../store';
import type { TimerConfiguration } from '../types';

interface TimerConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimerConfig = ({ isOpen, onClose }: TimerConfigProps) => {
  const { timerState, configureTimer } = useGameStore();
  
  const [config, setConfig] = useState<TimerConfiguration>({
    mode: timerState.mode,
    duration: timerState.duration,
    settings: { ...timerState.settings }
  });

  const presets = [
    { label: '1 min', value: 60 },
    { label: '2 min', value: 120 },
    { label: '3 min', value: 180 },
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '15 min', value: 900 }
  ];

  const handleSave = () => {
    configureTimer(config);
    onClose();
  };

  const handlePresetSelect = (duration: number) => {
    setConfig(prev => ({ ...prev, duration }));
  };

  const handleCustomDuration = (minutes: number) => {
    const duration = Math.max(1, Math.min(60, minutes)) * 60; // Clamp between 1-60 minutes
    setConfig(prev => ({ ...prev, duration }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Settings2 className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">Timer Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Timer Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Timer Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'countdown', label: 'Countdown', icon: Clock },
                    { value: 'stopwatch', label: 'Stopwatch', icon: Play },
                    { value: 'none', label: 'No Timer', icon: X }
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setConfig(prev => ({ ...prev, mode: value as TimerConfiguration['mode'] }))}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                        config.mode === value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Settings (only for countdown) */}
              {config.mode === 'countdown' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Duration
                  </label>
                  
                  {/* Preset Buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {presets.map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => handlePresetSelect(value)}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                          config.duration === value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Duration */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Custom:</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={Math.floor(config.duration / 60)}
                      onChange={(e) => handleCustomDuration(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-600">minutes</span>
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    Current: {formatTime(config.duration)}
                  </div>
                </div>
              )}

              {/* Timer Options (only for countdown) */}
              {config.mode === 'countdown' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Options
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={config.settings.autoReveal}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          settings: { ...prev.settings, autoReveal: e.target.checked }
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Auto-reveal votes</div>
                        <div className="text-xs text-gray-500">Automatically reveal cards when timer expires</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={config.settings.audioEnabled}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          settings: { ...prev.settings, audioEnabled: e.target.checked }
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        {config.settings.audioEnabled ? (
                          <Volume2 size={16} className="text-gray-500" />
                        ) : (
                          <VolumeX size={16} className="text-gray-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-700">Audio alerts</div>
                          <div className="text-xs text-gray-500">Play sounds for warnings and completion</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};