import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDashboardPath, useAuth, type AuthUser } from "@/contexts/AuthContext";
import { JoinRequestForm } from "@/components/JoinRequestForm";
import { isValidIndianMobile, normalizeIndianMobileInput } from "@/lib/validation";

type Step = "phone" | "password" | "otp";
type AuthTrack = "employee" | "patient" | "new_patient" | "invalid_phone";

type CheckPhoneResponse = {
  success?: boolean;
  track?: AuthTrack;
  data?: {
    track?: AuthTrack;
    auth_flow?: "password" | "otp" | "phone-signin";
  };
  error?: string;
};

type AuthResponse = {
  success?: boolean;
  data?: AuthUser | { user?: AuthUser; [key: string]: unknown };
  user?: AuthUser;
  error?: string;
};

const getLoginDestination = (role: string | null | undefined) => {
  switch (role) {
    case "doctor":
    case "assistant":
      return "/doctor";
    case "rd":
      return "/dietician";
    case "mlt_intern":
      return "/mlt-intern";
    case "support":
    case "support_intern":
      return "/support";
    case "ops_manager":
    case "founder":
    case "tech_lead":
      return "/admin";
    case "patient":
      return "/patient";
    default:
      return "/";
  }
};

const normalizeAuthUser = (authUser: AuthUser): AuthUser => {
  if ((authUser.role as string) === "support") {
    return { ...authUser, role: "support_intern" };
  }

  return authUser;
};

const extractAuthUser = (payload: AuthResponse | null): AuthUser | null => {
  if (!payload) return null;

  const nestedUser = payload.data && "user" in payload.data ? payload.data.user : null;
  const candidate = nestedUser || payload.user || payload.data || payload;

  if (candidate && typeof candidate === "object" && "role" in candidate) {
    return normalizeAuthUser(candidate as AuthUser);
  }

  return null;
};

const getTrackFromResponse = (payload: CheckPhoneResponse | null): AuthTrack | null => {
  if (!payload) return null;
  if (payload.track) return payload.track;
  if (payload.data?.track) return payload.data.track;
  if (payload.data?.auth_flow === "password") return "employee";
  if (payload.data?.auth_flow === "otp" || payload.data?.auth_flow === "phone-signin") return "patient";
  return null;
};

