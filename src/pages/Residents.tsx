import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Phone, Mail, MapPin, Calendar, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import AddResidentModal from "@/components/AddResidentModal";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";

interface Resident {
  id: string;
  name: string;
  unit?: string;
  phone?: string;
  email: string;
  leaseEnd?: string;
  status: "active" | "notice" | "inactive";
  rentPaid?: boolean;
  role: string;
  fullName: string;
  createdAt: string;
}

const Residents = () => {
  const { user, userProfile } = useAuth();
  const [filter, setFilter] = useState("all");
  const [isResidentModalOpen, setIsResidentModalOpen] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResidents = async () => {
      if (!user || user.isAnonymous) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch residents from Firestore
        const residentsQuery = query(
          collection(db, "residents"),
          where("ownerId", "==", user.uid)
        );
        const residentsSnapshot = await getDocs(residentsQuery);
        
        const fetchedResidents: Resident[] = residentsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.fullName || data.name || 'Unknown Resident',
            fullName: data.fullName || data.name || 'Unknown Resident',
            email: data.email || '',
            phone: data.phone || '',
            unit: data.unit || `Unit ${Math.floor(Math.random() * 100) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`,
            leaseEnd: data.leaseEnd ? new Date(data.leaseEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            status: data.status || "active",
            rentPaid: data.rentPaid !== false,
            role: data.role || 'resident',
            createdAt: data.createdAt || new Date().toISOString()
          };
        });
        
        // Sort by creation date (newest first) on the client side
        const sortedResidents = fetchedResidents.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setResidents(sortedResidents);
      } catch (error) {
        console.error('Error fetching residents:', error);
        setResidents([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchResidents();
  }, [user, userProfile]);

  const handleResidentAdded = () => {
    fetchResidents(); // Refresh the residents list when a new resident is added
  };

  // Memoize filtered residents to avoid unnecessary recalculations
  const filteredResidents = useMemo(() => {
    return residents.filter(resident => {
      if (filter === "all") return true;
      if (filter === "active") return resident.status === "active";
      if (filter === "notice") return resident.status === "notice";
      if (filter === "unpaid") return !resident.rentPaid;
      return true;
    });
  }, [residents, filter]);

  // Memoize statistics calculations
  const statistics = useMemo(() => ({
    total: residents.length,
    active: residents.filter(r => r.status === "active").length,
    notice: residents.filter(r => r.status === "notice").length,
    overdue: residents.filter(r => !r.rentPaid).length,
  }), [residents]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "notice": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Residents</h1>
          <p className="text-muted-foreground mb-6">Manage your property residents</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 transition-all hover:shadow-lg">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : statistics.total}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Residents</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800 transition-all hover:shadow-lg">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : statistics.active}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Active Leases</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800 transition-all hover:shadow-lg">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : statistics.notice}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Notice Given</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-6 border border-red-200 dark:border-red-800 transition-all hover:shadow-lg">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : statistics.overdue}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Rent Overdue</p>
              </div>
            </div>
          </div>
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground mb-6 shadow-lg transition-all hover:shadow-xl" 
          size="lg"
          onClick={() => setIsResidentModalOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Resident
        </Button>

        <div className="flex gap-2 mb-6 flex-wrap">
          <Button 
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            All Residents
          </Button>
          <Button 
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
            size="sm"
          >
            Active
          </Button>
          <Button 
            variant={filter === "notice" ? "default" : "outline"}
            onClick={() => setFilter("notice")}
            size="sm"
          >
            Notice Given
          </Button>
          <Button 
            variant={filter === "unpaid" ? "default" : "outline"}
            onClick={() => setFilter("unpaid")}
            size="sm"
          >
            Rent Overdue
          </Button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading residents...</span>
            </div>
          ) : filteredResidents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No residents found</h3>
              <p className="text-muted-foreground">
                {filter === "all" 
                  ? "No residents have been added yet." 
                  : `No residents match the "${filter}" filter.`
                }
              </p>
            </div>
          ) : (
            filteredResidents.map((resident) => (
            <Card key={resident.id} className="w-full hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{resident.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{resident.unit}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(resident.status)}>
                      {resident.status === "active" ? "Active" : "Notice Given"}
                    </Badge>
                    {!resident.rentPaid && (
                      <Badge className="bg-red-100 text-red-800">Rent Overdue</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{resident.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{resident.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Lease ends: {resident.leaseEnd}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      </main>

      <BottomNavigation />
      <AddResidentModal 
        isOpen={isResidentModalOpen} 
        onClose={() => setIsResidentModalOpen(false)}
        onResidentAdded={handleResidentAdded}
      />
    </div>
  );
};

export default memo(Residents);