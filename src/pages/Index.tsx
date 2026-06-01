import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Leaf,
  Loader2,
  Lock,
  Pencil,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDashboardPath, useAuth } from "@/contexts/AuthContext";
import { JoinRequestForm } from "@/components/JoinRequestForm";

type AuthStep =
  | "phone"
  | "password"
  | "welcome-form"
  | "join-form"
  | "pending";

type CheckPhoneResponse = {
  success?: boolean;
  error?: string;
  data?: {
    exists?: boolean;
    user_role?: string | null;
    user_name?: string | null;
    auth_flow?: "password" | "otp" | "phone-signin";
  };
};

const formatRoleLabel = (role: string | null) => {
  if (!role) return "";

  if (role === "patient") return "Patient";
  if (role === "doctor") return "Doctor";
  if (role === "rd") return "Dietician (RD)";
  if (role === "mlt_intern") return "MLT Intern";
  if (role === "support_intern") return "Support Team";
  if (["ops_manager", "founder", "tech_lead"].includes(role)) return "Admin";

  return role.replace(/_/g, " ");
};

const getPhoneDigits = (value: string) => value.replace(/\D/g, "");

const normalizePhoneForAuth = (value: string) => {
  const digits = getPhoneDigits(value);
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const Index = () => {
  const navigate = useNavigate();
  const {
    login,
    isAuthenticated,
    user,
    isLoading: authLoading,
    sessionExpired,
  } = useAuth();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(getDashboardPath(user.role));
    }
  }, [authLoading, isAuthenticated, navigate, user]);

  const resetStepState = () => {
    setPassword("");
    setError("");
    setSuccess("");
    setShowPassword(false);
    setNameInput("");
    setAdminMessage(null);
  };

  const handleChangePhone = () => {
    resetStepState();
    setStep("phone");
  };

  const handleLookupPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const digits = getPhoneDigits(phone);
    if (digits.length < 9) {
      setError("Please enter a valid phone number");
      return;
    }

    const normalizedPhone = normalizePhoneForAuth(phone);

    setCheckingPhone(true);

    let userName: string | null = null;

    try {
      const res = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      let data: CheckPhoneResponse | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok && data?.success) {
        userName = data?.data?.user_name || null;
      }
    } catch {
      userName = null;
    } finally {
      setCheckingPhone(false);
    }

    setStep("password");
    setSuccess(userName ? `Welcome Back ${userName}` : "Enter your password to continue.");
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const digits = getPhoneDigits(phone);
    if (digits.length < 9) {
      setError("Please enter a valid phone number");
      setIsLoading(false);
      return;
    }

    const normalizedPhone = normalizePhoneForAuth(phone);
    const result = await login(normalizedPhone, password);
    if (!result.success) {
      if (result.pending) {
        setAdminMessage(result.admin_message ?? null);
        setStep("pending");
      } else {
        setError(result.error || "Invalid credentials");
      }
    }

    setIsLoading(false);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setError("Please enter your name");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const digits = getPhoneDigits(phone);
      if (digits.length < 10) {
        setError("Please enter a 10-digit phone number");
        setIsLoading(false);
        return;
      }

      const normalizedPhone = normalizePhoneForAuth(phone);
      const res = await fetch("/api/auth/complete-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          name: nameInput.trim(),
          email: null,
          age: null,
          gender: null,
          diagnosis: null,
          diagnosisDescription: null,
          allergies: [],
          height: null,
          weight: null,
          workoutFrequency: null,
          dietaryPreference: null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create account");
        setIsLoading(false);
        return;
      }
      localStorage.setItem("dietbyrd_user", JSON.stringify(data.data));
      window.location.href = getDashboardPath(data.data.role);
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === "welcome-form") {
      return (
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Almost there!</h2>
            <p className="text-slate-500 mt-2 text-base">What should we call you?</p>
          </div>
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-base flex items-center gap-3 mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">Your Name</label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""))}
                className="h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Get Started →"}
            </Button>
            <p className="text-xs text-center text-slate-400">
              You can complete your health profile after signing in.
            </p>
          </form>
        </>
      );
    }

    if (step === "join-form") {
      return (
        <JoinRequestForm
          inline
          onBack={handleChangePhone}
          onComplete={() => {
            setSuccess("Thanks for your interest! Our team will review your request.");
            setStep("phone");
          }}
        />
      );
    }

    if (step === "pending") {
      return (
        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Application Under Review</h2>
            <p className="text-slate-500 mt-2 text-base">
              Your account is pending approval by the DietByRD team. We'll notify you once it's approved.
            </p>
          </div>
          {adminMessage && (
            <div className="w-full p-4 rounded-xl bg-blue-50 border border-blue-200 text-left">
              <p className="text-sm font-semibold text-blue-800 mb-1">Message from the DietByRD team:</p>
              <p className="text-sm text-blue-700">{adminMessage}</p>
            </div>
          )}
          <Button type="button" variant="outline" onClick={handleChangePhone}>
            Back to login
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </button>
          <h2 className="text-3xl font-bold text-slate-900">Welcome to DietbyRD</h2>
          <p className="text-slate-500 mt-2 text-base">Enter your Phone number</p>
        </div>

        {(error || success) && (
          <div className="space-y-3 mb-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-base flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                {success}
              </div>
            )}
          </div>
        )}

        {step === "phone" && (
          <form onSubmit={handleLookupPhone} className="space-y-6">
            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="pl-12 h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={checkingPhone}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 group"
            >
              {checkingPhone ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="tel"
                  value={phone}
                  className="pl-12 pr-12 h-14 rounded-xl border-slate-200 bg-slate-100 text-slate-600"
                  disabled
                />
                <button
                  type="button"
                  onClick={handleChangePhone}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition"
                  aria-label="Edit phone number"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link to="/forgot-password" style={{ fontSize: 13, color: "var(--teal)" }}>
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 group"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        )}
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
    <div className="h-screen bg-slate-200 p-4 lg:p-6 xl:p-8 flex page-fade-in">
      <div className="w-full h-full flex flex-col lg:flex-row gap-4 lg:gap-5">
        <div className="flex-1 lg:w-[30%] flex flex-col items-center justify-center bg-white rounded-3xl shadow-xl p-8 lg:p-10 overflow-y-auto">
          {step !== "join-form" && step !== "welcome-form" && step !== "pending" && (
            <Link
              to="/"
              className="self-start mb-6 -mt-4 flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          )}
          
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
            {/* Session expired banner */}
            {sessionExpired && step === "phone" && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <p className="font-semibold text-sm">Your session has expired for security purposes.</p>
                <p className="text-sm mt-0.5">Please log in again to continue.</p>
              </div>
            )}
            {renderStepContent()}

            {/* Join as Professional Link */}
            {step !== "welcome-form" && step !== "join-form" && step !== "pending" && (
              <div className="mt-8 mb-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-slate-500">Healthcare Professional?</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                  onClick={() => setStep("join-form")}
                >
                  Join as Doctor or Dietician
                </Button>
              </div>
            )}

            {step !== "pending" && (
              <p className="text-center text-sm text-slate-400 mt-8">
                By using DietByRD, you agree to our <a href="#" className="text-emerald-600 hover:underline">Terms</a> and <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>
              </p>
            )}
          </div>
        </div>

        <div className="hidden lg:flex lg:w-[70%] flex-col justify-between p-10 xl:p-12 bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 animate-float-slow-1" />
          <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-teal-500/10 animate-float-slow-2" />
          <div className="absolute top-1/2 right-8 w-40 h-40 rounded-full bg-emerald-400/10 animate-float-slow-3" />
          <div className="absolute inset-0 opacity-[0.06] dot-grid" />

          <Link to="/" className="relative flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">DietByRD</h1>
              <p className="text-xs text-emerald-200 font-medium tracking-wide">Clinical Nutrition Platform</p>
            </div>
          </Link>

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

          <div className="relative grid grid-cols-3 gap-3">
            {[
              { value: "10k+", label: "Patients Helped" },
              { value: "95%", label: "Satisfaction Rate" },
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
      </div>
    </div>
  );
};

export default Index;
