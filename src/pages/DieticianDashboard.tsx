import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import { AlertTriangle, CalendarDays, Minus, Plus, RefreshCw, Search, Settings, Trash2, Users, UtensilsCrossed, Loader2, LogOut, ChevronDown, X, Download, Apple, SquarePen, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import AppSidebar from "@/components/AppSidebar";
import { getDietician, getDieticianPatients, getConsultations, getReferrals, getUnassignedAppointments, triggerAutoAssign, type Patient, type Dietician, type Consultation, type Referral, type AutoAssignResult } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { foodService } from "@/lib/food-service";
import type { Food as FoodLibraryItem } from "@/lib/diet-types";
import { getRDA } from "@/lib/diet-utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FoodLibraryAddDialog } from "@/components/diet";
import DieticianCalendarSchedule from "@/components/dietician/DieticianCalendarSchedule";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FoodItem {
  name: string;
  nameHindi?: string;
  caloriesPer100: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  iron?: number;
  calcium?: number;
  magnesium?: number;
  zinc?: number;
  potassium?: number;
  sodium?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  vitamin_d?: number;
  vitamin_e?: number;
  vitamin_k?: number;
  vitamin_b1?: number;
  vitamin_b2?: number;
  vitamin_b3?: number;
  vitamin_b6?: number;
  vitamin_b9?: number;
  vitamin_b12?: number;
  treat?: boolean;
}

interface MealItem extends FoodItem {
  id: string;
  quantity: number;
  unit: string;
  calories: number;
}

interface MealSlot {
  name: string;
  items: MealItem[];
}

type TabType = "patients" | "schedule" | "diet";
type ScheduleFilter = "today" | "tomorrow" | "this_week" | "all";

// ─── Food Database (local for now) ────────────────────────────────────────────
const foodDatabase: FoodItem[] = [
  { name: "Brown Rice", nameHindi: "भूरे चावल", caloriesPer100: 111, protein: 2.6, carbs: 23, fat: 0.9 },
  { name: "Chicken Breast", nameHindi: "चिकन ब्रेस्ट", caloriesPer100: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Egg (Whole)", nameHindi: "अंडा", caloriesPer100: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: "Oats", nameHindi: "जई", caloriesPer100: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { name: "Banana", nameHindi: "केला", caloriesPer100: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: "Paneer (Cottage Cheese)", nameHindi: "पनीर", caloriesPer100: 265, protein: 18, carbs: 1.2, fat: 21 },
  { name: "Moong Dal", nameHindi: "मूंग दाल", caloriesPer100: 105, protein: 7.5, carbs: 18, fat: 0.4 },
  { name: "Roti (Wheat)", nameHindi: "रोटी", caloriesPer100: 264, protein: 8.7, carbs: 50, fat: 3.7 },
  { name: "Greek Yogurt", nameHindi: "ग्रीक दही", caloriesPer100: 59, protein: 10, carbs: 3.6, fat: 0.7 },
  { name: "Almonds", nameHindi: "बादाम", caloriesPer100: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Gulab Jamun", nameHindi: "गुलाब जामुन", caloriesPer100: 299, protein: 2.2, carbs: 40, fat: 14, treat: true },
  { name: "Dark Chocolate", nameHindi: "डार्क चॉकलेट", caloriesPer100: 546, protein: 5, carbs: 60, fat: 31, treat: true },
];

// ─── Transform patient for UI display ─────────────────────────────────────────
interface DisplayPatient {
  id: number;
  name: string;
  age: number;
  diagnosis: string;
  doctor: string;
  status: "review" | "on-track";
  nextSession: string;
}

function transformPatient(
  patient: Patient,
  consultations: Consultation[],
  referralDoctorName?: string | null,
): DisplayPatient {
  // Find next consultation for this patient
  const patientConsultations = consultations.filter(c => c.patient_id === patient.id);
  const upcomingConsultation = patientConsultations.find(c => 
    c.status === "scheduled" && new Date(c.scheduled_at) > new Date()
  );
  
  let nextSession = "Not scheduled";
  if (upcomingConsultation) {
    const date = new Date(upcomingConsultation.scheduled_at);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      nextSession = "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      nextSession = "Tomorrow";
    } else {
      nextSession = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  const doctorDisplayName = referralDoctorName?.trim() || patient.referring_doctor_name?.trim()
    ? (referralDoctorName?.trim() || patient.referring_doctor_name?.trim() || "")
    : "Direct Patient";

  return {
    id: patient.id,
    name: patient.name || "Unknown",
    age: patient.age || 0,
    diagnosis: patient.diagnosis || "General consultation",
    doctor: doctorDisplayName,
    status: Math.random() > 0.3 ? "on-track" : "review", // Placeholder - would come from actual tracking
    nextSession,
  };
}

// ─── Transform consultation for UI display ────────────────────────────────────
interface DisplayConsultation {
  id: number;
  patient: string;
  type: string;
  date: string;
  time: string;
  status: "today" | "tomorrow" | "this_week";
}

function transformConsultation(consultation: Consultation): DisplayConsultation {
  const date = new Date(consultation.scheduled_at);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let displayDate = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  let status: "today" | "tomorrow" | "this_week" = "this_week";
  
  if (date.toDateString() === today.toDateString()) {
    displayDate = "Today";
    status = "today";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    displayDate = "Tomorrow";
    status = "tomorrow";
  }
  
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  
  return {
    id: consultation.id,
    patient: consultation.patient_name || "Unknown Patient",
    type: consultation.type || "Follow-up",
    date: displayDate,
    time,
    status,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
const DieticianDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Get current dietician from auth
  const { data: currentDietician, isLoading: dieticianLoading } = useQuery({
    queryKey: ["dietician", user?.profileId],
    queryFn: () => getDietician(user!.profileId!),
    enabled: !!user?.profileId,
  });

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["dietician-patients", currentDietician?.id],
    queryFn: () => getDieticianPatients(currentDietician!.id),
    enabled: !!currentDietician?.id,
  });

  const { data: consultations, isLoading: consultationsLoading } = useQuery({
    queryKey: ["consultations", currentDietician?.id],
    queryFn: () => getConsultations({ rd_id: currentDietician?.id }),
    enabled: !!currentDietician?.id,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals"],
    queryFn: getReferrals,
  });

  const { data: foodLibrary = [], refetch: refetchFoodLibrary } = useQuery({
    queryKey: ["food-library"],
    queryFn: foodService.getAll,
  });

  const { data: unassignedAppointments = [], refetch: refetchUnassigned } = useQuery({
    queryKey: ["unassigned-appointments"],
    queryFn: getUnassignedAppointments,
    refetchInterval: 60_000,
  });

  const autoAssignMutation = useMutation({
    mutationFn: triggerAutoAssign,
    onSuccess: (data) => {
      refetchUnassigned();
      setAutoAssignResult(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Auto-assign failed");
    },
  });

  // Transform API data for UI
  const displayPatients = useMemo(() => {
    if (!patients || !consultations) return [];

    const latestReferralByPatient = new Map<number, Referral>();
    referrals.forEach((referral) => {
      const existing = latestReferralByPatient.get(referral.patient_id);
      const referralDate = new Date(referral.referred_at || referral.created_at || 0);
      const existingDate = existing ? new Date(existing.referred_at || existing.created_at || 0) : null;
      if (!existing || referralDate > existingDate!) {
        latestReferralByPatient.set(referral.patient_id, referral);
      }
    });

    return patients.map((patient) => {
      const referral = latestReferralByPatient.get(patient.id);
      const referralDoctorName = referral?.doctor_name || null;
      return transformPatient(patient, consultations, referralDoctorName);
    });
  }, [patients, consultations, referrals]);

  const displayConsultations = useMemo(() => {
    if (!consultations) return [];
    return consultations
      .filter(c => c.status === "scheduled" && new Date(c.scheduled_at) >= new Date())
      .map(transformConsultation)
      .sort((a, b) => {
        const order = { today: 0, tomorrow: 1, this_week: 2 };
        return order[a.status] - order[b.status];
      });
  }, [consultations]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("schedule");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [patientSearch, setPatientSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<DisplayPatient | null>(null);
  const [activeMeal, setActiveMeal] = useState("Breakfast");

  // Sync activeTab with URL
  useEffect(() => {
    if (location.pathname === "/dietician/patients") {
      setActiveTab("patients");
    } else if (location.pathname === "/dietician/diet") {
      setActiveTab("diet");
    } else {
      // Default to schedule (appointments) for /dietician and /dietician/schedule
      setActiveTab("schedule");
    }
  }, [location.pathname]);

  const handleTabChange = (tab: TabType) => {
    const paths: Record<TabType, string> = {
      schedule: "/dietician",
      patients: "/dietician/patients",
      diet: "/dietician/diet",
    };
    navigate(paths[tab]);
  };

  // Helper function to format dates
  const formatDate = (dateStr?: string) => {
    const date = dateStr ? new Date(dateStr) : new Date();
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // PDF Generation Function (Fitarc-style: modal flow with preview/download)
  const generateDietPlanPDF = (): string => {
    if (!selectedPatient) return '';
    const fullPatient = patients?.find(p => p.id === selectedPatient.id);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    const DASHBOARD_SCALE = 0.75;
    const DASH_HEADER_SIZE = 14 * DASHBOARD_SCALE;
    const DASH_LABEL_SIZE = 8 * DASHBOARD_SCALE;

    let y = 15;

    // 1. HEADER — sky-blue title (no coloured rect background)
    doc.setFontSize(22);
    doc.setTextColor(14, 165, 233);
    doc.setFont('helvetica', 'bold');
    doc.text('DietByRD Diet Plan', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Patient: ${selectedPatient.name} (${selectedPatient.age}y)`, margin, y);
    doc.text(`Date: ${formatDate()}`, margin + 90, y);
    y += 5;
    doc.text(`Dietician: ${currentDietician?.name || 'N/A'}`, margin, y);
    if (selectedPatient.diagnosis) doc.text(`Diagnosis: ${selectedPatient.diagnosis}`, margin + 90, y);
    y += 6;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // 2. DAILY SUMMARY — plain text row
    const sexForRda = fullPatient?.gender === 'female' ? 'F' : 'M';
    const ageForRda = fullPatient?.age || 30;
    const proteinTarget = Math.max(1, (fullPatient?.weight || 70) * 1.6);
    const carbsTarget = Math.max(1, (dailyTarget.calories * 0.45) / 4);
    const fatTarget = Math.max(1, (dailyTarget.calories * 0.25) / 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Daily Summary', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Calories: ${Math.round(totalNutrients.calories)} / ${dailyTarget.calories} kcal`, margin, y);
    doc.text(`Protein: ${totalNutrients.protein.toFixed(1)}g`, margin + 65, y);
    doc.text(`Carbs: ${totalNutrients.carbs.toFixed(1)}g`, margin + 105, y);
    doc.text(`Fat: ${totalNutrients.fat.toFixed(1)}g`, margin + 145, y);
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // 3. MEAL PLAN — rounded-rect headers + bullet points
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(14, 165, 233);
    doc.text('Meal Plan', margin, y);
    y += 8;

    meals.forEach((meal) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(margin, y - 6, pageWidth - (margin * 2), 9, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(14, 165, 233);
      doc.text(meal.name, margin + 3, y);
      const mealCals = Math.round(getMealCalories(meal));
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${mealCals} kcal`, pageWidth - margin - 20, y);
      y += 8;

      if (meal.items.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        doc.setFontSize(10);
        doc.text('No items', margin + 5, y);
        y += 8;
      } else {
        meal.items.forEach((item) => {
          if (y > 270) { doc.addPage(); y = 20; }
          const factor = item.quantity / 100;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0);
          doc.setFontSize(10);
          doc.text(`• ${item.name}`, margin + 5, y);
          doc.setFontSize(9);
          doc.setTextColor(80);
          doc.text(`- ${item.quantity}${item.unit}`, margin + 72, y);
          const macros = `${Math.round(item.calories * factor)} kcal  |  P: ${(item.protein * factor).toFixed(1)}  C: ${(item.carbs * factor).toFixed(1)}  F: ${(item.fat * factor).toFixed(1)}`;
          doc.setTextColor(120);
          doc.text(macros, pageWidth - margin - 80, y);
          y += 6;
        });
      }
      y += 3;
    });

    y += 5;

    // 4. NUTRITION DASHBOARD — 75% scale, 3-column micros
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(DASH_HEADER_SIZE);
    doc.setTextColor(14, 165, 233);
    doc.text('Nutrition Dashboard', margin, y);
    doc.setDrawColor(200);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 10 * DASHBOARD_SCALE;

    const drawBarScaled = (label: string, val: number, max: number, x: number, barY: number, w: number, color: [number, number, number], unit: string = 'g') => {
      doc.setFontSize(DASH_LABEL_SIZE);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'bold');
      doc.text(label, x, barY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${val.toFixed(1)} / ${max.toFixed(0)}${unit}`, x + w, barY, { align: 'right' });
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x, barY + 2, w, 2.5, 0.75, 0.75, 'F');
      doc.setFillColor(color[0], color[1], color[2]);
      const pct = Math.min(val / max, 1);
      if (pct > 0) doc.roundedRect(x, barY + 2, w * pct, 2.5, 0.75, 0.75, 'F');
    };

    drawBarScaled('Protein', totalNutrients.protein, proteinTarget, margin, y, 45, [14, 165, 233]);
    drawBarScaled('Carbs', totalNutrients.carbs, carbsTarget, margin + 55, y, 45, [20, 184, 166]);
    drawBarScaled('Fat', totalNutrients.fat, fatTarget, margin + 110, y, 45, [245, 158, 11]);
    y += 12 * DASHBOARD_SCALE;

    const microList = [
      { label: 'Fiber', key: 'fiber', target: getRDA('fiber' as never, ageForRda, sexForRda), unit: 'g' },
      { label: 'Calcium', key: 'calcium', target: getRDA('calcium' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'Iron', key: 'iron', target: getRDA('iron' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'Magnesium', key: 'magnesium', target: getRDA('magnesium' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'Zinc', key: 'zinc', target: getRDA('zinc' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'Potassium', key: 'potassium', target: getRDA('potassium' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'Sodium', key: 'sodium', target: getRDA('sodium' as never, ageForRda, sexForRda), unit: 'mg', reverse: true },
      { label: 'Vitamin A', key: 'vitamin_a', target: getRDA('vitamin_a' as never, ageForRda, sexForRda), unit: 'ug' },
      { label: 'Vitamin C', key: 'vitamin_c', target: getRDA('vitamin_c' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'Vitamin D', key: 'vitamin_d', target: getRDA('vitamin_d' as never, ageForRda, sexForRda), unit: 'ug' },
      { label: 'Vitamin E', key: 'vitamin_e', target: getRDA('vitamin_e' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'Vitamin K', key: 'vitamin_k', target: getRDA('vitamin_k' as never, ageForRda, sexForRda), unit: 'ug' },
      { label: 'B1', key: 'vitamin_b1', target: getRDA('vitamin_b1' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'B2', key: 'vitamin_b2', target: getRDA('vitamin_b2' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'B3', key: 'vitamin_b3', target: getRDA('vitamin_b3' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'B6', key: 'vitamin_b6', target: getRDA('vitamin_b6' as never, ageForRda, sexForRda), unit: 'mg' },
      { label: 'B9', key: 'vitamin_b9', target: getRDA('vitamin_b9' as never, ageForRda, sexForRda), unit: 'ug' },
      { label: 'B12', key: 'vitamin_b12', target: getRDA('vitamin_b12' as never, ageForRda, sexForRda), unit: 'ug' },
    ];

    const colWidthScaled = 45;
    const rowHeightScaled = 6.5;
    let col = 0, row = 0;
    const startMicroY = y;
    microList.forEach((m, i) => {
      if (i > 0 && i % 6 === 0) { col++; row = 0; }
      const x = margin + (col * (colWidthScaled + 12));
      const currentY = startMicroY + (row * rowHeightScaled);
      const val = (totalNutrients as Record<string, number>)[m.key] || 0;
      const safeTarget = m.target || 1;
      const pct = (val / safeTarget) * 100;
      const color: [number, number, number] = (m as { reverse?: boolean }).reverse
        ? (pct > 120 ? [239, 68, 68] : pct > 100 ? [249, 115, 22] : [34, 197, 94])
        : (pct >= 80 && pct <= 120 ? [34, 197, 94] : pct > 150 ? [249, 115, 22] : pct >= 50 ? [234, 179, 8] : [239, 68, 68]);
      drawBarScaled(m.label, val, safeTarget, x, currentY, colWidthScaled, color, m.unit);
      row++;
    });

    y = startMicroY + (6 * rowHeightScaled) + 6 * DASHBOARD_SCALE;

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | DietByRD - Your Health, Our Priority`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Personalised note page
    if (pdfNote.trim()) {
      doc.addPage();
      const bands = 40;
      const bandHeight = pageHeight / bands;
      for (let i = 0; i < bands; i++) {
        const ratio = i / (bands - 1);
        const r = Math.round(253 + (255 - 253) * ratio);
        const g = Math.round(236 + (255 - 236) * ratio);
        const b = Math.round(236 + (255 - 236) * ratio);
        doc.setFillColor(r, g, b);
        doc.rect(0, i * bandHeight, pageWidth, bandHeight + 0.5, 'F');
      }
      let currY = 30;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(30, 30, 30);
      doc.text('A Note from Your Dietitian', pageWidth / 2, currY, { align: 'center' });
      currY += 6;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      const subtitleLines = [
        'At DietByRD, we follow a simple but meaningful ritual. Every dietitian personally writes to the people they work with.',
        'This note is our way of telling you that your story did not fade in the crowd after the consultation ended.',
        'We remember the details you shared, the challenges you spoke about, and the goals that matter to you.',
        'Your concerns were heard, your context was understood, and this plan was built thoughtfully with care, specifically for you.',
        'You are not one among many here. You are important to us, and we are genuinely invested in your progress.',
      ];
      doc.text(subtitleLines, pageWidth / 2, currY, { align: 'center', lineHeightFactor: 1.2 });
      currY += (subtitleLines.length * 4.2) + 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);
      const splitNote = doc.splitTextToSize(pdfNote.trim(), pageWidth - (margin * 2));
      doc.text(splitNote, margin, currY, { lineHeightFactor: 1.5 });
    }

    return doc.output('bloburl');
  };

  const handleGeneratePDF = async () => {
    if (!selectedPatient) {
      toast.error("Please select a patient first");
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = generateDietPlanPDF();
      setPdfUrl(url);
    } catch (e) {
      console.error("PDF generation failed", e);
      toast.error("Failed to generate PDF");
    }
    setIsGeneratingPdf(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleAddNewMeal = () => {
    const trimmedName = newMealName.trim();
    if (!trimmedName) return;
    
    if (meals.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("A meal with this name already exists");
      return;
    }
    
    setMeals(prev => [...prev, { name: trimmedName, items: [] }]);
    setActiveMeal(trimmedName);
    setNewMealName("");
    setShowAddMeal(false);
    toast.success(`"${trimmedName}" meal added`);
  };

  const handleRemoveMeal = (mealName: string) => {
    if (meals.length <= 1) {
      toast.error("At least one meal is required");
      return;
    }
    setMeals(prev => prev.filter(m => m.name !== mealName));
    if (activeMeal === mealName) {
      setActiveMeal(meals[0].name !== mealName ? meals[0].name : meals[1]?.name || "");
    }
    toast.success(`"${mealName}" removed`);
  };

  const startEditMealName = (mealName: string) => {
    setEditingMealName(mealName);
    setEditMealNameInput(mealName);
  };

  const saveEditMealName = (originalMealName: string) => {
    const trimmedName = editMealNameInput.trim();
    if (!trimmedName) {
      setEditingMealName(null);
      setEditMealNameInput("");
      return;
    }

    if (trimmedName !== originalMealName && meals.some((meal) => meal.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("A meal with this name already exists");
      return;
    }

    setMeals((prev) => prev.map((meal) => (
      meal.name === originalMealName ? { ...meal, name: trimmedName } : meal
    )));

    if (activeMeal === originalMealName) {
      setActiveMeal(trimmedName);
    }

    setEditingMealName(null);
    setEditMealNameInput("");
    toast.success("Meal name updated");
  };
  
  const [meals, setMeals] = useState<MealSlot[]>([
    { name: "Breakfast", items: [] },
    { name: "Mid-Morning", items: [] },
    { name: "Lunch", items: [] },
    { name: "Evening Snack", items: [] },
    { name: "Dinner", items: [] },
  ]);

  // New meal state
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [newMealName, setNewMealName] = useState<string>("");
  const [editingMealName, setEditingMealName] = useState<string | null>(null);
  const [editMealNameInput, setEditMealNameInput] = useState("");
  const [showMicros, setShowMicros] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfNote, setPdfNote] = useState("");
  const [isFoodAddDialogOpen, setIsFoodAddDialogOpen] = useState(false);
  const [searchedFoods, setSearchedFoods] = useState<FoodLibraryItem[]>([]);
  const [autoAssignResult, setAutoAssignResult] = useState<AutoAssignResult | null>(null);

  const calculatedTDEE = useMemo(() => {
    if (!selectedPatient?.weight || !selectedPatient?.height || !selectedPatient?.age) return 1800;
    let bmr = selectedPatient.gender === "male" 
      ? 10 * selectedPatient.weight + 6.25 * selectedPatient.height - 5 * selectedPatient.age + 5
      : 10 * selectedPatient.weight + 6.25 * selectedPatient.height - 5 * selectedPatient.age - 161;
    let act = 1.2;
    const f = selectedPatient.workout_frequency ?? 0;
    if (f <= 2 && f > 0) act = 1.375;
    else if (f <= 4 && f > 2) act = 1.55;
    else if (f <= 6 && f > 4) act = 1.725;
    else if (f > 6) act = 1.9;
    return Math.round(bmr * act);
  }, [selectedPatient]);

  const dailyTarget = { 
    calories: calculatedTDEE, 
    protein: Math.round((calculatedTDEE * 0.3) / 4), 
    carbs: Math.round((calculatedTDEE * 0.4) / 4), 
    fat: Math.round((calculatedTDEE * 0.3) / 9) 
  };

  // Filtered data
  const filteredPatients = displayPatients.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const filteredConsultations = displayConsultations.filter((c) => {
    if (scheduleFilter === "all") return true;
    return c.status === scheduleFilter;
  });

  useEffect(() => {
    const trimmedTerm = searchTerm.trim();

    if (activeTab !== "diet" || !selectedPatient || trimmedTerm.length === 0) {
      setSearchedFoods([]);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      const results = await foodService.search(trimmedTerm);
      if (!cancelled) {
        setSearchedFoods(results);
      }
    };

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedPatient, searchTerm]);

  const searchResults: FoodItem[] = searchedFoods.map((food: FoodLibraryItem) => ({
    name: food.name_en,
    nameHindi: food.name_hi,
    caloriesPer100: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    iron: food.iron,
    calcium: food.calcium,
    magnesium: food.magnesium,
    zinc: food.zinc,
    potassium: food.potassium,
    sodium: food.sodium,
    vitamin_a: food.vitamin_a,
    vitamin_c: food.vitamin_c,
    vitamin_d: food.vitamin_d,
    vitamin_e: food.vitamin_e,
    vitamin_k: food.vitamin_k,
    vitamin_b1: food.vitamin_b1,
    vitamin_b2: food.vitamin_b2,
    vitamin_b3: food.vitamin_b3,
    vitamin_b6: food.vitamin_b6,
    vitamin_b9: food.vitamin_b9,
    vitamin_b12: food.vitamin_b12,
    treat: food.food_type === 'TREAT',
  }));

  // Handlers
  const addFoodToMeal = (food: FoodItem) => {
    const newItem: MealItem = {
      ...food,
      id: crypto.randomUUID(),
      quantity: 100,
      unit: "g",
      calories: food.caloriesPer100,
    };
    setMeals((prev) =>
      prev.map((m) => (m.name === activeMeal ? { ...m, items: [...m.items, newItem] } : m))
    );
    setSearchTerm("");
  };

  const updateQuantity = (mealName: string, itemId: string, delta: number) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.name === mealName
          ? {
              ...meal,
              items: meal.items.map((item) =>
                item.id === itemId
                  ? { ...item, quantity: Math.max(10, item.quantity + delta) }
                  : item
              ),
            }
          : meal
      )
    );
  };

  const removeItem = (mealName: string, itemId: string) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.name === mealName ? { ...meal, items: meal.items.filter((i) => i.id !== itemId) } : meal
      )
    );
  };

  const totalNutrients = meals.reduce(
    (acc, meal) => {
      meal.items.forEach((item) => {
        const factor = item.quantity / 100;
        acc.calories += item.calories * factor;
        acc.protein += item.protein * factor;
        acc.carbs += item.carbs * factor;
        acc.fat += item.fat * factor;
        acc.fiber += (item.fiber || 0) * factor;
        acc.iron += (item.iron || 0) * factor;
        acc.calcium += (item.calcium || 0) * factor;
        acc.magnesium += (item.magnesium || 0) * factor;
        acc.zinc += (item.zinc || 0) * factor;
        acc.potassium += (item.potassium || 0) * factor;
        acc.sodium += (item.sodium || 0) * factor;
        acc.vitamin_a += (item.vitamin_a || 0) * factor;
        acc.vitamin_c += (item.vitamin_c || 0) * factor;
        acc.vitamin_d += (item.vitamin_d || 0) * factor;
        acc.vitamin_e += (item.vitamin_e || 0) * factor;
        acc.vitamin_k += (item.vitamin_k || 0) * factor;
        acc.vitamin_b1 += (item.vitamin_b1 || 0) * factor;
        acc.vitamin_b2 += (item.vitamin_b2 || 0) * factor;
        acc.vitamin_b3 += (item.vitamin_b3 || 0) * factor;
        acc.vitamin_b6 += (item.vitamin_b6 || 0) * factor;
        acc.vitamin_b9 += (item.vitamin_b9 || 0) * factor;
        acc.vitamin_b12 += (item.vitamin_b12 || 0) * factor;
      });
      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      iron: 0,
      calcium: 0,
      magnesium: 0,
      zinc: 0,
      potassium: 0,
      sodium: 0,
      vitamin_a: 0,
      vitamin_c: 0,
      vitamin_d: 0,
      vitamin_e: 0,
      vitamin_k: 0,
      vitamin_b1: 0,
      vitamin_b2: 0,
      vitamin_b3: 0,
      vitamin_b6: 0,
      vitamin_b9: 0,
      vitamin_b12: 0,
    }
  );

  const getMealCalories = (meal: MealSlot) =>
    meal.items.reduce((sum, item) => sum + (item.calories * item.quantity) / 100, 0);

  const selectedPatientFull = patients?.find((patient) => patient.id === selectedPatient?.id);
  const rdaAge = selectedPatientFull?.age || selectedPatient?.age || 30;
  const rdaSex: 'M' | 'F' = selectedPatientFull?.gender === 'female' ? 'F' : 'M';

  const sidebarSections = [
    {
      title: "Dashboard",
      items: [
        { label: "Appointments", href: "/dietician", icon: CalendarDays },
        { label: "My Patients", href: "/dietician/patients", icon: Users, badge: displayPatients.length },
        { label: "Diet Plans", href: "/dietician/diet", icon: UtensilsCrossed },
        { label: "Food Library", href: "/dietician/food-library", icon: Apple },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "My Profile", href: "/dietician/settings", icon: Settings },
      ],
    },
  ];

  const caloriePercent = Math.min((totalNutrients.calories / dailyTarget.calories) * 100, 100);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  // Loading state
  const isLoading = dieticianLoading || patientsLoading || consultationsLoading;

  // Get initials for display
  const getInitials = (name: string) => 
    name.split(" ").map((n) => n[0]).join("").toUpperCase();

  // Bottom content with logout
  const bottomContent = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
    >
      <LogOut className="w-[18px] h-[18px] shrink-0" />
      <span>Sign Out</span>
    </button>
  );

  // Pending verification state
  if (user?.isVerified === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin has not approved</h2>
          <p className="text-gray-600 mb-8 text-lg">
            Your account is not approved by admin. Please contact support or wait for approval to access your dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleLogout} className="gap-2 px-6">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="DietByRD" subtitle={user?.name || "Dietician Portal"} sections={sidebarSections} bottomContent={bottomContent} />

      <main className="flex-1 bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">
            {activeTab === "patients" ? "My Patients" : activeTab === "schedule" ? "Appointments" : "Diet Plan"}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
                {currentDietician ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      {getInitials(currentDietician.name)}
                    </div>
                    <span className="text-sm font-medium">{currentDietician.name}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Loading...</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/dietician/settings")} className="cursor-pointer">
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
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading data...</span>
          </div>
        )}

        {/* Dietitian allotment required banner */}
        {!isLoading && unassignedAppointments.length > 0 && (
          <div className="mx-6 mt-4 flex items-center justify-between gap-4 px-5 py-4 bg-amber-50 border border-amber-300 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">
                  Dietitian allotment required — {unassignedAppointments.length} appointment{unassignedAppointments.length > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {unassignedAppointments.slice(0, 3).map((a) => {
                    const dt = new Date(a.scheduled_at);
                    return `${a.patient_name} (${dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })})`;
                  }).join(" · ")}
                  {unassignedAppointments.length > 3 && ` +${unassignedAppointments.length - 3} more`}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              onClick={() => autoAssignMutation.mutate()}
              disabled={autoAssignMutation.isPending}
            >
              {autoAssignMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> Assigning…</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-1.5" /> Auto-Assign Now</>
              )}
            </Button>
          </div>
        )}

        {/* Patients tab */}
        {!isLoading && activeTab === "patients" && (
          <div className="p-6 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((p) => {
                // Create URL-friendly slug from patient name
                const nameSlug = (p.name || "patient")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
                return (
                <div
                  key={p.id}
                  className={`bg-card border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                    selectedPatient?.id === p.id ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                  onClick={() => navigate(`/dietician/patient/${nameSlug}-${p.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {getInitials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.diagnosis} · Age {p.age}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Ref: {p.doctor}</div>
                    </div>
                    <Badge variant="outline" className={p.status === "review" ? "text-warning border-warning/30" : "text-success border-success/30"}>
                      {p.status}
                    </Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Next: {p.nextSession}</div>
                    <Button size="sm" variant="ghost" className="text-xs h-7">View Details →</Button>
                  </div>
                </div>
              );
              })}
              {filteredPatients.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No patients found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule tab - Calendar View */}
        {!isLoading && activeTab === "schedule" && (
          <DieticianCalendarSchedule 
            consultations={displayConsultations}
            scheduleFilter={scheduleFilter}
            setScheduleFilter={setScheduleFilter}
            dieticianId={currentDietician?.id}
          />
        )}

        {/* Diet chart tab */}
        {!isLoading && activeTab === "diet" && (
          <div className="flex flex-1">
            <div className="flex-1 flex">
              <div className="w-48 border-r p-4 space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Daily Meals
                    {selectedPatient && (
                      <span className="block text-[10px] font-normal normal-case mt-0.5">for {selectedPatient.name}</span>
                    )}
                  </div>
                </div>
                
                {/* Add new meal input */}
                {showAddMeal && (
                  <div className="mb-3 p-2 bg-muted/50 rounded-lg space-y-2">
                    <Input
                      placeholder="Meal name"
                      value={newMealName}
                      onChange={(e) => setNewMealName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddNewMeal();
                        if (e.key === 'Escape') {
                          setShowAddMeal(false);
                          setNewMealName("");
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddNewMeal}>
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs" 
                        onClick={() => { setShowAddMeal(false); setNewMealName(""); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {meals.map((meal) => {
                  const cal = Math.round(getMealCalories(meal));
                  const isDefaultMeal = ["Breakfast", "Lunch", "Dinner"].includes(meal.name);
                  return (
                    <div key={meal.name} className="group flex items-center gap-0.5">
                      <button
                        onClick={() => setActiveMeal(meal.name)}
                        className={`flex-1 min-w-0 text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          activeMeal === meal.name
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {editingMealName === meal.name ? (
                          <Input
                            value={editMealNameInput}
                            onChange={(event) => setEditMealNameInput(event.target.value)}
                            onBlur={() => saveEditMealName(meal.name)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") saveEditMealName(meal.name);
                              if (event.key === "Escape") {
                                setEditingMealName(null);
                                setEditMealNameInput("");
                              }
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="h-7 text-xs font-semibold"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{meal.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{cal} kcal</span>
                          </div>
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditMealName(meal.name); }}
                        className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-opacity"
                        title="Edit meal name"
                      >
                        <SquarePen className="w-3 h-3" />
                      </button>
                      {!isDefaultMeal && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveMeal(meal.name); }}
                          className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-opacity"
                          title="Remove meal"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button 
                  onClick={() => setShowAddMeal(true)}
                  className="w-full mt-3 border-2 border-dashed border-muted-foreground/30 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  + Add Meal
                </button>
              </div>

              <div className="flex-1 p-6">
                {!selectedPatient && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a patient first</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => handleTabChange("patients")}
                    >
                      Go to Patients
                    </Button>
                  </div>
                )}

                {selectedPatient && (
                  <>
                    <div className="relative mb-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[260px]">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            placeholder="Search food..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 text-base rounded-xl border-2"
                          />
                        </div>
                        <Button onClick={() => setIsFoodAddDialogOpen(true)} className="h-12">
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Item
                        </Button>
                      </div>
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-card border-2 border-t-0 rounded-b-xl shadow-lg z-10 max-h-64 overflow-y-auto">
                          {searchResults.map((food, i) => (
                            <button
                              key={i}
                              onClick={() => addFoodToMeal(food)}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-lg">🍽️</div>
                                <div>
                                  <div className="font-medium text-sm flex items-center gap-2">
                                    {food.name}
                                    {food.treat && (
                                      <Badge variant="outline" className="text-warning border-warning/30 text-[10px]">⚠ Treat</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex gap-2">
                                    <span className="text-info">P: {food.protein}g</span>
                                    <span className="text-primary">C: {food.carbs}g</span>
                                    <span className="text-warning">F: {food.fat}g</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{food.caloriesPer100}kcal</span>
                                <Plus className="w-4 h-4 text-primary" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {meals.find((m) => m.name === activeMeal)?.items.map((item) => {
                        const factor = item.quantity / 100;
                        return (
                          <div key={item.id} className="bg-card border rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-xl">🍽️</div>
                              <div>
                                <div className="font-medium">{item.name}</div>
                                {item.nameHindi && <div className="text-xs text-muted-foreground">{item.nameHindi}</div>}
                                <div className="text-xs flex gap-3 mt-0.5">
                                  <span className="text-info">● {(item.protein * factor).toFixed(1)}g P</span>
                                  <span className="text-primary">● {(item.carbs * factor).toFixed(1)}g C</span>
                                  <span className="text-warning">● {(item.fat * factor).toFixed(1)}g F</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(activeMeal, item.id, -10)} className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-muted transition-colors">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <div className="text-center min-w-[50px]">
                                  <div className="font-semibold text-sm">{item.quantity}</div>
                                  <div className="text-[10px] text-muted-foreground uppercase">{item.unit}</div>
                                </div>
                                <button onClick={() => updateQuantity(activeMeal, item.id, 10)} className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-muted transition-colors">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-sm font-semibold min-w-[60px] text-right">
                                {Math.round(item.calories * factor)} kcal
                              </span>
                              <button onClick={() => removeItem(activeMeal, item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {(meals.find((m) => m.name === activeMeal)?.items.length ?? 0) === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No items in {activeMeal}</p>
                          <p className="text-xs">Search and add food items above</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="w-72 border-l p-6 space-y-6 overflow-y-auto">
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Calories</div>
                <div className="relative w-32 h-32 mx-auto mt-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{Math.round(totalNutrients.calories)}</span>
                    <span className="text-xs text-muted-foreground">/ {dailyTarget.calories}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {Math.max(0, Math.round(dailyTarget.calories - totalNutrients.calories))} remaining
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Protein", value: totalNutrients.protein, target: dailyTarget.protein, color: "bg-info" },
                  { label: "Carbs", value: totalNutrients.carbs, target: dailyTarget.carbs, color: "bg-primary" },
                  { label: "Fat", value: totalNutrients.fat, target: dailyTarget.fat, color: "bg-warning" },
                ].map((macro) => (
                  <div key={macro.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{macro.label}</span>
                      <span className="text-muted-foreground">{Math.round(macro.value)} / {macro.target}g</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${macro.color} transition-all`} style={{ width: `${Math.min((macro.value / macro.target) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Micronutrients</h4>
                <div className="bg-slate-50 p-4 rounded-xl space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Fiber</h4>
                    {[
                      { label: "Dietary Fiber", value: totalNutrients.fiber, key: "fiber", unit: "g" },
                    ].map((micro) => {
                      const target = getRDA(micro.key as never, rdaAge, rdaSex);
                      const pct = target > 0 ? (micro.value / target) * 100 : 0;
                      const colorClass = pct >= 80 && pct <= 120 ? "bg-green-500" : pct > 150 ? "bg-orange-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
                      return (
                        <div key={micro.label} className="mb-3">
                          <div className="flex justify-between text-[10px] mb-1 text-slate-600">
                            <span className="font-medium">{micro.label}</span>
                            <span className="font-mono">{micro.value.toFixed(1)} / {target} {micro.unit}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className={`${colorClass} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Minerals</h4>
                    {[
                      { label: "Calcium", value: totalNutrients.calcium, key: "calcium", unit: "mg" },
                      { label: "Iron", value: totalNutrients.iron, key: "iron", unit: "mg" },
                      { label: "Magnesium", value: totalNutrients.magnesium, key: "magnesium", unit: "mg" },
                      { label: "Zinc", value: totalNutrients.zinc, key: "zinc", unit: "mg" },
                      { label: "Potassium", value: totalNutrients.potassium, key: "potassium", unit: "mg" },
                      { label: "Sodium", value: totalNutrients.sodium, key: "sodium", unit: "mg", reverse: true },
                    ].map((micro) => {
                      const target = getRDA(micro.key as never, rdaAge, rdaSex);
                      const pct = target > 0 ? (micro.value / target) * 100 : 0;
                      const colorClass = (micro as { reverse?: boolean }).reverse
                        ? pct > 120 ? "bg-red-500" : pct > 100 ? "bg-orange-500" : "bg-green-500"
                        : pct >= 80 && pct <= 120 ? "bg-green-500" : pct > 150 ? "bg-orange-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
                      return (
                        <div key={micro.label} className="mb-3">
                          <div className="flex justify-between text-[10px] mb-1 text-slate-600">
                            <span className="font-medium">{micro.label}</span>
                            <span className="font-mono">{micro.value.toFixed(1)} / {target} {micro.unit}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className={`${colorClass} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Vitamins</h4>
                    {[
                      { label: "Vitamin A", value: totalNutrients.vitamin_a, key: "vitamin_a", unit: "µg" },
                      { label: "Vitamin C", value: totalNutrients.vitamin_c, key: "vitamin_c", unit: "mg" },
                      { label: "Vitamin D", value: totalNutrients.vitamin_d, key: "vitamin_d", unit: "µg" },
                      { label: "Vitamin E", value: totalNutrients.vitamin_e, key: "vitamin_e", unit: "mg" },
                      { label: "Vitamin K", value: totalNutrients.vitamin_k, key: "vitamin_k", unit: "µg" },
                      { label: "Thiamine (B1)", value: totalNutrients.vitamin_b1, key: "vitamin_b1", unit: "mg" },
                      { label: "Riboflavin (B2)", value: totalNutrients.vitamin_b2, key: "vitamin_b2", unit: "mg" },
                      { label: "Niacin (B3)", value: totalNutrients.vitamin_b3, key: "vitamin_b3", unit: "mg" },
                      { label: "B6", value: totalNutrients.vitamin_b6, key: "vitamin_b6", unit: "mg" },
                      { label: "Folate (B9)", value: totalNutrients.vitamin_b9, key: "vitamin_b9", unit: "µg" },
                      { label: "B12", value: totalNutrients.vitamin_b12, key: "vitamin_b12", unit: "µg" },
                    ].map((micro) => {
                      const target = getRDA(micro.key as never, rdaAge, rdaSex);
                      const pct = target > 0 ? (micro.value / target) * 100 : 0;
                      const colorClass = pct >= 80 && pct <= 120 ? "bg-green-500" : pct > 150 ? "bg-orange-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
                      return (
                        <div key={micro.label} className="mb-3">
                          <div className="flex justify-between text-[10px] mb-1 text-slate-600">
                            <span className="font-medium">{micro.label}</span>
                            <span className="font-mono">{micro.value.toFixed(1)} / {target} {micro.unit}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className={`${colorClass} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-slate-400 italic text-center pt-2">
                    * Values calculated from available food data; missing nutrients are not counted.
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => setPdfModalOpen(true)}
                disabled={!selectedPatient || meals.every(m => m.items.length === 0)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
        {/* PDF Export Modal */}
        {pdfModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Export Diet Plan</h3>
                <button
                  onClick={() => { setPdfModalOpen(false); setPdfUrl(null); setPdfNote(""); }}
                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              {!pdfUrl ? (
                isGeneratingPdf ? (
                  <div className="flex flex-col items-center gap-4 py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">Generating PDF...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-sm text-muted-foreground text-center">
                      Generating plan for <strong>{selectedPatient?.name}</strong>
                    </p>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Personalised Note</label>
                      <textarea
                        className="w-full min-h-[120px] p-3 rounded-xl border border-input focus:ring-2 focus:ring-primary/30 outline-none text-sm transition-all resize-none"
                        placeholder="Write a personal note for your patient..."
                        value={pdfNote}
                        onChange={(e) => setPdfNote(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground italic">Appears on the last page of the PDF</p>
                    </div>
                    <Button onClick={handleGeneratePDF} className="w-full">
                      Generate PDF
                    </Button>
                  </div>
                )
              ) : (
                <div className="space-y-4 text-center">
                  <div className="bg-green-50 text-green-700 p-4 rounded-xl font-medium">
                    PDF Generated Successfully!
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => window.open(pdfUrl!, '_blank')}>
                      Preview
                    </Button>
                    <Button onClick={() => {
                      const link = document.createElement('a');
                      link.href = pdfUrl!;
                      link.download = `DietPlan_${selectedPatient!.name.replace(/\s+/g, '_')}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}>
                      Download
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={() => setPdfUrl(null)} className="mt-2 text-xs">
                    Edit Note & Regenerate
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <FoodLibraryAddDialog
          open={isFoodAddDialogOpen}
          onOpenChange={setIsFoodAddDialogOpen}
          onSuccess={async () => {
            await refetchFoodLibrary();
          }}
        />

        {/* Auto-assign result dialog */}
        <Dialog open={!!autoAssignResult} onOpenChange={(open) => !open && setAutoAssignResult(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Auto-Assign Results</DialogTitle>
              <DialogDescription>
                {autoAssignResult && autoAssignResult.total_pending === 0
                  ? "No unassigned appointments due within 48 hours."
                  : autoAssignResult
                  ? `Assigned ${autoAssignResult.assigned} of ${autoAssignResult.total_pending} pending appointment${autoAssignResult.total_pending !== 1 ? "s" : ""}`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            {autoAssignResult && autoAssignResult.details.length > 0 && (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {autoAssignResult.details.map((d) => {
                  const dt = new Date(d.scheduled_at);
                  const timeStr = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " at " + dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                  return (
                    <div key={d.consultation_id} className={`flex items-start gap-2 p-2 rounded-md text-sm ${d.assigned ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                      {d.assigned
                        ? <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        : <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                      <div>
                        <p className="font-medium leading-tight">{d.patient_name || `Consultation #${d.consultation_id}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {timeStr} {d.assigned ? `→ ${d.rd_name}` : `— ${d.reason}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setAutoAssignResult(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default DieticianDashboard;
