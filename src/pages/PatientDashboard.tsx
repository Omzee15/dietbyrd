import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  CreditCard,
  Download,
  Dumbbell,
  Edit3,
  FileText,
  Heart,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  Ruler,
  Save,
  Scale,
  Stethoscope,
  Star,
  Target,
  User,
  UserCheck,
  Users,
  UtensilsCrossed,
  Video,
  X,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppSidebar from "@/components/AppSidebar";
import { DashboardFooter } from "@/components/DashboardFooter";
import { CitySearchCombobox } from "@/components/CitySearchCombobox";
import {
  getPatient,
  getPatientDietPlans,
  getConsultations,
  getPatientMeAppointments,
  updatePatient,
  getAvailableSlots,
  getAllDieticianSlots,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getConsultationPackages,
  createPaymentOrder,
  verifyPayment,
  type DietPlan,
  type Consultation,
  type AvailableSlot,
  type ConsultationPackage,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatTime12, formatDateTime12, parseIST } from "@/lib/utils";
import { getPatientSidebarSections } from "@/lib/patient-sidebar";

// ─── Height Input Helpers ───────────────────────────────────────────────────────
const heightAllowedKeys = new Set([
  "Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End",
]);

const filterHeightKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (heightAllowedKeys.has(e.key)) return;
  if (/^[0-9'".]$/.test(e.key)) return;
  e.preventDefault();
};

const parseHeightToCm = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.includes("'")) {
    const parts = trimmed.replace(/"/g, "").split("'");
    const feet = parseFloat(parts[0]) || 0;
    const inches = parseFloat(parts[1] ?? "0") || 0;
    const cm = (feet * 12 + inches) * 2.54;
    return cm > 0 ? cm.toFixed(1) : "";
  }
  return trimmed;
};

const cmToFtIn = (cm: number): string => {
  if (!cm || cm <= 0) return "";
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return inches === 12 ? `${feet + 1}'0"` : `${feet}'${inches}"`;
};

const cmToFtDecimal = (cm: number): string => {
  if (!cm || cm <= 0) return "";
  return (cm / 30.48).toFixed(1);
};

const ftDecimalToCm = (ft: number): string => {
  if (!ft || ft <= 0) return "";
  return (ft * 30.48).toFixed(1);
};

const isIntegerString = (value: string): boolean => /^\d+$/.test(value);

const validateAgeValue = (value: string): string => {
  if (!value.trim()) return "";
  if (!isIntegerString(value)) return "Please enter an age between 1 and 100.";
  const age = Number(value);
  if (age < 1 || age > 100) return "Please enter an age between 1 and 100.";
  return "";
};

const validateHeightValue = (value: string, unit: "cm" | "ft"): string => {
  if (!value.trim()) return "";
  const height = Number(value);
  if (!Number.isFinite(height)) {
    return unit === "cm"
      ? "Please enter a height between 50 cm and 250 cm."
      : "Please enter a height between 1.5 ft and 8 ft.";
  }
  if (unit === "cm" && (height < 50 || height > 250)) {
    return "Please enter a height between 50 cm and 250 cm.";
  }
  if (unit === "ft" && (height < 1.5 || height > 8)) {
    return "Please enter a height between 1.5 ft and 8 ft.";
  }
  return "";
};

const validateWeightValue = (value: string): string => {
  if (!value.trim()) return "";
  const weight = Number(value);
  if (!Number.isFinite(weight) || weight < 10 || weight > 300) {
    return "Please enter a weight between 10 kg and 300 kg.";
  }
  return "";
};

