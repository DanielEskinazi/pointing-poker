import { motion } from 'framer-motion';
import { Timer as TimerIcon, Pause, Play, Square, Plus, RotateCcw, Settings } from 'lucide-react';
import { useGameStore } from '../store';

interface TimerDisplayProps {
  onConfigure?: () => void;
}

export const TimerDisplay = ({ onConfigure }: TimerDisplayProps) => {
  const { 
    timerState, 
    isCurrentUserHost, 
    startTimer, 
    pauseTimer, 
    resumeTimer, 
    stopTimer, 
    resetTimer, 
    addTime,
    getTimerDisplay 
  } = useGameStore();

  const isHost = isCurrentUserHost();
  const { minutes, seconds, isWarning, warningLevel } = getTimerDisplay();

  if (timerState.mode === 'none') {
    return null;
  }

  const handleAddTime = (secondsToAdd: number) => {
    addTime(secondsToAdd);
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (timerState.mode === 'stopwatch') {
      return Math.min((timerState.remaining / timerState.duration) * 100, 100);
    }
    return (timerState.remaining / timerState.duration) * 100;
  };

  const getTimerColor = () => {
    if (!isWarning) return 'text-gray-700';
    
    switch (warningLevel) {
      case 'low': return 'text-yellow-600';
      case 'medium': return 'text-orange-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-700';
    }
  };

  const getProgressColor = () => {
    if (!isWarning) return 'bg-blue-500';
    
    switch (warningLevel) {
      case 'low': return 'bg-yellow-500';
      case 'medium': return 'bg-orange-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`bg-white rounded-lg p-4 shadow-lg border-2 transition-all duration-300 ${
        warningLevel === 'high' ? 'border-red-300 animate-pulse' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TimerIcon className={`${getTimerColor()} transition-colors`} size={20} />
          <span className="text-sm font-medium text-gray-600 capitalize">
            {timerState.mode} Timer
          </span>
        </div>
        {isHost && onConfigure && (
          <button
            onClick={onConfigure}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Configure timer"
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      {/* Timer Display */}
      <div className="text-center mb-4">
        <motion.div
          className={`text-4xl font-mono font-bold ${getTimerColor()} transition-colors`}
          animate={warningLevel === 'high' ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: warningLevel === 'high' ? Infinity : 0 }}
        >
          {formatTime(minutes, seconds)}
        </motion.div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <motion.div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.max(0, Math.min(100, getProgressPercentage()))}%` }}
            animate={warningLevel === 'high' ? { opacity: [1, 0.7, 1] } : {}}
            transition={{ duration: 1, repeat: warningLevel === 'high' ? Infinity : 0 }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          timerState.isRunning 
            ? 'bg-green-100 text-green-800' 
            : timerState.isPaused
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {timerState.isRunning ? 'Running' : timerState.isPaused ? 'Paused' : 'Stopped'}
        </span>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="space-y-3">
          {/* Main Controls */}
          <div className="flex justify-center gap-2">
            {!timerState.isRunning ? (
              <button
                onClick={timerState.isPaused ? resumeTimer : startTimer}
                className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
              >
                <Play size={14} />
                {timerState.isPaused ? 'Resume' : 'Start'}
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm"
              >
                <Pause size={14} />
                Pause
              </button>
            )}
            
            <button
              onClick={stopTimer}
              className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
            >
              <Square size={14} />
              Stop
            </button>
            
            <button
              onClick={resetTimer}
              className="flex items-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          {/* Add Time Controls (only for countdown) */}
          {timerState.mode === 'countdown' && (
            <div className="flex justify-center gap-1">
              <button
                onClick={() => handleAddTime(30)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                title="Add 30 seconds"
              >
                <Plus size={12} />
                30s
              </button>
              <button
                onClick={() => handleAddTime(60)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                title="Add 1 minute"
              >
                <Plus size={12} />
                1m
              </button>
              <button
                onClick={() => handleAddTime(300)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                title="Add 5 minutes"
              >
                <Plus size={12} />
                5m
              </button>
            </div>
          )}
        </div>
      )}

      {/* Auto-reveal warning */}
      {timerState.settings.autoReveal && timerState.mode === 'countdown' && timerState.remaining <= 10 && timerState.isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md"
        >
          <p className="text-xs text-amber-800 text-center">
            Cards will auto-reveal when timer reaches zero
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};