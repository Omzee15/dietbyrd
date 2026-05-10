import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, CheckCircle2, Stethoscope, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

interface JoinRequestFormProps {
  onComplete: () => void;
  onBack?: () => void;
  inline?: boolean;
}

export function JoinRequestForm({ onComplete, onBack, inline = false }: JoinRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "",
    specialization: "",
    qualification: "",
    experience_years: "",
    medical_license_number: "",
    clinic_name: "",
    clinic_address: "",
    about: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.phone || !formData.role || !formData.qualification) {
      toast.error("Please fill in all required fields");
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    if (formData.role === "doctor") {
      if (!formData.specialization || !formData.experience_years) {
        toast.error("Please fill in all doctor-specific fields");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Generate a temporary password - admin will provide actual credentials upon approval
      const tempPassword = Math.floor(10000000 + Math.random() * 90000000).toString();

      // Prepare specializations array for doctors
      const specializations = formData.specialization 
        ? [formData.specialization] 
        : [];

      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneDigits,
          password: tempPassword,
          name: formData.name,
          role: formData.role,
          qualification: formData.qualification,
          clinic_name: formData.clinic_name || null,
          clinic_address: formData.clinic_address || null,
          specializations: specializations.length > 0 ? specializations : null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to submit join request");
      }

      setSubmitted(true);
      toast.success("Join request submitted successfully!");
      
      // Auto-redirect after 2 seconds
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h3>
        <p className="text-slate-600 text-sm max-w-md mb-6">
          Thank you for your interest in joining DietByRD. Our team will review your application and contact you within 2-3 business days.
        </p>
        <Button onClick={onComplete} className="w-full max-w-xs">
          Back to Login
        </Button>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Join as Healthcare Professional</h2>
        <p className="text-slate-600 text-sm mt-1">
          Fill out the form below to apply as a Doctor or Dietician
        </p>
      </div>

      {/* Role Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          I want to join as <span className="text-red-500">*</span>
        </label>
        <Select value={formData.role} onValueChange={(value) => handleChange("role", value)} required>
          <SelectTrigger>
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="doctor">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                <span>Doctor</span>
              </div>
            </SelectItem>
            <SelectItem value="rd">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                <span>Registered Dietician (RD)</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Full Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="Dr. John Doe"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Phone <span className="text-red-500">*</span>
          </label>
          <Input
            type="tel"
            placeholder="10-digit number"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            maxLength={10}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
      </div>

      {/* Professional Information */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Qualification <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="MBBS, MD, RD, MSc Nutrition, etc."
          value={formData.qualification}
          onChange={(e) => handleChange("qualification", e.target.value)}
          required
        />
      </div>

      {formData.role === "doctor" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Specialization <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Endocrinology, etc."
                value={formData.specialization}
                onChange={(e) => handleChange("specialization", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Experience (Years) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="5"
                min="0"
                value={formData.experience_years}
                onChange={(e) => handleChange("experience_years", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Medical License</label>
            <Input
              type="text"
              placeholder="License number"
              value={formData.medical_license_number}
              onChange={(e) => handleChange("medical_license_number", e.target.value)}
            />
          </div>
        </>
      )}

      {formData.role === "rd" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Specialization</label>
            <Input
              type="text"
              placeholder="Clinical Nutrition, etc."
              value={formData.specialization}
              onChange={(e) => handleChange("specialization", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Experience (Years)</label>
            <Input
              type="number"
              placeholder="3"
              min="0"
              value={formData.experience_years}
              onChange={(e) => handleChange("experience_years", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Clinic Information */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Clinic Name</label>
          <Input
            type="text"
            placeholder="ABC Hospital"
            value={formData.clinic_name}
            onChange={(e) => handleChange("clinic_name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <Input
            type="text"
            placeholder="City, State"
            value={formData.clinic_address}
            onChange={(e) => handleChange("clinic_address", e.target.value)}
          />
        </div>
      </div>

      {/* About */}
      <div className="space-y-2">
        <label className="text-sm font-medium">About (Optional)</label>
        <Textarea
          placeholder="Tell us about your practice..."
          value={formData.about}
          onChange={(e) => handleChange("about", e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Application"
        )}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        Our team will review your application and contact you within 2-3 business days
      </p>
    </form>
  );

  if (inline) {
    return (
      <div className="w-full max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        {formContent}
      </div>
    );
  }

  return formContent;
}
