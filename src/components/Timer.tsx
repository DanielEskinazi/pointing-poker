import { useEffect, useState } from 'react';
import { Timer as TimerIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimerProps {
  duration: number;
  onComplete?: () => void;
  key?: string | number; // Add key prop to force remount
}

export function Timer({ duration, onComplete }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    setTimeLeft(duration);
    setIsRunning(true);
  }, [duration]);

  useEffect(() => {
    if (!isRunning) return;

    if (timeLeft <= 0) {
      setIsRunning(false);
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isRunning, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-lg"
    >
      <TimerIcon className="text-blue-500" size={20} />
      <span className="font-mono text-lg">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </motion.div>
  );
}