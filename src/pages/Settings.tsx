import { useState } from "react";
import { CreditCard, User, Shield, Bell, UserPlus, Settings2, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import ReferralModal from "@/components/ReferralModal";

const Settings = () => {
  const navigate = useNavigate();
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

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
      onClick: () => {}
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
      onClick: () => {}
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Manage your privacy and security settings",
      onClick: () => {}
    },
    {
      icon: Bug,
      title: "Crashlytics Test",
      description: "Test Firebase Crashlytics functionality",
      onClick: () => navigate('/crashlytics-test')
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
        </div>
      </main>

      <BottomNavigation />
      
      <ReferralModal 
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
      />
    </div>
  );
};

export default Settings;