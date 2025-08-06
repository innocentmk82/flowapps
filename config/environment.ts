// Environment configuration for PayFlow
export const ENV_CONFIG = {
  // Firebase configuration is handled in firebase.ts
  
  // MoMo API Configuration (for production)
  MOMO: {
    SANDBOX_URL: 'https://sandbox.momodeveloper.mtn.com',
    PRODUCTION_URL: 'https://momodeveloper.mtn.com',
    SUBSCRIPTION_KEY: process.env.EXPO_PUBLIC_MOMO_SUBSCRIPTION_KEY || '',
    API_USER_ID: process.env.EXPO_PUBLIC_MOMO_API_USER_ID || '',
    API_KEY: process.env.EXPO_PUBLIC_MOMO_API_KEY || '',
    CALLBACK_URL: process.env.EXPO_PUBLIC_MOMO_CALLBACK_URL || '',
  },

  // Bank details for manual transfers
  BANK_DETAILS: {
    BANK_NAME: 'Standard Bank Eswatini',
    ACCOUNT_NUMBER: '1234567890',
    ACCOUNT_NAME: 'PayFlow Limited',
    BRANCH_CODE: '051001',
    SWIFT_CODE: 'SBICSZ22',
  },

  // MoMo send details
  MOMO_SEND_DETAILS: {
    PHONE_NUMBER: '+268 7612 3456',
    ACCOUNT_NAME: 'PayFlow Limited',
  },

  // App configuration
  APP: {
    NAME: 'PayFlow',
    VERSION: '1.0.0',
    SUPPORT_EMAIL: 'support@payflow.sz',
    SUPPORT_PHONE: '+268 2404 2000',
  },

  // Transaction limits
  LIMITS: {
    MIN_TOPUP: 10,
    MAX_TOPUP: 10000,
    MIN_MANUAL_DEPOSIT: 50,
    MAX_MANUAL_DEPOSIT: 50000,
    DAILY_TRANSACTION_LIMIT: 25000,
  },
};

// Validation functions
export const validateEswatiniPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+268|268|0)?[67]\d{7}$/;
  return phoneRegex.test(phone);
};

export const formatEswatiniPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.startsWith('268')) {
    return `+${digits}`;
  } else if (digits.startsWith('0')) {
    return `+268${digits.slice(1)}`;
  } else if (digits.length === 8) {
    return `+268${digits}`;
  }
  
  return phone; // Return original if can't format
};