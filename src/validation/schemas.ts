// Story creation validation schema
export const storyValidationSchema = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 200,
    custom: (value: string) => {
      if (value.trim().length === 0) {
        return 'Story title cannot be empty';
      }
      return null;
    }
  },
  description: {
    maxLength: 1000,
    custom: (value: string) => {
      if (value && value.trim().length === 0) {
        return 'Description cannot be empty if provided';
      }
      return null;
    }
  }
};

// Session join validation schema
export const joinValidationSchema = {
  playerName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s]+$/,
    custom: (value: string) => {
      if (value.trim().length === 0) {
        return 'Player name cannot be empty';
      }
      if (!/^[a-zA-Z0-9\s]+$/.test(value)) {
        return 'Only letters, numbers and spaces are allowed';
      }
      return null;
    }
  }
};

// Session creation validation schema
export const sessionValidationSchema = {
  sessionName: {
    required: true,
    minLength: 1,
    maxLength: 100,
    custom: (value: string) => {
      if (value.trim().length === 0) {
        return 'Session name cannot be empty';
      }
      return null;
    }
  },
  hostName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s]+$/,
    custom: (value: string) => {
      if (value.trim().length === 0) {
        return 'Host name cannot be empty';
      }
      if (!/^[a-zA-Z0-9\s]+$/.test(value)) {
        return 'Only letters, numbers and spaces are allowed';
      }
      return null;
    }
  }
};