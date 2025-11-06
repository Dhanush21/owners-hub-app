import { Clock, Play, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  issues: any[];
  loading?: boolean;
}

const StatsCards = ({ issues, loading = false }: StatsCardsProps) => {
  const stats = [
    {
      title: "Pending Issues",
      value: loading ? null : issues.filter(issue => issue.status === "pending").length.toString(),
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "In Progress", 
      value: loading ? null : issues.filter(issue => issue.status === "in-progress").length.toString(),
      icon: Play,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Resolved",
      value: loading ? null : issues.filter(issue => issue.status === "resolved").length.toString(), 
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "High Priority",
      value: loading ? null : issues.filter(issue => issue.priority === "high").length.toString(),
      icon: AlertTriangle,
      color: "text-red-600", 
      bgColor: "bg-red-50"
    }
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card 
          key={stat.title} 
          className="border border-border hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center shadow-sm transition-transform duration-300 hover:scale-110`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground transition-colors">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="animate-in fade-in-50 duration-300">{stat.value}</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;