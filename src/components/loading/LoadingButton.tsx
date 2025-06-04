import { motion } from 'framer-motion';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  loadingText?: string;
}

const variantClasses = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white'
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export function LoadingButton({
  children,
  isLoading = false,
  disabled = false,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  loadingText = 'Loading...'
}: LoadingButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-lg font-medium transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        flex items-center justify-center gap-2
        ${className}
      `}
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
    >
      {isLoading && (
        <LoadingSpinner 
          size="sm" 
          color="white" 
        />
      )}
      
      <span className={isLoading ? 'opacity-75' : ''}>
        {isLoading ? loadingText : children}
      </span>
    </motion.button>
  );
}