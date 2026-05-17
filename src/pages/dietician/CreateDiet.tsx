import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Loader2,
  LogOut,
  Minus,
  Plus,
  Scale,
  Search,
  Settings,
  SquarePen,
  Target,
  Trash2,
  User,
  Users,
  UtensilsCrossed,
  Apple,
  ChevronDown,
  X,
} from "lucide-react";
import { getModulatorEEE, getRDA, OXALATE_LIMIT, PHYTATE_LIMIT } from "@/lib/diet-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import AppSidebar from "@/components/AppSidebar";
import {
  getPatient,
  createDietPlan,
  getDietPlan,
  getDietician,
  updateDietPlan,
} from "@/lib/api";
import { foodService } from "@/lib/food-service";
import type { Food as FoodLibraryItem } from "@/lib/diet-types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  unitName?: string;
  unitWeight?: number;
  oxalate_eee?: number;
  phytate_eee?: number;
}

interface MealItem extends FoodItem {
  id: string;
  quantity: number;
  unit: string;
  calories: number;
  enteredMode: 'target' | 'weight' | 'quantity';
  enteredValue: number;
}

interface MealSlot {
  name: string;
  items: MealItem[];
}

interface DietPrototype {
  id: string;
  name: string;
  meals: MealSlot[];
}

type AddFoodTab = 'target' | 'weight' | 'quantity';
type TargetNutrient = 'protein' | 'carbs' | 'fat';

const createDefaultMealSlots = (): MealSlot[] => [
  { name: "Breakfast", items: [] },
  { name: "Mid-Morning", items: [] },
  { name: "Lunch", items: [] },
  { name: "Evening Snack", items: [] },
  { name: "Dinner", items: [] },
];

const cloneMeals = (sourceMeals: MealSlot[]): MealSlot[] =>
  sourceMeals.map((meal) => ({
    ...meal,
    items: meal.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
  }));

