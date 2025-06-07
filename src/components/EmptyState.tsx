import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'subtle' | 'primary';
}

export const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action,
  variant = 'default' 
}: EmptyStateProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'subtle':
        return 'bg-gray-50 border-gray-200 shadow-sm';
      case 'primary':
        return 'bg-blue-50 border-blue-200 shadow-sm';
      default:
        return 'bg-gray-50 shadow-sm border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg p-8 border ${getVariantClasses()}`}
    >
      <div className="text-center">
        {icon && (
          <div className="text-gray-400 mb-3">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mb-4">{description}</p>
        )}
        {action && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--primary-blue)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-blue)'}
          >
            {action.label}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};