import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CalendarDays,
  ChevronDown,
  Plus,
  ChevronUp,
  Download,
  FileText,
  Heart,
  Loader2,
  Scale,
  Target,
  User,
  UtensilsCrossed,
  MessageSquare,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  getPatient,
  getPatientDietPlans,
  getPatientAppointments,
  type DietPlan,
} from "@/lib/api";
import { formatDateTime12 } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getPatientSidebarSections } from "@/lib/patient-sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────
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

type PlanJson = {
  meals?: PlanMeal[];
  prototypes?: PlanPrototype[];
  totals?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  weight?: { current?: number | null; target?: number | null };
  note?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Return prototypes array — always includes at least one entry */
const getPrototypes = (planJson: PlanJson): PlanPrototype[] => {
  if (Array.isArray(planJson.prototypes) && planJson.prototypes.length > 0) {
    return planJson.prototypes;
  }
  // Backward-compat: old plans had only top-level meals
  return [{ name: "Diet Plan", meals: planJson.meals ?? [], totals: planJson.totals }];
};

const calcTotals = (meals: PlanMeal[]) =>
  meals.reduce(
    (acc, meal) => {
      (meal.items ?? []).forEach((item) => {
        acc.calories += item.calories ?? 0;
        acc.protein  += item.protein  ?? 0;
        acc.carbs    += item.carbs    ?? 0;
        acc.fat      += item.fat      ?? 0;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

// ─── Component ────────────────────────────────────────────────────────────────
const PatientDietPlans = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [activePrototypeIdx, setActivePrototypeIdx] = useState<Record<number, number>>({});

  // Get patient data
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["patient", user?.profileId],
    queryFn: () => getPatient(user!.profileId!),
    enabled: !!user?.profileId,
  });

  // Get patient diet plans
  const { data: dietPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["patient-diet-plans", user?.profileId],
    queryFn: () => getPatientDietPlans(user!.profileId!),
    enabled: !!user?.profileId,
  });

  // Get upcoming appointments
  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ["patient-appointments-upcoming", user?.profileId],
    queryFn: () => getPatientAppointments(user!.profileId!, { upcoming_only: true }),
    enabled: !!user?.profileId,
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ["patient-appointments-all", user?.profileId],
    queryFn: () => getPatientAppointments(user!.profileId!),
    enabled: !!user?.profileId,
  });

  const nextAppointment = upcomingAppointments[0] ?? null;
  const hasBookedAnyAppointment = allAppointments.length > 0;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  // Get the current active diet plan
  const activeDietPlan = dietPlans?.find((p: DietPlan) => p.is_active);

  // ─── PDF Download ─────────────────────────────────────────────────────────
  const downloadDietPlanPDF = (plan: DietPlan) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const BRAND_GREEN: [number, number, number] = [46, 125, 50];
    const BRAND_LIGHT: [number, number, number] = [232, 245, 233];
    const GRAY_TEXT: [number, number, number] = [100, 100, 100];

    const planJson = (plan.plan_json ?? {}) as PlanJson;
    const prototypes = getPrototypes(planJson);
    const note = planJson.note?.trim();

    const drawHeader = (pageNum: number, totalPages: number) => {
      // Green header bar
      doc.setFillColor(...BRAND_GREEN);
      doc.rect(0, 0, pageWidth, 28, "F");

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("DietByRD – Personalised Diet Plan", pageWidth / 2, 12, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Patient: ${patient?.name || "N/A"}`, 15, 21);
      doc.text(`Issued: ${formatDate(plan.issued_at || plan.created_at)}`, pageWidth - 15, 21, {
        align: "right",
      });

      // Page number footer
      doc.setFontSize(8);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(
        `Page ${pageNum} of ${totalPages} | DietByRD – Your Health, Our Priority`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" },
      );
    };

    // We need two passes: first pass to count pages, second to add headers.
    // Simplest: build content first, then add headers retroactively.

    let yPos = 34;

    // Weight info
    if (planJson.weight?.current || planJson.weight?.target) {
      doc.setFillColor(...BRAND_LIGHT);
      doc.roundedRect(14, yPos, pageWidth - 28, 18, 3, 3, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_GREEN);
      doc.text("Weight Information", 20, yPos + 7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const parts: string[] = [];
      if (planJson.weight.current) parts.push(`Current: ${planJson.weight.current} kg`);
      if (planJson.weight.target) parts.push(`Target: ${planJson.weight.target} kg`);
      doc.text(parts.join("   ·   "), 20, yPos + 14);
      yPos += 26;
    }

    // Note from dietitian
    if (note) {
      doc.setFillColor(255, 248, 225);
      const noteLines = doc.splitTextToSize(note, pageWidth - 40);
      const noteHeight = noteLines.length * 5 + 12;
      doc.roundedRect(14, yPos, pageWidth - 28, noteHeight, 3, 3, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 120, 0);
      doc.text("📝  Note from your Dietitian", 20, yPos + 8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 60, 0);
      doc.text(noteLines, 20, yPos + 15);
      yPos += noteHeight + 8;
    }

    // Prototypes
    prototypes.forEach((proto, pi) => {
      if (pi > 0) {
        doc.addPage();
        yPos = 34;
      }

      const protoMeals = proto.meals ?? [];
      const protoTotals = proto.totals ?? calcTotals(protoMeals);
      const protoName = proto.name ?? `Prototype ${pi + 1}`;

      // Prototype heading
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_GREEN);
      doc.text(protoName, 15, yPos);
      yPos += 8;

      // Macro summary table
      autoTable(doc, {
        startY: yPos,
        head: [["Calories", "Protein", "Carbohydrates", "Fat"]],
        body: [[
          `${Math.round(protoTotals.calories ?? 0)} kcal`,
          `${(protoTotals.protein ?? 0).toFixed(1)} g`,
          `${(protoTotals.carbs ?? 0).toFixed(1)} g`,
          `${(protoTotals.fat ?? 0).toFixed(1)} g`,
        ]],
        theme: "grid",
        headStyles: { fillColor: BRAND_GREEN, fontSize: 9, halign: "center" },
        bodyStyles: { fontSize: 10, halign: "center", fontStyle: "bold" },
        margin: { left: 15, right: 15 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Meals
      protoMeals.forEach((meal) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 34;
        }

        const mealCal = (meal.items ?? []).reduce((s, i) => s + (i.calories ?? 0), 0);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(meal.name ?? "Meal", 15, yPos);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`${Math.round(mealCal)} kcal`, pageWidth - 15, yPos, { align: "right" });
        yPos += 4;

        if ((meal.items ?? []).length > 0) {
          const mealData = (meal.items ?? []).map((item) => [
            (item.name ?? "Food item") + (item.nameHindi ? ` (${item.nameHindi})` : ""),
            `${item.quantity ?? ""} ${item.unit ?? "g"}`,
            `${Math.round(item.calories ?? 0)}`,
            `${(item.protein ?? 0).toFixed(1)}`,
            `${(item.carbs ?? 0).toFixed(1)}`,
            `${(item.fat ?? 0).toFixed(1)}`,
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [["Food Item", "Qty", "Cal", "P(g)", "C(g)", "F(g)"]],
            body: mealData,
            theme: "striped",
            headStyles: { fillColor: [224, 242, 224], textColor: [30, 80, 30], fontSize: 8 },
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            columnStyles: {
              0: { cellWidth: 65 },
              1: { cellWidth: 28, halign: "center" },
              2: { cellWidth: 18, halign: "center" },
              3: { cellWidth: 18, halign: "center" },
              4: { cellWidth: 18, halign: "center" },
              5: { cellWidth: 18, halign: "center" },
            },
            margin: { left: 15, right: 15 },
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          yPos = (doc as any).lastAutoTable.finalY + 6;
        } else {
          yPos += 6;
          doc.setTextColor(160, 160, 160);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.text("No items", 20, yPos);
          doc.setFont("helvetica", "normal");
          yPos += 6;
        }
      });
    });

    // Add headers/footers retroactively to every page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawHeader(i, totalPages);
    }

    const fileName = `DietPlan_${patient?.name?.replace(/\s+/g, "_") || "Patient"}_${formatDate(
      plan.issued_at || plan.created_at,
    ).replace(/[,\s]+/g, "_")}.pdf`;
    doc.save(fileName);
  };

  // ─── Sidebar ──────────────────────────────────────────────────────────────
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

  const isLoading = patientLoading || plansLoading;

  // ─── Render helpers ───────────────────────────────────────────────────────

  /** Render meals for a given prototype */
  const renderMeals = (meals: PlanMeal[]) => (
    <div className="space-y-4">
      {meals.map((meal) => (
        <div key={meal.name} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">{meal.name}</h4>
            <span className="text-sm text-muted-foreground">
              {Math.round((meal.items ?? []).reduce((s, i) => s + (i.calories ?? 0), 0))} kcal
            </span>
          </div>
          {(meal.items ?? []).length > 0 ? (
            <div className="space-y-2">
              {(meal.items ?? []).map((item, idx) => (
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
  );

  /** Render all prototypes with tab switcher */
  const renderPrototypes = (plan: DietPlan, planId: number) => {
    const planJson = (plan.plan_json ?? {}) as PlanJson;
    const prototypes = getPrototypes(planJson);
    const note = planJson.note?.trim();
    const currentIdx = activePrototypeIdx[planId] ?? 0;
    const proto = prototypes[currentIdx];
    const protoMeals = proto?.meals ?? [];
    const protoTotals = proto?.totals ?? calcTotals(protoMeals);

    return (
      <div className="space-y-4">
        {/* Note from dietitian */}
        {note && (
          <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <MessageSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                Note from your Dietitian
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">{note}</p>
            </div>
          </div>
        )}

        {/* Prototype tabs — only show if more than one */}
        {prototypes.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {prototypes.map((p, i) => (
              <button
                key={i}
                onClick={() => setActivePrototypeIdx((prev) => ({ ...prev, [planId]: i }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentIdx === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {p.name ?? `Prototype ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Macro summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Calories", value: Math.round(protoTotals.calories ?? 0), unit: "kcal", color: "bg-orange-500" },
            { label: "Protein",  value: +(protoTotals.protein  ?? 0).toFixed(1), unit: "g", color: "bg-blue-500" },
            { label: "Carbs",    value: +(protoTotals.carbs    ?? 0).toFixed(1), unit: "g", color: "bg-green-500" },
            { label: "Fat",      value: +(protoTotals.fat      ?? 0).toFixed(1), unit: "g", color: "bg-yellow-500" },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 bg-background border rounded-lg">
              <div className={`w-2.5 h-2.5 ${item.color} rounded-full mx-auto mb-1.5`} />
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-base font-bold">
                {item.value}
                <span className="text-xs font-normal ml-0.5">{item.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Weight info */}
        {planJson.weight && (planJson.weight.current || planJson.weight.target) && (
          <div className="grid grid-cols-2 gap-3">
            {planJson.weight.current && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Weight at time</p>
                  <p className="font-semibold text-sm">{planJson.weight.current} kg</p>
                </div>
              </div>
            )}
            {planJson.weight.target && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Target className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Target Weight</p>
                  <p className="font-semibold text-sm">{planJson.weight.target} kg</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meals */}
        {renderMeals(protoMeals)}
      </div>
    );
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle={patient?.name || user?.name || "Patient Portal"}
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">My Diet Plans</h1>
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
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
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
            <span className="ml-2 text-muted-foreground">Loading diet plans...</span>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="p-6 space-y-6">
            {/* Appointment banner */}
            {dietPlans && dietPlans.length > 0 && (
              <div
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  nextAppointment
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      nextAppointment ? "bg-blue-100 dark:bg-blue-900" : "bg-amber-100 dark:bg-amber-900"
                    }`}
                  >
                    <CalendarDays className={`w-4 h-4 ${nextAppointment ? "text-blue-600" : "text-amber-600"}`} />
                  </div>
                  <div>
                    {nextAppointment ? (
                      <>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Next appointment booked
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {new Date(nextAppointment.scheduled_at).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          at {formatDateTime12(nextAppointment.scheduled_at)}
                          {nextAppointment.dietician_name && ` · ${nextAppointment.dietician_name}`}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          No upcoming appointment
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Book a follow-up to stay on track with your diet
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={nextAppointment ? "outline" : "default"}
                  className={
                    nextAppointment
                      ? "border-blue-300 text-blue-700 hover:bg-blue-100"
                      : "bg-amber-500 hover:bg-amber-600 text-white border-0"
                  }
                  onClick={() => navigate("/patient/appointments")}
                >
                  {nextAppointment ? "Schedule Another" : "Book Now"}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}

            {/* ── Current Active Diet Plan ─────────────────────────────── */}
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
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderPrototypes(activeDietPlan, activeDietPlan.id)}
                </CardContent>
              </Card>
            )}

            {/* ── Diet Plan History ────────────────────────────────────── */}
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
                    {dietPlans.map((plan) => {
                      const planJson = (plan.plan_json ?? {}) as PlanJson;
                      const prototypes = getPrototypes(planJson);
                      const protoCount = prototypes.length;
                      return (
                        <div key={plan.id} className="border rounded-lg overflow-hidden">
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
                                  Diet Plan – {formatDate(plan.issued_at || plan.created_at)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {planJson.totals?.calories || 0} kcal daily
                                  {planJson.weight?.current && ` · ${planJson.weight.current} kg`}
                                  {protoCount > 1 && ` · ${protoCount} Prototypes`}
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
                          {expandedPlanId === plan.id && (
                            <div className="border-t p-4 bg-muted/30">
                              {renderPrototypes(plan, plan.id)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No diet plans */}
            {(!dietPlans || dietPlans.length === 0) && (
              <Card>
                <CardContent className="py-16 text-center">
                  <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No Diet Plans Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your personalised diet plan will appear here once your dietician creates one for
                    you.
                  </p>
                  {!hasBookedAnyAppointment && (
                    <Button
                      variant="outline"
                      className="mt-5"
                      onClick={() => navigate("/patient/appointments")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
        <DashboardFooter />
      </main>
    </div>
  );
};

export default PatientDietPlans;
