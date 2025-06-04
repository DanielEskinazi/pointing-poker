import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface ValidatedInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  onValidate?: (isValid: boolean) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  rows?: number;
}

export function ValidatedInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onValidate,
  error,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  rows = 3
}: ValidatedInputProps) {
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    if (isTouched) {
      onValidate?.(!error);
    }
  }, [error, isTouched, onValidate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setIsTouched(true);
  };

  const handleFocus = () => {
    // Focus handler for potential future use
  };

  const showError = error && isTouched;
  const inputClassName = `
    w-full px-3 py-2 border rounded-lg transition-colors duration-200
    ${showError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    focus:outline-none focus:ring-2
    ${className}
  `;

  const InputComponent = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div className="space-y-1">
      <label 
        htmlFor={name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <InputComponent
          id={name}
          name={name}
          type={type === 'textarea' ? undefined : type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
          rows={type === 'textarea' ? rows : undefined}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${name}-error` : undefined}
        />
        
        {showError && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      
      {/* Error message */}
      <motion.div
        initial={false}
        animate={{ 
          height: showError ? 'auto' : 0,
          opacity: showError ? 1 : 0
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        {showError && (
          <p 
            id={`${name}-error`}
            className="text-sm text-red-600 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </p>
        )}
      </motion.div>
      
      {/* Character count for text areas */}
      {type === 'textarea' && (
        <div className="text-xs text-gray-500 text-right">
          {value.length} characters
        </div>
      )}
    </div>
  );
}