import { useState, useEffect } from "react";
import { User, Mail, Phone, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { updateProfile } from "firebase/auth";

const Profile = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    role: 'resident' as 'owner' | 'resident',
  });

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        fullName: userProfile.fullName || '',
        email: userProfile.email || '',
        phoneNumber: userProfile.phoneNumber || '',
        role: userProfile.role || 'resident',
      });
    }
    setLoading(false);
  }, [userProfile]);

  const handleSave = async () => {
    if (!user || user.isAnonymous) {
      toast({
        title: "Error",
        description: "Please sign in to update your profile.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Update Firebase Auth display name
      if (user && profileData.fullName) {
        await updateProfile(user, {
          displayName: profileData.fullName,
        });
      }

      // Update Firestore profile
      const profileUpdate: any = {
        fullName: profileData.fullName,
        email: profileData.email,
        phoneNumber: profileData.phoneNumber,
        role: profileData.role,
      };

      // If phone number changed, reset verification status
      if (profileData.phoneNumber !== userProfile?.phoneNumber) {
        profileUpdate.phoneVerified = false;
      }

      await updateDoc(doc(db, 'users', user.uid), profileUpdate);

      toast({
        title: "Profile updated!",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-24">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Update your personal information</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  required
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need to update it.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+91XXXXXXXXXX (with country code)"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {userProfile?.phoneVerified 
                    ? "✓ Phone number verified" 
                    : "Phone number not verified. Update and verify in Settings."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Account Type</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={profileData.role}
                  onChange={(e) => setProfileData({ ...profileData, role: e.target.value as 'owner' | 'resident' })}
                >
                  <option value="resident">Resident</option>
                  <option value="owner">Property Owner</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 mt-8 mb-4 animate-fade-in">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            size="lg"
          >
            Cancel
          </Button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Profile;

