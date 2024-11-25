import { motion } from 'framer-motion';
import type { CardValue } from '../types';

interface CardProps {
  value: CardValue;
  isSelected?: boolean;
  isRevealed?: boolean;
  onClick?: () => void;
}

export function Card({ value, isSelected, isRevealed, onClick }: CardProps) {
  const variants = {
    hidden: { 
      scale: 1,
      opacity: 1
    },
    revealed: { 
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial="hidden"
      animate={isRevealed ? "revealed" : "hidden"}
      variants={variants}
      className={`
        relative w-24 h-36 rounded-xl cursor-pointer
        shadow-lg transition-colors duration-300
        ${isSelected ? 'ring-4 ring-blue-500 bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}
      `}
      onClick={onClick}
    >
      <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
        {value}
      </div>
    </motion.div>
  );
}