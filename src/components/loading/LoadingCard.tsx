import { motion } from 'framer-motion';

interface LoadingCardProps {
  className?: string;
}

export function LoadingCard({ className = '' }: LoadingCardProps) {
  return (
    <motion.div
      className={`
        relative w-24 h-36 rounded-xl bg-gray-200
        shadow-lg overflow-hidden
        ${className}
      `}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white via-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
        }}
      />
      
      {/* Card content placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 bg-gray-300 rounded animate-pulse" />
      </div>
    </motion.div>
  );
}