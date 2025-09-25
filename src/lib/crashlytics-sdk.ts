/**
 * Firebase Crashlytics SDK for Web
 * 
 * This is a web-compatible implementation of Firebase Crashlytics
 * that uses Firebase Analytics for tracking events and errors.
 * 
 * For Android/iOS, use the native Firebase Crashlytics SDK.
 */

import { app } from '../integrations/firebase/client';
import { getAnalytics, logEvent as analyticsLogEvent, setUserId as analyticsSetUserId } from 'firebase/analytics';

// Initialize Analytics
let analytics: any = null;
try {
  analytics = getAnalytics(app);
  console.log('✅ Firebase Analytics initialized for Crashlytics');
} catch (error) {
  console.warn('⚠️ Analytics not available:', error);
}

export interface CrashlyticsUser {
  id: string;
  email?: string;
  name?: string;
}

export interface CrashlyticsCustomKey {
  key: string;
  value: string | number | boolean;
}

export interface CrashlyticsError {
  message: string;
  stack?: string;
  name?: string;
  context?: string;
}

class CrashlyticsSDK {
  private userId: string | null = null;
  private customKeys: Map<string, any> = new Map();

  /**
   * Log a custom event to Crashlytics
   */
  log(message: string, data?: Record<string, any>): void {
    console.log(`[Crashlytics] ${message}`);
    
    if (analytics) {
      analyticsLogEvent(analytics, 'crashlytics_log', { 
        message,
        timestamp: new Date().toISOString(),
        ...data 
      });
    }
  }

  /**
   * Set a custom key-value pair
   */
  setCustomKey(key: string, value: any): void {
    this.customKeys.set(key, value);
    console.log(`[Crashlytics] Custom Key: ${key} = ${value}`);
    
    if (analytics) {
      analyticsLogEvent(analytics, 'crashlytics_custom_key', { 
        key, 
        value: String(value),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Set user ID for crash reports
   */
  setUserId(userId: string): void {
    this.userId = userId;
    console.log(`[Crashlytics] User ID: ${userId}`);
    
    if (analytics) {
      analyticsSetUserId(analytics, userId);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, string>): void {
    Object.entries(properties).forEach(([key, value]) => {
      this.setCustomKey(key, value);
    });
  }

  /**
   * Record an error
   */
  recordError(error: Error, context?: string): void {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context: context || 'unknown',
      timestamp: new Date().toISOString(),
      userId: this.userId
    };

    console.error(`[Crashlytics] Error:`, errorData);
    
    if (analytics) {
      analyticsLogEvent(analytics, 'crashlytics_error', errorData);
    }
  }

  /**
   * Test crash functionality
   */
  testCrash(): void {
    this.log('Test crash triggered by user');
    const error = new Error('Test crash for Crashlytics - This is intentional');
    this.recordError(error, 'test_crash');
    throw error;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get all custom keys
   */
  getCustomKeys(): Record<string, any> {
    return Object.fromEntries(this.customKeys);
  }

  /**
   * Clear all custom keys
   */
  clearCustomKeys(): void {
    this.customKeys.clear();
    this.log('Custom keys cleared');
  }

  /**
   * Get SDK status
   */
  getStatus(): {
    analyticsAvailable: boolean;
    userId: string | null;
    customKeysCount: number;
  } {
    return {
      analyticsAvailable: !!analytics,
      userId: this.userId,
      customKeysCount: this.customKeys.size
    };
  }
}

// Export singleton instance
export const crashlyticsSDK = new CrashlyticsSDK();

// Export individual functions for backward compatibility
export const logEvent = (message: string, data?: Record<string, any>) => {
  crashlyticsSDK.log(message, data);
};

export const setUserId = (userId: string) => {
  crashlyticsSDK.setUserId(userId);
};

export const recordError = (error: Error, context?: string) => {
  crashlyticsSDK.recordError(error, context);
};

export const setUserProperties = (properties: Record<string, string>) => {
  crashlyticsSDK.setUserProperties(properties);
};

export const testCrash = () => {
  crashlyticsSDK.testCrash();
};

export default crashlyticsSDK;
