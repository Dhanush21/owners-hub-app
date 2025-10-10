import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  AlertTriangle, 
  Bug, 
  User, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Info,
  Activity,
  Database,
  Zap
} from 'lucide-react';
import crashlyticsSDK from '../lib/crashlytics-sdk';

export const CrashlyticsTestSuite: React.FC = () => {
  const [status, setStatus] = useState(crashlyticsSDK.getStatus());
  const [testResults, setTestResults] = useState<Array<{test: string, result: 'success' | 'error', message: string}>>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(crashlyticsSDK.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addTestResult = (test: string, result: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, { test, result, message }]);
  };

  const runTest = async (testName: string, testFn: () => void | Promise<void>) => {
    setIsRunning(true);
    try {
      await testFn();
      addTestResult(testName, 'success', 'Test completed successfully');
    } catch (error) {
      addTestResult(testName, 'error', `Test failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testBasicLogging = () => {
    runTest('Basic Logging', () => {
      crashlyticsSDK.log('Test log message', { test: 'basic_logging' });
    });
  };

  const testCustomKeys = () => {
    runTest('Custom Keys', () => {
      crashlyticsSDK.setCustomKey('test_key', 'test_value');
      crashlyticsSDK.setCustomKey('numeric_key', 123);
      crashlyticsSDK.setCustomKey('boolean_key', true);
    });
  };

  const testUserTracking = () => {
    runTest('User Tracking', () => {
      const userId = `test_user_${Date.now()}`;
      crashlyticsSDK.setUserId(userId);
      crashlyticsSDK.setUserProperties({
        user_type: 'test_user',
        app_version: '1.0.0',
        platform: 'web'
      });
    });
  };

  const testErrorRecording = () => {
    runTest('Error Recording', () => {
      const error = new Error('Test error for Crashlytics');
      crashlyticsSDK.recordError(error, 'test_error_recording');
    });
  };

  const testCrashSimulation = () => {
    runTest('Crash Simulation', () => {
      crashlyticsSDK.testCrash();
    });
  };

  const runAllTests = async () => {
    setTestResults([]);
    setIsRunning(true);
    
    const tests = [
      { name: 'Basic Logging', fn: testBasicLogging },
      { name: 'Custom Keys', fn: testCustomKeys },
      { name: 'User Tracking', fn: testUserTracking },
      { name: 'Error Recording', fn: testErrorRecording },
    ];

    for (const test of tests) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
      test.fn();
    }

    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
    crashlyticsSDK.clearCustomKeys();
    setStatus(crashlyticsSDK.getStatus());
  };

  return (
    <div className="space-y-6 p-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Crashlytics SDK Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="text-sm">Analytics:</span>
              <Badge variant={status.analyticsAvailable ? "default" : "destructive"}>
                {status.analyticsAvailable ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm">User ID:</span>
              <Badge variant={status.userId ? "default" : "secondary"}>
                {status.userId || "Not Set"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm">Custom Keys:</span>
              <Badge variant="outline">
                {status.customKeysCount}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Crashlytics Testing Suite
          </CardTitle>
          <CardDescription>
            Test all Crashlytics functionality. Check browser console and Firebase Analytics for results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> The "Test Crash" button will intentionally crash the app to test error reporting.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={testBasicLogging}
              variant="outline"
              disabled={isRunning}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Test Basic Logging
            </Button>

            <Button 
              onClick={testCustomKeys}
              variant="outline"
              disabled={isRunning}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Test Custom Keys
            </Button>

            <Button 
              onClick={testUserTracking}
              variant="outline"
              disabled={isRunning}
              className="w-full"
            >
              <User className="h-4 w-4 mr-2" />
              Test User Tracking
            </Button>

            <Button 
              onClick={testErrorRecording}
              variant="outline"
              disabled={isRunning}
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Test Error Recording
            </Button>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button 
              onClick={runAllTests}
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? "Running Tests..." : "Run All Tests"}
            </Button>

            <Button 
              onClick={clearResults}
              variant="outline"
              disabled={isRunning}
            >
              Clear Results
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={testCrashSimulation}
              variant="destructive"
              className="w-full"
              disabled={isRunning}
            >
              <Bug className="h-4 w-4 mr-2" />
              Test Crash (Will Crash App)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded border">
                  {result.result === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{result.test}</span>
                  <span className="text-sm text-muted-foreground">{result.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Crashlytics Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Web Platform:</strong> Uses Firebase Analytics for event tracking</p>
            <p>• <strong>Android Platform:</strong> Uses native Firebase Crashlytics SDK</p>
            <p>• <strong>Console Logs:</strong> Check browser console for [Crashlytics] messages</p>
            <p>• <strong>Firebase Console:</strong> View events in Analytics → Events</p>
            <p>• <strong>Error Tracking:</strong> Errors are logged to Firebase Analytics</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
