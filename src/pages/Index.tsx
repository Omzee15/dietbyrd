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
  MessageSquare,
  Pencil,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDashboardPath, useAuth } from "@/contexts/AuthContext";

type AuthStep = "phone" | "password" | "otp-send" | "otp-verify" | "not-found";

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
  if (["ops_manager", "founder", "tech_lead"].includes(role)) return "Admin";

  return role.replace(/_/g, " ");
};

const Index = () => {
  const navigate = useNavigate();
  const { login, sendOtp, verifyOtp, isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [resolvedRole, setResolvedRole] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(getDashboardPath(user.role));
    }
  }, [authLoading, isAuthenticated, navigate, user]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const resetStepState = () => {
    setPassword("");
    setOtp("");
    setOtpTimer(0);
    setResolvedRole(null);
    setError("");
    setSuccess("");
    setShowPassword(false);
  };

  const handleChangePhone = () => {
    resetStepState();
    setStep("phone");
  };

  const handleLookupPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setCheckingPhone(true);

    try {
      const res = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits.slice(-10) }),
      });

      const data: CheckPhoneResponse = await res.json();

      if (!res.ok || !data?.success) {
        setError(data?.error || "Failed to lookup phone number");
        return;
      }

      const exists = Boolean(data?.data?.exists);
      const authFlow = data?.data?.auth_flow;
      const userRole = data?.data?.user_role || null;
      const userName = data?.data?.user_name || null;

      setResolvedRole(userRole);

      if (!exists || authFlow === "phone-signin") {
        setStep("not-found");
        setSuccess("");
        return;
      }

      if (authFlow === "otp" || userRole === "patient") {
        setStep("otp-send");
        setSuccess(userName ? `Welcome Back "${userName}"` : "Welcome Back");
        return;
      }

      setStep("password");
      setSuccess(userName ? `Welcome Back ${userName}` : "Welcome Back");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCheckingPhone(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const result = await login(phone, password);
    if (!result.success) {
      setError(result.error || "Invalid credentials");
    }

    setIsLoading(false);
  };

  const handleSendOtp = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);

    const result = await sendOtp(phone);
    if (!result.success) {
      setError(result.error || "Failed to send OTP");
    } else {
      setStep("otp-verify");
      setOtp("");
      setOtpTimer(result.expiresIn || 300);
      setSuccess("OTP sent to your phone.");
    }

    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const result = await verifyOtp(phone, otp);
    if (!result.success) {
      setError(result.error || "Invalid OTP");
    }

    setIsLoading(false);
  };

  const renderStepContent = () => {
    return (
      <>
        <div className="mb-8">
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

        {(step === "phone" || step === "not-found") && (
          <form onSubmit={handleLookupPhone} className="space-y-6">
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

            {step === "not-found" && (
              <Button
                type="button"
                onClick={() => navigate("/register")}
                variant="outline"
                className="w-full h-14 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Sign in using phone number
              </Button>
            )}
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

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 group"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
            </Button>

          </form>
        )}

        {(step === "otp-send" || step === "otp-verify") && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
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

            {step === "otp-verify" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-base font-medium text-slate-700">Enter OTP</label>
                  {otpTimer > 0 && (
                    <span className="text-sm text-slate-500">
                      Expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="pl-12 h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base tracking-widest font-mono"
                    required
                  />
                </div>
              </div>
            )}

            {step === "otp-send" ? (
              <Button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 group"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Login using OTP
                    <MessageSquare className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 group"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Verify OTP
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            )}

            {step === "otp-verify" && otpTimer === 0 && (
              <button
                type="button"
                onClick={() => {
                  setOtp("");
                  setStep("otp-send");
                  setError("");
                  setSuccess("");
                }}
                className="w-full text-center text-emerald-600 hover:text-emerald-700 font-medium text-sm"
              >
                Resend OTP
              </button>
            )}

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
    <div className="h-screen bg-slate-200 p-4 lg:p-6 xl:p-8 flex">
      <div className="w-full h-full flex flex-col lg:flex-row gap-4 lg:gap-5">
        <div className="hidden lg:flex lg:w-[70%] flex-col justify-between p-10 xl:p-12 bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 animate-float-slow-1" />
          <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-teal-500/10 animate-float-slow-2" />
          <div className="absolute top-1/2 right-8 w-40 h-40 rounded-full bg-emerald-400/10 animate-float-slow-3" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

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

        <div className="flex-1 lg:w-[30%] flex flex-col items-center justify-center bg-white rounded-3xl shadow-xl p-8 lg:p-10 overflow-y-auto">
          <Link 
            to="/" 
            className="self-start mb-6 -mt-4 flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
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
            {renderStepContent()}

            <p className="text-center text-sm text-slate-400 mt-8">
              By using DietByRD, you agree to our <a href="#" className="text-emerald-600 hover:underline">Terms</a> and <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
