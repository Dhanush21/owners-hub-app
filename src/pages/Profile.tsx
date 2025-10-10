import Header from "@/components/Header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Settings, LogOut, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import ReferralModal from "@/components/ReferralModal";
import BottomNavigation from "@/components/BottomNavigation";

const Profile = () => {
  const navigate = useNavigate();
  const { user, isGuest, logout } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
    const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);


  const profileOptions = [
    // {
    //   title: "Settings",
    //   description: "Manage your account and preferences",
    //   icon: Settings,
    //   onClick: () => navigate("/settings"),
    //   color: "primary",
    // },
    {
      title: "Refer a Friend",
      description: "Share CoHub and earn rewards together",
      icon: UserPlus,
      onClick: () => setIsReferralModalOpen(true),
      color: "primary",
    },
    {
      title: "Log Out",
      description: "Sign out of your account",
      icon: LogOut,
      onClick: logout,
      color: "red",
    },
  ];

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setProfileData(userSnap.data());
        } else {
          console.log("No such user!");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 safe-area-top safe-area-bottom mobile-scroll px-4">
      <Header />

      {/* User Info Card */}
      <div className="flex flex-col items-center mt-8">
  <Avatar className="h-28 w-28 mb-4 ring-4 ring-primary/40">
    <AvatarFallback className="bg-primary/20 text-primary text-5xl flex items-center justify-center">
      {isGuest
        ? "G"
        : profileData?.fullName?.charAt(0) ||
          user?.email?.charAt(0) ||
          "U"}
    </AvatarFallback>
  </Avatar>

  <h1 className="text-3xl font-bold text-center text-gray-800">
    {isGuest ? "Guest User" : profileData?.fullName || "User"}
  </h1>

  <p className="text-sm text-gray-500 text-center mt-1">
    {isGuest ? "Limited Access" : user?.email || ""}
  </p>

  {profileData?.role && (
    <span className="mt-2 inline-block bg-primary/10 text-primary px-4 py-1 rounded-full text-sm font-medium">
      {`Role: ${profileData.role}`}
    </span>
  )}
</div>


      {/* Action Cards */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-4 sm:gap-6 animate-fade-in">
          {profileOptions.map((option, index) => (
            <Card
              key={index}
              onClick={option.onClick}
              className={`hover:shadow-lg transition-all duration-200 cursor-pointer group border border-border/50 ${
                option.color === "red"
                  ? "hover:border-red-400"
                  : "hover:border-primary/20"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                      option.color === "red"
                        ? "bg-red-100 group-hover:bg-red-200"
                        : "bg-primary/10 group-hover:bg-primary/20"
                    }`}
                  >
                    <option.icon
                      className={`w-6 h-6 ${
                        option.color === "red" ? "text-red-600" : "text-primary"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <CardTitle
                      className={`text-lg sm:text-xl font-semibold transition-colors duration-200 ${
                        option.color === "red"
                          ? "text-red-600 group-hover:text-red-700"
                          : "group-hover:text-primary"
                      }`}
                    >
                      {option.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      {option.description}
                    </CardDescription>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        option.color === "red" ? "bg-red-600" : "bg-primary"
                      }`}
                    ></div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
      <BottomNavigation/>
      <ReferralModal
        isOpen={isReferralModalOpen}
        onClose={() => setIsReferralModalOpen(false)}
      />
    </div>
    
  );
};

export default Profile;
