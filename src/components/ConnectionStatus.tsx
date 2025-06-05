import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingButton } from './loading';
import { useToast } from './toast';
import { 
  Wifi, 
  WifiOff,
  AlertTriangle,
  RotateCw
} from 'lucide-react';

export const ConnectionStatus = () => {
  const { connectionStatus, connectionError } = useGameStore();
  const { showToast } = useToast();

  const handleRetry = () => {
    showToast('Attempting to reconnect...', 'info');
    window.location.reload();
  };
  
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'initial':
        return {
          show: false // Don't show anything in initial state
        };
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
          icon: WifiOff,
          text: 'Offline',
          subtitle: 'Changes will sync when reconnected',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          show: true,
          showRetry: true
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Connection Error',
          subtitle: connectionError || 'Unable to connect to server',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          show: true,
          showRetry: true
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
          className="fixed top-4 left-4 z-40 max-w-sm"
        >
          <div className={`rounded-lg shadow-lg border ${config.bgColor} p-4`}>
            <div className="flex items-start gap-3">
              <config.icon 
                size={20}
                className={`${config.color} ${config.animate ? 'animate-spin' : ''} flex-shrink-0 mt-0.5`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${config.color}`}>
                  {config.text}
                </p>
                {config.subtitle && (
                  <p className={`text-xs mt-1 ${config.color} opacity-75`}>
                    {config.subtitle}
                  </p>
                )}
                {config.showRetry && (
                  <LoadingButton
                    onClick={handleRetry}
                    size="sm"
                    variant="secondary"
                    className="mt-2 text-xs"
                  >
                    <RotateCw className="w-3 h-3" />
                    Retry
                  </LoadingButton>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};