// ─── BMI/TDEE Calculation Helpers ──────────────────────────────────────────────
const calculateBMI = (weight: number, heightCm: number): number | null => {
  if (!weight || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
};

const getBMICategory = (bmi: number): { label: string; color: string } => {
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (bmi < 25) return { label: "Normal", color: "text-green-500" };
  if (bmi < 30) return { label: "Overweight", color: "text-yellow-600" };
  return { label: "Obese", color: "text-red-500" };
};

// TDEE using Mifflin-St Jeor equation with activity level based on workout frequency
const calculateTDEE = (
  weight: number,
  heightCm: number,
  age: number | null,
  gender: string | null,
  workoutFrequency: number | null | undefined
): number | null => {
  if (!weight || !heightCm || !age) return null;
  
  // Mifflin-St Jeor BMR equation
  let bmr: number;
  if (gender === "male") {
    bmr = 10 * weight + 6.25 * heightCm - 5 * age + 5;
  } else {
    // For female and other, use female formula
    bmr = 10 * weight + 6.25 * heightCm - 5 * age - 161;
  }
  
  // Activity multiplier based on workout frequency
  let activityFactor: number;
  const freq = workoutFrequency ?? 0;
  if (freq === 0) {
    activityFactor = 1.2; // Sedentary
  } else if (freq <= 2) {
    activityFactor = 1.375; // Lightly active
  } else if (freq <= 4) {
    activityFactor = 1.55; // Moderately active
  } else if (freq <= 6) {
    activityFactor = 1.725; // Very active
  } else {
    activityFactor = 1.9; // Extra active (daily)
  }
  
  return Math.round(bmr * activityFactor);
};

// ─── Component ────────────────────────────────────────────────────────────────
const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);

  // Body details editing state
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [bodyAge, setBodyAge] = useState<string>("");
  const [bodyHeight, setBodyHeight] = useState<string>("");
  const [bodyHeightUnit, setBodyHeightUnit] = useState<"cm" | "ft">("cm");
  const [bodyWeight, setBodyWeight] = useState<string>("");
  const [bodyAllergies, setBodyAllergies] = useState<string>("");
  const [bodyWorkoutFrequency, setBodyWorkoutFrequency] = useState<string>("");
  const [bodyErrors, setBodyErrors] = useState<{ age?: string; height?: string; weight?: string }>({});

  // Profile completion state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAge, setProfileAge] = useState("");
  const [profileGender, setProfileGender] = useState("");
  const [profileDiagnosis, setProfileDiagnosis] = useState("");
  const [profileDiagnoses, setProfileDiagnoses] = useState<string[]>([]);
  const [profileHeight, setProfileHeight] = useState("");
  const [profileHeightUnit, setProfileHeightUnit] = useState<"cm" | "ft">("cm");
  const [profileWeight, setProfileWeight] = useState("");
  const [profileAllergies, setProfileAllergies] = useState("");
  const [profileWorkout, setProfileWorkout] = useState("");
  const [profileDietary, setProfileDietary] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileErrors, setProfileErrors] = useState<{ age?: string; height?: string; weight?: string }>({});

  // Appointment booking state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week, etc.

  // Cancellation state
  const [cancelAppointmentId, setCancelAppointmentId] = useState<number | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Payment state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ConsultationPackage | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const confirmAppointmentButtonRef = useRef<HTMLButtonElement>(null);

  // Get patient data using the profileId from auth context
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["patient", user?.profileId],
    queryFn: () => getPatient(user!.profileId!),
    enabled: !!user?.profileId,
  });

  const { data: appointments, isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ["patient-appointments", user?.id],
    queryFn: () => getPatientMeAppointments(),
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
  });

  // Update patient mutation for body details
  const updatePatientMutation = useMutation({
    mutationFn: (data: { age?: number; height?: number; weight?: number; allergies?: string; workout_frequency?: number }) =>
      updatePatient(user!.profileId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
      toast.success("Body details updated successfully!");
      setBodyErrors({});
      setIsEditingBody(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update body details");
    },
  });

  // Calculate week date range for available slots
  const weekDateRange = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + (weekOffset * 7));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      start: new Date(startOfWeek.getTime() - startOfWeek.getTimezoneOffset() * 60000).toISOString().split("T")[0],
      end: new Date(endOfWeek.getTime() - endOfWeek.getTimezoneOffset() * 60000).toISOString().split("T")[0],
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
  }, [isBookingModalOpen, selectedSlot]);

  // Get available slots — assigned RD's slots, or all dieticians if unassigned
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
    enabled: isPaymentModalOpen,
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
        rd_id: data.rd_id ?? patient?.assigned_rd_id ?? null,
        scheduled_at: data.scheduled_at,
        patient_notes: data.patient_notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-consultations"] });
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
      if (error.message.includes("No consultations left") || error.message.includes("consultation package")) {
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
      queryClient.invalidateQueries({ queryKey: ["patient-consultations"] });
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
    mutationFn: (data: { id: number; newScheduledAt: string; patientNotes?: string }) => 
      rescheduleAppointment(data.id, data.newScheduledAt, data.patientNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-consultations"] });
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
      toast.success("Appointment rescheduled successfully!");
      setIsBookingModalOpen(false);
      setReschedulingAppointmentId(null);
      setSelectedSlot(null);
      setAppointmentNotes("");
      refetchSlots();
      refetchAppointments();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reschedule appointment");
    },
  });

  // Group available slots by date
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

  // Handle booking confirmation
  const handleBookAppointment = () => {
    if (!selectedSlot) return;
    
    if (reschedulingAppointmentId) {
      rescheduleAppointmentMutation.mutate({
        id: reschedulingAppointmentId,
        newScheduledAt: selectedSlot.datetime,
        patientNotes: appointmentNotes || undefined,
      });
      return;
    }

    // Check if patient has consultations left
    const consultationsLeft = (patient as any)?.consultations_left ?? 0;
    if (consultationsLeft <= 0) {
      setIsBookingModalOpen(false);
      setIsPaymentModalOpen(true);
      return;
    }
    
    bookAppointmentMutation.mutate({
      scheduled_at: selectedSlot.datetime,
      patient_notes: appointmentNotes || undefined,
    });
  };

  // Load Razorpay script
  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
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

    try {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        toast.error("Failed to load payment gateway. Please try again.");
        setIsPaymentProcessing(false);
        return;
      }

      // Create order on backend
      const order = await createPaymentOrder({
        patient_id: user!.profileId!,
        package_id: pkg.id,
        amount: pkg.price,
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

            queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
            setIsPaymentModalOpen(false);
            setIsPaymentProcessing(false);

            // Automatically book the appointment if a slot was selected
            if (selectedSlot) {
              bookAppointmentMutation.mutate({
                scheduled_at: selectedSlot.datetime,
                patient_notes: appointmentNotes || undefined,
              });
            } else {
              toast.success(`Payment successful! ${pkg.num_consultations} consultation(s) added.`);
            }
          } catch (err: any) {
            toast.error(err.message || "Payment verification failed");
            setIsPaymentProcessing(false);
          }
        },
        prefill: {
          name: patient?.name || "",
          contact: patient?.phone || user?.phone || "",
        },
        theme: {
          color: "#14b8a6",
        },
        remember_customer: true,
        modal: {
          ondismiss: function () {
            setIsPaymentProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(response.error.description || "Payment failed");
        setIsPaymentProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment order");
      setIsPaymentProcessing(false);
    }
  };

  // Sync body details form with patient data
  const handleEditBodyDetails = () => {
    setBodyAge(patient?.age?.toString() || "");
    setBodyHeight(patient?.height?.toString() || "");
    setBodyHeightUnit("cm");
    setBodyWeight(patient?.weight?.toString() || "");
    setBodyAllergies(
      Array.isArray(patient?.allergies) 
        ? patient.allergies.join(", ") 
        : (patient?.allergies || "")
    );
    setBodyWorkoutFrequency(patient?.workout_frequency?.toString() || "");
    setBodyErrors({});
    setIsEditingBody(true);
  };

  const updateBodyAge = (value: string) => {
    const nextValue = value.replace(/\D/g, "");
    setBodyAge(nextValue);
    setBodyErrors((prev) => ({ ...prev, age: validateAgeValue(nextValue) }));
  };

  const updateBodyHeight = (value: string) => {
    const nextValue = value.replace(/[^0-9.]/g, "");
    setBodyHeight(nextValue);
    setBodyErrors((prev) => ({ ...prev, height: validateHeightValue(nextValue, bodyHeightUnit) }));
  };

  const updateBodyWeight = (value: string) => {
    const nextValue = value.replace(/[^0-9.]/g, "");
    setBodyWeight(nextValue);
    setBodyErrors((prev) => ({ ...prev, weight: validateWeightValue(nextValue) }));
  };

  const handleSaveBodyDetails = () => {
    const nextErrors = {
      age: validateAgeValue(bodyAge),
      height: validateHeightValue(bodyHeight, bodyHeightUnit),
      weight: validateWeightValue(bodyWeight),
    };
    setBodyErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const heightValue = bodyHeight ? parseFloat(bodyHeight) : NaN;
    const bodyHeightCm = Number.isFinite(heightValue)
      ? bodyHeightUnit === "ft"
        ? heightValue * 30.48
        : heightValue
      : undefined;
    const trimmedAllergies = bodyAllergies.trim();
    updatePatientMutation.mutate({
      age: bodyAge ? parseInt(bodyAge, 10) : undefined,
      height: bodyHeightCm && !isNaN(bodyHeightCm) ? bodyHeightCm : undefined,
      weight: bodyWeight ? parseFloat(bodyWeight) : undefined,
      allergies: trimmedAllergies ? trimmedAllergies : undefined,
      workout_frequency: bodyWorkoutFrequency ? parseInt(bodyWorkoutFrequency, 10) : undefined,
    });
  };

  const openProfileCompletion = () => {
    setProfileName(patient?.name || "");
    setProfileAge(patient?.age?.toString() || "");
    setProfileGender(patient?.gender || "");
    setProfileDiagnosis(patient?.diagnosis || "");
    setProfileDiagnoses(
      Array.isArray(patient?.diagnoses) && patient.diagnoses.length > 0
        ? patient.diagnoses
        : patient?.diagnosis ? [patient.diagnosis] : []
    );
    setProfileHeight(patient?.height?.toString() || "");
    setProfileHeightUnit("cm");
    setProfileWeight(patient?.weight?.toString() || "");
    setProfileAllergies(
      Array.isArray(patient?.allergies) ? patient.allergies.join(", ") : (patient?.allergies || "")
    );
    setProfileWorkout(patient?.workout_frequency?.toString() || "");
    setProfileDietary(patient?.dietary_preference || "");
    setProfileCity(patient?.city || "");
    setProfileErrors({});
    setIsProfileModalOpen(true);
  };

  const updateProfileAge = (value: string) => {
    const nextValue = value.replace(/\D/g, "");
    setProfileAge(nextValue);
    setProfileErrors((prev) => ({ ...prev, age: validateAgeValue(nextValue) }));
  };

  const updateProfileHeight = (value: string) => {
    const nextValue = value.replace(/[^0-9.]/g, "");
    setProfileHeight(nextValue);
    setProfileErrors((prev) => ({ ...prev, height: validateHeightValue(nextValue, profileHeightUnit) }));
  };

  const updateProfileWeight = (value: string) => {
    const nextValue = value.replace(/[^0-9.]/g, "");
    setProfileWeight(nextValue);
    setProfileErrors((prev) => ({ ...prev, weight: validateWeightValue(nextValue) }));
  };

  const handleSaveProfile = () => {
    const nextErrors = {
      age: validateAgeValue(profileAge),
      height: validateHeightValue(profileHeight, profileHeightUnit),
      weight: validateWeightValue(profileWeight),
    };
    setProfileErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const profileHeightCm = profileHeight
      ? parseFloat(profileHeightUnit === "ft" ? ftDecimalToCm(parseFloat(profileHeight)) : profileHeight)
      : undefined;
    const trimmedProfileAllergies = profileAllergies.trim();
    updatePatientMutation.mutate({
      name: profileName.trim() || undefined,
      age: profileAge ? parseInt(profileAge) : undefined,
      gender: profileGender as any || undefined,
      diagnosis: profileDiagnoses[0] || profileDiagnosis || undefined,
      diagnoses: profileDiagnoses.length > 0 ? profileDiagnoses : undefined,
      height: profileHeightCm && !isNaN(profileHeightCm) ? profileHeightCm : undefined,
      weight: profileWeight ? parseFloat(profileWeight) : undefined,
      allergies: trimmedProfileAllergies ? trimmedProfileAllergies : undefined,
      workout_frequency: profileWorkout ? parseInt(profileWorkout) : undefined,
      dietary_preference: profileDietary || undefined,
      city: profileCity || undefined,
    });
    setIsProfileModalOpen(false);
  };

  // Helper to get workout frequency label
  const getWorkoutLabel = (freq: number | null | undefined): string => {
    if (freq === null || freq === undefined) return "—";
    if (freq === 0) return "No workouts";
    if (freq === 1) return "1x per week";
    if (freq === 7) return "Daily";
    return `${freq}x per week`;
  };

  // Calculate BMI and TDEE dynamically
  const currentBMI = patient?.weight && patient?.height 
    ? calculateBMI(patient.weight, patient.height) 
    : null;
  const currentTDEE = patient?.weight && patient?.height && patient?.age
    ? calculateTDEE(patient.weight, patient.height, patient.age, patient.gender, patient.workout_frequency)
    : null;

  // Get patient diet plans
  const { data: dietPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["patient-diet-plans", user?.profileId],
    queryFn: () => getPatientDietPlans(user!.profileId!),
    enabled: !!user?.profileId,
  });

  // Get patient consultations
  const { data: consultations } = useQuery({
    queryKey: ["patient-consultations", user?.profileId],
    queryFn: () => getConsultations({ patient_id: user?.profileId }),
    enabled: !!user?.profileId,
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Auto-logout if patient data cannot be found for the current profileId (stale session)
  useEffect(() => {
    if (!patientLoading && user?.profileId && !patient) {
      toast.error("Session expired or invalid. Please log in again.");
      handleLogout();
    }
  }, [patientLoading, patient, user?.profileId]);

  const formatDate = (dateStr: string) => {
    const date = parseIST(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => formatDateTime12(dateStr);

  const formatAppointmentDate = (dateStr: string) =>
    parseIST(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

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

  const formatDieticianName = (name?: string | null) => {
    if (!name) return "";
    return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
  };

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  // Get upcoming consultations
  const upcomingConsultations = (consultations || [])
    .filter((c) => c.status === "scheduled" && parseIST(c.scheduled_at) > new Date())
    .sort((a, b) => parseIST(a.scheduled_at).getTime() - parseIST(b.scheduled_at).getTime());

  const upcomingAppointments = (appointments || [])
    .filter((a) =>
      (a.status === "confirmed" || a.status === "scheduled") && parseIST(a.scheduled_at) > new Date()
    )
    .sort((a, b) => parseIST(a.scheduled_at).getTime() - parseIST(b.scheduled_at).getTime());

  const nextAppointment = upcomingAppointments[0];

  // Check if patient has completed first consultation
  const hasCompletedConsultation = (consultations || []).some((c) => c.status === "completed") || (appointments || []).some((a) => a.status === "completed");
  const hasScheduledAppointment = (consultations || []).some((c) => c.status === "scheduled") || (appointments || []).some((a) => a.status === "scheduled" || a.status === "confirmed");
  const hasPaid = (patient as any)?.payment_status === "paid" || (patient as any)?.consultations_left > 0 || dietPlans?.length > 0;
  
  // Progress steps for onboarding
  const progressSteps = [
    { id: 1, label: "Registration", completed: !!patient, icon: UserCheck },
    { id: 2, label: "Payment", completed: hasPaid, icon: CreditCard },
    { id: 3, label: "Appointment", completed: hasScheduledAppointment || hasCompletedConsultation, icon: CalendarDays },
    { id: 4, label: "Consultation", completed: hasCompletedConsultation, icon: UtensilsCrossed },
  ];
  const showProgressBar = !hasCompletedConsultation;

  // Profile completion check — show banner if key health fields are missing
  const isProfileIncomplete = patient && (!patient.age || !patient.gender || !patient.height || !patient.weight);

  // Get the active diet plan
  const activeDietPlan = dietPlans?.find((plan) => plan.is_active);

  // Get weight tracking from most recent diet plan
  const latestWeight = activeDietPlan?.plan_json?.weight || dietPlans?.[0]?.plan_json?.weight;

  // PDF generation function
  const downloadDietPlanPDF = (plan: DietPlan) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    type PlanItem = {
      name?: string;
      nameHindi?: string;
      quantity?: number;
      unit?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    };

    type PlanMeal = {
      name?: string;
      items?: PlanItem[];
    };

    type PlanPrototype = {
      name?: string;
      meals?: PlanMeal[];
      totals?: { calories?: number; protein?: number; carbs?: number; fat?: number };
    };

    const planJson = (plan.plan_json ?? {}) as {
      meals?: PlanMeal[];
      totals?: { calories?: number; protein?: number; carbs?: number; fat?: number };
      weight?: { current?: number | null; target?: number | null };
      prototypes?: PlanPrototype[];
    };

    const calculateTotalsFromMeals = (meals: PlanMeal[]) =>
      meals.reduce(
        (acc, meal) => {
          (meal.items || []).forEach((item) => {
            acc.calories += item.calories || 0;
            acc.protein += item.protein || 0;
            acc.carbs += item.carbs || 0;
            acc.fat += item.fat || 0;
          });
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

    const prototypes = (Array.isArray(planJson.prototypes) && planJson.prototypes.length > 0
      ? planJson.prototypes
      : [
          {
            name: "Prototype 1",
            meals: planJson.meals || [],
            totals: planJson.totals,
          },
        ]) as PlanPrototype[];
    
    // Header
    doc.setFillColor(20, 184, 166); // Teal color
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Logo/Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('DietByRD', 15, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Your Personalized Diet Plan', 15, 32);
    
    // Plan date
    doc.setFontSize(9);
    doc.text(`Generated: ${formatDate(plan.issued_at || plan.created_at)}`, pageWidth - 15, 22, { align: 'right' });
    doc.text(`Plan ID: #${plan.id}`, pageWidth - 15, 32, { align: 'right' });
    
    // Patient info section
    let yPos = 55;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${patient?.name || 'N/A'}`, 15, yPos);
    doc.text(`Age: ${patient?.age || 'N/A'} years`, 100, yPos);
    yPos += 7;
    doc.text(`Diagnosis: ${patient?.diagnosis || 'General'}`, 15, yPos);
    doc.text(`Diet Type: ${patient?.dietary_preference || 'Not specified'}`, 100, yPos);
    
    // Weight info
    if (planJson.weight) {
      yPos += 7;
      if (planJson.weight.current) {
        doc.text(`Current Weight: ${planJson.weight.current} kg`, 15, yPos);
      }
      if (planJson.weight.target) {
        doc.text(`Target Weight: ${planJson.weight.target} kg`, 100, yPos);
      }
    }
    
    // Divider
    yPos += 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    
    prototypes.forEach((prototype, prototypeIndex) => {
      if (prototypeIndex > 0) {
        doc.addPage();
        yPos = 20;
      } else {
        yPos += 12;
      }

      const prototypeName = prototype.name || `Prototype ${prototypeIndex + 1}`;
      const prototypeMeals = prototype.meals || [];
      const prototypeTotals = prototype.totals || calculateTotalsFromMeals(prototypeMeals);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(prototypeName, 15, yPos);

      yPos += 10;
      doc.setFontSize(14);
      doc.text('Daily Nutrition Summary', 15, yPos);

      yPos += 10;
      const summaryData = [
        ['Calories', `${Math.round(prototypeTotals.calories || 0)} kcal`],
        ['Protein', `${(prototypeTotals.protein || 0).toFixed(1)} g`],
        ['Carbohydrates', `${(prototypeTotals.carbs || 0).toFixed(1)} g`],
        ['Fat', `${(prototypeTotals.fat || 0).toFixed(1)} g`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Nutrient', 'Daily Target']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [20, 184, 166], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable.finalY + 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Meal Plan', 15, yPos);

      prototypeMeals.forEach((meal) => {
        yPos += 12;

        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 184, 166);
        doc.text(meal.name || 'Meal', 15, yPos);

        const mealCalories = (meal.items || []).reduce((sum, item) => sum + (item.calories || 0), 0);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(10);
        doc.text(`${Math.round(mealCalories)} kcal`, pageWidth - 15, yPos, { align: 'right' });

        if ((meal.items || []).length > 0) {
          yPos += 5;
          const mealData = (meal.items || []).map((item) => [
            (item.name || 'Food item') + (item.nameHindi ? ` (${item.nameHindi})` : ''),
            `${item.quantity || ''} ${item.unit || 'g'}`,
            `${Math.round(item.calories || 0)}`,
            `${(item.protein || 0).toFixed(1)}`,
            `${(item.carbs || 0).toFixed(1)}`,
            `${(item.fat || 0).toFixed(1)}`,
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Food Item', 'Quantity', 'Cal', 'P(g)', 'C(g)', 'F(g)']],
            body: mealData,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [60, 60, 60], fontSize: 8 },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
              0: { cellWidth: 60 },
              1: { cellWidth: 30, halign: 'center' },
              2: { cellWidth: 20, halign: 'center' },
              3: { cellWidth: 20, halign: 'center' },
              4: { cellWidth: 20, halign: 'center' },
              5: { cellWidth: 20, halign: 'center' },
            },
            margin: { left: 15, right: 15 },
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          yPos = (doc as any).lastAutoTable.finalY + 5;
        } else {
          yPos += 8;
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'italic');
          doc.text('No items added', 20, yPos);
          doc.setFont('helvetica', 'normal');
        }
      });
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | DietByRD - Your Health, Our Priority`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save PDF
    const fileName = `DietPlan_${patient?.name?.replace(/\s+/g, '_') || 'Patient'}_${formatDate(plan.issued_at || plan.created_at).replace(/,\s*/g, '_').replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  };

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

  const isLoading = patientLoading || plansLoading || appointmentsLoading;
  const hasBodyErrors = Object.values(bodyErrors).some(Boolean);

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle={patient?.name || "Patient Portal"}
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">My Dashboard</h1>
          {patient && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                    {getInitials(patient.name || "?")}
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-medium">{patient.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatPhoneDisplay(patient.phone || patient.user_phone || user?.phone) || patient.email || ""}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading your dashboard...</span>
          </div>
        )}

        {/* Content */}
        {!isLoading && patient && (
          <div className="p-6 space-y-6">
            {/* Welcome Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {getInitials(patient.name || "?")}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Welcome, {patient.name?.split(" ")[0] || "Patient"}!</h2>
                    <p className="text-muted-foreground">
                      {(() => {
                        const all = Array.isArray(patient.diagnoses) && patient.diagnoses.length > 0
                          ? patient.diagnoses
                          : patient.diagnosis ? [patient.diagnosis] : [];
                        const visible = all.filter(d => d && d !== "other");
                        return visible.length > 0 ? `Managing ${visible.join(", ")}` : "Your health journey dashboard";
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Completion Banner */}
            {isProfileIncomplete && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-200">Complete your health profile</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                          Help your dietitian give you the best advice by sharing your age, weight, height, and other details.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={openProfileCompletion}
                    >
                      Complete Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!hasScheduledAppointment && (
              <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Book your next appointment</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Schedule a session with your dietitian and stay on track with your health goals.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={() => { setWeekOffset(0); setSelectedSlot(null); setAppointmentNotes(""); setIsBookingModalOpen(true); }}
                    >
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Bar - Only shown until first consultation is completed */}
            {showProgressBar && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Your Journey Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted mx-8" />
                    <div 
                      className="absolute top-5 left-0 h-0.5 bg-primary mx-8 transition-all duration-500"
                      style={{ 
                        width: `calc(${(progressSteps.filter(s => s.completed).length - 1) / (progressSteps.length - 1) * 100}% - 4rem)` 
                      }}
                    />
                    
                    {/* Steps */}
                    <div className="relative flex justify-between">
                      {progressSteps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.id} className="flex flex-col items-center gap-2">
                            <div 
                              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                step.completed 
                                  ? "bg-primary border-primary text-primary-foreground" 
                                  : index === progressSteps.findIndex(s => !s.completed)
                                    ? "bg-background border-primary text-primary"
                                    : "bg-background border-muted text-muted-foreground"
                              }`}
                            >
                              {step.completed ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <Icon className="w-5 h-5" />
                              )}
                            </div>
                            <span className={`text-xs font-medium text-center ${
                              step.completed ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Current Step Message */}
                  <div className="mt-4 pt-4 border-t">
                    {!hasPaid && (
                      <p className="text-sm text-muted-foreground text-center">
                        <span className="font-medium text-primary">Next step:</span> Complete your payment to book a consultation
                      </p>
                    )}
                    {hasPaid && !hasScheduledAppointment && !hasCompletedConsultation && (
                      <p className="text-sm text-muted-foreground text-center">
                        <span className="font-medium text-primary">Next step:</span> Schedule your appointment with a dietician
                      </p>
                    )}
                    {hasScheduledAppointment && !hasCompletedConsultation && (
                      <p className="text-sm text-muted-foreground text-center">
                        <span className="font-medium text-primary">Almost there!</span> Attend your scheduled consultation
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Care Team Card */}
            {(patient.referring_doctor_name || patient.assigned_dietician_name) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Your Care Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Referring Doctor */}
                    {patient.referring_doctor_name && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Referred By</p>
                          <p className="font-semibold">Dr. {patient.referring_doctor_name}</p>
                          {patient.referring_doctor_qualification && (
                            <p className="text-sm text-muted-foreground">{patient.referring_doctor_qualification}</p>
                          )}
                          {patient.referring_doctor_clinic && (
                            <p className="text-sm text-muted-foreground">{patient.referring_doctor_clinic}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Assigned Dietician */}
                    {patient.assigned_dietician_name && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <UtensilsCrossed className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Dietician</p>
                          <p className="font-semibold">{patient.assigned_dietician_name}</p>
                          {patient.assigned_dietician_qualification && (
                            <p className="text-sm text-muted-foreground">{patient.assigned_dietician_qualification}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Weight Tracking */}
              {latestWeight && (latestWeight.current || latestWeight.target) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Scale className="w-4 h-4" />
                      Weight Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      {latestWeight.current && (
                        <span className="text-2xl font-bold">{latestWeight.current} kg</span>
                      )}
                      {latestWeight.target && (
                        <span className="text-sm text-muted-foreground">
                          → {latestWeight.target} kg target
                        </span>
                      )}
                    </div>
                    {latestWeight.current && latestWeight.target && (
                      <p className="text-sm mt-1">
                        {latestWeight.current > latestWeight.target ? (
                          <span className="text-orange-600">
                            {(latestWeight.current - latestWeight.target).toFixed(1)} kg to lose
                          </span>
                        ) : latestWeight.current < latestWeight.target ? (
                          <span className="text-green-600">
                            {(latestWeight.target - latestWeight.current).toFixed(1)} kg to gain
                          </span>
                        ) : (
                          <span className="text-blue-600">At target weight!</span>
                        )}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Active Diet Plan */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4" />
                    Diet Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeDietPlan ? (
                    <>
                      <div className="text-2xl font-bold">
                        {activeDietPlan.plan_json?.totals?.calories || 0} kcal
                      </div>
                      <p className="text-sm text-muted-foreground">Daily target</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active diet plan</p>
                  )}
                </CardContent>
              </Card>

              {/* Next Appointment */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Next Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nextAppointment ? (
                    <div className="space-y-1.5">
                      <div className="text-2xl font-bold">
                        {formatAppointmentDate(nextAppointment.scheduled_at)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        at {formatTime(nextAppointment.scheduled_at)}
                      </p>
                      {nextAppointment.dietician_name ? (
                        <p className="text-sm text-muted-foreground">
                          with {formatDieticianName(nextAppointment.dietician_name)}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600">Dietician will be assigned to you soon</p>
                      )}
                      <Badge className="mt-2 bg-teal-50 text-teal-700 border border-teal-200">
                        Confirmed
                      </Badge>
                      {(nextAppointment as any).meeting_link && (
                        <div className="pt-2">
                          <Button
                            size="sm"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center gap-2"
                            onClick={() => window.open((nextAppointment as any).meeting_link, "_blank")}
                          >
                            <Video className="w-4 h-4" />
                            Join Meeting
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                  )}
                </CardContent>
              </Card>

              {/* Consultations Left */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Total Sessions Left
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-primary">
                      {((patient as any)?.consultations_left ?? 0) + upcomingAppointments.length}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(patient as any)?.consultations_left ?? 0} available to book
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Body Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    My Body Details
                  </span>
                  {!isEditingBody ? (
                    <Button variant="outline" size="sm" onClick={handleEditBodyDetails}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditingBody(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveBodyDetails} disabled={updatePatientMutation.isPending || hasBodyErrors}>
                        {updatePatientMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingBody ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Age (years)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 30"
                        value={bodyAge}
                        min={1}
                        max={100}
                        step={1}
                        onChange={(e) => updateBodyAge(e.target.value)}
                        onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                        onBlur={() =>
                          setBodyErrors((prev) => ({
                            ...prev,
                            age: validateAgeValue(bodyAge),
                          }))
                        }
                      />
                      {bodyErrors.age && (
                        <p className="text-[13px] text-[#C53030] mt-1">{bodyErrors.age}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        Height
                        <div className="ml-auto flex text-xs border rounded-md overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              if (bodyHeightUnit === "ft") {
                                const num = parseFloat(bodyHeight);
                                const cmValue = Number.isFinite(num) ? ftDecimalToCm(num) : "";
                                setBodyHeight(cmValue);
                                setBodyHeightUnit("cm");
                                setBodyErrors((prev) => ({
                                  ...prev,
                                  height: validateHeightValue(cmValue, "cm"),
                                }));
                              }
                            }}
                            className={`px-2 py-0.5 transition-colors ${bodyHeightUnit === "cm" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                          >cm</button>
                          <button
                            type="button"
                            onClick={() => {
                              if (bodyHeightUnit === "cm") {
                                const num = parseFloat(bodyHeight);
                                const ftValue = Number.isFinite(num) ? cmToFtDecimal(num) : "";
                                setBodyHeight(ftValue);
                                setBodyHeightUnit("ft");
                                setBodyErrors((prev) => ({
                                  ...prev,
                                  height: validateHeightValue(ftValue, "ft"),
                                }));
                              }
                            }}
                            className={`px-2 py-0.5 transition-colors ${bodyHeightUnit === "ft" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                          >ft</button>
                        </div>
                      </label>
                      <Input
                        type="number"
                        placeholder={bodyHeightUnit === "cm" ? "e.g. 170" : "e.g. 5.5"}
                        value={bodyHeight}
                        onChange={(e) => {
                          updateBodyHeight(e.target.value);
                        }}
                        min={bodyHeightUnit === "cm" ? 50 : 1.5}
                        max={bodyHeightUnit === "cm" ? 250 : 8}
                        step={0.1}
                        onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                        onBlur={() =>
                          setBodyErrors((prev) => ({
                            ...prev,
                            height: validateHeightValue(bodyHeight, bodyHeightUnit),
                          }))
                        }
                      />
                      {bodyHeight && !bodyErrors.height && (
                        <p className="text-[13px] text-muted-foreground mt-1">
                          {bodyHeightUnit === "cm" ? `≈ ${cmToFtIn(Number(bodyHeight))}` : `≈ ${ftDecimalToCm(Number(bodyHeight))} cm`}
                        </p>
                      )}
                      {bodyErrors.height && (
                        <p className="text-[13px] text-[#C53030] mt-1">{bodyErrors.height}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Scale className="w-4 h-4 text-muted-foreground" />
                        Weight (kg)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 70"
                        value={bodyWeight}
                        min={10}
                        max={300}
                        step={0.1}
                        onChange={(e) => updateBodyWeight(e.target.value)}
                        onKeyDown={(e) => ["e", "E", "+", "-"] .includes(e.key) && e.preventDefault()}
                        onBlur={() =>
                          setBodyErrors((prev) => ({
                            ...prev,
                            weight: validateWeightValue(bodyWeight),
                          }))
                        }
                      />
                      {bodyErrors.weight && (
                        <p className="text-[13px] text-[#C53030] mt-1">{bodyErrors.weight}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                        Allergies
                      </label>
                      <Textarea
                        placeholder="e.g. Peanuts, Shellfish, Gluten..."
                        value={bodyAllergies}
                        onChange={(e) => setBodyAllergies(e.target.value)}
                        maxLength={500}
                        rows={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-muted-foreground" />
                        Workout Frequency
                      </label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={bodyWorkoutFrequency}
                        onChange={(e) => setBodyWorkoutFrequency(e.target.value)}
                      >
                        <option value="">Select frequency</option>
                        <option value="0">No workouts</option>
                        <option value="1">1x per week</option>
                        <option value="2">2x per week</option>
                        <option value="3">3x per week</option>
                        <option value="4">4x per week</option>
                        <option value="5">5x per week</option>
                        <option value="6">6x per week</option>
                        <option value="7">Daily (7x per week)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Body Measurements Row */}
                    {/* Body Measurements Row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <User className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Age</p>
                        <p className="text-xl font-bold">
                          {patient.age ? `${patient.age} yrs` : "—"}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Ruler className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Height</p>
                        <p className="text-xl font-bold">
                          {patient.height ? `${patient.height} cm` : "—"}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Scale className="w-5 h-5 mx-auto mb-2 text-primary" />
                        <p className="text-xs text-muted-foreground">Weight</p>
                        <p className="text-xl font-bold">
                          {patient.weight ? `${patient.weight} kg` : "—"}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Activity className="w-5 h-5 mx-auto mb-2 text-green-500" />
                        <p className="text-xs text-muted-foreground">Est. TDEE</p>
                        {currentTDEE ? (
                          <p className="text-xl font-bold">
                            {currentTDEE}
                            <span className="text-xs font-normal ml-0.5">kcal</span>
                          </p>
                        ) : (
                          <p className="text-xl font-bold">—</p>
                        )}
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Dumbbell className="w-5 h-5 mx-auto mb-2 text-orange-500" />
                        <p className="text-xs text-muted-foreground">Workout</p>
                        <p className="text-xl font-bold">
                          {getWorkoutLabel(patient.workout_frequency)}
                        </p>
                      </div>
                    </div>

                    {/* BMI Progress Bar */}
                    {currentBMI && (
                      <div className="mt-4 border rounded-xl p-5 bg-card shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                              <Target className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground leading-none mb-1">Body Mass Index</p>
                              <p className="text-2xl font-bold leading-none">{currentBMI}</p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            currentBMI < 18.5 ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' :
                            currentBMI < 25 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                            currentBMI < 30 ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800' :
                            'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                          }`}>
                            {getBMICategory(currentBMI).label}
                          </div>
                        </div>
                        
                        <div className="relative pt-2 pb-5">
                          {/* The Bar */}
                          <div className="flex h-3 w-full rounded-full overflow-hidden opacity-90">
                            <div className="bg-blue-400 dark:bg-blue-500" style={{ width: '28.3%' }} title="Underweight (< 18.5)"></div>
                            <div className="bg-green-400 dark:bg-green-500" style={{ width: '21.6%' }} title="Normal (18.5 - 24.9)"></div>
                            <div className="bg-yellow-400 dark:bg-yellow-500" style={{ width: '16.6%' }} title="Overweight (25 - 29.9)"></div>
                            <div className="bg-red-400 dark:bg-red-500" style={{ width: '33.5%' }} title="Obese (≥ 30)"></div>
                          </div>
                          
                          {/* The Marker */}
                          <div 
                            className="absolute top-0 w-4 h-7 -ml-2 flex flex-col items-center justify-center transition-all duration-500"
                            style={{ left: `${Math.min(100, Math.max(0, ((currentBMI - 10) / 30) * 100))}%` }}
                          >
                            <div className="w-1 h-3 bg-zinc-800 dark:bg-white rounded-t-sm shadow-sm"></div>
                            <div className="w-3 h-3 bg-zinc-800 dark:bg-white rotate-45 transform -mt-1 rounded-sm shadow-sm"></div>
                          </div>
                          
                          {/* Labels */}
                          <div className="absolute w-full flex justify-between text-[10px] text-muted-foreground mt-2 px-1 font-medium">
                            <span>10</span>
                            <span className="absolute" style={{ left: '28.3%', transform: 'translateX(-50%)' }}>18.5</span>
                            <span className="absolute" style={{ left: '49.9%', transform: 'translateX(-50%)' }}>25</span>
                            <span className="absolute" style={{ left: '66.5%', transform: 'translateX(-50%)' }}>30</span>
                            <span>40</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Allergies */}
                    {patient.allergies && (
                      <div className="mt-4 p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                        <div className="mt-0.5 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Dietary Allergies & Restrictions</p>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(patient.allergies) ? patient.allergies.map((a: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-xs font-semibold">{a}</span>
                            )) : patient.allergies.split(',').map((a: string, i: number) => (
                              a.trim() && <span key={i} className="px-2.5 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-xs font-semibold">{a.trim()}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Prompt to add details if missing */}
                    {!patient.height && !patient.weight && (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">Add your body details to see BMI and TDEE calculations</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={handleEditBodyDetails}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Add Details
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Diet Plan */}
            {activeDietPlan && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5" />
                      Your Current Diet Plan
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDietPlanPDF(activeDietPlan)}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                        Active
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Nutrition Summary */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      {
                        label: "Calories",
                        value: activeDietPlan.plan_json?.totals?.calories || 0,
                        unit: "kcal",
                        color: "bg-orange-500",
                      },
                      {
                        label: "Protein",
                        value: activeDietPlan.plan_json?.totals?.protein || 0,
                        unit: "g",
                        color: "bg-blue-500",
                      },
                      {
                        label: "Carbs",
                        value: activeDietPlan.plan_json?.totals?.carbs || 0,
                        unit: "g",
                        color: "bg-green-500",
                      },
                      {
                        label: "Fat",
                        value: activeDietPlan.plan_json?.totals?.fat || 0,
                        unit: "g",
                        color: "bg-yellow-500",
                      },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className={`w-3 h-3 ${item.color} rounded-full mx-auto mb-2`} />
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-xl font-bold">
                          {item.value}
                          <span className="text-xs font-normal ml-0.5">{item.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Meals */}
                  <div className="space-y-4">
                    {(activeDietPlan.plan_json?.meals || []).map((meal: any) => (
                      <div key={meal.name} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{meal.name}</h4>
                          <span className="text-sm text-muted-foreground">
                            {meal.items?.reduce((sum: number, item: any) => sum + (item.calories || 0), 0)} kcal
                          </span>
                        </div>
                        {meal.items && meal.items.length > 0 ? (
                          <div className="space-y-2">
                            {meal.items.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-sm py-2 border-t first:border-t-0"
                              >
                                <div>
                                  <span className="font-medium">{item.name}</span>
                                  {item.nameHindi && (
                                    <span className="text-muted-foreground ml-2">({item.nameHindi})</span>
                                  )}
                                  <span className="text-muted-foreground ml-2">
                                    {item.quantity}{item.unit}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>{item.calories} kcal</span>
                                  <span className="text-blue-600">P: {item.protein}g</span>
                                  <span className="text-green-600">C: {item.carbs}g</span>
                                  <span className="text-yellow-600">F: {item.fat}g</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No items</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appointments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Appointments
                  </span>
                  <Button size="sm" onClick={() => setIsBookingModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Appointment
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {appointment.consultation_type === "initial" || appointment.consultation_type === "first"
                                ? "Initial Consultation" 
                                : "Follow-up Consultation"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(appointment.scheduled_at)} at {formatTime(appointment.scheduled_at)}
                            </p>
                            {appointment.dietician_name ? (
                              <p className="text-xs text-muted-foreground">
                                with {formatDieticianName(appointment.dietician_name)}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-600">
                                Dietician will be assigned to you soon
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {appointment.status === "scheduled" && appointment.meeting_link && (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => window.open(appointment.meeting_link, "_blank")}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Join
                            </Button>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {appointment.status}
                          </Badge>
                          {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                            <>
                              {(() => {
                                const diffHours = (parseIST(appointment.scheduled_at).getTime() - new Date().getTime()) / (1000 * 60 * 60);
                                if (true) {
                                  const daysLeft = Math.floor(diffHours / 24);
                                  const hoursRemaining = Math.floor(diffHours % 24);
                                  let timeLeftStr = "";
                                  if (daysLeft > 0) {
                                    timeLeftStr = `${daysLeft}d ${hoursRemaining}h left`;
                                  } else {
                                    timeLeftStr = `${hoursRemaining}h left`;
                                  }
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-primary hover:text-primary hover:bg-primary/5 mr-2"
                                      onClick={() => {
                                        setReschedulingAppointmentId(appointment.id);
                                        setIsBookingModalOpen(true);
                                      }}
                                    >
                                      Reschedule ({timeLeftStr})
                                    </Button>
                                  );
                                }
                                return null;
                              })()}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">No upcoming appointments</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsBookingModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* No diet plans message */}
            {(!dietPlans || dietPlans.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">No diet plans yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your dietician will create a personalized diet plan for you soon.
                  </p>
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
              <p className="text-sm text-muted-foreground mt-1">
                Please contact support if this issue persists.
              </p>
              <Button variant="outline" className="mt-4" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        )}
        <DashboardFooter />
      </main>

      {/* Profile Completion Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Complete Your Health Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This helps your dietitian create a truly personalised plan for you.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input value={profileName} onChange={e => setProfileName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ""))} placeholder="Your name" className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Age</label>
                  <Input
                    type="number"
                    value={profileAge}
                    onChange={e => updateProfileAge(e.target.value)}
                    onBlur={() => setProfileErrors(prev => ({ ...prev, age: validateAgeValue(profileAge) }))}
                    placeholder="Years"
                    min={1}
                    max={80}
                    step={1}
                    className="mt-1"
                    onKeyDown={(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()}
                  />
                  {profileErrors.age && <p className="text-[13px] text-[#C53030] mt-1">{profileErrors.age}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Gender</label>
                  <select
                    value={profileGender}
                    onChange={e => setProfileGender(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Health Conditions</label>
                <div className="mt-1 space-y-2">
                  {profileDiagnoses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {profileDiagnoses.map((d) => (
                        <span key={d} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                          {d}
                          <button type="button" onClick={() => setProfileDiagnoses(prev => prev.filter(x => x !== d))} className="ml-0.5 hover:text-destructive">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <select
                    value=""
                    onChange={e => {
                      const val = e.target.value;
                      if (val && !profileDiagnoses.includes(val)) setProfileDiagnoses(prev => [...prev, val]);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">+ Add condition</option>
                    {["Diabetes","PCOS","Thyroid","Hypertension","Obesity","CKD (Kidney Disease)","Liver Disease","Heart Disease","Cancer","IBS / Gut Issues","Other"].filter(o => !profileDiagnoses.includes(o)).map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    Height
                    <div className="ml-auto flex text-xs border rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          if (profileHeightUnit === "ft") {
                            const num = parseFloat(profileHeight);
                            const cmValue = Number.isFinite(num) ? ftDecimalToCm(num) : "";
                            setProfileHeight(cmValue);
                            setProfileHeightUnit("cm");
                            setProfileErrors(prev => ({ ...prev, height: validateHeightValue(cmValue, "cm") }));
                          }
                        }}
                        className={`px-2 py-0.5 transition-colors ${profileHeightUnit === "cm" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      >cm</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (profileHeightUnit === "cm") {
                            const num = parseFloat(profileHeight);
                            const ftValue = Number.isFinite(num) ? cmToFtDecimal(num) : "";
                            setProfileHeight(ftValue);
                            setProfileHeightUnit("ft");
                            setProfileErrors(prev => ({ ...prev, height: validateHeightValue(ftValue, "ft") }));
                          }
                        }}
                        className={`px-2 py-0.5 transition-colors ${profileHeightUnit === "ft" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      >ft</button>
                    </div>
                  </label>
                  <Input
                    type="number"
                    value={profileHeight}
                    onChange={e => updateProfileHeight(e.target.value)}
                    onBlur={() => setProfileErrors(prev => ({ ...prev, height: validateHeightValue(profileHeight, profileHeightUnit) }))}
                    min={profileHeightUnit === "cm" ? 50 : 1.5}
                    max={profileHeightUnit === "cm" ? 250 : 8}
                    step={0.1}
                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                    placeholder={profileHeightUnit === "cm" ? "e.g. 170" : "e.g. 5.5"}
                    className="mt-1"
                  />
                  {profileErrors.height && <p className="text-[13px] text-[#C53030] mt-1">{profileErrors.height}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Weight (kg)</label>
                  <Input
                    type="number"
                    value={profileWeight}
                    onChange={e => updateProfileWeight(e.target.value)}
                    onBlur={() => setProfileErrors(prev => ({ ...prev, weight: validateWeightValue(profileWeight) }))}
                    placeholder="70"
                    min={10}
                    max={300}
                    step={0.1}
                    className="mt-1"
                    onKeyDown={(e) => ['e','E','+','-'].includes(e.key) && e.preventDefault()}
                  />
                  {profileErrors.weight && <p className="text-[13px] text-[#C53030] mt-1">{profileErrors.weight}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Workouts/week</label>
                  <Input type="number" value={profileWorkout} onChange={e => setProfileWorkout(e.target.value)} placeholder="0–7" min="0" max="7" className="mt-1" onKeyDown={(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Allergies (optional)</label>
                <Input value={profileAllergies} onChange={e => setProfileAllergies(e.target.value)} maxLength={500} placeholder="e.g., Nuts, Dairy (comma-separated)" className="mt-1" />
              </div>

              <div>
                <label className="text-sm font-medium">Dietary Preference (optional)</label>
                <Input value={profileDietary} onChange={e => setProfileDietary(e.target.value)} placeholder="e.g., Vegetarian, Vegan" className="mt-1" />
              </div>

              <div>
                <label className="text-sm font-medium">City</label>
                <div className="mt-1">
                  <CitySearchCombobox value={profileCity} onChange={setProfileCity} />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSaveProfile} disabled={updatePatientMutation.isPending || Object.values(profileErrors).some(Boolean)}>
              {updatePatientMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Profile</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Booking Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={(open) => { setIsBookingModalOpen(open); if (!open) { setSelectedSlot(null); setReschedulingAppointmentId(null); } }}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {reschedulingAppointmentId ? "Reschedule Appointment" : selectedSlot ? "Confirm Appointment" : "Schedule Appointment"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* View 1: Slot Selection */}
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
                    {weekDateRange.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" - "}
                    {weekDateRange.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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

                {/* Dietician info or auto-assign notice */}
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
                              {dateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
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

            {/* View 2: Confirmation */}
            {selectedSlot && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBookAppointment();
                }}
              >
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

                {/* Appointment Summary */}
                <div className="border rounded-xl p-5 space-y-4 bg-gradient-to-br from-primary/5 to-primary/10">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {new Date(selectedSlot.datetime).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
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

                <Button
                  type="submit"
                  ref={confirmAppointmentButtonRef}
                  className="w-full h-12 text-base"
                  disabled={reschedulingAppointmentId ? rescheduleAppointmentMutation.isPending : bookAppointmentMutation.isPending}
                >
                  {(reschedulingAppointmentId ? rescheduleAppointmentMutation.isPending : bookAppointmentMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {reschedulingAppointmentId ? "Rescheduling..." : "Booking..."}
                    </>
                  ) : (
                    <>
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {reschedulingAppointmentId ? "Confirm Reschedule" : "Confirm Appointment"}
                    </>
                  )}
                </Button>
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
                onClick={() => handlePayment(pkg)}
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
              ) : (
                <>
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

export default PatientDashboard;
