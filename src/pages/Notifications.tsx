import { useState, useEffect } from "react";
import { Bell, Mail, MessageSquare, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  issueUpdates: boolean;
  paymentReminders: boolean;
  maintenanceAlerts: boolean;
  newMessages: boolean;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    issueUpdates: true,
    paymentReminders: true,
    maintenanceAlerts: true,
    newMessages: true,
  });

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user || user.isAnonymous) {
      setLoading(false);
      return;
    }

    try {
      const prefsDoc = await getDoc(doc(db, 'users', user.uid));
      if (prefsDoc.exists()) {
        const data = prefsDoc.data();
        if (data.notificationPreferences) {
          setPreferences({
            ...preferences,
            ...data.notificationPreferences,
          });
        }
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user || user.isAnonymous) {
      toast({
        title: "Error",
        description: "Please sign in to save notification preferences.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          notificationPreferences: preferences,
        },
        { merge: true }
      );
      toast({
        title: "Preferences saved!",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading preferences...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-20">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <Bell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Notifications</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage your notification preferences</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* General Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>General Notifications</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notifications" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via SMS
                  </p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={preferences.smsNotifications}
                  onCheckedChange={(checked) => updatePreference('smsNotifications', checked)}
                  disabled={!userProfile?.phoneNumber || !userProfile?.phoneVerified}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) => updatePreference('pushNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>Select which types of notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="issue-updates">Issue Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about issue status changes
                  </p>
                </div>
                <Switch
                  id="issue-updates"
                  checked={preferences.issueUpdates}
                  onCheckedChange={(checked) => updatePreference('issueUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-reminders">Payment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders for upcoming payments
                  </p>
                </div>
                <Switch
                  id="payment-reminders"
                  checked={preferences.paymentReminders}
                  onCheckedChange={(checked) => updatePreference('paymentReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-alerts">Maintenance Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get alerts for scheduled maintenance
                  </p>
                </div>
                <Switch
                  id="maintenance-alerts"
                  checked={preferences.maintenanceAlerts}
                  onCheckedChange={(checked) => updatePreference('maintenanceAlerts', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new-messages">New Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify me when I receive new messages
                  </p>
                </div>
                <Switch
                  id="new-messages"
                  checked={preferences.newMessages}
                  onCheckedChange={(checked) => updatePreference('newMessages', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex gap-3">
            <Button
              onClick={savePreferences}
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/settings')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Notifications;

