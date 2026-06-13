import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, CheckCircle2, Stethoscope, UtensilsCrossed, Phone, MessageSquare, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { isValidIndianMobile, normalizeIndianMobileInput } from "@/lib/validation";

const QUALIFICATION_OPTIONS = [
  "MBBS","MD","MS","BDS","BAMS","BHMS","BUMS",
  "BSc Nutrition","MSc Nutrition","BSc Dietetics","MSc Dietetics",
  "PG Diploma in Dietetics","PG Diploma in Clinical Nutrition",
  "PhD Nutrition","RD (Registered Dietitian)","Others",
];

const DOCTOR_SPECIALIZATIONS = [
  "General Medicine","Endocrinology","Cardiology","Nephrology",
  "Gastroenterology","Diabetology","Internal Medicine","Pulmonology",
  "Neurology","Oncology","Others",
];

const RD_SPECIALIZATIONS = [
  "Clinical Nutrition","Sports Nutrition","Pediatric Nutrition","Renal Nutrition",
  "Oncology Nutrition","Bariatric Nutrition","Diabetes Nutrition","Gut Health & IBS",
  "Weight Management","Women's Health & PCOS","Others",
];

const INDIAN_CITIES = [
  "Mumbai","Delhi","Bengaluru","Hyderabad","Ahmedabad","Chennai","Kolkata","Pune",
  "Jaipur","Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal","Visakhapatnam",
  "Pimpri-Chinchwad","Patna","Vadodara","Ghaziabad","Ludhiana","Agra","Nashik",
  "Faridabad","Meerut","Rajkot","Kalyan-Dombivali","Vasai-Virar","Varanasi","Srinagar",
  "Aurangabad","Dhanbad","Amritsar","Navi Mumbai","Allahabad","Ranchi","Howrah","Coimbatore",
  "Jabalpur","Gwalior","Vijayawada","Jodhpur","Madurai","Raipur","Kota","Chandigarh",
  "Guwahati","Thiruvananthapuram","Kochi","Mysuru","Others",
];

interface JoinRequestFormProps {
  onComplete: () => void;
  onBack?: () => void;
  inline?: boolean;
}

type JoinStep = "otp-send" | "otp-verify" | "password" | "details";

