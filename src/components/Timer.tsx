import { useState, useEffect, useRef } from 'react';
import { TimerDisplay } from './TimerDisplay';
import { TimerConfig } from './TimerConfig';
import { useGameStore } from '../store';

interface TimerProps {
  duration?: number; // Legacy prop for backward compatibility
  onComplete?: () => void;
  key?: string | number;
}

export function Timer({ onComplete }: TimerProps) {
  const [showConfig, setShowConfig] = useState(false);
  const { timerState, revealVotes, getTimerDisplay } = useGameStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastWarningRef = useRef<number>(-1);

  const { minutes, seconds } = getTimerDisplay();
  const currentTime = minutes * 60 + seconds;

  // Handle audio warnings and completion
  useEffect(() => {
    if (!timerState.settings.audioEnabled || !timerState.isRunning || timerState.mode !== 'countdown') {
      return;
    }

    // Check for warnings at specific times
    const warningTimes = timerState.settings.warningAt;
    const shouldPlayWarning = warningTimes.some(warningTime => {
      return currentTime === warningTime && lastWarningRef.current !== warningTime;
    });

    if (shouldPlayWarning) {
      playSound('warning');
      lastWarningRef.current = currentTime;
    }

    // Final countdown (1-10 seconds)
    if (currentTime <= 10 && currentTime > 0 && lastWarningRef.current !== currentTime) {
      playSound('tick');
      lastWarningRef.current = currentTime;
    }

    // Timer completed
    if (currentTime === 0 && timerState.isRunning) {
      playSound('complete');
      
      // Auto-reveal if enabled
      if (timerState.settings.autoReveal) {
        setTimeout(() => {
          revealVotes();
        }, 1000); // Delay to let the sound play
      }
      
      // Call legacy onComplete callback
      onComplete?.();
      
      lastWarningRef.current = -1; // Reset warning tracker
    }
  }, [currentTime, timerState.isRunning, timerState.mode, timerState.settings.audioEnabled, timerState.settings.autoReveal, timerState.settings.warningAt, onComplete, revealVotes]);

  const playSound = (soundType: 'warning' | 'tick' | 'complete') => {
    // For now, use a simple beep sound
    // In production, you would load actual audio files
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different sounds
    switch (soundType) {
      case 'warning':
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
      case 'tick':
        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case 'complete':
        // Play a sequence of notes for completion
        [523, 659, 784].forEach((freq, index) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3, audioContext.currentTime + index * 0.2);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.2 + 0.3);
          osc.start(audioContext.currentTime + index * 0.2);
          osc.stop(audioContext.currentTime + index * 0.2 + 0.3);
        });
        break;
    }
  };

  return (
    <>
      <TimerDisplay onConfigure={() => setShowConfig(true)} />
      <TimerConfig 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
      />
      <audio ref={audioRef} />
    </>
  );
}