const getJson = async <T,>(res: Response): Promise<T | null> => {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

const Index = () => {
  const navigate = useNavigate();
  const { loginWithData, isAuthenticated, user, isLoading: authLoading, sessionExpired } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(() => window.location.pathname === '/join');
  const [joinSuccess, setJoinSuccess] = useState(() => new URLSearchParams(window.location.search).get('joinSuccess') ? "Thanks for your interest! Our team will review your request." : "");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const formattedPhone = useMemo(() => `+91 ${phone}`, [phone]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, user]);

  useEffect(() => {
    if (authLoading || showJoinForm || step !== "phone") return;
    const focusTimer = window.setTimeout(() => phoneInputRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [authLoading, showJoinForm, step]);

  useEffect(() => {
    if (authLoading || showJoinForm || step !== "phone") return;
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        target?.isContentEditable;
      if (isEditing) return;
      event.preventDefault();
      phoneInputRef.current?.focus();
      phoneInputRef.current?.select();
    };
    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [authLoading, showJoinForm, step]);

  useEffect(() => {
    if (!otpExpiresAt) {
      setSecondsRemaining(0);
      return;
    }

    const updateRemaining = () => {
      setSecondsRemaining(Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000)));
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [otpExpiresAt]);

  const completeLogin = (authUser: AuthUser, fallbackPath?: string) => {
    const normalizedUser = normalizeAuthUser(authUser);
    loginWithData(normalizedUser);
    navigate(fallbackPath || getLoginDestination(normalizedUser.role), { replace: true });
  };

  const sendPatientOtp = useCallback(async () => {
    if (!isValidIndianMobile(phone)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/patient/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await getJson<{ success?: boolean; error?: string; expiresIn?: number }>(res);

      if (!res.ok || data?.success === false) {
        setError("Could not send OTP. Try again in a moment.");
        return;
      }

      const expiresIn = typeof data?.expiresIn === "number" ? data.expiresIn : 30;
      setOtpExpiresAt(Date.now() + expiresIn * 1000);
    } catch {
      setError("Could not send OTP. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    if (step !== "otp") return;
    void sendPatientOtp();
  }, [sendPatientOtp, step]);

  const resetTrackState = () => {
    setPassword("");
    setOtp("");
    setOtpExpiresAt(null);
    setError(null);
    setShowPassword(false);
  };

  const handleEditPhone = () => {
    resetTrackState();
    setStep("phone");
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinSuccess("");
    setError(null);

    if (!isValidIndianMobile(phone)) {
      setError("Please enter a valid mobile number");
      phoneInputRef.current?.focus();
      phoneInputRef.current?.select();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await getJson<CheckPhoneResponse>(res);
      const track = getTrackFromResponse(data);

      if (track === "invalid_phone") {
        setError("Please enter a valid mobile number");
        return;
      }

      if (!res.ok || !track) {
        setError("Something went wrong. Please try again.");
        return;
      }

      resetTrackState();
      setStep(track === "employee" ? "password" : "otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await getJson<AuthResponse>(res);

      if (res.status === 401) {
        setError("Invalid phone number or password");
        return;
      }

      const responseData = data?.data as Record<string, unknown> | undefined;
      if (res.status === 403 && responseData?.pending) {
        const adminMessage = typeof responseData.admin_message === "string" ? responseData.admin_message : "";
        const status = typeof responseData.status === "string" ? responseData.status : "pending";
        const statusLabel = status === "interview_sent" ? "interview scheduled" : status;
        setError(adminMessage || `Your application status is ${statusLabel}. Please wait for admin approval.`);
        return;
      }

      if (!res.ok || data?.success === false) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }

      const authUser = extractAuthUser(data);
      if (!authUser) {
        setError("Something went wrong. Please try again.");
        return;
      }

      completeLogin(authUser);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/patient/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await getJson<AuthResponse>(res);

      if (res.status === 400 || res.status === 401) {
        setError("Invalid OTP. Please try again.");
        return;
      }

      if (!res.ok || data?.success === false) {
        setError("Invalid OTP. Please try again.");
        return;
      }

      const authUser = extractAuthUser(data);
      if (!authUser) {
        setError("Invalid OTP. Please try again.");
        return;
      }

      completeLogin(authUser, "/patient");
    } catch {
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderHeading = () => {
    if (step === "password") {
      return (
        <>
          <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
          <p className="text-slate-500 mt-2 text-base">Enter your password</p>
        </>
      );
    }

    if (step === "otp") {
      return (
        <>
          <h2 className="text-3xl font-bold text-slate-900">One last step</h2>
          <p className="text-slate-500 mt-2 text-base">Enter the OTP sent to {formattedPhone}</p>
        </>
      );
    }

    return (
      <>
        <h2 className="text-3xl font-bold text-slate-900">Welcome to DietByRD</h2>
        <p className="text-slate-500 mt-2 text-base">Enter your phone number</p>
      </>
    );
  };

  const renderPhoneField = (readOnly = false) => (
    <div className="space-y-2">
      <label className="text-base font-medium text-slate-700">Phone Number</label>
      <div className="relative">
        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          ref={phoneInputRef}
          type="tel"
          inputMode="numeric"
          placeholder="Enter your phone number"
          value={phone}
          onChange={(e) => {
            setPhone(normalizeIndianMobileInput(e.target.value));
            setError(null);
          }}
          onKeyDown={(e) => {
            if (!readOnly && e.key === "Enter") {
              if (phone.trim() === "") {
                e.preventDefault();
              } else if (!isValidIndianMobile(phone)) {
                e.preventDefault();
                setError("Please enter a valid mobile number");
                phoneInputRef.current?.focus();
                phoneInputRef.current?.select();
              }
            }
          }}
          autoFocus={!readOnly}
          className={`pl-12 h-14 rounded-xl border-slate-200 transition-all text-base ${
            readOnly
              ? "pr-12 bg-slate-100 text-slate-600"
              : "bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20"
          }`}
          maxLength={10}
          readOnly={readOnly}
          required
        />
        {readOnly && (
          <button
            type="button"
            onClick={handleEditPhone}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition"
            aria-label="Edit phone number"
            tabIndex={-1}
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderAuthForm = () => (
    <>
      <div className="mb-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4"
          aria-label="Back to home"
          tabIndex={-1}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to home</span>
        </Link>
        {renderHeading()}
      </div>

      {(error || joinSuccess) && (
        <div className="space-y-3 mb-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-base flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}
          {joinSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              {joinSuccess}
            </div>
          )}
        </div>
      )}

      {step === "phone" && (
        <form onSubmit={handlePhoneSubmit} className="space-y-6">
          {renderPhoneField(false)}

          <Button
            type="submit"
            disabled={loading || !isValidIndianMobile(phone)}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300 group"
          >
            {loading ? (
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
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          {renderPhoneField(true)}

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
                autoFocus
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
            disabled={loading || password.length < 6}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="space-y-6">
          {renderPhoneField(true)}

          <div className="space-y-2">
            <label className="text-base font-medium text-slate-700">OTP</label>
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="pl-12 h-14 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 transition-all text-base tracking-[0.25em]"
                autoFocus
                maxLength={6}
                required
              />
            </div>
            <div className="text-sm text-slate-500">
              OTP sent to {formattedPhone}.{" "}
              {secondsRemaining > 0 ? (
                <span>Resend in {secondsRemaining}s</span>
              ) : (
                <button
                  type="button"
                  onClick={sendPatientOtp}
                  disabled={loading}
                  className="font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-60"
                >
                  Resend
                </button>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all duration-300"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Continue"}
          </Button>
        </form>
      )}
    </>
  );

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
            {sessionExpired && step === "phone" && !showJoinForm && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <p className="font-semibold text-sm">Your session has expired for security purposes.</p>
                <p className="text-sm mt-0.5">Please log in again to continue.</p>
              </div>
            )}

            {showJoinForm ? (
              <JoinRequestForm
                inline
                onBack={() => {
                  if (window.location.pathname === '/join') {
                    navigate('/');
                  } else {
                    setShowJoinForm(false);
                  }
                }}
                onComplete={() => {
                  if (window.location.pathname === '/join') {
                    navigate('/login?joinSuccess=1');
                  } else {
                    setJoinSuccess("Thanks for your interest! Our team will review your request.");
                    setShowJoinForm(false);
                    setStep("phone");
                  }
                }}
              />
            ) : (
              <>
                {renderAuthForm()}

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
                    onClick={() => setShowJoinForm(true)}
                  >
                    Join as Doctor or Dietician
                  </Button>
                </div>

                <p className="text-center text-sm text-slate-400 mt-8">
                  By using DietByRD, you agree to our{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    Terms and Conditions
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </>
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
              Connect doctors with registered dietitians seamlessly. Create personalized diet plans and track patient
              outcomes in real-time.
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
