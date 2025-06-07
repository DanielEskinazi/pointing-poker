import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HiArrowPath } from 'react-icons/hi2';

export const RecoveryScreen = () => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    'Loading saved state...',
    'Validating session...',
    'Synchronizing game state...',
    'Almost ready...'
  ];
  
  useEffect(() => {
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setCurrentStep(stepIndex);
        setProgress(((stepIndex + 1) / steps.length) * 100);
      }
    }, 350);
    
    return () => clearInterval(interval);
  }, [steps.length]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto"
          >
            <HiArrowPath className="w-full h-full text-blue-600" />
          </motion.div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Recovering Your Session
        </h2>
        
        <div className="w-full mx-auto mb-6">
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>
        </div>
        
        <motion.p 
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gray-600 mb-2"
        >
          {steps[currentStep]}
        </motion.p>
        
        <p className="text-sm text-gray-500">
          Please wait while we restore your game...
        </p>
      </div>
    </div>
  );
};

export const ErrorScreen = ({ message }: { message: string }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
      <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Recovery Failed
        </h2>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};