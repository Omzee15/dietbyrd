import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle2, Heart, Stethoscope, UtensilsCrossed } from "lucide-react";

const QUALIFICATION_OPTIONS = [
  "MBBS",
  "MD",
  "MS",
  "BDS",
  "BAMS",
  "BHMS",
  "BUMS",
  "BSc Nutrition",
  "MSc Nutrition",
  "BSc Dietetics",
  "MSc Dietetics",
  "PG Diploma in Dietetics",
  "PG Diploma in Clinical Nutrition",
  "PhD Nutrition",
  "RD (Registered Dietitian)",
  "Others",
];

const DOCTOR_SPECIALIZATIONS = [
  "General Medicine",
  "Endocrinology",
  "Cardiology",
  "Nephrology",
  "Gastroenterology",
  "Diabetology",
  "Internal Medicine",
  "Pulmonology",
  "Neurology",
  "Oncology",
  "Others",
];

const RD_SPECIALIZATIONS = [
  "Clinical Nutrition",
  "Sports Nutrition",
  "Pediatric Nutrition",
  "Renal Nutrition",
  "Oncology Nutrition",
  "Bariatric Nutrition",
  "Diabetes Nutrition",
  "Gut Health & IBS",
  "Weight Management",
  "Women's Health & PCOS",
  "Others",
];

const JoinForm = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qualificationOther, setQualificationOther] = useState("");
  const [specializationOther, setSpecializationOther] = useState("");

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

      const finalQualification = formData.qualification === "Others" ? qualificationOther : formData.qualification;
      const finalSpecializations = specializations.map((s) =>
        s === "Others" ? specializationOther : s
      );

      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneDigits,
          password: tempPassword,
          name: formData.name,
          role: formData.role,
          qualification: finalQualification,
          clinic_name: formData.clinic_name || null,
          clinic_address: formData.clinic_address || null,
          specializations: finalSpecializations.length > 0 ? finalSpecializations : null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to submit join request");
      }

      setSubmitted(true);
      toast.success("Join request submitted successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Application Submitted!</CardTitle>
            <CardDescription className="text-base mt-2">
              Thank you for your interest in joining DietByRD. Our team will review your application and contact you within 2-3 business days.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => navigate("/login")} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Heart className="w-6 h-6 fill-primary" />
            DietByRD
          </Link>
          <Link to="/login">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Join DietByRD</CardTitle>
            <CardDescription className="text-base">
              Register as a healthcare professional to partner with us. Fill out the form below and our team will review your application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Dr. John Doe"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="10-digit number"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
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
                <Select value={formData.qualification} onValueChange={(v) => handleChange("qualification", v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALIFICATION_OPTIONS.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.qualification === "Others" && (
                  <Input
                    type="text"
                    placeholder="Please specify your qualification"
                    value={qualificationOther}
                    onChange={(e) => setQualificationOther(e.target.value)}
                    required
                  />
                )}
              </div>

              {formData.role === "doctor" && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Specialization <span className="text-red-500">*</span>
                      </label>
                      <Select value={formData.specialization} onValueChange={(v) => handleChange("specialization", v)} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCTOR_SPECIALIZATIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.specialization === "Others" && (
                        <Input
                          type="text"
                          placeholder="Please specify your specialization"
                          value={specializationOther}
                          onChange={(e) => setSpecializationOther(e.target.value)}
                          required
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Years of Experience <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="5"
                        min="0"
                        value={formData.experience_years}
                        onChange={(e) => handleChange("experience_years", e.target.value)}
                        onKeyDown={(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Medical License Number</label>
                    <Input
                      type="text"
                      placeholder="Your medical registration number"
                      value={formData.medical_license_number}
                      onChange={(e) => handleChange("medical_license_number", e.target.value)}
                    />
                  </div>
                </>
              )}

              {formData.role === "rd" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Specialization</label>
                    <Select value={formData.specialization} onValueChange={(v) => handleChange("specialization", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        {RD_SPECIALIZATIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.specialization === "Others" && (
                      <Input
                        type="text"
                        placeholder="Please specify your specialization"
                        value={specializationOther}
                        onChange={(e) => setSpecializationOther(e.target.value)}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Years of Experience</label>
                    <Input
                      type="number"
                      placeholder="3"
                      min="0"
                      value={formData.experience_years}
                      onChange={(e) => handleChange("experience_years", e.target.value)}
                      onKeyDown={(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                    />
                  </div>
                </div>
              )}

              {/* Clinic Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Clinic/Hospital Name</label>
                  <Input
                    type="text"
                    placeholder="ABC Hospital"
                    value={formData.clinic_name}
                    onChange={(e) => handleChange("clinic_name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location (City)</label>
                  <Select value={formData.clinic_address} onValueChange={(v) => handleChange("clinic_address", v)}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {["Mumbai","Delhi","Bengaluru","Hyderabad","Ahmedabad","Chennai","Kolkata","Pune",
                        "Jaipur","Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal","Visakhapatnam",
                        "Pimpri-Chinchwad","Patna","Vadodara","Ghaziabad","Ludhiana","Agra","Nashik",
                        "Faridabad","Meerut","Rajkot","Varanasi","Srinagar","Aurangabad","Dhanbad",
                        "Amritsar","Navi Mumbai","Allahabad","Ranchi","Howrah","Coimbatore","Jabalpur",
                        "Gwalior","Vijayawada","Jodhpur","Madurai","Raipur","Kota","Chandigarh",
                        "Guwahati","Thiruvananthapuram","Kochi","Mysuru","Others"].map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* About */}
              <div className="space-y-2">
                <label className="text-sm font-medium">About You (Optional)</label>
                <Textarea
                  placeholder="Tell us about your practice, areas of interest, or why you'd like to join DietByRD..."
                  value={formData.about}
                  onChange={(e) => handleChange("about", e.target.value)}
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
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
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800">
              💡 <strong>What happens next?</strong> After submission, our admin team will review your application within 2-3 business days. If approved, you'll receive login credentials via SMS to access your professional dashboard.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JoinForm;
