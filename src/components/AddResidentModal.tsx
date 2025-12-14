import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/integrations/firebase/client";
import { collection, addDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { notificationHelpers } from "@/services/notificationService";

interface AddResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResidentAdded?: () => void; // Callback to refresh residents list
}

const AddResidentModal = ({ isOpen, onClose, onResidentAdded }: AddResidentModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    unit: "",
    leaseStart: "",
    leaseEnd: "",
    monthlyRent: "",
    securityDeposit: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Save new resident to Firebase
      const residentData = {
        fullName: formData.name,
        email: formData.email,
        phone: formData.phone,
        unit: formData.unit,
        leaseStart: formData.leaseStart,
        leaseEnd: new Date(formData.leaseEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthlyRent: parseFloat(formData.monthlyRent),
        securityDeposit: parseFloat(formData.securityDeposit),
        role: "resident",
        status: "active",
        rentPaid: true,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'users'), residentData);
      
      toast({
        title: "Resident Added",
        description: "New resident has been successfully added to your property.",
      });
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        unit: "",
        leaseStart: "",
        leaseEnd: "",
        monthlyRent: "",
        securityDeposit: ""
      });
      
      // Refresh the residents list
      if (onResidentAdded) {
        onResidentAdded();
      }
      
      onClose();
    } catch (error) {
      console.error("Error adding resident:", error);
      toast({
        title: "Error",
        description: "Failed to add resident. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Resident</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="john@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit Assignment</Label>
            <Select onValueChange={(value) => handleInputChange("unit", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1A">Unit 1A</SelectItem>
                <SelectItem value="1B">Unit 1B</SelectItem>
                <SelectItem value="2A">Unit 2A</SelectItem>
                <SelectItem value="2B">Unit 2B</SelectItem>
                <SelectItem value="3A">Unit 3A</SelectItem>
                <SelectItem value="3B">Unit 3B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leaseStart">Lease Start Date</Label>
              <Input
                id="leaseStart"
                type="date"
                value={formData.leaseStart}
                onChange={(e) => handleInputChange("leaseStart", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leaseEnd">Lease End Date</Label>
              <Input
                id="leaseEnd"
                type="date"
                value={formData.leaseEnd}
                onChange={(e) => handleInputChange("leaseEnd", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyRent">Monthly Rent ($)</Label>
              <Input
                id="monthlyRent"
                type="number"
                value={formData.monthlyRent}
                onChange={(e) => handleInputChange("monthlyRent", e.target.value)}
                placeholder="2500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Security Deposit ($)</Label>
              <Input
                id="securityDeposit"
                type="number"
                value={formData.securityDeposit}
                onChange={(e) => handleInputChange("securityDeposit", e.target.value)}
                placeholder="2500"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Resident"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddResidentModal;