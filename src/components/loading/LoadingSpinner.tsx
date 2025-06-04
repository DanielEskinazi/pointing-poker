import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6', 
  lg: 'w-8 h-8'
};

const colorClasses = {
  primary: 'border-blue-600',
  secondary: 'border-gray-600',
  white: 'border-white'
};

export function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '' 
}: LoadingSpinnerProps) {
  return (
    <motion.div
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]}
        border-2 border-t-transparent rounded-full
        ${className}
      `}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
      role="status"
      aria-label="Loading"
    />
  );
}