import { useState, useMemo, useEffect, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Phone,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDieticians,
  getAvailableSlots,
  getConsultationPackages,
  createPaymentOrder,
  verifyPayment,
  bookAppointment,
  type ConsultationPackage,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatTime12 } from "@/lib/utils";
import { isValidIndianMobile, normalizeIndianMobileInput } from "@/lib/validation";

interface MergedSlot {
  date: string;
  start_time: string;
  datetime: string;
  duration_minutes: number;
  dietician_id: number;
}

type BookingStep = "slots" | "contact" | "otp" | "payment" | "success";

interface PublicBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublicBookingModal({ open, onOpenChange }: PublicBookingModalProps) {
  const { user, sendOtp, verifyOtp, loginWithData } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<BookingStep>("slots");
  const [weekOffset, setWeekOffset] = useState(0);
  const [mergedSlots, setMergedSlots] = useState<MergedSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MergedSlot | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [patientId, setPatientId] = useState<number | null>(null);
  const [packages, setPackages] = useState<ConsultationPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ConsultationPackage | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const confirmPaymentButtonRef = useRef<HTMLButtonElement>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = async (pkg: ConsultationPackage | null) => {
    if (!couponCode.trim() || !pkg) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(couponCode.trim(), pkg.price / 100);
      setAppliedCoupon(result);
      toast.success(`Coupon applied! ₹${result.discount_applied} off`);
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon code");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };
  const isSignedInPatient = user?.role === "patient" && !!user.profileId;

  const weekDateRange = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().split("T")[0],
      end: new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().split("T")[0],
      startDate: start,
      endDate: end,
    };
  }, [weekOffset]);

  useEffect(() => {
    if (!open) return;
    loadMergedSlots();
  }, [open, weekOffset]);

  const loadMergedSlots = async () => {
    setIsLoadingSlots(true);
    try {
      const dieticians = await getDieticians();
      const active = dieticians.filter((d) => d.is_active);

      const results = await Promise.all(
        active.map((d) =>
          getAvailableSlots(d.id, weekDateRange.start, weekDateRange.end)
            .then((slots) =>
              slots
                .filter((s) => !s.is_booked)
                .map((s) => ({ ...s, dietician_id: d.id }))
            )
            .catch(() => [] as (typeof active[0] & { dietician_id: number })[])
        )
      );

      // Merge: first dietitian to offer each time slot wins
      const seen = new Map<string, MergedSlot>();
      for (const slotList of results) {
        for (const slot of slotList) {
          if (!seen.has(slot.datetime)) {
            seen.set(slot.datetime, {
              date: slot.date,
              start_time: slot.start_time,
              datetime: slot.datetime,
              duration_minutes: slot.duration_minutes,
              dietician_id: slot.dietician_id,
            });
          }
        }
      }

      setMergedSlots(
        Array.from(seen.values()).sort(
          (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        )
      );
    } catch {
      toast.error("Failed to load available slots");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const slotsByDate = useMemo(
    () =>
      mergedSlots.reduce((acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
      }, {} as Record<string, MergedSlot[]>),
    [mergedSlots]
  );

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      if (step === "contact") nameInputRef.current?.focus();
      if (step === "otp") otpInputRef.current?.focus();
      if (step === "payment") confirmPaymentButtonRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(focusTimer);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const handleGlobalEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (step === "slots" && selectedSlot && !isLoading) {
          const active = document.activeElement;
          if (active && active.tagName === "BUTTON" && active.textContent !== "Continue →") {
            return;
          }
          e.preventDefault();
          handleContinueFromSlot();
        } else if (step === "payment" && selectedPackage && !isPaymentProcessing) {
          const active = document.activeElement;
          if (active && active.tagName === "BUTTON") {
             return; // Let the button handle it
          }
          e.preventDefault();
          void handlePayment();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalEnter);
    return () => window.removeEventListener("keydown", handleGlobalEnter);
  }, [open, step, selectedSlot, isLoading, selectedPackage, isPaymentProcessing]);

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhone(normalizeIndianMobileInput(e.target.value));
  };

  const loadPackagesForPayment = async () => {
    const pkgs = await getConsultationPackages();
    const normalizedPackages = pkgs.map((pkg) =>
      pkg.num_consultations === 1 && pkg.price < 99900 ? { ...pkg, price: 99900 } : pkg
    );
    setPackages(normalizedPackages);
    if (normalizedPackages.length > 0) setSelectedPackage(normalizedPackages[0]);
  };

  const handleContinueFromSlot = async () => {
    if (!selectedSlot) return;
    if (!isSignedInPatient) {
      setStep("contact");
      return;
    }

    setError("");
    setIsLoading(true);
    setPatientId(user.profileId!);
    setName(user.name || "");
    setPhone(normalizeIndianMobileInput(user.phone || ""));
    try {
      await loadPackagesForPayment();
      setStep("payment");
    } catch {
      setError("Failed to load consultation packages. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!isValidIndianMobile(phone)) { setError("Please enter a valid Indian mobile number"); return; }
    setError("");
    setIsLoading(true);
    const result = await sendOtp(phone);
    if (!result.success) {
      setError(result.error || "Failed to send OTP");
    } else {
      setStep("otp");
      setOtpTimer(result.expiresIn || 300);
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { setError("Please enter the OTP"); return; }
    setError("");
    setIsLoading(true);

    const digits = normalizeIndianMobileInput(phone);
    const result = await verifyOtp(digits, otp);

    if (!result.success) {
      setError(result.error || "Invalid OTP");
      setIsLoading(false);
      return;
    }

    const authUser = result.data;
    let pid = authUser?.profileId ?? null;

    if (authUser?.isNewPatient || authUser?.requiresWelcomeForm) {
      try {
        const res = await fetch("/api/auth/complete-welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: digits,
            name: name.trim(),
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
        pid = data.data?.profileId ?? null;
        loginWithData(data.data);
      } catch {
        setError("Network error. Please try again.");
        setIsLoading(false);
        return;
      }
    } else if (authUser?.name) {
      toast.success(`Welcome back, ${authUser.name}`);
      setName(authUser.name);
    }

    setPatientId(pid);

    try {
      await loadPackagesForPayment();
    } catch {
      // non-fatal
    }

    setStep("payment");
    setIsLoading(false);
  };

  const loadRazorpay = (): Promise<boolean> =>
    new Promise((resolve) => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handlePayment = async () => {
    if (!selectedPackage || !patientId || !selectedSlot) return;
    setIsPaymentProcessing(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        setIsPaymentProcessing(false);
        return;
      }

      const order = await createPaymentOrder({
        patient_id: patientId,
        package_id: selectedPackage.id,
        amount: selectedPackage.price,
      });

      const razorpayKey = (import.meta as any).env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        toast.error("Payment configuration missing. Please contact support.");
        setIsPaymentProcessing(false);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "DietByRD",
        description: `${selectedPackage.name} – ${selectedPackage.num_consultations} consultation(s)`,
        order_id: order.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (appliedCoupon) {
              applyCoupon(appliedCoupon.id, {
                patient_id: patientId,
                discount_applied: appliedCoupon.discount_applied,
                order_amount: selectedPackage.price / 100,
              }).catch(console.error);
              handleRemoveCoupon();
            }
            await bookAppointment({
              patient_id: patientId,
              scheduled_at: selectedSlot.datetime,
            });
            setStep("success");
          } catch (err: any) {
            toast.error(err.message || "Booking failed after payment");
          } finally {
            setIsPaymentProcessing(false);
            setIsRazorpayOpen(false);
          }
        },
        prefill: { name, contact: phone.replace(/\D/g, "").slice(-10) },
        remember_customer: true,
        theme: { color: "#10b981" },
        modal: {
          ondismiss: () => {
            setIsPaymentProcessing(false);
            setIsRazorpayOpen(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (r: any) => {
        toast.error(r.error.description || "Payment failed");
        setIsPaymentProcessing(false);
        setIsRazorpayOpen(false);
      });
      setIsRazorpayOpen(true);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment");
      setIsPaymentProcessing(false);
    }
  };

  const selectPackage = (pkg: ConsultationPackage) => {
    setSelectedPackage(pkg);
    window.requestAnimationFrame(() => confirmPaymentButtonRef.current?.focus());
  };

  const resetAndClose = () => {
    setStep("slots");
    setWeekOffset(0);
    setSelectedSlot(null);
    setName("");
    setPhone("");
    setOtp("");
    setError("");
    setPatientId(null);
    setPackages([]);
    setSelectedPackage(null);
    onOpenChange(false);
  };

  const goToDashboard = () => {
    resetAndClose();
    navigate("/patient");
  };

  const stepLabels = ["Choose Time", "Your Details", "Verify OTP", "Payment", "Done"];
  const stepKeys: BookingStep[] = ["slots", "contact", "otp", "payment", "success"];
  const currentStepIdx = stepKeys.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={resetAndClose} modal={!isRazorpayOpen}>
      <DialogContent className="sm:max-w-2xl h-[70vh] flex flex-col gap-0 p-0 overflow-hidden">
        <div className="flex-shrink-0 px-6 pt-6 pb-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              Book a Consultation
            </DialogTitle>
          </DialogHeader>

          {/* Step progress */}
          <div className="flex items-center gap-1 text-xs mt-3">
            {stepLabels.map((label, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground mx-0.5">›</span>}
                <span
                  className={
                    i === currentStepIdx
                      ? "text-emerald-600 font-semibold"
                      : i < currentStepIdx
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                  }
                >
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Step 1: Slot Selection ── */}
        {step === "slots" && (
          <div className="flex flex-col flex-1 min-h-0 px-6 pb-6 gap-3">
            <div className="flex-shrink-0 space-y-3">
              <p className="text-sm text-muted-foreground">
                Select a time that works for you — we'll match you with an available dietitian.
              </p>
              <div className="px-4 py-3 rounded-lg text-sm flex gap-2" style={{ background: "var(--teal-l)", color: "var(--teal)" }}>
                <span aria-hidden="true">ℹ️</span>
                <span>We'll assign an available dietitian to you after booking.</span>
              </div>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                  disabled={weekOffset === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev Week
                </Button>
                <span className="text-sm font-medium">
                  {weekDateRange.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {" – "}
                  {weekDateRange.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  disabled={weekOffset >= 4}
                >
                  Next Week <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Scrollable slot list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
                  <span className="text-muted-foreground text-sm">Loading available times…</span>
                </div>
              ) : Object.keys(slotsByDate).length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground font-medium">No slots available this week</p>
                  <p className="text-sm text-muted-foreground mt-1">Try the next week →</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date(weekDateRange.startDate);
                    d.setDate(d.getDate() + i);
                    const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                    const slots = slotsByDate[dateStr] || [];
                    
                    return (
                      <div key={dateStr} className={`border rounded-lg p-4 ${slots.length === 0 ? "bg-muted/30 opacity-70" : ""}`}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold">
                            {d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          </p>
                          {slots.length === 0 && (
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                              Dietitian on Leave / Fully Booked
                            </span>
                          )}
                        </div>
                        {slots.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {slots.map((slot) => (
                              <Button
                                key={slot.datetime}
                                variant={selectedSlot?.datetime === slot.datetime ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedSlot(slot)}
                                className={
                                  selectedSlot?.datetime === slot.datetime
                                    ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                                    : "hover:border-emerald-400"
                                }
                              >
                                {formatTime12(slot.start_time)}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            No available slots
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky footer: selection indicator + continue button */}
            <div className="flex-shrink-0 space-y-3 pt-2 border-t">
              {selectedSlot && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Selected:{" "}
                    <strong>
                      {new Date(selectedSlot.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at {formatTime12(selectedSlot.start_time)}
                    </strong>
                  </span>
                </div>
              )}
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={!selectedSlot || isLoading}
                onClick={handleContinueFromSlot}
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* Steps 2–5: scrollable content */}
        {step !== "slots" && (
        <div className="flex-1 overflow-y-auto px-6 pb-6">

        {/* ── Step 2: Contact Details ── */}
        {step === "contact" && (
          <div className="space-y-4">
            {selectedSlot && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {new Date(selectedSlot.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {formatTime12(selectedSlot.start_time)}
                </span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Enter your name and phone number to proceed. We'll send a verification code.
            </p>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={(e) => { e.preventDefault(); if (!isLoading) handleSendOtp(); }} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={nameInputRef}
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        phoneInputRef.current?.focus();
                      }
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="pl-9"
                    maxLength={10}
                  />
                </div>
                {phone.length > 0 && phone.length < 10 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your 10-digit mobile number
                  </p>
                )}
                {phone.length === 10 && !isValidIndianMobile(phone) && (
                  <p className="text-xs text-red-600 mt-1">
                    Indian mobile numbers start with 6, 7, 8, or 9
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { setStep("slots"); setError(""); }}>
                ← Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={!isValidIndianMobile(phone) || isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Send OTP →
              </Button>
            </div>
            </form>
          </div>
        )}

        {/* ── Step 3: OTP Verification ── */}
        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit OTP to{" "}
              <strong>+91 {phone}</strong>. Enter it below.
            </p>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={(e) => { e.preventDefault(); if (!isLoading) handleVerifyOtp(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium">OTP</label>
              <Input
                ref={otpInputRef}
                type="tel"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-1 text-center text-xl tracking-widest"
                maxLength={6}
              />
            </div>

            {otpTimer > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Resend in {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
              </p>
            )}
            {otpTimer === 0 && (
              <button
                type="button"
                className="text-xs text-emerald-600 underline w-full text-center"
                onClick={handleSendOtp}
              >
                Resend OTP
              </button>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setStep("contact"); setError(""); setOtp(""); }}
              >
                ← Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Verify & Continue →
              </Button>
            </div>
            </form>
          </div>
        )}

        {/* ── Step 4: Payment ── */}
        {step === "payment" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isPaymentProcessing && selectedPackage) {
                void handlePayment();
              }
            }}
          >
            {selectedSlot && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {new Date(selectedSlot.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {formatTime12(selectedSlot.start_time)}
                </span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Choose a package to confirm your appointment. Your consultation slot is reserved.
            </p>

            <div className="space-y-3">
              {packages.map((pkg) => (
                <button
                  type="button"
                  key={pkg.id}
                  className={`w-full text-left p-4 border rounded-lg cursor-pointer transition-all hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    selectedPackage?.id === pkg.id
                      ? "border-emerald-600 ring-2 ring-emerald-200 bg-emerald-50"
                      : ""
                  }`}
                  aria-pressed={selectedPackage?.id === pkg.id}
                  onClick={() => selectPackage(pkg)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (selectedPackage?.id === pkg.id && !isPaymentProcessing) {
                        void handlePayment();
                      } else {
                        selectPackage(pkg);
                      }
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pkg.num_consultations} consultation{pkg.num_consultations > 1 ? "s" : ""}
                      </p>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-lg font-bold">₹{(pkg.price / 100).toFixed(0)}</p>
                      {pkg.discount_percentage > 0 && (
                        <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                          {pkg.discount_percentage}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Button
              ref={confirmPaymentButtonRef}
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!selectedPackage || isPaymentProcessing}
            >
              {isPaymentProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing…
                </>
              ) : (
                `Pay ₹${selectedPackage ? Math.max(1, (selectedPackage.price / 100) - (appliedCoupon?.discount_applied || 0)).toFixed(0) : "0"} & Confirm Booking`
              )}
            </Button>
          </form>
        )}

        {/* ── Step 5: Success ── */}
        {step === "success" && (
          <div className="text-center py-8 space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Appointment Confirmed!</h3>
              {selectedSlot && (
                <p className="text-sm text-muted-foreground mt-2">
                  Your consultation is booked for{" "}
                  <strong>
                    {new Date(selectedSlot.date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    at {formatTime12(selectedSlot.start_time)}
                  </strong>
                  .
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-3">
                Your dietitian will be appointed to you soon. You'll receive a confirmation message on your phone once assigned.
              </p>
            </div>
            <div className="space-y-2">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={goToDashboard}>
                Go to My Dashboard →
              </Button>
              <Button variant="outline" className="w-full" onClick={resetAndClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        </div>
        )} {/* end steps 2-5 scrollable wrapper */}
      </DialogContent>
    </Dialog>
  );
}