export function JoinRequestForm({ onComplete, onBack, inline = false }: JoinRequestFormProps) {
  const [step, setStep] = useState<JoinStep>("otp-send");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    specialization: "",
    qualification: "",
    experience_years: "",
    medical_license_number: "",
    clinic_name: "",
    clinic_address: "",
    about: "",
  });

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getValidatedPhone = () => {
    const phoneDigits = normalizeIndianMobileInput(formData.phone);
    if (!isValidIndianMobile(phoneDigits)) {
      toast.error("Please enter a valid Indian mobile number");
      return null;
    }
    return phoneDigits;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneDigits = getValidatedPhone();
    if (!phoneDigits) return;

    setIsSubmitting(true);

    try {
      // Send OTP using registration endpoint (doesn't create account)
      const res = await fetch("/api/auth/send-otp-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDigits }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to send OTP");
      }

      setStep("otp-verify");
      setOtpTimer(data.expiresIn || 120);
      toast.success("OTP sent to your phone");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsSubmitting(true);

    try {
      const phoneDigits = getValidatedPhone();
      if (!phoneDigits) return;

      const res = await fetch("/api/auth/verify-otp-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDigits, otp }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Invalid OTP");
      }

      toast.success("Phone verified successfully!");
      setStep("password");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to verify OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password || formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    toast.success("Password set successfully!");
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.phone || !formData.role || !formData.qualification) {
      toast.error("Please fill in all required fields");
      return;
    }

    const phoneDigits = getValidatedPhone();
    if (!phoneDigits) return;

    if (formData.role === "doctor") {
      if (!formData.specialization || !formData.experience_years) {
        toast.error("Please fill in all doctor-specific fields");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare specializations array
      const specializations = formData.specialization 
        ? [formData.specialization] 
        : [];

      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneDigits,
          password: formData.password,
          name: formData.name,
          email: formData.email || null,
          role: formData.role,
          qualification: formData.qualification,
          clinic_name: formData.clinic_name || null,
          clinic_address: formData.clinic_address || null,
          specializations: specializations.length > 0 ? specializations : null,
          about_yourself: formData.about || null,
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

  const renderStepContent = () => {
    // Step 1: Send OTP
    if (step === "otp-send") {
      return (
        <form onSubmit={handleSendOtp} className="space-y-6">
          {onBack && (
            <Button type="button" variant="ghost" onClick={onBack} className="mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Join as Healthcare Professional</h2>
            <p className="text-slate-600 text-sm mt-1">
              Step 1 of 3: Verify your phone number
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number <span className="text-red-500">*</span></label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                autoFocus
                type="tel"
                placeholder="Enter 10-digit phone number"
                value={formData.phone}
                onChange={(e) => handleChange("phone", normalizeIndianMobileInput(e.target.value))}
                className="pl-11 h-12"
                maxLength={10}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || !isValidIndianMobile(formData.phone)} className="w-full h-12">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP...</>
            ) : (
              <><MessageSquare className="w-4 h-4 mr-2" />Send OTP</>
            )}
          </Button>
        </form>
      );
    }

    // Step 2: Verify OTP
    if (step === "otp-verify") {
      return (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Verify OTP</h2>
            <p className="text-slate-600 text-sm mt-1">
              Step 1 of 3: Enter the 6-digit code sent to {formData.phone}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enter OTP</label>
              {otpTimer > 0 && (
                <span className="text-sm text-slate-500">
                  {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                </span>
              )}
            </div>
            <Input
              autoFocus
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="h-12 text-center tracking-widest font-mono text-lg"
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting || otp.length !== 6} className="w-full h-12">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
            ) : (
              "Verify OTP"
            )}
          </Button>

          {otpTimer === 0 && (
            <button
              type="button"
              onClick={() => {
                setOtp("");
                setStep("otp-send");
              }}
              className="w-full text-center text-emerald-600 hover:text-emerald-700 font-medium text-sm"
            >
              Resend OTP
            </button>
          )}
        </form>
      );
    }

    // Step 3: Set Password
    if (step === "password") {
      return (
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Create Password</h2>
            <p className="text-slate-600 text-sm mt-1">
              Step 2 of 3: Set a secure password for your account
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password (min 6 characters)"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="pl-11 pr-11 h-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                className="pl-11 pr-11 h-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-12">
            Continue
          </Button>
        </form>
      );
    }

    // Step 4: Details Form
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Professional Details</h2>
          <p className="text-slate-600 text-sm mt-1">
            Step 3 of 3: Tell us about your practice
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
          <Select value={formData.qualification} onValueChange={(v) => handleChange("qualification", v)} required>
            <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
            <SelectContent>
              {QUALIFICATION_OPTIONS.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.role === "doctor" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Specialization <span className="text-red-500">*</span>
                </label>
                <Select value={formData.specialization} onValueChange={(v) => handleChange("specialization", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                  <SelectContent>
                    {DOCTOR_SPECIALIZATIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  onKeyDown={(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
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
              <Select value={formData.specialization} onValueChange={(v) => handleChange("specialization", v)}>
                <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                <SelectContent>
                  {RD_SPECIALIZATIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Experience (Years)</label>
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
            <label className="text-sm font-medium">Location (City)</label>
            <Select value={formData.clinic_address} onValueChange={(v) => handleChange("clinic_address", v)}>
              <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
              <SelectContent>
                {INDIAN_CITIES.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* About Yourself */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tell us about yourself</label>
          <Textarea
            placeholder="Share your background, experience, and why you'd like to join DietByRD..."
            value={formData.about}
            onChange={(e) => handleChange("about", e.target.value)}
            rows={4}
            className="resize-none"
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
  };

  if (inline) {
    return (
      <div className="w-full max-h-[calc(100vh-280px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        {renderStepContent()}
      </div>
    );
  }

  return renderStepContent();
}
