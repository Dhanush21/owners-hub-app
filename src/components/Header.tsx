import { Bell, Settings, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import logoImage from "@/assets/logo.png";

const Header = () => {
  const navigate = useNavigate();
  const { user, userProfile, isGuest, logout } = useAuth();

  return (
    <header className="bg-background border-b border-border px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="Owners Hub Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Owners Hub</h1>
            <p className="text-sm text-muted-foreground">Manage your property portfolio</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  0
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/notifications');
                  }}
                >
                  View All
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No new notifications</p>
                  <p className="text-xs mt-1">You're all caught up!</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate('/notifications')}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Notification Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {isGuest ? 'G' : (userProfile?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {isGuest ? 'Guest User' : (userProfile?.fullName || 'User')}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {isGuest ? 'Limited access' : (user?.email || '')}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={logout}
                className="text-red-600 dark:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
