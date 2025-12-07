import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, Users, Home, Activity, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import IssueCard from "@/components/IssueCard";
import BottomNavigation from "@/components/BottomNavigation";
import AddPropertyModal from "@/components/AddPropertyModal";
import { useAuth } from "@/context/AuthContext";
import { dashboardAPI, issueAPI } from "@/services/api";

type Status = "pending" | "in-progress" | "resolved";

const mockIssues = [
  {
    id: "1",
    title: "AC Unit Maintenance", 
    priority: "high" as const,
    reporter: "Property Manager",
    date: "8/27/2025",
    unit: "Unit 3A",
    description: "Annual AC maintenance required",
    category: "Maintenance",
    status: "pending" as Status
  },
  {
    id: "2", 
    title: "Lease Renewal",
    priority: "medium" as const,
    reporter: "John Smith",
    date: "8/26/2025", 
    unit: "Unit 2B",
    description: "Tenant requesting lease renewal",
    category: "Administrative",
    status: "in-progress" as Status
  },
  {
    id: "3",
    title: "Property Inspection",
    priority: "low" as const,
    reporter: "Inspector",
    date: "8/22/2025",
    unit: "Unit 1C", 
    description: "Quarterly property inspection",
    category: "Inspection",
    status: "resolved" as Status
  }
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [issues, setIssues] = useState(mockIssues);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    residents: [],
    payments: [],
    loading: true
  });
  const { userProfile, isGuest } = useAuth();

  const isOwner = userProfile?.role === 'owner' || isGuest;

  // Fetch dashboard data from Backend API
  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      
      // Fetch data from backend API
      const data = await dashboardAPI.getDashboardData();
      
      setDashboardData({
        residents: data.residents || [],
        payments: data.payments || [],
        loading: false
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  // Fetch real issues from Backend API
  useEffect(() => {
    fetchIssues();
    fetchDashboardData();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await issueAPI.getAll();
      
      if (response && response.issues && response.issues.length > 0) {
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
      } else {
        // Fall back to mock data if no issues returned
        setIssues(mockIssues);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      // Fall back to mock data if there's an error
      setIssues(mockIssues);
    } finally {
      setLoading(false);
    }
  };

  const updateIssueStatus = async (issueId: string, newStatus: Status) => {
    try {
      await issueAPI.updateStatus(issueId, newStatus);
      
      // Update local state
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      ));
    } catch (error) {
      console.error('Error updating issue status:', error);
    }
  };

  // Calculate dashboard statistics from real data
  const dashboardStats = useMemo(() => {
    const { residents, payments } = dashboardData;
    
    // Calculate total properties (assume each resident has a unit, or use a default)
    const totalProperties = residents.length || 12; // fallback to 12 if no data
    
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

  const filteredIssues = issues.filter(issue => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return issue.status === "pending";
    if (activeTab === "in-progress") return issue.status === "in-progress";
    if (activeTab === "resolved") return issue.status === "resolved";
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isOwner ? 'Owner Dashboard' : 'Resident Dashboard'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isOwner 
              ? 'Manage your rental properties and tenant issues' 
              : 'View your rental information and submit requests'
            }
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 transition-all hover:shadow-lg">
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
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800 transition-all hover:shadow-lg">
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
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800 transition-all hover:shadow-lg">
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

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800 transition-all hover:shadow-lg">
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
        </div>

        <StatsCards issues={issues} loading={loading} />

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Loading issues...</div>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">No issues found.</div>
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <IssueCard 
                  key={issue.id} 
                  issue={issue} 
                  onStatusChange={isOwner ? updateIssueStatus : undefined}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
      {isOwner && (
        <AddPropertyModal 
          isOpen={isPropertyModalOpen} 
          onClose={() => setIsPropertyModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;