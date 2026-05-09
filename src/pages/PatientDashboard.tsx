import { useState, useMemo } from "react";
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
  Plus,
  Ruler,
  Save,
  Scale,
  Settings,
  Stethoscope,
  Target,
  User,
  UserCheck,
  Users,
  UtensilsCrossed,
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
  getPatientDietPlans,
  getConsultations,
  updatePatient,
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
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
  const [bodyWeight, setBodyWeight] = useState<string>("");
  const [bodyAllergies, setBodyAllergies] = useState<string>("");
  const [bodyWorkoutFrequency, setBodyWorkoutFrequency] = useState<string>("");

  // Appointment booking state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week, etc.

  // Payment state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ConsultationPackage | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  // Get patient data using the profileId from auth context
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["patient", user?.profileId],
    queryFn: () => getPatient(user!.profileId!),
    enabled: !!user?.profileId,
  });

  // Update patient mutation for body details
  const updatePatientMutation = useMutation({
    mutationFn: (data: { age?: number; height?: number; weight?: number; allergies?: string; workout_frequency?: number }) =>
      updatePatient(user!.profileId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
      toast.success("Body details updated successfully!");
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
      start: startOfWeek.toISOString().split("T")[0],
      end: endOfWeek.toISOString().split("T")[0],
      startDate: startOfWeek,
      endDate: endOfWeek,
    };
  }, [weekOffset]);

  // Get available slots for booking
  const { data: availableSlots, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ["available-slots", patient?.assigned_rd_id, weekDateRange.start, weekDateRange.end],
    queryFn: () => getAvailableSlots(patient!.assigned_rd_id!, weekDateRange.start, weekDateRange.end),
    enabled: !!patient?.assigned_rd_id && isBookingModalOpen,
  });

  // Get consultation packages
  const { data: packages } = useQuery({
    queryKey: ["consultation-packages"],
    queryFn: getConsultationPackages,
    enabled: isPaymentModalOpen,
  });

  // Book appointment mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: (data: { scheduled_at: string; patient_notes?: string }) =>
      bookAppointment({
        patient_id: user!.profileId!,
        rd_id: patient!.assigned_rd_id!,
        scheduled_at: data.scheduled_at,
        patient_notes: data.patient_notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-consultations"] });
      queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
      toast.success("Appointment booked successfully!");
      setIsBookingModalOpen(false);
      setSelectedSlot(null);
      setAppointmentNotes("");
      refetchSlots();
    },
    onError: (error: Error) => {
      // Check if it's a payment required error
      if (error.message.includes("No consultations left") || error.message.includes("consultation package")) {
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
      queryClient.invalidateQueries({ queryKey: ["patient-consultations"] });
      queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
      toast.success("Appointment cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel appointment");
    },
  });

  // Group available slots by date
  const slotsByDate = useMemo(() => {
    if (!availableSlots) return {};
    return availableSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {} as Record<string, AvailableSlot[]>);
  }, [availableSlots]);

  // Handle booking confirmation
  const handleBookAppointment = () => {
    if (!selectedSlot) return;
    
    // Check if patient has consultations left
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

      const options = {
        key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || "rzp_test_demo",
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
            queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
            setIsPaymentModalOpen(false);
            setIsPaymentProcessing(false);
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
    setBodyWeight(patient?.weight?.toString() || "");
    setBodyAllergies(patient?.allergies || "");
    setBodyWorkoutFrequency(patient?.workout_frequency?.toString() || "");
    setIsEditingBody(true);
  };

  const handleSaveBodyDetails = () => {
    updatePatientMutation.mutate({
      age: bodyAge ? parseInt(bodyAge) : undefined,
      height: bodyHeight ? parseFloat(bodyHeight) : undefined,
      weight: bodyWeight ? parseFloat(bodyWeight) : undefined,
      allergies: bodyAllergies || undefined,
      workout_frequency: bodyWorkoutFrequency ? parseInt(bodyWorkoutFrequency) : undefined,
    });
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  // Get upcoming consultations
  const upcomingConsultations = (consultations || [])
    .filter((c) => c.status === "scheduled" && new Date(c.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // Check if patient has completed first consultation
  const hasCompletedConsultation = (consultations || []).some((c) => c.status === "completed");
  const hasScheduledAppointment = (consultations || []).some((c) => c.status === "scheduled");
  const hasPaid = (patient as any)?.payment_status === "paid" || (patient as any)?.consultations_left > 0 || dietPlans?.length > 0;
  
  // Progress steps for onboarding
  const progressSteps = [
    { id: 1, label: "Registration", completed: !!patient, icon: UserCheck },
    { id: 2, label: "Payment", completed: hasPaid, icon: CreditCard },
    { id: 3, label: "Appointment", completed: hasScheduledAppointment || hasCompletedConsultation, icon: CalendarDays },
    { id: 4, label: "Consultation", completed: hasCompletedConsultation, icon: UtensilsCrossed },
  ];
  const showProgressBar = !hasCompletedConsultation;

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

  const sidebarSections = [
    {
      title: "Dashboard",
      items: [
        { label: "Overview", href: "/patient", icon: User },
        { label: "My Profile", href: "/patient/profile", icon: Heart },
        { label: "Diet Plans", href: "/patient/diet-plans", icon: UtensilsCrossed },
        { label: "Appointments", href: "/patient/appointments", icon: CalendarDays },
      ],
    },
    {
      title: "Settings",
      items: [{ label: "Preferences", href: "/patient/settings", icon: Settings }],
    },
  ];

  const bottomContent = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
    >
      <LogOut className="w-[18px] h-[18px] shrink-0" />
      <span>Sign Out</span>
    </button>
  );

  const isLoading = patientLoading || plansLoading;

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle="Patient Portal"
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">My Dashboard</h1>
          {patient && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                    {getInitials(patient.name || "?")}
                  </div>
                  <span className="text-sm font-medium">{patient.name}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/patient/settings")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
                      {patient.diagnosis ? `Managing ${patient.diagnosis}` : "Your health journey dashboard"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  {upcomingConsultations.length > 0 ? (
                    <>
                      <div className="text-2xl font-bold">
                        {formatDate(upcomingConsultations[0].scheduled_at)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        at {formatTime(upcomingConsultations[0].scheduled_at)}
                      </p>
                    </>
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
                    Consultations Left
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {(patient as any)?.consultations_left ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Available sessions</p>
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
                      <Button size="sm" onClick={handleSaveBodyDetails} disabled={updatePatientMutation.isPending}>
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
                        onChange={(e) => setBodyAge(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        Height (cm)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 170"
                        value={bodyHeight}
                        onChange={(e) => setBodyHeight(e.target.value)}
                      />
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
                        onChange={(e) => setBodyWeight(e.target.value)}
                      />
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
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                        <Target className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                        <p className="text-xs text-muted-foreground">BMI</p>
                        {currentBMI ? (
                          <div>
                            <p className="text-xl font-bold">{currentBMI}</p>
                            <p className={`text-xs ${getBMICategory(currentBMI).color}`}>
                              {getBMICategory(currentBMI).label}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xl font-bold">—</p>
                        )}
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
                    
                    {/* Allergies */}
                    {patient.allergies && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider font-semibold">Allergies</p>
                        </div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">{patient.allergies}</p>
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

            {/* Diet Plan History */}
            {dietPlans && dietPlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Diet Plan History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dietPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() =>
                            setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)
                          }
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                Diet Plan - {formatDate(plan.issued_at || plan.created_at)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {plan.plan_json?.totals?.calories || 0} kcal daily
                                {plan.plan_json?.weight?.current && ` · Weight: ${plan.plan_json.weight.current}kg`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadDietPlanPDF(plan);
                              }}
                              className="h-8 px-2"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {plan.is_active && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                Active
                              </Badge>
                            )}
                            {expandedPlanId === plan.id ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Expanded view */}
                        {expandedPlanId === plan.id && plan.plan_json && (
                          <div className="border-t p-4 bg-muted/30">
                            <div className="grid gap-4">
                              {/* Weight Info */}
                              {plan.plan_json.weight && (plan.plan_json.weight.current || plan.plan_json.weight.target) && (
                                <div className="grid grid-cols-2 gap-3">
                                  {plan.plan_json.weight.current && (
                                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                      <Scale className="w-5 h-5 text-muted-foreground" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Weight at time</p>
                                        <p className="font-semibold">{plan.plan_json.weight.current} kg</p>
                                      </div>
                                    </div>
                                  )}
                                  {plan.plan_json.weight.target && (
                                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                      <Target className="w-5 h-5 text-muted-foreground" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Target Weight</p>
                                        <p className="font-semibold">{plan.plan_json.weight.target} kg</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Summary */}
                              <div className="grid grid-cols-4 gap-3">
                                {[
                                  { label: "Calories", value: plan.plan_json.totals?.calories || 0, unit: "kcal" },
                                  { label: "Protein", value: plan.plan_json.totals?.protein || 0, unit: "g" },
                                  { label: "Carbs", value: plan.plan_json.totals?.carbs || 0, unit: "g" },
                                  { label: "Fat", value: plan.plan_json.totals?.fat || 0, unit: "g" },
                                ].map((item) => (
                                  <div
                                    key={item.label}
                                    className="text-center p-3 bg-background rounded-lg"
                                  >
                                    <p className="text-xs text-muted-foreground">{item.label}</p>
                                    <p className="text-lg font-bold">
                                      {item.value}
                                      <span className="text-xs font-normal ml-0.5">{item.unit}</span>
                                    </p>
                                  </div>
                                ))}
                              </div>

                              {/* Meals */}
                              <div className="space-y-3">
                                {(plan.plan_json.meals || []).map((meal: any) => (
                                  <div key={meal.name} className="bg-background rounded-lg p-3">
                                    <p className="font-medium text-sm mb-2">{meal.name}</p>
                                    {meal.items && meal.items.length > 0 ? (
                                      <div className="space-y-1">
                                        {meal.items.map((item: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between text-sm text-muted-foreground"
                                          >
                                            <span>
                                              {item.name} ({item.quantity}{item.unit})
                                            </span>
                                            <span>{item.calories} kcal</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground italic">No items</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
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
                  {patient?.assigned_rd_id && (
                    <Button size="sm" onClick={() => setIsBookingModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule Appointment
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingConsultations.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingConsultations.map((consultation) => (
                      <div
                        key={consultation.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {consultation.type === "initial" || consultation.type === "first" 
                                ? "Initial Consultation" 
                                : "Follow-up Consultation"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(consultation.scheduled_at)} at {formatTime(consultation.scheduled_at)}
                            </p>
                            {consultation.dietician_name && (
                              <p className="text-xs text-muted-foreground">
                                with {consultation.dietician_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {consultation.status}
                          </Badge>
                          {consultation.status === "scheduled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to cancel this appointment?")) {
                                  cancelAppointmentMutation.mutate(consultation.id);
                                }
                              }}
                              disabled={cancelAppointmentMutation.isPending}
                            >
                              {cancelAppointmentMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">No upcoming appointments</p>
                    {patient?.assigned_rd_id ? (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setIsBookingModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Schedule Your First Appointment
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">
                        A dietician will be assigned to you soon.
                      </p>
                    )}
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
      </main>

      {/* Appointment Booking Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Schedule Appointment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
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
                disabled={weekOffset >= 4} // Limit to 4 weeks ahead
              >
                Next Week
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Dietician Info */}
            {patient?.assigned_dietician_name && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Appointment with</p>
                  <p className="font-semibold">{patient.assigned_dietician_name}</p>
                </div>
              </div>
            )}

            {/* Loading State */}
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
                              variant={selectedSlot?.datetime === slot.datetime ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedSlot(slot)}
                              className="min-w-[80px]"
                            >
                              {slot.start_time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected Slot & Notes */}
            {selectedSlot && (
              <div className="space-y-4 p-4 border rounded-lg bg-primary/5">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Selected Time</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedSlot.datetime).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" at "}
                      {selectedSlot.start_time}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Notes for your dietician (optional)
                  </label>
                  <Textarea
                    placeholder="Any specific concerns or topics you'd like to discuss..."
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleBookAppointment}
                  disabled={bookAppointmentMutation.isPending}
                >
                  {bookAppointmentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CalendarDays className="w-4 h-4 mr-2" />
                      Confirm Appointment
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-lg">
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
    </div>
  );
};

export default PatientDashboard;
