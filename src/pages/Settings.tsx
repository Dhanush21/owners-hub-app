import { useState } from "react";
import { CreditCard, User, Shield, Bell, UserPlus, Settings2, Trash2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import ReferralModal from "@/components/ReferralModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { deleteAccount } = useAuth();
  const { toast } = useToast();
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted.",
      });
      navigate('/auth');
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const settingsOptions = [
    {
      icon: CreditCard,
      title: "Subscription",
      description: "Manage your subscription plan and billing",
      onClick: () => navigate('/subscription')
    },
    {
      icon: User,
      title: "Profile",
      description: "Update your personal information",
      onClick: () => navigate('/profile')
    },
    {
      icon: UserPlus,
      title: "Refer a Friend",
      description: "Share CoHub and earn rewards together",
      onClick: () => setIsReferralModalOpen(true)
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Configure your notification preferences",
      onClick: () => navigate('/notifications')
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Manage your privacy and security settings",
      onClick: () => {}
    }
  ];

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-20">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <Settings2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 animate-fade-in">
          {settingsOptions.map((option, index) => (
            <Card 
              key={index} 
              className="hover:shadow-md transition-all duration-200 cursor-pointer hover-scale group border-border/50 hover:border-primary/20" 
              onClick={option.onClick}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors duration-200">
                    <option.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors duration-200">
                      {option.title}
                    </CardTitle>
                    <CardDescription className="text-sm">{option.description}</CardDescription>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          {/* Delete Account Option */}
          <Card 
            className="hover:shadow-md transition-all duration-200 cursor-pointer hover-scale group border-red-200 hover:border-red-400 dark:border-red-900 dark:hover:border-red-700" 
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-100 group-hover:bg-red-200 dark:bg-red-900/30 dark:group-hover:bg-red-900/50 rounded-lg flex items-center justify-center transition-colors duration-200">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base sm:text-lg text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors duration-200">
                    Delete Account
                  </CardTitle>
                  <CardDescription className="text-sm">Permanently delete your account and all data</CardDescription>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full"></div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </main>

      <BottomNavigation />
      
      <ReferralModal 
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
      />

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your profile information</li>
                <li>All properties and residents data</li>
                <li>Payment history</li>
                <li>All chat conversations</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;