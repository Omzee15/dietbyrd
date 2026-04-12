import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Lock, ArrowRight, Leaf, Heart, Activity, Loader2, User, Stethoscope, ChevronLeft, UtensilsCrossed, Building, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, getDashboardPath } from "@/contexts/AuthContext";
import { createJoinRequest } from "@/lib/api";

type FormMode = "login" | "signup" | "professional";

const Index = () => {
  const navigate = useNavigate();
  const { login, signup, isAuthenticated, user, isLoading: authLoading } = useAuth();
  
  const [mode, setMode] = useState<FormMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Professional join form fields
  const [professionalRole, setProfessionalRole] = useState<"doctor" | "rd">("doctor");
  const [qualification, setQualification] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [specializations, setSpecializations] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(getDashboardPath(user.role));
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const resetForm = () => {
    setPhone("");
    setPassword("");
    setName("");
    setQualification("");
    setClinicName("");
    setClinicAddress("");
    setSpecializations("");
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(phone, password);
    
    if (!result.success) {
      setError(result.error || "Invalid credentials");
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    const result = await signup(phone, password, name);
    
    if (!result.success) {
      setError(result.error || "Signup failed");
    }
    
    setIsLoading(false);
  };

  const handleProfessionalJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    if (!qualification.trim()) {
      setError("Qualification is required");
      setIsLoading(false);
      return;
    }

    try {
      await createJoinRequest({
        phone,
        password,
        name,
        role: professionalRole,
        qualification,
        clinic_name: clinicName || undefined,
        clinic_address: clinicAddress || undefined,
        specializations: specializations ? specializations.split(",").map(s => s.trim()) : undefined,
      });
      
      setSuccess("Your request has been submitted! You'll be notified once approved.");
      resetForm();
      setProfessionalRole("doctor");
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    }
    
    setIsLoading(false);
  };

  const renderFormContent = () => {
    if (mode === "login") {
      return (
        <>
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-2 text-base">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-base flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-12 h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 group"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <p className="text-center text-slate-600 text-sm">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => { resetForm(); setMode("signup"); }}
                className="text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Sign up
              </button>
            </p>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => { resetForm(); setMode("professional"); }}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-600 hover:text-emerald-700 transition-all duration-300 group"
            >
              <Stethoscope className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Join as a Doctor or Dietician</span>
            </button>
          </div>
        </>
      );
    }

    if (mode === "signup") {
      return (
        <>
          <div className="mb-8">
            <button
              type="button"
              onClick={() => { resetForm(); setMode("login"); }}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to login
            </button>
            <h2 className="text-3xl font-bold text-slate-900">Create account</h2>
            <p className="text-slate-500 mt-2 text-base">Sign up to get started as a patient</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-base flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-12 h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-12 h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 group"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <p className="text-center text-slate-600 text-sm">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { resetForm(); setMode("login"); }}
                className="text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Sign in
              </button>
            </p>
          </form>
        </>
      );
    }

    // Professional join mode
    return (
      <>
        <div className="mb-6">
          <button
            type="button"
            onClick={() => { resetForm(); setMode("login"); }}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-700 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to login
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Join as a Professional</h2>
          <p className="text-slate-500 mt-2 text-sm">Submit your request to join as a doctor or dietician</p>
        </div>

        <form onSubmit={handleProfessionalJoin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              {success}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">I want to join as</label>
            <Select value={professionalRole} onValueChange={(v) => setProfessionalRole(v as "doctor" | "rd")}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-emerald-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                    <span>Doctor</span>
                  </div>
                </SelectItem>
                <SelectItem value="rd">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                    <span>Registered Dietician</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Dr. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Phone *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Min 6 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Qualification *</label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder={professionalRole === "doctor" ? "MBBS, MD" : "M.Sc Nutrition, RD"}
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                required
              />
            </div>
          </div>

          {professionalRole === "doctor" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Clinic Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="City Hospital"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Clinic Address</label>
                <Textarea
                  placeholder="123 Main St, City"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-sm resize-none"
                  rows={2}
                />
              </div>
            </>
          )}

          {professionalRole === "rd" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Specializations</label>
              <Input
                type="text"
                placeholder="Diabetes, Weight Management, PCOS"
                value={specializations}
                onChange={(e) => setSpecializations(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-sm"
              />
              <p className="text-xs text-slate-400">Separate with commas</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-300 group mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Submit Request
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-slate-400">
            Your request will be reviewed by our admin team
          </p>
        </form>
      </>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-200 p-4 lg:p-6 xl:p-8 flex">
      {/* Outer wrapper — two-box layout filling entire page */}
      <div className="w-full h-full flex flex-col lg:flex-row gap-4 lg:gap-5">

        {/* ── LEFT BOX — 70% — Branding & Content ── */}
        <div className="hidden lg:flex lg:w-[70%] flex-col justify-between p-10 xl:p-12 bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 rounded-3xl shadow-xl relative overflow-hidden">

          {/* Decorative background shapes */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-teal-500/10" />
          <div className="absolute top-1/2 right-8 w-40 h-40 rounded-full bg-emerald-400/10" />
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
            }}
          />

          {/* Logo */}
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">DietByRD</h1>
              <p className="text-xs text-emerald-200 font-medium tracking-wide">Clinical Nutrition Platform</p>
            </div>
          </div>

          {/* Hero content */}
          <div className="relative max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-emerald-100 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              Trusted by 500+ Healthcare Providers
            </div>

            <h2 className="text-5xl xl:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              Nutrition care,
              <br />
              <span className="text-emerald-300">reimagined.</span>
            </h2>

            <p className="mt-5 text-base text-emerald-100/80 leading-relaxed">
              Connect doctors with registered dietitians seamlessly.
              Create personalized diet plans and track patient outcomes in real-time.
            </p>

            {/* Feature cards */}
            <div className="mt-8 space-y-3">
              {[
                { icon: Heart, label: "Patient-Centric Care", desc: "Holistic approach to nutrition management" },
                { icon: Activity, label: "Real-time Collaboration", desc: "Doctors and dietitians work together" },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm hover:bg-white/15 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{feature.label}</h3>
                    <p className="text-xs text-emerald-200/70 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats — each in its own box */}
          <div className="relative grid grid-cols-3 gap-3">
            {[
              { value: "10k+", label: "Patients Helped" },
              { value: "95%",  label: "Satisfaction Rate" },
              { value: "200+", label: "Active Dietitians" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center gap-1 p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm hover:bg-white/15 transition-all duration-200"
              >
                <span className="text-3xl font-bold text-white leading-none">{stat.value}</span>
                <span className="text-xs text-emerald-200/80 text-center leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT BOX — 30% — Login/Signup Form ── */}
        <div className="flex-1 lg:w-[30%] flex flex-col items-center justify-center bg-white rounded-3xl shadow-xl p-8 lg:p-10 overflow-y-auto">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">DietByRD</h1>
              <p className="text-xs text-slate-500 font-medium">Clinical Nutrition Platform</p>
            </div>
          </div>

          <div className="w-full max-w-md">
            {renderFormContent()}

            {/* Footer */}
            <p className="text-center text-sm text-slate-400 mt-8">
              By using DietByRD, you agree to our{" "}
              <a href="#" className="text-emerald-600 hover:underline">Terms</a> and{" "}
              <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Index;
