import { useEffect } from 'react';
import { crashlytics, logEvent, setUserId, recordError, setUserProperties } from '../integrations/firebase/crashlytics';

export const useCrashlytics = () => {
  // Log app startup
  useEffect(() => {
    logEvent('App started', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  }, []);

  return {
    logEvent,
    setUserId,
    recordError,
    setUserProperties,
    testCrash: () => {
      logEvent('Test crash button clicked');
      // This will throw an error for testing
      throw new Error('Test crash triggered by user');
    },
  };
};
