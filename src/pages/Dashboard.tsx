import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, Users, Home, Activity, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import IssueCard from "@/components/IssueCard";
import BottomNavigation from "@/components/BottomNavigation";
import AddPropertyModal from "@/components/AddPropertyModal";
import { useAuth } from "@/context/AuthContext";
import { dashboardAPI, issueAPI, propertyAPI, paymentAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { notificationHelpers } from "@/services/notificationService";

type Status = "pending" | "in-progress" | "resolved";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const issuesRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());
  const [dashboardData, setDashboardData] = useState({
    residents: [],
    payments: [],
    properties: [],
    loading: true
  });
  const { user, userProfile, isGuest } = useAuth();
  const { toast } = useToast();

  const isOwner = userProfile?.role === 'owner' || isGuest;

  // Fetch dashboard data from Firestore
  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      
      if (!user || user.isAnonymous) {
        setDashboardData({
          residents: [],
          payments: [],
          properties: [],
          loading: false
        });
        return;
      }

      // Fetch properties from Firestore
      const propertiesQuery = query(
        collection(db, "properties"),
        where("ownerId", "==", user.uid)
      );
      const propertiesSnapshot = await getDocs(propertiesQuery);
      const properties = propertiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch residents from Firestore
      const residentsQuery = query(
        collection(db, "residents"),
        where("ownerId", "==", user.uid)
      );
      const residentsSnapshot = await getDocs(residentsQuery);
      const residents = residentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Try to fetch payments from backend API (fallback to empty array)
      let payments: any[] = [];
      try {
        const paymentsResult = await paymentAPI.getAll();
        payments = paymentsResult.payments || [];
      } catch (error) {
        console.warn('Could not fetch payments from API:', error);
      }
      
      setDashboardData({
        residents: residents || [],
        payments: payments || [],
        properties: properties || [],
        loading: false
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  // Memoize fetchIssues to prevent recreation on every render
  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await issueAPI.getAll();
      
      if (response && response.issues) {
        // Transform backend data to match our interface
        const transformedIssues = response.issues.map((issue: any) => ({
          id: issue.id,
          title: issue.title || 'Untitled Issue',
          priority: issue.priority || 'medium',
          reporter: issue.submitted_by || issue.submittedBy || 'Unknown',
          date: issue.created_at || issue.createdAt ? new Date(issue.created_at || issue.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
          unit: issue.unit || 'N/A',
          description: issue.description || 'No description',
          category: issue.category || 'other',
          status: issue.status || 'pending'
        }));
        setIssues(transformedIssues);
        issuesRef.current = transformedIssues;
      } else {
        setIssues([]);
        issuesRef.current = [];
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      setIssues([]);
      issuesRef.current = [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real issues from Backend API
  useEffect(() => {
    fetchIssues();
    fetchDashboardData();
  }, [fetchIssues]);

  // Optimistic update with rollback on error
  const updateIssueStatus = useCallback(async (issueId: string, newStatus: Status) => {
    // Get original issue from ref for rollback
    const originalIssue = issuesRef.current.find(issue => issue.id === issueId);
    if (!originalIssue) return;

    // Optimistic update - update UI immediately
    setUpdatingStatus(prev => new Set(prev).add(issueId));
    setIssues(prev => {
      const updated = prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      );
      issuesRef.current = updated; // Keep ref in sync
      return updated;
    });

    try {
      await issueAPI.updateStatus(issueId, newStatus);
      
      // Create notification for issue update
      const issue = issuesRef.current.find(issue => issue.id === issueId);
      if (issue && user && !user.isAnonymous) {
        await notificationHelpers.issueUpdate(user.uid, issue.title, newStatus, issueId);
      }
      
      toast({
        title: "Status Updated",
        description: `Issue status changed to ${newStatus.replace("-", " ")}.`,
      });
    } catch (error) {
      // Rollback on error - restore original issue
      setIssues(prev => {
        const rolledBack = prev.map(issue => 
          issue.id === issueId ? originalIssue : issue
        );
        issuesRef.current = rolledBack; // Keep ref in sync
        return rolledBack;
      });
      console.error('Error updating issue status:', error);
      toast({
        title: "Error",
        description: "Failed to update issue status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(prev => {
        const next = new Set(prev);
        next.delete(issueId);
        return next;
      });
    }
  }, [toast]);

  // Calculate dashboard statistics from real backend data
  const dashboardStats = useMemo(() => {
    const { residents, payments, properties } = dashboardData;
    
    // Calculate total properties from backend
    const totalProperties = properties.length || 0;
    
    // Calculate occupied units (active residents)
    const occupiedUnits = residents.filter((r: any) => r.status === 'active').length;
    
    // Calculate monthly revenue from payments (sum of recent payments)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = payments
      .filter((payment: any) => {
        const paymentDate = payment.created_at ? new Date(payment.created_at) : new Date();
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      })
      .reduce((sum: number, payment: any) => sum + (parseFloat(payment.amount) || 0), 0);
    
    // Calculate occupancy rate
    const occupancyRate = totalProperties > 0 ? Math.round((occupiedUnits / totalProperties) * 100) : 0;
    
    return {
      totalProperties,
      occupiedUnits,
      monthlyRevenue,
      occupancyRate
    };
  }, [dashboardData]);

  // Memoize filtered issues to prevent unnecessary recalculations
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (activeTab === "all") return true;
      if (activeTab === "pending") return issue.status === "pending";
      if (activeTab === "in-progress") return issue.status === "in-progress";
      if (activeTab === "resolved") return issue.status === "resolved";
      return true;
    });
  }, [issues, activeTab]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {isOwner ? 'Owner Dashboard' : 'Resident Dashboard'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isOwner 
              ? 'Manage your rental properties and tenant issues' 
              : 'View your rental information and submit requests'
            }
          </p>
        </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Properties</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {dashboardData.loading ? <Loader2 className="h-8 w-8 animate-spin" /> : dashboardStats.totalProperties}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Occupied Units</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {dashboardData.loading ? <Loader2 className="h-8 w-8 animate-spin" /> : dashboardStats.occupiedUnits}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {dashboardData.loading ? <Loader2 className="h-8 w-8 animate-spin" /> : `₹${dashboardStats.monthlyRevenue.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Occupancy Rate</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                    {dashboardData.loading ? <Loader2 className="h-8 w-8 animate-spin" /> : `${dashboardStats.occupancyRate}%`}
                  </p>
                </div>
              </div>
            </div>
          </div>

        <StatsCards issues={issues} loading={loading || updatingStatus.size > 0} />

        {isOwner && (
          <Button 
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground mb-6 shadow-lg transition-all hover:shadow-xl" 
            size="lg"
            onClick={() => setIsPropertyModalOpen(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Property
          </Button>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Issues & Tasks</h2>
            <span className="text-sm text-muted-foreground">
              {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
            </span>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Completed</TabsTrigger>
            </TabsList>

          <TabsContent value={activeTab} className="space-y-4 animate-in fade-in-50 duration-300">
            {loading ? (
              <div className="text-center py-12 border rounded-lg bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <div className="text-muted-foreground">Loading issues...</div>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/30">
                <div className="text-muted-foreground">No issues found.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIssues.map((issue, index) => (
                  <div
                    key={issue.id}
                    className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <IssueCard 
                      issue={issue} 
                      onStatusChange={isOwner ? updateIssueStatus : undefined}
                      isUpdating={updatingStatus.has(issue.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation />
      {isOwner && (
        <AddPropertyModal 
          isOpen={isPropertyModalOpen} 
          onClose={() => setIsPropertyModalOpen(false)}
          onPropertyAdded={fetchDashboardData}
        />
      )}
    </div>
  );
};

export default Dashboard;