import posthog from 'posthog-js';

let isInitialized = false;

export function initPostHog(appName) {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;

  posthog.init('phc_WbhMvR45275GFHlOTgegNrrSe4UpnY9MJydsj3qX9kR', {
    api_host: 'https://app.posthog.com',
    autocapture: true,
    capture_pageview: true,
  });

  isInitialized = true;

  // delay ensures SDK is ready
  setTimeout(() => {
    posthog.capture('app_loaded', {
      source: appName || 'react_app',
    });
  }, 1200);
}
