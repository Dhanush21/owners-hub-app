import { app } from './client';
import { getAnalytics, logEvent as analyticsLogEvent, setUserId as analyticsSetUserId } from 'firebase/analytics';

// Initialize Analytics for web tracking
let analytics: any = null;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn('Analytics not available:', error);
}

// Web-compatible Crashlytics implementation using Analytics
const webCrashlytics = {
  log: (message: string) => {
    console.log(`[Crashlytics] ${message}`);
    if (analytics) {
      analyticsLogEvent(analytics, 'crashlytics_log', { message });
    }
  },
  setCustomKey: (key: string, value: any) => {
    console.log(`[Crashlytics] Custom Key: ${key} = ${value}`);
    if (analytics) {
      analyticsLogEvent(analytics, 'crashlytics_custom_key', { key, value: String(value) });
    }
  },
  setUserId: (userId: string) => {
    console.log(`[Crashlytics] User ID: ${userId}`);
    if (analytics) {
      analyticsSetUserId(analytics, userId);
    }
  },
  recordError: (error: Error) => {
    console.error(`[Crashlytics] Error:`, error);
    if (analytics) {
      analyticsLogEvent(analytics, 'crashlytics_error', {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name
      });
    }
  }
};

export const crashlytics = webCrashlytics;

// Helper functions for Crashlytics
export const logEvent = (message: string, data?: Record<string, any>) => {
  try {
    crashlytics.log(message);
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        crashlytics.setCustomKey(key, value);
      });
    }
  } catch (error) {
    console.warn('Failed to log to Crashlytics:', error);
  }
};

export const setUserId = (userId: string) => {
  try {
    crashlytics.setUserId(userId);
  } catch (error) {
    console.warn('Failed to set user ID in Crashlytics:', error);
  }
};

export const recordError = (error: Error, context?: string) => {
  try {
    if (context) {
      crashlytics.setCustomKey('error_context', context);
    }
    crashlytics.recordError(error);
  } catch (crashlyticsError) {
    console.warn('Failed to record error in Crashlytics:', crashlyticsError);
  }
};

export const setUserProperties = (properties: Record<string, string>) => {
  try {
    Object.entries(properties).forEach(([key, value]) => {
      crashlytics.setCustomKey(key, value);
    });
  } catch (error) {
    console.warn('Failed to set user properties in Crashlytics:', error);
  }
};

export const testCrash = () => {
  try {
    crashlytics.log('Test crash triggered by user');
    throw new Error('Test crash for Crashlytics');
  } catch (error) {
    recordError(error as Error, 'test_crash');
  }
};