import { motion } from 'framer-motion';
import { LoadingSpinner } from './LoadingSpinner';

interface PageLoaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PageLoader({ 
  title = 'Loading...', 
  subtitle,
  className = '' 
}: PageLoaderProps) {
  return (
    <div className={`
      min-h-screen bg-gradient-to-br from-blue-50 to-purple-50
      flex items-center justify-center p-8
      ${className}
    `}>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-6">
          <LoadingSpinner size="lg" />
        </div>
        
        <motion.h2 
          className="text-2xl font-semibold text-gray-800 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h2>
        
        {subtitle && (
          <motion.p 
            className="text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {subtitle}
          </motion.p>
        )}
        
        {/* Animated dots */}
        <motion.div 
          className="flex justify-center gap-1 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}