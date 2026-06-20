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
  Stethoscope,
  User,
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
        <h2 className="text-[36px] leading-tight text-[#0A1628] mb-1" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800 }}>Welcome to<br/>DietByRD</h2>
        <p className="text-slate-500 text-[15px] mb-2">Enter your phone number</p>
      </>
    );
  };

  const renderPhoneField = (readOnly = false) => (
    <div className="space-y-1.5">
      <label className="text-[13px] font-bold text-[#0A1628]">Phone Number</label>
      <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
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
            className={`pl-12 h-12 rounded-xl border-[#33654A] transition-all text-[15px] ${
              readOnly
                ? "pr-12 bg-slate-50 text-slate-600 border-slate-200"
                : "bg-white focus:ring-2 focus:ring-[#33654A]/20"
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
          <span className="text-sm font-medium">Back to home</span>
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
          disabled={loading || phone.length < 10}
          className="w-full h-12 text-[15px] font-semibold rounded-xl bg-[#2B5239] hover:bg-[#1E3B29] text-white transition-all shadow-[0_4px_12px_rgba(43,82,57,0.15)] mt-4 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Please wait...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              Continue <ArrowRight className="w-[18px] h-[18px]" />
            </div>
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
            className="w-full h-12 rounded-xl bg-[#33654A] hover:bg-[#2B543D] text-white font-medium text-[15px] transition-all duration-300"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
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
            className="w-full h-12 rounded-xl bg-[#33654A] hover:bg-[#2B543D] text-white font-medium text-[15px] transition-all duration-300"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
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

  const renderPatientRightSide = () => (
    <div className="flex-1 flex flex-col pt-4 xl:pt-8 pb-3 pl-12 xl:pl-16 pr-4 min-h-0 overflow-y-auto no-scrollbar">
      <div className="relative z-10 w-full max-w-[550px] mt-auto mb-auto py-1">
        {/* Header/Logo */}
        <div className="mb-3">
          <h1 className="text-[26px] xl:text-[32px] font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="text-[#0A1628]">Diet By </span>
            <span className="text-[#D49B2A]">RD</span>
          </h1>
          <p className="text-[12px] text-[#33654A] font-medium tracking-wide mt-1">The Gold Standard Clinical Nutrition</p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EEF2ED] rounded-full text-[#33654A] text-[10.5px] xl:text-[11px] font-medium mb-3">
          <span className="text-[12px] xl:text-[13px]">⭐</span>
          Trusted By Doctors across India
        </div>

        <h2 className="text-[28px] xl:text-[36px] font-bold text-[#0A1628] leading-[1.05] mb-3 max-w-[500px]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Diet,
          <br />
          Do not need to be a
          <br />
          Rocket Science <img src="/rocket-icon.png" alt="rocket" className="inline-block h-[1.2em] w-auto ml-1 align-[-0.2em]" />
        </h2>

        <p className="text-[12.5px] xl:text-[14px] text-[#4A5568] leading-relaxed mb-3 max-w-[460px]">
          Our Registered Dietitians make easy-peasy personalised diet plans that fit your not-so-easy-peasy, extremely busy schedule and pocket (promise 😉).
        </p>

        <div className="space-y-2 mb-1">
          <div className="flex items-start gap-3.5 p-3 xl:p-4 rounded-[16px] max-w-[480px] relative z-20 bg-[#FBF9F4]">
            <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-transparent border border-black/5">
              <ShieldCheck className="w-[16px] h-[16px] xl:w-[18px] xl:h-[18px] text-[#33654A]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-[#0A1628] text-[12px] xl:text-[13px] mb-0.5">No supplement upsell, only what is required</h3>
              <p className="text-[11px] xl:text-[12px] text-[#4A5568] leading-[1.5]">Every recommendation is made with your wellbeing in mind, not a sales target. When food is enough, we say so. When a supplement is necessary, we explain why.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 xl:p-4 rounded-[16px] max-w-[480px] relative z-20 bg-[#FBF9F4]">
            <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-transparent border border-black/5">
              <Activity className="w-[16px] h-[16px] xl:w-[18px] xl:h-[18px] text-[#33654A]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-[#0A1628] text-[12px] xl:text-[13px] mb-0.5">There's always a space for your comfort food.</h3>
              <p className="text-[11px] xl:text-[12px] text-[#4A5568] leading-[1.5]">Be it your sweet tooth, chocolate cravings or momos treat.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfessionalRightSide = () => (
    <div className="flex-1 flex flex-col pt-4 xl:pt-8 pb-3 pl-10 xl:pl-14 pr-4 overflow-y-auto no-scrollbar">
      <div className="relative z-10 w-full max-w-[480px] xl:max-w-[540px] mt-auto mb-auto py-1">
        {/* Header/Logo (Professional version) */}
        <div className="mb-3">
          <h1 className="text-[26px] xl:text-[32px] font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="text-[#0A1628]">Diet By </span>
            <span className="text-[#D49B2A]">RD</span>
          </h1>
          <p className="text-[12px] text-[#33654A] font-medium tracking-wide mt-1">The Gold Standard Clinical Nutrition</p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EEF2ED] rounded-full text-[#33654A] text-[10.5px] xl:text-[11px] font-medium mb-3">
          <span className="text-[12px] xl:text-[13px]">⭐</span>
          Trusted By Doctors across India
        </div>

        <h2 className="text-[26px] xl:text-[32px] font-bold text-[#0A1628] leading-[1.1] mb-4 max-w-[400px]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Qualifications to join <br />
          DietByRD as a professional:
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch max-w-[460px] xl:max-w-[500px] relative z-20">
          {/* Dietitian Column */}
          <div className="flex-[1.2] bg-white border border-[#33654A]/20 rounded-[14px] p-3.5 xl:p-4 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b-2 border-[#33654A]/20 w-fit">
              <div className="w-7 h-7 rounded-full bg-[#EEF2ED] flex items-center justify-center shrink-0 border border-[#33654A]/10">
                <User className="w-[15px] h-[15px] text-[#33654A]" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-[#33654A] text-[13px] xl:text-[14px]">Registered Dietitian</h3>
            </div>

            <div className="space-y-2.5 mt-3">
              {[
                "Be an IDA recognized registered dietitian.",
                "Should have the habit of reading and analyzing scientific literature on nutrition and dietetics.",
                "Third, must be a critical thinker.",
                "Must not have any connections with supplement brands.",
                "Must be super empathetic, a good listener, and have good conversation skills.",
                "Must speak Hindi and English fluently. (Additional Indian languages are plus point)",
                "Should have the will to serve patients with utmost sincerity and love."
              ].map((text, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-[16px] h-[16px] rounded-full bg-[#F4F4F5] flex items-center justify-center shrink-0 text-[#0A1628] font-bold text-[9px] mt-0.5 border border-slate-200">
                    {idx + 1}
                  </div>
                  <p className="text-[10px] xl:text-[11px] text-[#0A1628] font-medium leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Doctors Column */}
          <div className="flex-1 bg-white border border-[#33654A]/20 rounded-[14px] p-3.5 xl:p-4 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b-2 border-[#33654A]/20 w-fit">
                <div className="w-7 h-7 rounded-full bg-[#EEF2ED] flex items-center justify-center shrink-0 border border-[#33654A]/10">
                  <Stethoscope className="w-[15px] h-[15px] text-[#33654A]" strokeWidth={2} />
                </div>
                <h3 className="font-bold text-[#33654A] text-[13px] xl:text-[14px]">Doctors</h3>
              </div>

              <p className="text-[10px] xl:text-[11px] text-[#0A1628] font-medium leading-snug mt-3 relative z-10">
                Should have a valid Medical licence, a MBBS degree and will to help patients via Diet By RD.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#F4F3F0] flex justify-center items-center relative overflow-hidden page-fade-in">

      {/* Main Content Wrapper */}
      <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] h-[90vh] min-h-[740px] max-h-[900px] flex relative z-10 pointer-events-none">
        
        {/* Left Side: Auth Form Card */}
        <div className="flex-none w-full lg:w-[380px] xl:w-[420px] m-6 bg-white rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.04)] px-12 xl:px-14 py-10 flex flex-col z-20 overflow-y-auto pointer-events-auto">
          <div className="flex-1 flex flex-col justify-center">
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

                <p className="text-center text-[13px] text-slate-500 leading-relaxed mt-6">
                  By using DietByRD, you agree to our<br />
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#2B5239] font-medium hover:underline">
                    Terms of services
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2B5239] font-medium hover:underline">
                    Privacy Policy
                  </a>
                </p>

                <div className="w-full h-px bg-slate-200/60 my-8"></div>

                <div className="text-center">
                  <div className="text-[13px] text-slate-500 mb-1">
                    Healthcare Professional?
                  </div>
                  <button
                    className="text-[13px] text-slate-500 hover:text-[#33654A] transition-colors"
                    onClick={() => setShowJoinForm(true)}
                  >
                    Join as <span className="font-semibold text-[#2B5239]">Doctor</span> or <span className="font-semibold text-[#2B5239]">Dietitian</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Visual Section */}
        <div className="hidden lg:flex flex-1 relative flex-col z-10 pointer-events-auto bg-[#FDFBF7] rounded-[32px] my-6 mr-6 overflow-hidden shadow-sm border border-black/5">
          {/* Dotted background pattern */}
          <div className="absolute inset-0 z-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(#E8E4DB 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            opacity: 0.5,
            maskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 80%)'
          }} />

          {/* Image Container */}
          <div 
            className={`absolute inset-0 pointer-events-none ${showJoinForm ? 'z-30' : 'z-[5]'}`}
            style={{ mixBlendMode: showJoinForm ? 'darken' : 'normal' }}
          >
            {showJoinForm ? (
              <img 
                src="/new-docs-full.png" 
                alt="Professional Doctors and Dietitians" 
                className="absolute bottom-[0%] xl:bottom-[0%] right-[0%] xl:right-[0%] h-[95%] xl:h-[95%] object-contain object-right-bottom"
              />
            ) : (
              <img 
                src="/signin-image-nobg.webp" 
                alt="Happy Patient Eating Healthy" 
                className="absolute bottom-[-4%] right-[-8%] xl:right-[-12%] h-[100%] xl:h-[105%] object-contain object-right-bottom translate-x-[8%] xl:translate-x-[11%]"
                style={{ filter: 'drop-shadow(-8px 8px 24px rgba(0,0,0,0.1))' }}
              />
            )}
          </div>

          <div className="relative z-10 flex-1 flex flex-col h-full">
            {showJoinForm ? renderProfessionalRightSide() : renderPatientRightSide()}
            
            {/* Stats bar pinned to bottom - only shown on patient side */}
            {!showJoinForm && (
              <div className="flex gap-4 px-12 xl:px-16 pb-6 xl:pb-8 mt-auto relative z-40 w-full max-w-[650px]">
                <div className="flex-1 bg-[#F1EFE9]/90 backdrop-blur-sm rounded-[12px] py-2.5 xl:py-3.5 px-4 text-center">
                  <div className="text-[26px] font-bold text-[#33654A]">95%</div>
                  <div className="text-[12px] text-[#4A5568] font-medium mt-0.5">Satisfaction Rate</div>
                </div>
                <div className="flex-1 bg-[#F1EFE9]/90 backdrop-blur-sm rounded-[12px] py-2.5 xl:py-3.5 px-4 text-center">
                  <div className="text-[26px] font-bold text-[#33654A]">100%</div>
                  <div className="text-[12px] text-[#4A5568] font-medium mt-0.5">Real Reviews</div>
                </div>
                <div className="flex-1 bg-[#F1EFE9]/90 backdrop-blur-sm rounded-[12px] py-2.5 xl:py-3.5 px-4 text-center">
                  <div className="text-[26px] font-bold text-[#33654A]">110%</div>
                  <div className="text-[12px] text-[#4A5568] font-medium mt-0.5">Patient centric care</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
