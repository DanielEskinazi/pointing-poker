import { useState, useCallback } from 'react';
import { ValidationError, FormValidationState } from '../types/errors';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface ValidationSchema {
  [field: string]: ValidationRule;
}

export function useFormValidation(schema: ValidationSchema): FormValidationState & {
  validateField: (field: string, value: string) => boolean;
  validateForm: (values: Record<string, string>) => boolean;
} {
  const [errors, setErrors] = useState<Record<string, ValidationError[]>>({});

  const validateField = useCallback((field: string, value: string): boolean => {
    const rule = schema[field];
    if (!rule) return true;

    const fieldErrors: ValidationError[] = [];

    // Required validation
    if (rule.required && (!value || value.trim() === '')) {
      fieldErrors.push({
        field,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
        code: 'REQUIRED'
      });
    }

    // Min length validation
    if (rule.minLength && value.length < rule.minLength) {
      fieldErrors.push({
        field,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${rule.minLength} characters`,
        code: 'MIN_LENGTH'
      });
    }

    // Max length validation
    if (rule.maxLength && value.length > rule.maxLength) {
      fieldErrors.push({
        field,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} must be no more than ${rule.maxLength} characters`,
        code: 'MAX_LENGTH'
      });
    }

    // Pattern validation
    if (rule.pattern && value && !rule.pattern.test(value)) {
      fieldErrors.push({
        field,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} format is invalid`,
        code: 'PATTERN'
      });
    }

    // Custom validation
    if (rule.custom && value) {
      const customError = rule.custom(value);
      if (customError) {
        fieldErrors.push({
          field,
          message: customError,
          code: 'CUSTOM'
        });
      }
    }

    setErrors(prev => ({
      ...prev,
      [field]: fieldErrors
    }));

    return fieldErrors.length === 0;
  }, [schema]);

  const validateForm = useCallback((values: Record<string, string>): boolean => {
    let isValid = true;
    const newErrors: Record<string, ValidationError[]> = {};

    Object.keys(schema).forEach(field => {
      const value = values[field] || '';
      const fieldValid = validateField(field, value);
      if (!fieldValid) {
        isValid = false;
        newErrors[field] = errors[field] || [];
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [schema, validateField, errors]);

  const hasErrors = useCallback((field?: string): boolean => {
    if (field) {
      return (errors[field]?.length || 0) > 0;
    }
    return Object.values(errors).some(fieldErrors => fieldErrors.length > 0);
  }, [errors]);

  const getFieldError = useCallback((field: string): string | undefined => {
    return errors[field]?.[0]?.message;
  }, [errors]);

  const setFieldError = useCallback((field: string, error: ValidationError) => {
    setErrors(prev => ({
      ...prev,
      [field]: [error]
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const isValid = !hasErrors();

  return {
    errors,
    isValid,
    hasErrors,
    getFieldError,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    validateField,
    validateForm
  };
}