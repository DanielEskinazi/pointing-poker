import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  AlertTriangle,
  RotateCw
} from 'lucide-react';

export const ConnectionStatus = () => {
  const { connectionStatus, connectionError } = useGameStore();
  
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          show: false // Hide when connected
        };
      case 'connecting':
      case 'reconnecting':
        return {
          icon: RotateCw,
          text: connectionStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          show: true,
          animate: true
        };
      case 'disconnected':
        return {
          icon: AlertTriangle,
          text: 'Disconnected',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          show: true
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: connectionError || 'Connection Error',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          show: true
        };
      default:
        return null;
    }
  };
  
  const config = getStatusConfig();
  if (!config) return null;
  
  return (
    <AnimatePresence>
      {config.show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${config.bgColor}`}>
            <config.icon 
              size={20}
              className={`${config.color} ${config.animate ? 'animate-spin' : ''}`}
            />
            <span className={`text-sm font-medium ${config.color}`}>
              {config.text}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};