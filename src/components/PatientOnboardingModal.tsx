import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { updatePatient, uploadMyDocument } from "@/lib/api";

interface PatientOnboardingModalProps {
  patient: any;
}

export function PatientOnboardingModal({ patient }: PatientOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [regionPreference, setRegionPreference] = useState("");
  const [languagePreference, setLanguagePreference] = useState("");
  const [bloodReport, setBloodReport] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (patient && !patient.email) {
      setIsOpen(true);
    }
  }, [patient]);

  const updatePatientMutation = useMutation({
    mutationFn: async () => {
      // 1. Update patient profile
      await updatePatient(patient.id, {
        email,
        region_preference: regionPreference || undefined,
        language_preference: languagePreference || undefined,
      });

      // 2. Upload blood report if provided
      if (bloodReport) {
        await uploadMyDocument(bloodReport, "blood_report");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient"] });
      queryClient.invalidateQueries({ queryKey: ["patient-documents"] });
      setIsOpen(false);
      toast({
        title: "Profile Updated",
        description: "Your information has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Something went wrong while saving your details.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please provide your email address.",
        variant: "destructive",
      });
      return;
    }
    updatePatientMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to Your Dashboard!</DialogTitle>
          <DialogDescription>
            Please provide a few additional details to help your care team serve you better.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bloodReport">Blood Report (Optional)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="bloodReport"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setBloodReport(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("bloodReport")?.click()}
                className="w-full border-dashed"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                {bloodReport ? bloodReport.name : "Upload Document"}
              </Button>
            </div>
            {bloodReport && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {bloodReport.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region Preference (Optional)</Label>
            <Input
              id="region"
              placeholder="e.g. North India, South India"
              value={regionPreference}
              onChange={(e) => setRegionPreference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language Preference (Optional)</Label>
            <Input
              id="language"
              placeholder="e.g. Hindi, English"
              value={languagePreference}
              onChange={(e) => setLanguagePreference(e.target.value)}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full mt-6" 
            disabled={updatePatientMutation.isPending}
          >
            {updatePatientMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Details"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
