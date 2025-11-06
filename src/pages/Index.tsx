import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BarChart3 } from "lucide-react";
import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import IssueCard from "@/components/IssueCard";
import BottomNavigation from "@/components/BottomNavigation";

type Status = "pending" | "in-progress" | "resolved";

const mockIssues = [
  {
    id: "1",
    title: "Druh", 
    priority: "high" as const,
    reporter: "Fhff",
    date: "8/27/2025",
    unit: "Unit X",
    description: "Zgrdf",
    category: "Utilities",
    status: "pending" as Status
  },
  {
    id: "2", 
    title: "test",
    priority: "medium" as const,
    reporter: "tester",
    date: "8/26/2025", 
    unit: "Unit test unit",
    description: "testing",
    category: "Maintenance",
    status: "pending" as Status
  },
  {
    id: "3",
    title: "Testing 3",
    priority: "low" as const,
    reporter: "James",
    date: "8/22/2025",
    unit: "Unit B1", 
    description: ".",
    category: "Utilities",
    status: "pending" as Status
  },
  {
    id: "4",
    title: "Testing2",
    priority: "medium" as const,
    reporter: "James",
    date: "8/22/2025",
    unit: "Unit B1",
    description: ".", 
    category: "Noise Complaint",
    status: "pending" as Status
  },
  {
    id: "5",
    title: "Testing",
    priority: "high" as const,
    reporter: "John",
    date: "8/20/2025",
    unit: "Unit A1",
    description: "Testing",
    category: "Other", 
    status: "pending" as Status
  }
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("all");

  const filteredIssues = mockIssues.filter(issue => {
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Property Management</h1>
          <p className="text-muted-foreground mb-6">Monitor and manage your rental properties</p>
        </div>

        <StatsCards issues={mockIssues} />

        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-6" size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Add New Property
        </Button>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">All Properties</TabsTrigger>
            <TabsTrigger value="pending">Maintenance</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Index;
