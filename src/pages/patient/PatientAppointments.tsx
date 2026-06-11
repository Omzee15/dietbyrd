import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Loader2,
  LogOut,
  Plus,
  User,
  UtensilsCrossed,
  X,
  Heart,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppSidebar from "@/components/AppSidebar";
import {
  getPatient,
  getPatientMeAppointments,
  getAvailableSlots,
  getAllDieticianSlots,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getConsultationPackages,
  createPaymentOrder,
  verifyPayment,
  validateCoupon,
  applyCoupon,
  type Appointment,
  type AvailableSlot,
  type ConsultationPackage,
  type CouponValidation,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatTime12, formatDateTime12, parseIST } from "@/lib/utils";
import { getPatientSidebarSections } from "@/lib/patient-sidebar";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PatientAppointments = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Appointment booking state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<ConsultationPackage | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const confirmAppointmentButtonRef = useRef<HTMLButtonElement>(null);

  // Cancellation state
  const [cancelAppointmentId, setCancelAppointmentId] = useState<number | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Get patient data
  const { data: patient, isLoading: patientLoading, refetch: refetchPatient } = useQuery({
    queryKey: ["patient", user?.profileId],
    queryFn: () => getPatient(user!.profileId!),
    enabled: !!user?.profileId,
  });

  // Get patient appointments
  const { data: appointments, isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ["patient-appointments", user?.id],
    queryFn: () => getPatientMeAppointments(),
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
  });

  // Calculate week date range for available slots
  const weekDateRange = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + weekOffset * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      start: startOfWeek.toISOString().split("T")[0],
      end: endOfWeek.toISOString().split("T")[0],
      startDate: startOfWeek,
      endDate: endOfWeek,
    };
  }, [weekOffset]);

  const hasAssignedRD = !!patient?.assigned_rd_id;

  useEffect(() => {
    if (!isBookingModalOpen || !selectedSlot) return;
    const focusTimer = window.setTimeout(() => {
      confirmAppointmentButtonRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(focusTimer);
  }, [isBookingModalOpen, selectedSlot, selectedPackage]);

  // Get available slots — assigned dietician or all dieticians if unassigned
  const { data: availableSlots, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ["available-slots", patient?.assigned_rd_id ?? "all", weekDateRange.start, weekDateRange.end],
    queryFn: () =>
      hasAssignedRD
        ? getAvailableSlots(patient!.assigned_rd_id!, weekDateRange.start, weekDateRange.end)
        : getAllDieticianSlots(weekDateRange.start, weekDateRange.end),
    enabled: !!patient && isBookingModalOpen,
  });

  // Get consultation packages
  const { data: packages } = useQuery({
    queryKey: ["consultation-packages"],
    queryFn: getConsultationPackages,
    enabled: isPaymentModalOpen || isBookingModalOpen,
  });

  // Auto-select first package if none selected
  useEffect(() => {
    if (packages && packages.length > 0 && !selectedPackage) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  // Book appointment mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: (data: { scheduled_at: string; rd_id?: number | null; patient_notes?: string }) =>
      bookAppointment({
        patient_id: user!.profileId!,
        rd_id: data.rd_id ?? null,
        scheduled_at: data.scheduled_at,
        patient_notes: data.patient_notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
      toast.success("Appointment booked successfully!");
      setIsBookingModalOpen(false);
      setSelectedSlot(null);
      setAppointmentNotes("");
      refetchSlots();
      refetchAppointments();
    },
    onError: (error: Error) => {
      // Check if it's a payment required error
      if (error.message.includes("No consultations left")) {
        toast.error("No consultations left. Please purchase a package to book an appointment.");
        setIsBookingModalOpen(false);
        setIsPaymentModalOpen(true);
      } else {
        toast.error(error.message || "Failed to book appointment");
      }
    },
  });

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: (appointmentId: number) => cancelAppointment(appointmentId, "patient"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
      toast.success("Appointment cancelled");
      refetchAppointments();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel appointment");
    },
  });

  // Reschedule appointment mutation
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: (data: { appointmentId: number; newScheduledAt: string; patientNotes?: string }) =>
      rescheduleAppointment(data.appointmentId, data.newScheduledAt, data.patientNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
      toast.success("Appointment rescheduled successfully!");
      setIsBookingModalOpen(false);
      setSelectedSlot(null);
      setAppointmentNotes("");
      setEditingAppointment(null);
      refetchSlots();
      refetchAppointments();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reschedule appointment");
    },
  });

  // Group slots by date
  const slotsByDate = useMemo(() => {
    if (!availableSlots) return {};
    const seen = new Set<string>();
    return availableSlots.reduce((acc, slot) => {
      if (seen.has(slot.datetime)) return acc;
      seen.add(slot.datetime);
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {} as Record<string, AvailableSlot[]>);
  }, [availableSlots]);

  // Handle booking or rescheduling
  const handleBookAppointment = () => {
    if (!selectedSlot) return;

    // If editing an existing appointment, reschedule it
    if (editingAppointment) {
      rescheduleAppointmentMutation.mutate({
        appointmentId: editingAppointment.id,
        newScheduledAt: selectedSlot.datetime,
        patientNotes: appointmentNotes || undefined,
      });
      return;
    }

    // Check if patient has consultations left for new booking
    const consultationsLeft = (patient as any)?.consultations_left ?? 0;
    if (consultationsLeft <= 0) {
      toast.error("No consultations left. Please purchase a package first.");
      setIsBookingModalOpen(false);
      setIsPaymentModalOpen(true);
      return;
    }

    bookAppointmentMutation.mutate({
      scheduled_at: selectedSlot.datetime,
      patient_notes: appointmentNotes || undefined,
    });
  };

  // Handle modal close
  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedSlot(null);
    setAppointmentNotes("");
    setEditingAppointment(null);
  };

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

  // Load Razorpay script
  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle payment
  const handlePayment = async (pkg: ConsultationPackage) => {
    setSelectedPackage(pkg);
    setIsPaymentProcessing(true);
    
    // Capture all required values before closing modal (for async callbacks)
    const slotToBook = selectedSlot;
    const notesToSave = appointmentNotes;
    const patientId = user?.profileId;
    const couponSnapshot = appliedCoupon;
    const patientName = patient?.name || "";
    const patientPhone = patient?.phone || user?.phone || "";

    // Validate we have all required data for booking
    if (!slotToBook || !patientId) {
      toast.error("Missing required information. Please try again.");
      setIsPaymentProcessing(false);
      return;
    }
    
    // Close the booking modal so Razorpay popup is accessible
    setIsBookingModalOpen(false);

    try {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        toast.error("Failed to load payment gateway. Please try again.");
        setIsPaymentProcessing(false);
        // Reopen modal on failure
        setIsBookingModalOpen(true);
        return;
      }

      // Create order on backend — pass discounted amount if coupon applied
      const discountedPaise = appliedCoupon
        ? Math.max(100, pkg.price - Math.round(appliedCoupon.discount_applied * 100))
        : undefined;
      const order = await createPaymentOrder({
        patient_id: patientId,
        package_id: pkg.id,
        amount: pkg.price,
        ...(discountedPaise ? { discounted_amount: discountedPaise } : {}),
      });

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        toast.error("Payment configuration missing. Please contact support.");
        setIsPaymentProcessing(false);
        setTimeout(() => {
          if (slotToBook) {
            setSelectedSlot(slotToBook);
            setAppointmentNotes(notesToSave);
            setIsBookingModalOpen(true);
          }
        }, 300);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "DietByRD",
        description: `${pkg.name} - ${pkg.num_consultations} Consultation(s)`,
        order_id: order.razorpay_order_id,
        handler: async function (response: any) {
          try {
            // Verify payment on backend
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success(`Payment successful! ${pkg.num_consultations} consultation(s) added.`);
            queryClient.invalidateQueries({ queryKey: ["patient", patientId] });

            // Record coupon usage if one was applied
            if (couponSnapshot) {
              applyCoupon(couponSnapshot.id, {
                patient_id: patientId,
                discount_applied: couponSnapshot.discount_applied,
                order_amount: pkg.price / 100,
              }).catch(() => {});
              handleRemoveCoupon();
            }

            // Refetch patient data to get updated consultations_left
            await refetchPatient();
            
            // Close payment modal
            setIsPaymentModalOpen(false);
            setIsPaymentProcessing(false);
            
            // Reopen booking modal with the selected slot to complete booking
            // Use setTimeout to ensure payment modal fully closes first
            setTimeout(() => {
              setSelectedSlot(slotToBook);
              setAppointmentNotes(notesToSave);
              setIsBookingModalOpen(true);
              toast.info("Now confirm your appointment booking!");
            }, 300);
            
          } catch (err: any) {
            toast.error(err.message || "Payment verification failed");
            setIsPaymentProcessing(false);
            // Reopen booking modal on payment failure too
            setTimeout(() => {
              setSelectedSlot(slotToBook);
              setAppointmentNotes(notesToSave);
              setIsBookingModalOpen(true);
            }, 300);
          }
        },
        prefill: {
          name: patientName,
          contact: patientPhone,
        },
        theme: {
          color: "#14b8a6",
        },
        remember_customer: true,
        modal: {
          ondismiss: function () {
            setIsPaymentProcessing(false);
            // Reopen booking modal if user dismisses payment (after a short delay to let Razorpay fully close)
            setTimeout(() => {
              if (slotToBook) {
                setSelectedSlot(slotToBook);
                setAppointmentNotes(notesToSave);
                setIsBookingModalOpen(true);
              }
            }, 300);
          },
          escape: true,
          backdropclose: false,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        // Don't show toast here - Razorpay already shows the error
        // The modal ondismiss will handle reopening our booking modal
        console.log("[Razorpay] Payment failed:", response.error.description);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment order");
      setIsPaymentProcessing(false);
      // Reopen modal on error
      if (slotToBook) {
        setSelectedSlot(slotToBook);
        setAppointmentNotes(notesToSave);
        setIsBookingModalOpen(true);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatDate = (dateStr: string) => {
    const date = parseIST(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => formatDateTime12(dateStr);

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  const formatPhoneDisplay = (raw?: string | null) => {
    if (!raw) return "";
    const trimmed = raw.trim();
    if (!trimmed) return "";
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10) return trimmed;
    const lastTen = digits.slice(-10);
    const prefixDigits = digits.length > 10 ? digits.slice(0, -10) : "";
    const prefix = prefixDigits ? `+${prefixDigits}` : "+91";
    return `${prefix} ${lastTen.slice(0, 5)} ${lastTen.slice(5)}`;
  };

  // Separate appointments
  const isUpcomingAppointment = (appointment: Appointment) =>
    (appointment.status === "confirmed" || appointment.status === "scheduled") &&
    parseIST(appointment.scheduled_at) > new Date();

  const upcomingAppointments = (appointments || [])
    .filter((a) => isUpcomingAppointment(a))
    .sort((a, b) => parseIST(a.scheduled_at).getTime() - parseIST(b.scheduled_at).getTime());

  const pastAppointments = (appointments || [])
    .filter((a) => !isUpcomingAppointment(a))
    .sort((a, b) => parseIST(b.scheduled_at).getTime() - parseIST(a.scheduled_at).getTime());

  const sidebarSections = getPatientSidebarSections();

  const bottomContent = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
    >
      <LogOut className="w-[18px] h-[18px] shrink-0" />
      <span>Sign Out</span>
    </button>
  );

  const isLoading = patientLoading || appointmentsLoading;
  const consultationsLeft = (patient as any)?.consultations_left ?? 0;

  return (
    <div className="flex min-h-screen">
      {/* Payment Processing Overlay */}
      {isPaymentProcessing && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border shadow-lg">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-semibold text-lg">Processing Payment</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait while we verify your payment...</p>
            </div>
          </div>
        </div>
      )}

      <AppSidebar
        title="DietByRD"
        subtitle={user?.name || "Patient Portal"}
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">Appointments</h1>
          {patient && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {getInitials(patient.name || "")}
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-medium">{patient.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatPhoneDisplay(patient.phone || patient.user_phone || user?.phone) || patient.email || ""}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/patient/profile")}>
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Main Content */}
        {!isLoading && patient && (
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Quick Actions */}
            <div className="flex gap-4">
              <Button onClick={() => setIsBookingModalOpen(true)} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Schedule New Appointment
              </Button>
            </div>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CalendarDays className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {appointment.consultation_type === "first"
                                ? "Initial Consultation"
                                : "Follow-up Consultation"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(appointment.scheduled_at)} at{" "}
                              {formatTime(appointment.scheduled_at)}
                            </p>
                            {appointment.dietician_name ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                with {appointment.dietician_name}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-600 mt-1">
                                Dietician will be assigned to you soon
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {appointment.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80"
                            onClick={() => {
                              setEditingAppointment(appointment);
                              setIsBookingModalOpen(true);
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => {
                              setCancelAppointmentId(appointment.id);
                              setIsCancelDialogOpen(true);
                            }}
                            disabled={cancelAppointmentMutation.isPending}
                          >
                            {cancelAppointmentMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">No upcoming appointments</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsBookingModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Book New Appointment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Past Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pastAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {appointment.consultation_type === "first"
                                ? "Initial Consultation"
                                : "Follow-up Consultation"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(appointment.scheduled_at)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            appointment.status === "completed"
                              ? "border-green-500/30 text-green-600"
                              : appointment.status === "cancelled"
                              ? "border-red-500/30 text-red-600"
                              : ""
                          }
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Not found state */}
        {!isLoading && !patient && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Patient data not found</p>
              <Button variant="outline" className="mt-4" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Booking Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseBookingModal();
        } else {
          setIsBookingModalOpen(open);
        }
      }}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {editingAppointment 
                ? (selectedSlot ? "Confirm Reschedule" : "Reschedule Appointment")
                : (selectedSlot ? "Confirm Appointment" : "Schedule Appointment")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Reschedule Notice */}
            {editingAppointment && !selectedSlot && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Current appointment:</strong>{" "}
                  {new Date(editingAppointment.scheduled_at + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {formatDateTime12(editingAppointment.scheduled_at)}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Select a new time slot below to reschedule.
                </p>
              </div>
            )}

            {/* View 1: Slot Selection (when no slot selected) */}
            {!selectedSlot && (
              <>
                {/* Week Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                    disabled={weekOffset === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous Week
                  </Button>
                  <span className="text-sm font-medium">
                    {weekDateRange.startDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {" - "}
                    {weekDateRange.endDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    disabled={weekOffset >= 4}
                  >
                    Next Week
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* Dietician Info */}
                {patient?.assigned_dietician_name ? (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <UtensilsCrossed className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Appointment with</p>
                      <p className="font-semibold">{patient.assigned_dietician_name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Choose any available slot — a dietician will be assigned to you automatically.
                    </p>
                  </div>
                )}

                {/* Loading */}
                {slotsLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading available slots...</span>
                  </div>
                )}

                {/* Available Slots */}
                {!slotsLoading && availableSlots && (
                  <div className="space-y-4">
                    {Object.keys(slotsByDate).length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                        <p className="text-muted-foreground">No available slots this week</p>
                        <p className="text-sm text-muted-foreground">Try selecting a different week</p>
                      </div>
                    ) : (
                      Object.entries(slotsByDate).map(([date, slots]) => {
                        const dateObj = new Date(date + "T00:00:00");
                        return (
                          <div key={date} className="border rounded-lg p-4">
                            <p className="font-medium mb-3">
                              {dateObj.toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {slots.map((slot) => (
                                <Button
                                  key={slot.datetime}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedSlot(slot)}
                                  className="min-w-[80px] flex flex-col h-auto py-1.5 px-3"
                                  disabled={slot.is_booked}
                                >
                                  <span>{formatTime12(slot.start_time)}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}

            {/* View 2: Confirmation (when slot selected) */}
            {selectedSlot && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (consultationsLeft <= 0 && !editingAppointment) {
                    if (selectedPackage && !isPaymentProcessing) void handlePayment(selectedPackage);
                    return;
                  }
                  handleBookAppointment();
                }}
              >
                {/* Back button to change slot */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSlot(null)}
                  className="gap-1 -ml-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Change Time
                </Button>

                {/* Appointment Summary Card */}
                <div className="border rounded-xl p-5 space-y-4 bg-gradient-to-br from-primary/5 to-primary/10">
                  {/* Dietician */}
                  {patient?.assigned_dietician_name && (
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <UtensilsCrossed className="w-7 h-7 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Dietician</p>
                        <p className="text-lg font-semibold">
                          {patient.assigned_dietician_name}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="h-px bg-border" />

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {new Date(selectedSlot.datetime).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-medium">{formatTime12(selectedSlot.start_time)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes for your dietician (optional)</label>
                  <Textarea
                    placeholder="Any specific concerns or topics you'd like to discuss..."
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Payment/Confirmation Section */}
                {consultationsLeft <= 0 && !editingAppointment ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Purchase a consultation package to confirm
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {packages?.map((pkg) => (
                        <div
                          key={pkg.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                            selectedPackage?.id === pkg.id ? "border-primary ring-2 ring-primary/20" : ""
                          }`}
                          onClick={() => setSelectedPackage(pkg)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{pkg.name}</p>
                              <p className="text-xs text-muted-foreground">{pkg.num_consultations} consultation{pkg.num_consultations > 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">₹{(pkg.price / 100).toFixed(0)}</p>
                              {pkg.discount_percentage > 0 && (
                                <Badge variant="secondary" className="text-green-600 text-xs">
                                  {pkg.discount_percentage}% OFF
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Coupon code input */}
                    {selectedPackage && (
                      <div className="space-y-2">
                        {appliedCoupon ? (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                              <Tag className="w-4 h-4" />
                              <span className="font-medium">{appliedCoupon.code}</span>
                              <span>— ₹{appliedCoupon.discount_applied} off</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="text-green-600 hover:text-green-800"
                              aria-label="Remove applied coupon"
                              title="Remove coupon"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Coupon code"
                              value={couponCode}
                              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleApplyCoupon(selectedPackage);
                                }
                              }}
                              className="h-9 text-sm"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 shrink-0"
                              onClick={() => handleApplyCoupon(selectedPackage)}
                              disabled={!couponCode.trim() || couponLoading}
                            >
                              {couponLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                            </Button>
                          </div>
                        )}
                        {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                      </div>
                    )}

                    <Button
                      type="submit"
                      ref={confirmAppointmentButtonRef}
                      className="w-full h-12 text-base"
                      disabled={!selectedPackage || isPaymentProcessing}
                    >
                      {isPaymentProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing Payment...
                        </>
                      ) : selectedPackage && appliedCoupon ? (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay ₹{Math.max(1, (selectedPackage.price / 100) - appliedCoupon.discount_applied).toFixed(0)} & Proceed
                          <span className="ml-1 text-xs line-through opacity-70">₹{(selectedPackage.price / 100).toFixed(0)}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay ₹{selectedPackage ? (selectedPackage.price / 100).toFixed(0) : "0"} & Proceed
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="submit"
                    ref={confirmAppointmentButtonRef}
                    className="w-full h-12 text-base"
                    disabled={bookAppointmentMutation.isPending || rescheduleAppointmentMutation.isPending}
                  >
                    {(bookAppointmentMutation.isPending || rescheduleAppointmentMutation.isPending) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingAppointment ? "Rescheduling..." : "Booking..."}
                      </>
                    ) : (
                      <>
                        <CalendarDays className="w-4 h-4 mr-2" />
                        {editingAppointment ? "Confirm Reschedule" : "Confirm Appointment"}
                      </>
                    )}
                  </Button>
                )}
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Purchase Consultations
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a consultation package to continue booking appointments with your dietician.
            </p>

            {packages?.map((pkg) => (
              <div
                key={pkg.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                  selectedPackage?.id === pkg.id ? "border-primary ring-2 ring-primary/20" : ""
                }`}
                onClick={() => setSelectedPackage(pkg)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{pkg.name}</p>
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{(pkg.price / 100).toFixed(0)}</p>
                    {pkg.discount_percentage > 0 && (
                      <Badge variant="secondary" className="text-green-600">
                        {pkg.discount_percentage}% OFF
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Coupon code input */}
            {selectedPackage && (
              <div className="space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                      <Tag className="w-4 h-4" />
                      <span className="font-medium">{appliedCoupon.code}</span>
                      <span>— ₹{appliedCoupon.discount_applied} off</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-green-600 hover:text-green-800"
                      aria-label="Remove applied coupon"
                      title="Remove coupon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyCoupon(selectedPackage);
                        }
                      }}
                      className="h-9 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 shrink-0"
                      onClick={() => handleApplyCoupon(selectedPackage)}
                      disabled={!couponCode.trim() || couponLoading}
                    >
                      {couponLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {couponError && <p className="text-xs text-red-500">{couponError}</p>}
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => selectedPackage && handlePayment(selectedPackage)}
              disabled={!selectedPackage || isPaymentProcessing}
            >
              {isPaymentProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : selectedPackage && appliedCoupon ? (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ₹{Math.max(1, (selectedPackage.price / 100) - appliedCoupon.discount_applied).toFixed(0)}
                  <span className="ml-1 text-xs line-through opacity-70">₹{(selectedPackage.price / 100).toFixed(0)}</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ₹{selectedPackage ? (selectedPackage.price / 100).toFixed(0) : "0"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Cancel Appointment Alert Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Consultation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this consultation? This action cannot be undone, and your consultation credit will be refunded to your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (cancelAppointmentId) {
                  cancelAppointmentMutation.mutate(cancelAppointmentId);
                }
              }}
            >
              Yes, cancel it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientAppointments;