// ─── Component ────────────────────────────────────────────────────────────────
const CreateDiet = () => {
  const { slug, planId } = useParams<{ slug: string; planId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const editingPlanId = planId ? Number(planId) : null;
  const isEditMode = Number.isFinite(editingPlanId) && editingPlanId !== null;
  
  // Extract patient ID from slug (format: "patient-name-123")
  const patientId = parseInt(slug?.split("-").pop() || "0");

  // Data fetching
  const { data: currentDietician } = useQuery({
    queryKey: ["dietician", user?.profileId],
    queryFn: () => getDietician(user!.profileId!),
    enabled: !!user?.profileId,
  });

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId),
    enabled: !!patientId,
  });

  const { data: existingPlan, isLoading: existingPlanLoading } = useQuery({
    queryKey: ["diet-plan", editingPlanId],
    queryFn: () => getDietPlan(editingPlanId as number),
    enabled: !!editingPlanId,
  });

  // Save diet plan mutation (create or update)
  const savePlanMutation = useMutation({
    mutationFn: (planData: { patient_id: number; rd_id: number; plan_json: object }) =>
      isEditMode && editingPlanId
        ? updateDietPlan(editingPlanId, { plan_json: planData.plan_json })
        : createDietPlan(planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-diet-plans", patientId] });
      if (editingPlanId) {
        queryClient.invalidateQueries({ queryKey: ["diet-plan", editingPlanId] });
      }
      toast.success(isEditMode ? "Diet plan updated successfully!" : "Diet plan saved successfully!");
      navigate(`/dietician/patient/${slug}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to ${isEditMode ? "update" : "save"} diet plan: ${error.message}`);
    },
  });

  // UI State
  const [activeMeal, setActiveMeal] = useState("Breakfast");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [prototypes, setPrototypes] = useState<DietPrototype[]>([
    { id: crypto.randomUUID(), name: "Prototype 1", meals: createDefaultMealSlots() },
  ]);
  const [activePrototypeId, setActivePrototypeId] = useState<string>("");

  // Body composition state
  const [currentWeight, setCurrentWeight] = useState<string>("");
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");

  // Calculate BMI
  const calculateBMI = (weight: string, heightCm: string): string | null => {
    const w = parseFloat(weight);
    const h = parseFloat(heightCm);
    if (!w || !h || h === 0) return null;
    const heightM = h / 100;
    return (w / (heightM * heightM)).toFixed(1);
  };
  const bmi = calculateBMI(currentWeight, height);

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
  const [prototypeDialogOpen, setPrototypeDialogOpen] = useState(false);

  // Add Food Modal state
  const [addFoodModalOpen, setAddFoodModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [activeTab, setActiveTab] = useState<AddFoodTab>('weight');
  const [targetNutrient, setTargetNutrient] = useState<TargetNutrient>('protein');
  const [targetAmount, setTargetAmount] = useState<string>('20');
  const [weightInput, setWeightInput] = useState<string>('100');
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [editingMealItemId, setEditingMealItemId] = useState<string | null>(null);
  const [isHydratedFromPlan, setIsHydratedFromPlan] = useState(false);
  const [initialDraftSnapshot, setInitialDraftSnapshot] = useState<string>("");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const dailyTarget = { calories: 1800, protein: 90, carbs: 200, fat: 60 };

  const createDraftSnapshot = (
    draftPrototypes: DietPrototype[],
    draftCurrentWeight: string,
    draftTargetWeight: string,
    draftHeight: string,
    draftNote: string,
  ) =>
    JSON.stringify({
      prototypes: draftPrototypes.map((prototype) => ({
        name: prototype.name,
        meals: prototype.meals.map((meal) => ({
          name: meal.name,
          items: meal.items.map((item) => {
            const quantity = Number(item.quantity) || 0;
            const caloriesPer100 =
              typeof item.caloriesPer100 === "number"
                ? item.caloriesPer100
                : typeof item.calories === "number"
                  ? item.calories
                  : 0;

            return {
              name: item.name,
              nameHindi: item.nameHindi || "",
              quantity: Number(quantity.toFixed(2)),
              unit: item.unit,
              caloriesPer100: Number(caloriesPer100.toFixed(2)),
              protein: Number((Number(item.protein) || 0).toFixed(2)),
              carbs: Number((Number(item.carbs) || 0).toFixed(2)),
              fat: Number((Number(item.fat) || 0).toFixed(2)),
            };
          }),
        })),
      })),
      currentWeight: draftCurrentWeight.trim(),
      targetWeight: draftTargetWeight.trim(),
      height: draftHeight.trim(),
      note: draftNote.trim(),
    });

  const currentDraftSnapshot = useMemo(
    () => createDraftSnapshot(prototypes, currentWeight, targetWeight, height, pdfNote),
    [prototypes, currentWeight, targetWeight, height, pdfNote],
  );

  const hasUnsavedChanges = initialDraftSnapshot !== "" && currentDraftSnapshot !== initialDraftSnapshot;

  const activePrototype = useMemo(
    () => prototypes.find((prototype) => prototype.id === activePrototypeId) || prototypes[0],
    [prototypes, activePrototypeId],
  );

  const meals = activePrototype?.meals || [];

  const setActivePrototypeMeals = (updater: (previousMeals: MealSlot[]) => MealSlot[]) => {
    if (!activePrototype) return;

    setPrototypes((previousPrototypes) =>
      previousPrototypes.map((prototype) =>
        prototype.id === activePrototype.id
          ? { ...prototype, meals: updater(prototype.meals) }
          : prototype,
      ),
    );
  };

  useEffect(() => {
    if (prototypes.length === 0) return;

    if (!activePrototypeId || !prototypes.some((prototype) => prototype.id === activePrototypeId)) {
      setActivePrototypeId(prototypes[0].id);
    }
  }, [prototypes, activePrototypeId]);

  useEffect(() => {
    if (meals.length === 0) {
      setActiveMeal("");
      return;
    }

    if (!meals.some((meal) => meal.name === activeMeal)) {
      setActiveMeal(meals[0].name);
    }
  }, [meals, activeMeal]);

  const navigateBackToPatient = () => {
    navigate(`/dietician/patient/${slug}`);
  };

  const handleBackWithConfirmation = () => {
    if (savePlanMutation.isPending) return;

    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      return;
    }

    navigateBackToPatient();
  };

  const handleSaveAndLeave = () => {
    setShowUnsavedDialog(false);
    handleSaveDietPlan();
  };

  const handleDiscardAndLeave = () => {
    setShowUnsavedDialog(false);
    navigateBackToPatient();
  };

  // Handlers
  const handleLogout = () => {
    logout();
    navigate("/");
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

  const generateDietPlanPDFUrl = () => {
    if (!patient) return null;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const pageBottom = pageHeight - 25;
    const prototypesToExport = prototypes.length > 0
      ? prototypes
      : [{ id: crypto.randomUUID(), name: "Prototype 1", meals: createDefaultMealSlots() }];

    const computePrototypeMicros = (prototype: DietPrototype) => {
      return prototype.meals.reduce(
        (accumulator, meal) => {
          meal.items.forEach((item) => {
            const factor = item.quantity / 100;
            accumulator.fiber += (item.fiber || 0) * factor;
            accumulator.iron += (item.iron || 0) * factor;
            accumulator.calcium += (item.calcium || 0) * factor;
            accumulator.magnesium += (item.magnesium || 0) * factor;
            accumulator.zinc += (item.zinc || 0) * factor;
            accumulator.potassium += (item.potassium || 0) * factor;
            accumulator.sodium += (item.sodium || 0) * factor;
            accumulator.vitamin_a += (item.vitamin_a || 0) * factor;
            accumulator.vitamin_c += (item.vitamin_c || 0) * factor;
            accumulator.vitamin_d += (item.vitamin_d || 0) * factor;
            accumulator.vitamin_e += (item.vitamin_e || 0) * factor;
            accumulator.vitamin_k += (item.vitamin_k || 0) * factor;
            accumulator.vitamin_b1 += (item.vitamin_b1 || 0) * factor;
            accumulator.vitamin_b2 += (item.vitamin_b2 || 0) * factor;
            accumulator.vitamin_b3 += (item.vitamin_b3 || 0) * factor;
            accumulator.vitamin_b6 += (item.vitamin_b6 || 0) * factor;
            accumulator.vitamin_b9 += (item.vitamin_b9 || 0) * factor;
            accumulator.vitamin_b12 += (item.vitamin_b12 || 0) * factor;
          });
          return accumulator;
        },
        {
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
        },
      );
    };

    const computePrototypeModulators = (prototype: DietPrototype) => {
      const oxContributions: Record<string, number> = {};
      const phContributions: Record<string, number> = {};
      let totalOx = 0;
      let totalPh = 0;

      prototype.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          const grams = item.quantity;
          const oxEEE = getModulatorEEE(item.name, "oxalate", item.oxalate_eee);
          const phEEE = getModulatorEEE(item.name, "phytate", item.phytate_eee);

          const oxVal = (grams * oxEEE) / 100;
          const phVal = (grams * phEEE) / 100;

          if (oxVal > 0) {
            oxContributions[item.name] = (oxContributions[item.name] || 0) + oxVal;
            totalOx += oxVal;
          }
          if (phVal > 0) {
            phContributions[item.name] = (phContributions[item.name] || 0) + phVal;
            totalPh += phVal;
          }
        });
      });

      const getTopContributors = (map: Record<string, number>) =>
        Object.entries(map)
          .map(([name, amount]) => ({ name: name.toLowerCase(), amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);

      return {
        oxalate: {
          total: totalOx,
          percentage: (totalOx / OXALATE_LIMIT) * 100,
          contributors: getTopContributors(oxContributions),
        },
        phytate: {
          total: totalPh,
          percentage: (totalPh / PHYTATE_LIMIT) * 100,
          contributors: getTopContributors(phContributions),
        },
      };
    };

    prototypesToExport.forEach((prototype, prototypeIndex) => {
      if (prototypeIndex > 0) {
        doc.addPage();
      }

      let y = 15;
      const ensureSpace = (space: number) => {
        if (y + space > pageBottom) {
          doc.addPage();
          y = 20;
        }
      };
      const prototypeTotals = prototype.meals.reduce(
        (accumulator, meal) => {
          meal.items.forEach((item) => {
            const factor = item.quantity / 100;
            accumulator.calories += item.calories * factor;
            accumulator.protein += item.protein * factor;
            accumulator.carbs += item.carbs * factor;
            accumulator.fat += item.fat * factor;
          });
          return accumulator;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      doc.setFontSize(22);
      doc.setTextColor(14, 165, 233);
      doc.setFont("helvetica", "bold");
      doc.text("DietByRD Diet Plan", margin, y);
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(prototype.name, pageWidth - margin - doc.getTextWidth(prototype.name), y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.text(`Patient: ${patient.name || "N/A"} (${patient.age || "N/A"}y)`, margin, y);
      doc.text(`Date: ${formatDate()}`, margin + 90, y);
      y += 5;
      doc.text(`Dietician: ${currentDietician?.name || "N/A"}`, margin, y);
      if (patient.diagnosis) doc.text(`Diagnosis: ${patient.diagnosis}`, margin + 90, y);
      y += 6;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text("Daily Summary", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Calories: ${Math.round(prototypeTotals.calories)} / ${dailyTarget.calories} kcal`, margin, y);
      doc.text(`Protein: ${prototypeTotals.protein.toFixed(1)}g`, margin + 65, y);
      doc.text(`Carbs: ${prototypeTotals.carbs.toFixed(1)}g`, margin + 105, y);
      doc.text(`Fat: ${prototypeTotals.fat.toFixed(1)}g`, margin + 145, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(14, 165, 233);
      doc.text("Meal Plan", margin, y);
      y += 8;

      prototype.meals.forEach((meal) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(240, 249, 255);
        doc.roundedRect(margin, y - 6, pageWidth - margin * 2, 9, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(14, 165, 233);
        doc.text(meal.name, margin + 3, y);
        const mealCals = Math.round(getMealCalories(meal));
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`${mealCals} kcal`, pageWidth - margin - 20, y);
        y += 8;

        if (meal.items.length === 0) {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(150);
          doc.setFontSize(10);
          doc.text("No items", margin + 5, y);
          y += 8;
        }

        meal.items.forEach((item) => {
          const factor = item.quantity / 100;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0);
          doc.setFontSize(10);
          doc.text(`• ${item.name}`, margin + 5, y);
          doc.setFontSize(9);
          doc.setTextColor(80);
          doc.text(`- ${item.quantity} ${item.unit}`, margin + 70, y);
          const macroSegments: Array<{ text: string; color: [number, number, number] }> = [
            { text: `${Math.round(item.calories * factor)} kcal`, color: [217, 119, 6] },
            { text: "  |  ", color: [120, 120, 120] },
            { text: `P: ${(item.protein * factor).toFixed(1)}`, color: [37, 99, 235] },
            { text: "  ", color: [120, 120, 120] },
            { text: `C: ${(item.carbs * factor).toFixed(1)}`, color: [22, 163, 74] },
            { text: "  ", color: [120, 120, 120] },
            { text: `F: ${(item.fat * factor).toFixed(1)}`, color: [219, 39, 119] },
          ];
          let macroX = pageWidth - margin - 86;
          macroSegments.forEach((segment) => {
            doc.setTextColor(...segment.color);
            doc.text(segment.text, macroX, y);
            macroX += doc.getTextWidth(segment.text);
          });
          y += 6;
        });

        y += 3;
      });

      const prototypeMicros = computePrototypeMicros(prototype);
      const prototypeMods = computePrototypeModulators(prototype);

      // Micronutrients Summary
      ensureSpace(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(14, 165, 233);
      doc.text("Micronutrients", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      doc.setFontSize(8);

      const microItems = [
        { label: "Fiber", key: "fiber", unit: "g" },
        { label: "Calcium", key: "calcium", unit: "mg" },
        { label: "Iron", key: "iron", unit: "mg" },
        { label: "Magnesium", key: "magnesium", unit: "mg" },
        { label: "Zinc", key: "zinc", unit: "mg" },
        { label: "Potassium", key: "potassium", unit: "mg" },
        { label: "Sodium", key: "sodium", unit: "mg" },
        { label: "Vitamin A", key: "vitamin_a", unit: "ug" },
        { label: "Vitamin C", key: "vitamin_c", unit: "mg" },
        { label: "Vitamin D", key: "vitamin_d", unit: "ug" },
        { label: "Vitamin E", key: "vitamin_e", unit: "mg" },
        { label: "Vitamin K", key: "vitamin_k", unit: "ug" },
        { label: "Thiamine (B1)", key: "vitamin_b1", unit: "mg" },
        { label: "Riboflavin (B2)", key: "vitamin_b2", unit: "mg" },
        { label: "Niacin (B3)", key: "vitamin_b3", unit: "mg" },
        { label: "B6", key: "vitamin_b6", unit: "mg" },
        { label: "Folate (B9)", key: "vitamin_b9", unit: "ug" },
        { label: "B12", key: "vitamin_b12", unit: "ug" },
      ];

      const colWidth = (pageWidth - margin * 2) / 2;
      const maxRows = 10;
      let col = 0;
      let row = 0;
      const microStartY = y;
      microItems.forEach((item, index) => {
        if (index > 0 && index % maxRows === 0) {
          col += 1;
          row = 0;
        }
        if (col > 1) {
          doc.addPage();
          y = 20;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(14, 165, 233);
          doc.text("Micronutrients (cont.)", margin, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(60);
          col = 0;
          row = 0;
        }
        const currentY = (col > 0 ? y : microStartY) + row * 6;
        const x = margin + col * colWidth;
        // @ts-ignore
        const value = prototypeMicros[item.key] || 0;
        const rdaAge = patient?.age || 30;
        const rdaSex: "M" | "F" = patient?.gender === "female" ? "F" : "M";
        const target = getRDA(item.key as never, rdaAge, rdaSex);
        const pct = target > 0 ? (value / target) * 100 : 0;
        doc.text(`${item.label}: ${value.toFixed(1)} / ${target} ${item.unit}`, x, currentY);
        doc.setTextColor(120);
        doc.text(`${pct.toFixed(0)}%`, x + colWidth - 6, currentY, { align: "right" });
        doc.setTextColor(60);
        row += 1;
      });

      y = Math.max(y, microStartY + Math.min(maxRows, microItems.length) * 6 + 6);

      // Micronutrient Modulators Index
      ensureSpace(18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(14, 165, 233);
      doc.text("Micronutrient Modulators Index", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60);

      const modItems = [
        { label: "Oxalate Index", result: prototypeMods.oxalate, type: "oxalate" as const },
        { label: "Phytate Index", result: prototypeMods.phytate, type: "phytate" as const },
      ];

      modItems.forEach((item, index) => {
        const x = margin + index * 80;
        let zone = "";
        let color: [number, number, number] = [34, 197, 94];
        if (item.type === "oxalate") {
          if (item.result.percentage < 60) {
            zone = "Healthy";
            color = [34, 197, 94];
          } else {
            zone = "Caution";
            color = [234, 179, 8];
          }
        } else {
          if (item.result.percentage < 10) {
            zone = "Not enough";
            color = [59, 130, 246];
          } else if (item.result.percentage < 70) {
            zone = "Healthy";
            color = [34, 197, 94];
          } else {
            zone = "Caution";
            color = [234, 179, 8];
          }
        }
        doc.setFont("helvetica", "bold");
        doc.text(`${item.label}: ${item.result.percentage.toFixed(0)}%`, x, y);
        doc.setFont("helvetica", "normal");
        doc.text(zone, x + 65, y, { align: "right" });
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, y + 2, 65, 2.5, 0.75, 0.75, "F");
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, y + 2, 65 * Math.min(item.result.percentage / 100, 1), 2.5, 0.75, 0.75, "F");
        if (item.result.contributors.length > 0) {
          doc.setFontSize(7);
          doc.setTextColor(120);
          doc.setFont("helvetica", "italic");
          doc.text(`Top: ${item.result.contributors.map((c) => c.name).join(", ")}`, x, y + 6);
          doc.setFontSize(9);
          doc.setTextColor(60);
          doc.setFont("helvetica", "normal");
        }
      });
    });

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
        doc.rect(0, i * bandHeight, pageWidth, bandHeight + 0.5, "F");
      }

      let currY = 30;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(30, 30, 30);
      doc.text("A Note from Your Dietitian", pageWidth / 2, currY, { align: "center" });
      currY += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);
      const splitUserNote = doc.splitTextToSize(pdfNote.trim(), pageWidth - margin * 2);
      doc.text(splitUserNote, margin, currY, { lineHeightFactor: 1.5 });
    }

    return doc.output("bloburl");
  };

  const handleGeneratePDF = async () => {
    if (!patient) {
      toast.error("Patient information not available");
      return;
    }
    setIsGeneratingPdf(true);
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = generateDietPlanPDFUrl();
      if (!url) throw new Error("Could not generate PDF");
      setPdfUrl(url);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (!existingPlan || isHydratedFromPlan) return;

    const planJson = (existingPlan.plan_json ?? {}) as {
      prototypes?: Array<{
        id?: string;
        name?: string;
        meals?: Array<{
          name?: string;
          items?: Array<{
            name?: string;
            nameHindi?: string;
            quantity?: number;
            unit?: string;
            calories?: number;
            protein?: number;
            carbs?: number;
            fat?: number;
          }>;
        }>;
      }>;
      meals?: Array<{
        name?: string;
        items?: Array<{
          name?: string;
          nameHindi?: string;
          quantity?: number;
          unit?: string;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        }>;
      }>;
      weight?: { current?: number | null; target?: number | null };
      note?: string;
    };

    const hydrateMeals = (
      sourceMeals: Array<{
        name?: string;
        items?: Array<{
          name?: string;
          nameHindi?: string;
          quantity?: number;
          unit?: string;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        }>;
      }> = [],
    ): MealSlot[] =>
      sourceMeals.map((meal, mealIndex) => ({
        name: meal.name || `Meal ${mealIndex + 1}`,
        items: (meal.items || []).map((item) => {
          const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 100;
          const caloriesPer100 = Math.round(((item.calories || 0) / quantity) * 100 * 10) / 10;
          const proteinPer100 = Math.round(((item.protein || 0) / quantity) * 100 * 10) / 10;
          const carbsPer100 = Math.round(((item.carbs || 0) / quantity) * 100 * 10) / 10;
          const fatPer100 = Math.round(((item.fat || 0) / quantity) * 100 * 10) / 10;

          return {
            id: crypto.randomUUID(),
            name: item.name || "Food item",
            nameHindi: item.nameHindi,
            quantity,
            unit: item.unit || "g",
            caloriesPer100,
            calories: caloriesPer100,
            protein: proteinPer100,
            carbs: carbsPer100,
            fat: fatPer100,
            enteredMode: "weight" as const,
            enteredValue: quantity,
          };
        }),
      }));

    const hydratedPrototypesFromPlan = (planJson.prototypes || [])
      .map((prototype, index) => ({
        id: prototype.id || crypto.randomUUID(),
        name: prototype.name || `Prototype ${index + 1}`,
        meals: hydrateMeals(prototype.meals || []),
      }))
      .filter((prototype) => prototype.meals.length > 0);

    const fallbackHydratedMeals = hydrateMeals(planJson.meals || []);

    const hydratedPrototypes =
      hydratedPrototypesFromPlan.length > 0
        ? hydratedPrototypesFromPlan
        : fallbackHydratedMeals.length > 0
          ? [{ id: crypto.randomUUID(), name: "Prototype 1", meals: fallbackHydratedMeals }]
          : [{ id: crypto.randomUUID(), name: "Prototype 1", meals: createDefaultMealSlots() }];

    setPrototypes(hydratedPrototypes);
    setActivePrototypeId(hydratedPrototypes[0].id);
    setActiveMeal(hydratedPrototypes[0].meals[0]?.name || "");

    if (planJson.weight?.current !== null && planJson.weight?.current !== undefined) {
      setCurrentWeight(String(planJson.weight.current));
    }
    if (planJson.weight?.target !== null && planJson.weight?.target !== undefined) {
      setTargetWeight(String(planJson.weight.target));
    }
    if (planJson.note) {
      setPdfNote(planJson.note);
    }

    setInitialDraftSnapshot(
      createDraftSnapshot(
        hydratedPrototypes,
        planJson.weight?.current !== null && planJson.weight?.current !== undefined
          ? String(planJson.weight.current)
          : "",
        planJson.weight?.target !== null && planJson.weight?.target !== undefined
          ? String(planJson.weight.target)
          : "",
        "",
        planJson.note || "",
      ),
    );

    setIsHydratedFromPlan(true);
  }, [existingPlan, isHydratedFromPlan]);

  useEffect(() => {
    if (isEditMode || initialDraftSnapshot) return;

    const defaultPrototypes = [{ id: crypto.randomUUID(), name: "Prototype 1", meals: createDefaultMealSlots() }];
    setPrototypes(defaultPrototypes);
    setActivePrototypeId(defaultPrototypes[0].id);

    setInitialDraftSnapshot(
      createDraftSnapshot(
        defaultPrototypes,
        "",
        "",
        "",
        "",
      ),
    );
  }, [isEditMode, initialDraftSnapshot]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleAddNewMeal = () => {
    const trimmedName = newMealName.trim();
    if (!trimmedName) return;
    
    // Check if meal already exists
    if (meals.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("A meal with this name already exists");
      return;
    }
    
    setActivePrototypeMeals((previousMeals) => [...previousMeals, { name: trimmedName, items: [] }]);
    setActiveMeal(trimmedName);
    setNewMealName("");
    setShowAddMeal(false);
    toast.success(`"${trimmedName}" meal added`);
  };

  const startEditMealName = (mealName: string) => {
    setEditingMealName(mealName);
    setEditMealNameInput(mealName);
  };

  const saveEditMealName = (originalMealName: string) => {
    const trimmedName = editMealNameInput.trim();
    if (!trimmedName) { setEditingMealName(null); setEditMealNameInput(""); return; }
    if (trimmedName !== originalMealName && meals.some((m) => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("A meal with this name already exists");
      return;
    }
    setActivePrototypeMeals((previousMeals) =>
      previousMeals.map((meal) => (meal.name === originalMealName ? { ...meal, name: trimmedName } : meal)),
    );
    if (activeMeal === originalMealName) setActiveMeal(trimmedName);
    setEditingMealName(null);
    setEditMealNameInput("");
    toast.success("Meal name updated");
  };

  const handleRemoveMeal = (mealName: string) => {
    if (meals.length <= 1) {
      toast.error("At least one meal is required");
      return;
    }
    setActivePrototypeMeals((previousMeals) => previousMeals.filter((meal) => meal.name !== mealName));
    if (activeMeal === mealName) {
      setActiveMeal(meals[0].name !== mealName ? meals[0].name : meals[1]?.name || "");
    }
    toast.success(`"${mealName}" removed`);
  };

  const trimmedSearchTerm = searchTerm.trim();

  const { data: searchedFoods = [] } = useQuery({
    queryKey: ["create-diet-food-search", trimmedSearchTerm],
    queryFn: () =>
      trimmedSearchTerm.length > 0
        ? foodService.search(trimmedSearchTerm)
        : foodService.getAll(),
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

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
    treat: food.food_type === "TREAT",
    unitName: food.unit_name,
    unitWeight: food.unit_weight_g,
    oxalate_eee: food.oxalate_eee,
    phytate_eee: food.phytate_eee,
  }));

  // Open Add Food Modal
  const handleFoodClick = (food: FoodItem) => {
    setEditingMealItemId(null);
    setSelectedFood(food);
    setWeightInput('100');
    setQuantityInput('1');
    setTargetAmount('20');
    
    // Set default tab based on food properties
    if (food.unitName) {
      setActiveTab('quantity');
    } else if (food.protein > 10) {
      setActiveTab('target');
      setTargetNutrient('protein');
    } else {
      setActiveTab('weight');
    }
    
    setAddFoodModalOpen(true);
    setSearchTerm("");
  };

  const handleEditFoodItem = (item: MealItem) => {
    setSelectedFood(item);
    setEditingMealItemId(item.id);

    const defaultTab: AddFoodTab = item.unitName ? 'quantity' : 'weight';
    setActiveTab(defaultTab);
    setWeightInput(String(Math.round(item.quantity)));

    if (item.unitName && item.unitWeight) {
      const derivedQuantity = item.quantity / item.unitWeight;
      setQuantityInput(String(Number.isFinite(derivedQuantity) ? Math.max(0.1, Number(derivedQuantity.toFixed(2))) : 1));
    } else {
      setQuantityInput('1');
    }

    setTargetAmount('20');
    setAddFoodModalOpen(true);
  };

  // Calculate grams for target nutrient
  const calculateGramsForTarget = (targetGrams: number, nutrient: TargetNutrient, food: FoodItem): number => {
    const nutrientPer100 = food[nutrient];
    if (nutrientPer100 <= 0) return 0;
    return Math.round((targetGrams / nutrientPer100) * 100);
  };

  // Computed values for preview
  const computedValues = useMemo(() => {
    if (!selectedFood) return null;

    let grams = 0;
    let displayQty = '';
    let enteredVal = 0;

    if (activeTab === 'target') {
      enteredVal = Number(targetAmount);
      grams = calculateGramsForTarget(enteredVal, targetNutrient, selectedFood);
      displayQty = `${grams}g (for ${enteredVal}g ${targetNutrient})`;
    } else if (activeTab === 'weight') {
      enteredVal = Number(weightInput);
      grams = enteredVal;
      displayQty = `${enteredVal}g`;
    } else if (activeTab === 'quantity') {
      enteredVal = Number(quantityInput);
      const unitWeight = selectedFood.unitWeight || 100;
      grams = enteredVal * unitWeight;
      displayQty = `${enteredVal} ${selectedFood.unitName || 'units'} (${grams}g)`;
    }

    const factor = grams / 100;
    return {
      grams,
      displayQty,
      enteredVal,
      calories: Math.round(selectedFood.caloriesPer100 * factor),
      protein: Math.round(selectedFood.protein * factor * 10) / 10,
      carbs: Math.round(selectedFood.carbs * factor * 10) / 10,
      fat: Math.round(selectedFood.fat * factor * 10) / 10,
    };
  }, [selectedFood, activeTab, targetAmount, targetNutrient, weightInput, quantityInput]);

  // Confirm adding food
  const confirmAddFood = () => {
    if (!selectedFood || !computedValues || computedValues.grams <= 0) return;

    const newItem: MealItem = {
      ...selectedFood,
      id: crypto.randomUUID(),
      quantity: computedValues.grams,
      unit: "g",
      calories: selectedFood.caloriesPer100,
      enteredMode: activeTab,
      enteredValue: computedValues.enteredVal,
    };

    setActivePrototypeMeals((previousMeals) =>
      previousMeals.map((m) => {
        if (m.name !== activeMeal) return m;

        if (editingMealItemId) {
          return {
            ...m,
            items: m.items.map((item) => (item.id === editingMealItemId ? { ...newItem, id: editingMealItemId } : item)),
          };
        }

        return { ...m, items: [...m.items, newItem] };
      })
    );

    setEditingMealItemId(null);
    setAddFoodModalOpen(false);
  };

  const updateQuantity = (mealName: string, itemId: string, delta: number) => {
    setActivePrototypeMeals((previousMeals) =>
      previousMeals.map((meal) =>
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
    setActivePrototypeMeals((previousMeals) =>
      previousMeals.map((meal) =>
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
      calories: 0, protein: 0, carbs: 0, fat: 0,
      fiber: 0, iron: 0, calcium: 0, magnesium: 0, zinc: 0, potassium: 0, sodium: 0,
      vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
      vitamin_b1: 0, vitamin_b2: 0, vitamin_b3: 0, vitamin_b6: 0, vitamin_b9: 0, vitamin_b12: 0,
    }
  );

  const modulators = useMemo(() => {
    const oxContributions: Record<string, number> = {};
    const phContributions: Record<string, number> = {};
    let totalOx = 0;
    let totalPh = 0;

    meals.forEach((meal) => {
      meal.items.forEach((item) => {
        const grams = item.quantity;
        const oxEEE = getModulatorEEE(item.name, "oxalate");
        const phEEE = getModulatorEEE(item.name, "phytate");

        const oxVal = (grams * oxEEE) / 100;
        const phVal = (grams * phEEE) / 100;

        if (oxVal > 0) {
          oxContributions[item.name] = (oxContributions[item.name] || 0) + oxVal;
          totalOx += oxVal;
        }
        if (phVal > 0) {
          phContributions[item.name] = (phContributions[item.name] || 0) + phVal;
          totalPh += phVal;
        }
      });
    });

    const getTopContributors = (map: Record<string, number>) =>
      Object.entries(map)
        .map(([name, amount]) => ({ name: name.toLowerCase(), amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

    return {
      oxalate: {
        total: totalOx,
        percentage: (totalOx / OXALATE_LIMIT) * 100,
        contributors: getTopContributors(oxContributions),
      },
      phytate: {
        total: totalPh,
        percentage: (totalPh / PHYTATE_LIMIT) * 100,
        contributors: getTopContributors(phContributions),
      },
    };
  }, [meals]);

  const ModulatorBar = ({ label, percentage, contributors, type }: { label: string; percentage: number; contributors: { name: string; amount: number }[]; type: "oxalate" | "phytate" }) => {
    let zone = "";
    let color = "";
    let emoji = "";
    if (type === "oxalate") {
      if (percentage < 60) {
        zone = "Healthy";
        color = "bg-green-500";
        emoji = "🟢";
      } else {
        zone = "Caution";
        color = "bg-yellow-500";
        emoji = "🟡";
      }
    } else {
      if (percentage < 10) {
        zone = "Not enough";
        color = "bg-blue-500";
        emoji = "🔵";
      } else if (percentage < 70) {
        zone = "Healthy";
        color = "bg-green-500";
        emoji = "🟢";
      } else {
        zone = "Caution";
        color = "bg-yellow-500";
        emoji = "🟡";
      }
    }
    return (
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1 font-semibold">
          <span className="text-slate-700">{label}: {percentage.toFixed(0)}%</span>
          <span className="text-slate-500">{emoji} {zone}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
          <div className={`${color} h-full transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
        {contributors.length > 0 && (
          <p className="text-[10px] text-slate-500 leading-tight italic">Top contributors: {contributors.map((c) => c.name).join(", ")}</p>
        )}
      </div>
    );
  };

  const getMealCalories = (meal: MealSlot) =>
    meal.items.reduce((sum, item) => sum + (item.calories * item.quantity) / 100, 0);

  const handleSaveDietPlan = () => {
    if (!currentDietician?.id) {
      toast.error("Dietician information not available");
      return;
    }

    const serializedPrototypes = prototypes.map((prototype, index) => ({
      id: prototype.id,
      name: prototype.name || `Prototype ${index + 1}`,
      meals: prototype.meals.map((meal) => ({
        name: meal.name,
        items: meal.items.map((item) => ({
          name: item.name,
          nameHindi: item.nameHindi,
          quantity: item.quantity,
          unit: item.unit,
          calories: Math.round((item.caloriesPer100 * item.quantity) / 100),
          protein: Math.round((item.protein * item.quantity) / 100 * 10) / 10,
          carbs: Math.round((item.carbs * item.quantity) / 100 * 10) / 10,
          fat: Math.round((item.fat * item.quantity) / 100 * 10) / 10,
        })),
      })),
    }));

    const primaryPrototypeMeals = serializedPrototypes[0]?.meals || [];

    const planJson = {
      meals: primaryPrototypeMeals,
      prototypes: serializedPrototypes,
      totals: {
        calories: Math.round(totalNutrients.calories),
        protein: Math.round(totalNutrients.protein),
        carbs: Math.round(totalNutrients.carbs),
        fat: Math.round(totalNutrients.fat),
      },
      targets: dailyTarget,
      weight: {
        current: currentWeight ? parseFloat(currentWeight) : null,
        target: targetWeight ? parseFloat(targetWeight) : null,
      },
      note: pdfNote,
      createdAt: new Date().toISOString(),
    };

    savePlanMutation.mutate({
      patient_id: patientId,
      rd_id: currentDietician.id,
      plan_json: planJson,
    });
  };

  const caloriePercent = Math.min((totalNutrients.calories / dailyTarget.calories) * 100, 100);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  const handleAddPrototype = (mode: "copy" | "blank") => {
    const prototypeIndex = prototypes.length + 1;
    const nextPrototype: DietPrototype = {
      id: crypto.randomUUID(),
      name: `Prototype ${prototypeIndex}`,
      meals: mode === "copy" && activePrototype ? cloneMeals(activePrototype.meals) : createDefaultMealSlots(),
    };

    setPrototypes((previousPrototypes) => [...previousPrototypes, nextPrototype]);
    setActivePrototypeId(nextPrototype.id);
    setActiveMeal(nextPrototype.meals[0]?.name || "");
    setPrototypeDialogOpen(false);
    toast.success(`${nextPrototype.name} created`);
  };

  const hasAnyFoodItems = prototypes.some((prototype) =>
    prototype.meals.some((meal) => meal.items.length > 0),
  );

  const sidebarSections = [
    {
      title: "Dashboard",
      items: [
        { label: "My Patients", href: "/dietician", icon: Users },
        { label: "My Schedule", href: "/dietician/schedule", icon: CalendarDays },
        { label: "Diet Plans", href: "/dietician/diet", icon: UtensilsCrossed },
        { label: "Food Library", href: "/dietician/food-library", icon: Apple },
      ],
    },
    {
      title: "Settings",
      items: [{ label: "Preferences", href: "/dietician/settings", icon: Settings }],
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

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle="Dietician Portal"
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackWithConfirmation}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{isEditMode ? "Edit Diet Plan" : "Create Diet Plan"}</h1>
              {patient && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span><span className="text-xs uppercase tracking-wider">Name:</span> <span className="font-medium">{patient.name}</span></span>
                  <span className="text-muted-foreground/40">|</span>
                  <span><span className="text-xs uppercase tracking-wider">Age:</span> {patient.age} yrs</span>
                  <span className="text-muted-foreground/40">|</span>
                  <span><span className="text-xs uppercase tracking-wider">Diagnosis:</span> {patient.diagnosis || "General"}</span>
                  {patient.dietary_preference && (
                    <>
                      <span className="text-muted-foreground/40">|</span>
                      <span><span className="text-xs uppercase tracking-wider">Diet:</span> {patient.dietary_preference}</span>
                    </>
                  )}
                  {patient.phone && (
                    <>
                      <span className="text-muted-foreground/40">|</span>
                      <span><span className="text-xs uppercase tracking-wider">Phone:</span> {patient.phone}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
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

        {/* Loading state */}
        {(patientLoading || existingPlanLoading) && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              {existingPlanLoading ? "Loading plan data..." : "Loading patient data..."}
            </span>
          </div>
        )}

        {/* Not found state */}
        {!patientLoading && !existingPlanLoading && !patient && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Patient not found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/dietician")}>
                Back to Patients
              </Button>
            </div>
          </div>
        )}

        {!patientLoading && !existingPlanLoading && patient && isEditMode && !existingPlan && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Diet plan not found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate(`/dietician/patient/${slug}`)}>
                Back to Patient
              </Button>
            </div>
          </div>
        )}

        {/* Diet Creation Workbench */}
        {!patientLoading && !existingPlanLoading && patient && (!isEditMode || !!existingPlan) && (
          <div className="flex-1 flex overflow-hidden">
            {/* Body Composition + Meals sidebar */}
            <div className="w-56 border-r flex flex-col">
              <div className="p-4 border-b bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Prototypes
                  </div>
                  <button
                    onClick={() => setPrototypeDialogOpen(true)}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-auto">
                  {prototypes.map((prototype) => {
                    const isActivePrototype = prototype.id === activePrototype?.id;
                    const calories = Math.round(
                      prototype.meals.reduce((total, meal) => total + getMealCalories(meal), 0),
                    );
                    return (
                      <button
                        key={prototype.id}
                        onClick={() => setActivePrototypeId(prototype.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors ${
                          isActivePrototype
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <div className="text-xs font-semibold leading-tight">{prototype.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{calories} kcal</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Body composition section */}
              <div className="p-4 border-b bg-muted/30">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Body Composition
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                      Weight (kg)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 75"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      Height (cm)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 170"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  {bmi && (
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-xs text-muted-foreground">BMI</div>
                      <div className={`text-lg font-bold ${
                        parseFloat(bmi) < 18.5 ? 'text-blue-600' :
                        parseFloat(bmi) < 25 ? 'text-green-600' :
                        parseFloat(bmi) < 30 ? 'text-orange-600' : 'text-red-600'
                      }`}>{bmi}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {parseFloat(bmi) < 18.5 ? 'Underweight' :
                         parseFloat(bmi) < 25 ? 'Normal' :
                         parseFloat(bmi) < 30 ? 'Overweight' : 'Obese'}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-muted-foreground" />
                      Target (kg)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 65"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                {currentWeight && targetWeight && (
                  <div className="mt-3 text-xs">
                    {parseFloat(currentWeight) > parseFloat(targetWeight) ? (
                      <span className="text-orange-600 font-medium">
                        ↓ Lose {(parseFloat(currentWeight) - parseFloat(targetWeight)).toFixed(1)} kg
                      </span>
                    ) : parseFloat(currentWeight) < parseFloat(targetWeight) ? (
                      <span className="text-green-600 font-medium">
                        ↑ Gain {(parseFloat(targetWeight) - parseFloat(currentWeight)).toFixed(1)} kg
                      </span>
                    ) : (
                      <span className="text-blue-600 font-medium">✓ Maintain weight</span>
                    )}
                  </div>
                )}
              </div>

              {/* Meals list */}
              <div className="flex-1 p-4 space-y-1 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Daily Meals
                  </div>
                  <button
                    onClick={() => setShowAddMeal(true)}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                
                {/* Add new meal input */}
                {showAddMeal && (
                  <div className="mb-3 p-2 bg-muted/50 rounded-lg space-y-2">
                    <Input
                      placeholder="Meal name (e.g. Pre-Workout)"
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
                        <Plus className="w-3 h-3 mr-1" /> Add Meal
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
                  const itemCount = meal.items.length;
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
                            onChange={(e) => setEditMealNameInput(e.target.value)}
                            onBlur={() => saveEditMealName(meal.name)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditMealName(meal.name);
                              if (e.key === "Escape") { setEditingMealName(null); setEditMealNameInput(""); }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-7 text-xs font-semibold"
                            autoFocus
                          />
                        ) : (
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="truncate">{meal.name}</span>
                              {itemCount > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
                                  {itemCount}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{cal} kcal</div>
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
              </div>
            </div>

            {/* Food search and items */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 pb-0">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search or browse food library..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    className="pl-12 h-12 text-base rounded-xl border-2"
                  />
                  {searchFocused && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-card border-2 border-t-0 rounded-b-xl shadow-lg z-10 max-h-72 overflow-y-auto">
                      {!trimmedSearchTerm && (
                        <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b bg-muted/40">
                          All foods — type to filter
                        </div>
                      )}
                      {searchResults.map((food, i) => (
                        <button
                          key={i}
                          onClick={() => handleFoodClick(food)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-lg">
                              🍽️
                            </div>
                            <div>
                              <div className="font-medium text-sm flex items-center gap-2">
                                {food.name}
                                {food.treat && (
                                  <Badge
                                    variant="outline"
                                    className="text-warning border-warning/30 text-[10px]"
                                  >
                                    ⚠ Treat
                                  </Badge>
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
                            <span className="text-sm text-muted-foreground">
                              {food.caloriesPer100}kcal
                            </span>
                            <Plus className="w-4 h-4 text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Current meal items */}
              <div className="flex-1 overflow-auto p-6 space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg">{activeMeal}</h2>
                    <Badge variant="secondary" className="text-[10px]">{activePrototype?.name}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(getMealCalories(meals.find((meal) => meal.name === activeMeal) || { name: "", items: [] }))} kcal
                  </span>
                </div>

                {meals.find((m) => m.name === activeMeal)?.items.map((item) => {
                  const factor = item.quantity / 100;
                  return (
                    <div
                      key={item.id}
                      className="bg-muted/30 border rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-xl">
                          🍽️
                        </div>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.nameHindi && (
                            <div className="text-xs text-muted-foreground">
                              {item.nameHindi}
                            </div>
                          )}
                          <div className="text-xs flex gap-3 mt-0.5">
                            <span className="text-info">
                              ● {(item.protein * factor).toFixed(1)}g P
                            </span>
                            <span className="text-primary">
                              ● {(item.carbs * factor).toFixed(1)}g C
                            </span>
                            <span className="text-warning">
                              ● {(item.fat * factor).toFixed(1)}g F
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(activeMeal, item.id, -10)}
                            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <div className="text-center min-w-[60px]">
                            <div className="font-semibold">{item.quantity}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">
                              {item.unit}
                            </div>
                          </div>
                          <button
                            onClick={() => updateQuantity(activeMeal, item.id, 10)}
                            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold min-w-[70px] text-right">
                          {Math.round(item.calories * factor)} kcal
                        </span>
                        <button
                          onClick={() => handleEditFoodItem(item)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          title="Edit item"
                        >
                          <SquarePen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeItem(activeMeal, item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(meals.find((m) => m.name === activeMeal)?.items.length ?? 0) === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No items in {activeMeal}</p>
                    <p className="text-xs mt-1">Search and add food items above</p>
                  </div>
                )}
              </div>
            </div>

            {/* Nutrition summary sidebar */}
            <div className="w-72 border-l p-6 space-y-6 overflow-auto">
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Calories
                </div>
                <div className="relative w-32 h-32 mx-auto mt-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">
                      {Math.round(totalNutrients.calories)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {dailyTarget.calories}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {Math.max(0, Math.round(dailyTarget.calories - totalNutrients.calories))}{" "}
                  remaining
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: "Protein",
                    value: totalNutrients.protein,
                    target: dailyTarget.protein,
                    color: "bg-info",
                  },
                  {
                    label: "Carbs",
                    value: totalNutrients.carbs,
                    target: dailyTarget.carbs,
                    color: "bg-primary",
                  },
                  {
                    label: "Fat",
                    value: totalNutrients.fat,
                    target: dailyTarget.fat,
                    color: "bg-warning",
                  },
                ].map((macro) => (
                  <div key={macro.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{macro.label}</span>
                      <span className="text-muted-foreground">
                        {Math.round(macro.value)} / {macro.target}g
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${macro.color} transition-all`}
                        style={{
                          width: `${Math.min((macro.value / macro.target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Micronutrient Panel */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowMicros(!showMicros)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 hover:text-slate-700 transition-colors"
                >
                  <span>Micronutrients</span>
                  <span className="text-slate-400">{showMicros ? "▲" : "▼"}</span>
                </button>
                {showMicros && <div className="bg-slate-50 p-4 rounded-xl space-y-5">
                  {[
                    { section: "Fiber", items: [
                      { label: "Dietary Fiber", value: totalNutrients.fiber, key: "fiber", unit: "g" },
                    ]},
                    { section: "Minerals", items: [
                      { label: "Calcium", value: totalNutrients.calcium, key: "calcium", unit: "mg" },
                      { label: "Iron", value: totalNutrients.iron, key: "iron", unit: "mg" },
                      { label: "Magnesium", value: totalNutrients.magnesium, key: "magnesium", unit: "mg" },
                      { label: "Zinc", value: totalNutrients.zinc, key: "zinc", unit: "mg" },
                      { label: "Potassium", value: totalNutrients.potassium, key: "potassium", unit: "mg" },
                      { label: "Sodium", value: totalNutrients.sodium, key: "sodium", unit: "mg", reverse: true },
                    ]},
                    { section: "Vitamins", items: [
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
                    ]},
                  ].map(({ section, items }) => (
                    <div key={section}>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{section}</h4>
                      {items.map((micro) => {
                        const rdaAge = patient?.age || 30;
                        const rdaSex: 'M' | 'F' = patient?.gender === 'female' ? 'F' : 'M';
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
                  ))}
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Micronutrient Modulators Index</h4>
                    <ModulatorBar label="Oxalates" percentage={modulators.oxalate.percentage} contributors={modulators.oxalate.contributors} type="oxalate" />
                    <ModulatorBar label="Phytates" percentage={modulators.phytate.percentage} contributors={modulators.phytate.contributors} type="phytate" />
                  </div>
                  <div className="text-[10px] text-slate-400 italic text-center pt-2">
                    * Values calculated from available food data; missing nutrients are not counted.
                  </div>
                </div>}
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleSaveDietPlan}
                  className="w-full"
                  size="lg"
                  disabled={savePlanMutation.isPending || !hasAnyFoodItems}
                >
                  {savePlanMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isEditMode ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    isEditMode ? "Update Diet Plan" : "Save Diet Plan"
                  )}
                </Button>
                <Button
                  onClick={() => setPdfModalOpen(true)}
                  variant="outline"
                  className="w-full"
                  disabled={!hasAnyFoodItems}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF (All)
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleBackWithConfirmation}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Buttons - Bottom Right (FitArc style) */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        <Button
          onClick={() => setPdfModalOpen(true)}
          className="shadow-xl bg-primary hover:bg-primary/90 px-6 py-4 rounded-full"
          disabled={!hasAnyFoodItems}
        >
          Generate PDF (All)
        </Button>
        <Button
          className="shadow-xl bg-slate-800 text-white hover:bg-slate-900 px-6 py-4 rounded-full"
          onClick={() => setPrototypeDialogOpen(true)}
        >
          + Prototype
        </Button>
      </div>

      {/* Add Food Modal */}
      <Dialog
        open={addFoodModalOpen}
        onOpenChange={(open) => {
          setAddFoodModalOpen(open);
          if (!open) setEditingMealItemId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-2xl">
                🍽️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {selectedFood?.name}
                  {selectedFood?.treat && (
                    <Badge variant="outline" className="text-warning border-warning/30 text-[10px]">
                      ⚠ Treat
                    </Badge>
                  )}
                </div>
                {selectedFood?.nameHindi && (
                  <p className="text-sm font-normal text-muted-foreground">{selectedFood.nameHindi}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Nutrient info */}
            <div className="flex gap-2 text-sm">
              <Badge variant="secondary">P: {selectedFood?.protein}g</Badge>
              <Badge variant="secondary">C: {selectedFood?.carbs}g</Badge>
              <Badge variant="secondary">F: {selectedFood?.fat}g</Badge>
              <Badge variant="secondary">{selectedFood?.caloriesPer100} kcal/100g</Badge>
            </div>

            {/* Mode Tabs */}
            <div className="flex bg-muted p-1 rounded-xl">
              {(['target', 'weight', 'quantity'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  disabled={tab === 'quantity' && !selectedFood?.unitName}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
                    activeTab === tab 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  } ${tab === 'quantity' && !selectedFood?.unitName ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-muted/50 p-4 rounded-xl border space-y-4">
              {activeTab === 'target' && (
                <>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    I want this food to provide...
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      className="w-24 text-right font-bold text-lg"
                      autoFocus
                    />
                    <span className="text-sm text-muted-foreground">grams of</span>
                    <div className="flex-1 flex gap-1 bg-background p-1 rounded-lg border">
                      {(['protein', 'carbs', 'fat'] as const).map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setTargetNutrient(n)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-colors ${
                            targetNutrient === n 
                              ? "bg-primary text-primary-foreground" 
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'weight' && (
                <>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Enter Weight
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      type="number"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="text-right font-bold text-lg"
                      autoFocus
                    />
                    <span className="text-sm font-medium text-muted-foreground">grams</span>
                  </div>
                </>
              )}

              {activeTab === 'quantity' && selectedFood?.unitName && (
                <>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Enter Quantity
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      type="number"
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      className="text-right font-bold text-lg"
                      autoFocus
                    />
                    <span className="text-sm font-medium text-muted-foreground capitalize">
                      {selectedFood.unitName}(s)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    1 {selectedFood.unitName} ≈ {selectedFood.unitWeight}g
                  </p>
                </>
              )}

              {/* Preview */}
              {computedValues && computedValues.grams > 0 && (
                <div className="mt-4 pt-4 border-t flex justify-between items-center bg-background p-3 rounded-lg">
                  <div className="text-sm">
                    <div className="font-semibold text-foreground">Calculated:</div>
                    <div className="text-muted-foreground">{computedValues.displayQty}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{computedValues.calories} kcal</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      P:{computedValues.protein} C:{computedValues.carbs} F:{computedValues.fat}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAddFoodModalOpen(false);
                  setEditingMealItemId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={confirmAddFood}
                disabled={!computedValues || computedValues.grams <= 0}
              >
                {editingMealItemId ? "Save Changes" : `Add to ${activeMeal}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Export Modal */}
      {pdfModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Export Diet Plan</h3>
              <button
                onClick={() => {
                  setPdfModalOpen(false);
                  setPdfUrl(null);
                }}
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
                  <p className="text-sm text-slate-600 text-center">
                    Finalize plan for <strong>{patient?.name}</strong> ({prototypes.length} prototypes)
                  </p>
                  <div className="space-y-2">
                    <Label className="normal-case font-bold">Personalised Note (Optional)</Label>
                    <textarea
                      className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all"
                      placeholder="e.g. Focus on consistency and hydration this week..."
                      value={pdfNote}
                      onChange={(e) => setPdfNote(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 italic">Appears on the last page of the PDF</p>
                  </div>
                  <Button onClick={handleGeneratePDF} className="w-full">Generate PDF (All Prototypes)</Button>
                </div>
              )
            ) : (
              <div className="space-y-4 text-center">
                <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-4 font-medium">PDF Generated Successfully!</div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => window.open(pdfUrl, "_blank")}>Preview</Button>
                  <Button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = pdfUrl;
                      link.download = `DietByRD_Plan_${(patient?.name || "Patient").replace(/\s+/g, "_")}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    Download
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => setPdfUrl(null)} className="mt-2 text-xs">Edit Note & Regenerate</Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={prototypeDialogOpen} onOpenChange={setPrototypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Prototype</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              className="w-full justify-start h-auto py-4 px-4 border-2 border-primary/20 bg-background text-foreground"
              variant="outline"
              onClick={() => handleAddPrototype("copy")}
            >
              <div className="text-left">
                <div className="font-semibold">Copy Active Prototype</div>
                <div className="text-xs text-muted-foreground font-normal">Duplicate current meals as a new prototype.</div>
              </div>
            </Button>
            <Button
              className="w-full justify-start h-auto py-4 px-4 border-2 border-border bg-background text-foreground"
              variant="outline"
              onClick={() => handleAddPrototype("blank")}
            >
              <div className="text-left">
                <div className="font-semibold">Blank Prototype</div>
                <div className="text-xs text-muted-foreground font-normal">Start with default empty meal slots.</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this diet plan. Do you want to save before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savePlanMutation.isPending}>Continue Editing</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscardAndLeave}
              disabled={savePlanMutation.isPending}
            >
              Discard
            </Button>
            <AlertDialogAction onClick={handleSaveAndLeave} disabled={savePlanMutation.isPending}>
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreateDiet;
