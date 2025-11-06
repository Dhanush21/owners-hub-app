import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User, Calendar, MapPin, CheckCircle, Clock, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Issue {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  reporter: string;
  date: string;
  unit: string;
  description: string;
  category: string;
  status: "pending" | "in-progress" | "resolved";
}

interface IssueCardProps {
  issue: Issue;
  onStatusChange?: (issueId: string, newStatus: "pending" | "in-progress" | "resolved") => void;
  isUpdating?: boolean;
}

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  low: "bg-green-100 text-green-800 border-green-200"
};

const statusColors = {
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-green-100 text-green-800 border-green-200"
};

const IssueCard = memo(({ issue, onStatusChange, isUpdating = false }: IssueCardProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in-progress': return <Play className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending': return 'in-progress';
      case 'in-progress': return 'resolved';
      default: return 'pending';
    }
  };

  const getStatusActionText = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending': return 'Start Work';
      case 'in-progress': return 'Mark Resolved';
      case 'resolved': return 'Reopen';
      default: return 'Update Status';
    }
  };
  const currentStatus = issue.status || 'pending';
  const isResolved = currentStatus === 'resolved';
  
  return (
    <Card className={cn(
      "border border-border hover:shadow-lg transition-all duration-300 border-l-4 transform",
      isUpdating && "opacity-60 pointer-events-none scale-[0.98]",
      !isUpdating && "hover:scale-[1.01]",
      currentStatus === "resolved" && "border-l-green-500 bg-green-50/30 dark:bg-green-950/10",
      currentStatus === "in-progress" && "border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10",
      currentStatus === "pending" && "border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/10"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5">
              {isUpdating ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-1 leading-tight">{issue.title}</h3>
            </div>
          </div>
          <Badge className={cn(priorityColors[issue.priority], "shrink-0")}>
            {issue.priority}
          </Badge>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">{issue.reporter}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{issue.date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{issue.unit}</span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{issue.description}</p>
        
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs">
            {issue.category}
          </Badge>
          <div className="flex items-center gap-2">
            <Badge className={cn(
              statusColors[currentStatus], 
              "transition-all duration-300",
              isUpdating && "animate-pulse"
            )}>
              <div className="flex items-center gap-1.5">
                {isUpdating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  getStatusIcon(currentStatus)
                )}
                <span className="capitalize">{currentStatus.replace("-", " ")}</span>
              </div>
            </Badge>
            {onStatusChange && !isResolved && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(issue.id, getNextStatus(currentStatus) as "pending" | "in-progress" | "resolved")}
                disabled={isUpdating}
                className="h-7 text-xs transition-all hover:scale-105"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Updating...
                  </>
                ) : (
                  getStatusActionText(currentStatus)
                )}
              </Button>
            )}
            {onStatusChange && isResolved && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(issue.id, 'pending')}
                disabled={isUpdating}
                className="h-7 text-xs transition-all hover:scale-105"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Reopen"
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

IssueCard.displayName = "IssueCard";

export default IssueCard;