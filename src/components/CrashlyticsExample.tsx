import React from 'react';
import { useCrashlytics } from '../hooks/use-crashlytics';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, Bug, User, Settings } from 'lucide-react';

export const CrashlyticsExample: React.FC = () => {
  const { logEvent, setUserId, recordError, setUserProperties, testCrash } = useCrashlytics();

  const handleTestCrash = () => {
    try {
      logEvent('Test crash button clicked');
      testCrash();
    } catch (error) {
      recordError(error as Error, 'manual_test_crash');
    }
  };

  const handleLogEvent = () => {
    logEvent('Custom event logged', {
      button: 'log_event',
      timestamp: new Date().toISOString(),
    });
  };

  const handleSetUserId = () => {
    const userId = `user_${Date.now()}`;
    setUserId(userId);
    logEvent('User ID set', { userId });
  };

  const handleSetUserProperties = () => {
    setUserProperties({
      user_type: 'test_user',
      app_version: '1.0.0',
      platform: 'web',
    });
    logEvent('User properties set');
  };

  const handleRecordError = () => {
    const error = new Error('Manual error for testing Crashlytics');
    recordError(error, 'manual_error_test');
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Firebase Crashlytics Testing
          </CardTitle>
          <CardDescription>
            Test Firebase Crashlytics functionality. These actions will send data to Firebase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> The "Test Crash" button will intentionally crash the app to test Crashlytics error reporting.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handleLogEvent}
              variant="outline"
              className="w-full"
            >
              Log Custom Event
            </Button>

            <Button 
              onClick={handleSetUserId}
              variant="outline"
              className="w-full"
            >
              <User className="h-4 w-4 mr-2" />
              Set User ID
            </Button>

            <Button 
              onClick={handleSetUserProperties}
              variant="outline"
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Set User Properties
            </Button>

            <Button 
              onClick={handleRecordError}
              variant="outline"
              className="w-full"
            >
              Record Error
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={handleTestCrash}
              variant="destructive"
              className="w-full"
            >
              <Bug className="h-4 w-4 mr-2" />
              Test Crash (Will Crash App)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crashlytics Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Events and errors will be sent to Firebase Crashlytics</p>
            <p>• Check your Firebase Console to see the data</p>
            <p>• Crashlytics helps you track app stability and user behavior</p>
            <p>• Use the test crash button to verify error reporting works</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
