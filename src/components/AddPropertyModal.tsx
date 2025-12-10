import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/integrations/firebase/client";
import { collection, addDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { notificationHelpers } from "@/services/notificationService";

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropertyAdded?: () => void; // Callback to refresh properties list
}

const AddPropertyModal = ({ isOpen, onClose, onPropertyAdded }: AddPropertyModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    unit: "",
    bedrooms: "",
    bathrooms: "",
    rent: "",
    propertyType: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.isAnonymous) {
      toast({
        title: "Error",
        description: "Please sign in to add properties.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.propertyType) {
      toast({
        title: "Error",
        description: "Please select a property type.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Save to Firestore
      const propertyData = {
        address: formData.address,
        unit: formData.unit || null,
        propertyType: formData.propertyType,
        bedrooms: parseInt(formData.bedrooms) || 1,
        bathrooms: parseFloat(formData.bathrooms) || 1,
        rent: parseFloat(formData.rent) || 0,
        status: "available",
        description: formData.description || "",
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const propertyDocRef = await addDoc(collection(db, "properties"), propertyData);
      
      // Create notification for property added
      await notificationHelpers.propertyAdded(user.uid, formData.address, propertyDocRef.id);
      
      toast({
        title: "Property Added",
        description: "New property has been successfully added to your portfolio.",
      });
      
      // Reset form
      setFormData({
        address: "",
        unit: "",
        bedrooms: "",
        bathrooms: "",
        rent: "",
        propertyType: "",
        description: ""
      });
      
      // Refresh properties list if callback provided
      if (onPropertyAdded) {
        onPropertyAdded();
      }
      
      onClose();
    } catch (error: any) {
      console.error("Error adding property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add property. Please try again.",
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
          <DialogTitle>Add New Property</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Property Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="123 Main St"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit Number</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => handleInputChange("unit", e.target.value)}
                placeholder="Unit 1A"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Select onValueChange={(value) => handleInputChange("bedrooms", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Bedroom</SelectItem>
                  <SelectItem value="2">2 Bedrooms</SelectItem>
                  <SelectItem value="3">3 Bedrooms</SelectItem>
                  <SelectItem value="4">4+ Bedrooms</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Select onValueChange={(value) => handleInputChange("bathrooms", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bathrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Bathroom</SelectItem>
                  <SelectItem value="1.5">1.5 Bathrooms</SelectItem>
                  <SelectItem value="2">2 Bathrooms</SelectItem>
                  <SelectItem value="2.5">2.5+ Bathrooms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent">Monthly Rent ($)</Label>
              <Input
                id="rent"
                type="number"
                value={formData.rent}
                onChange={(e) => handleInputChange("rent", e.target.value)}
                placeholder="2500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type</Label>
              <Select onValueChange={(value) => handleInputChange("propertyType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Property description and amenities..."
              rows={3}
            />
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
                "Add Property"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPropertyModal;