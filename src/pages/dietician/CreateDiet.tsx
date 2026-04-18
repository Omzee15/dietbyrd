import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
  Target,
  Trash2,
  User,
  Users,
  UtensilsCrossed,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  getDietician,
} from "@/lib/api";
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
  treat?: boolean;
  unitName?: string; // e.g., "piece", "cup", "slice"
  unitWeight?: number; // weight of one unit in grams
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

type AddFoodTab = 'target' | 'weight' | 'quantity';
type TargetNutrient = 'protein' | 'carbs' | 'fat';

// ─── Food Database ────────────────────────────────────────────────────────────
const foodDatabase: FoodItem[] = [
  { name: "Brown Rice", nameHindi: "भूरे चावल", caloriesPer100: 111, protein: 2.6, carbs: 23, fat: 0.9 },
  { name: "Chicken Breast", nameHindi: "चिकन ब्रेस्ट", caloriesPer100: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Egg (Whole)", nameHindi: "अंडा", caloriesPer100: 155, protein: 13, carbs: 1.1, fat: 11, unitName: "egg", unitWeight: 50 },
  { name: "Oats", nameHindi: "जई", caloriesPer100: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { name: "Banana", nameHindi: "केला", caloriesPer100: 89, protein: 1.1, carbs: 23, fat: 0.3, unitName: "piece", unitWeight: 120 },
  { name: "Paneer (Cottage Cheese)", nameHindi: "पनीर", caloriesPer100: 265, protein: 18, carbs: 1.2, fat: 21 },
  { name: "Moong Dal", nameHindi: "मूंग दाल", caloriesPer100: 105, protein: 7.5, carbs: 18, fat: 0.4 },
  { name: "Roti (Wheat)", nameHindi: "रोटी", caloriesPer100: 264, protein: 8.7, carbs: 50, fat: 3.7, unitName: "piece", unitWeight: 40 },
  { name: "Greek Yogurt", nameHindi: "ग्रीक दही", caloriesPer100: 59, protein: 10, carbs: 3.6, fat: 0.7, unitName: "cup", unitWeight: 170 },
  { name: "Almonds", nameHindi: "बादाम", caloriesPer100: 579, protein: 21, carbs: 22, fat: 50, unitName: "piece", unitWeight: 1.2 },
  { name: "Gulab Jamun", nameHindi: "गुलाब जामुन", caloriesPer100: 299, protein: 2.2, carbs: 40, fat: 14, treat: true, unitName: "piece", unitWeight: 30 },
  { name: "Dark Chocolate", nameHindi: "डार्क चॉकलेट", caloriesPer100: 546, protein: 5, carbs: 60, fat: 31, treat: true, unitName: "square", unitWeight: 10 },
  { name: "Apple", nameHindi: "सेब", caloriesPer100: 52, protein: 0.3, carbs: 14, fat: 0.2, unitName: "piece", unitWeight: 180 },
  { name: "Spinach", nameHindi: "पालक", caloriesPer100: 23, protein: 2.9, carbs: 3.6, fat: 0.4, unitName: "cup", unitWeight: 30 },
  { name: "Salmon", nameHindi: "सैल्मन मछली", caloriesPer100: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Quinoa", nameHindi: "क्विनोआ", caloriesPer100: 120, protein: 4.4, carbs: 21, fat: 1.9, unitName: "cup", unitWeight: 185 },
  { name: "Sweet Potato", nameHindi: "शकरकंद", caloriesPer100: 86, protein: 1.6, carbs: 20, fat: 0.1, unitName: "piece", unitWeight: 130 },
  { name: "Tofu", nameHindi: "टोफू", caloriesPer100: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { name: "Chickpeas", nameHindi: "छोले", caloriesPer100: 164, protein: 8.9, carbs: 27, fat: 2.6, unitName: "cup", unitWeight: 164 },
  { name: "Broccoli", nameHindi: "ब्रोकोली", caloriesPer100: 34, protein: 2.8, carbs: 7, fat: 0.4, unitName: "cup", unitWeight: 91 },
  { name: "Milk (Whole)", nameHindi: "दूध", caloriesPer100: 61, protein: 3.2, carbs: 4.8, fat: 3.3, unitName: "cup", unitWeight: 244 },
  { name: "Curd/Yogurt", nameHindi: "दही", caloriesPer100: 98, protein: 11, carbs: 3.4, fat: 4.3, unitName: "cup", unitWeight: 245 },
  { name: "Dal (Mixed)", nameHindi: "दाल", caloriesPer100: 116, protein: 9, carbs: 20, fat: 0.4, unitName: "cup", unitWeight: 200 },
  { name: "Chapati", nameHindi: "चपाती", caloriesPer100: 120, protein: 3.1, carbs: 25, fat: 0.5, unitName: "piece", unitWeight: 35 },
  { name: "White Rice", nameHindi: "सफेद चावल", caloriesPer100: 130, protein: 2.7, carbs: 28, fat: 0.3, unitName: "cup", unitWeight: 158 },
  { name: "Idli", nameHindi: "इडली", caloriesPer100: 60, protein: 2, carbs: 12, fat: 0.2, unitName: "piece", unitWeight: 40 },
  { name: "Dosa", nameHindi: "डोसा", caloriesPer100: 133, protein: 2.6, carbs: 18, fat: 5.2, unitName: "piece", unitWeight: 85 },
  { name: "Poha", nameHindi: "पोहा", caloriesPer100: 110, protein: 2.5, carbs: 23, fat: 0.6, unitName: "cup", unitWeight: 200 },
  { name: "Upma", nameHindi: "उपमा", caloriesPer100: 95, protein: 2.5, carbs: 17, fat: 2, unitName: "cup", unitWeight: 200 },
];

// ─── Component ────────────────────────────────────────────────────────────────
const CreateDiet = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
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

  // Create diet plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (planData: { patient_id: number; rd_id: number; plan_json: object }) =>
      createDietPlan(planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-diet-plans", patientId] });
      toast.success("Diet plan saved successfully!");
      navigate(`/dietician/patient/${slug}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save diet plan: ${error.message}`);
    },
  });

  // UI State
  const [activeMeal, setActiveMeal] = useState("Breakfast");
  const [searchTerm, setSearchTerm] = useState("");
  const [meals, setMeals] = useState<MealSlot[]>([
    { name: "Breakfast", items: [] },
    { name: "Mid-Morning", items: [] },
    { name: "Lunch", items: [] },
    { name: "Evening Snack", items: [] },
    { name: "Dinner", items: [] },
  ]);

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

  // Add Food Modal state
  const [addFoodModalOpen, setAddFoodModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [activeTab, setActiveTab] = useState<AddFoodTab>('weight');
  const [targetNutrient, setTargetNutrient] = useState<TargetNutrient>('protein');
  const [targetAmount, setTargetAmount] = useState<string>('20');
  const [weightInput, setWeightInput] = useState<string>('100');
  const [quantityInput, setQuantityInput] = useState<string>('1');

  const dailyTarget = { calories: 1800, protein: 90, carbs: 200, fat: 60 };

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

  // PDF Download Function
  const downloadDietPlanPDF = () => {
    if (!patient) {
      toast.error("Patient information not available");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
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
    doc.text('Personalized Diet Plan', 15, 32);
    
    // Plan date
    doc.setFontSize(9);
    doc.text(`Generated: ${formatDate()}`, pageWidth - 15, 22, { align: 'right' });
    doc.text(`Dietician: ${currentDietician?.name || 'N/A'}`, pageWidth - 15, 32, { align: 'right' });
    
    // Patient info section
    let yPos = 55;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${patient.name}`, 15, yPos);
    doc.text(`Age: ${patient.age} years`, 100, yPos);
    yPos += 7;
    doc.text(`Diagnosis: ${patient.diagnosis || 'General'}`, 15, yPos);
    if (patient.dietary_preference) {
      doc.text(`Diet Type: ${patient.dietary_preference}`, 100, yPos);
    }
    if (patient.phone) {
      yPos += 7;
      doc.text(`Phone: ${patient.phone}`, 15, yPos);
    }
    
    // Weight info
    if (currentWeight || targetWeight) {
      yPos += 7;
      if (currentWeight) {
        doc.text(`Current Weight: ${currentWeight} kg`, 15, yPos);
      }
      if (targetWeight) {
        doc.text(`Target Weight: ${targetWeight} kg`, 100, yPos);
      }
    }
    
    // Divider
    yPos += 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    
    // Daily Nutrition Summary
    yPos += 12;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Daily Nutrition Summary', 15, yPos);
    
    yPos += 10;
    const summaryData = [
      ['Calories', `${Math.round(totalNutrients.calories)} kcal`],
      ['Protein', `${Math.round(totalNutrients.protein)} g`],
      ['Carbohydrates', `${Math.round(totalNutrients.carbs)} g`],
      ['Fat', `${Math.round(totalNutrients.fat)} g`],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Nutrient', 'Daily Total']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto',
    });
    
    // Get the final Y position after the table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Meal Plans
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Meal Plan', 15, yPos);
    
    meals.forEach((meal) => {
      yPos += 12;
      
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 184, 166);
      doc.text(meal.name, 15, yPos);
      
      const mealCalories = Math.round(getMealCalories(meal));
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(10);
      doc.text(`${mealCalories} kcal`, pageWidth - 15, yPos, { align: 'right' });
      
      if (meal.items && meal.items.length > 0) {
        yPos += 5;
        const mealData = meal.items.map((item) => {
          const factor = item.quantity / 100;
          return [
            item.name + (item.nameHindi ? ` (${item.nameHindi})` : ''),
            `${item.quantity} ${item.unit}`,
            `${Math.round(item.calories * factor)}`,
            `${(item.protein * factor).toFixed(1)}`,
            `${(item.carbs * factor).toFixed(1)}`,
            `${(item.fat * factor).toFixed(1)}`,
          ];
        });
        
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
    const fileName = `DietPlan_${patient.name.replace(/\\s+/g, '_')}_${formatDate().replace(/,\\s*/g, '_').replace(/\\s+/g, '_')}.pdf`;
    doc.save(fileName);
    toast.success("Diet plan PDF downloaded successfully!");
  };

  const handleAddNewMeal = () => {
    const trimmedName = newMealName.trim();
    if (!trimmedName) return;
    
    // Check if meal already exists
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

  const searchResults = searchTerm.length >= 2
    ? foodDatabase.filter((f) => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.nameHindi?.includes(searchTerm)
      )
    : [];

  // Open Add Food Modal
  const handleFoodClick = (food: FoodItem) => {
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

    setMeals((prev) =>
      prev.map((m) => (m.name === activeMeal ? { ...m, items: [...m.items, newItem] } : m))
    );
    setAddFoodModalOpen(false);
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
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const getMealCalories = (meal: MealSlot) =>
    meal.items.reduce((sum, item) => sum + (item.calories * item.quantity) / 100, 0);

  const handleSaveDietPlan = () => {
    if (!currentDietician?.id) {
      toast.error("Dietician information not available");
      return;
    }

    const planJson = {
      meals: meals.map((meal) => ({
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
      createdAt: new Date().toISOString(),
    };

    createPlanMutation.mutate({
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

  const sidebarSections = [
    {
      title: "Dashboard",
      items: [
        { label: "My Patients", href: "/dietician", icon: Users },
        { label: "My Schedule", href: "/dietician/schedule", icon: CalendarDays },
        { label: "Diet Plans", href: "/dietician/diet", icon: UtensilsCrossed },
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
            <Button variant="ghost" size="icon" onClick={() => navigate(`/dietician/patient/${slug}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Create Diet Plan</h1>
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
        {patientLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading patient data...</span>
          </div>
        )}

        {/* Not found state */}
        {!patientLoading && !patient && (
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

        {/* Diet Creation Workbench */}
        {!patientLoading && patient && (
          <div className="flex-1 flex overflow-hidden">
            {/* Body Composition + Meals sidebar */}
            <div className="w-56 border-r flex flex-col">
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
                  return (
                    <div key={meal.name} className="group relative">
                      <button
                        onClick={() => setActiveMeal(meal.name)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          activeMeal === meal.name
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{meal.name}</span>
                          <div className="flex items-center gap-1">
                            {itemCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {itemCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{cal} kcal</div>
                      </button>
                      {/* Remove meal button - show on hover for non-default meals */}
                      {!["Breakfast", "Lunch", "Dinner"].includes(meal.name) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMeal(meal.name);
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive transition-opacity"
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
                    placeholder="Search food items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base rounded-xl border-2"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-card border-2 border-t-0 rounded-b-xl shadow-lg z-10 max-h-64 overflow-y-auto">
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
                  <h2 className="font-semibold text-lg">{activeMeal}</h2>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(getMealCalories(meals.find(m => m.name === activeMeal)!))} kcal
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

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleSaveDietPlan}
                  className="w-full"
                  size="lg"
                  disabled={createPlanMutation.isPending || totalNutrients.calories === 0}
                >
                  {createPlanMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Diet Plan"
                  )}
                </Button>
                <Button
                  onClick={downloadDietPlanPDF}
                  variant="outline"
                  className="w-full"
                  disabled={totalNutrients.calories === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/dietician/patient/${slug}`)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Food Modal */}
      <Dialog open={addFoodModalOpen} onOpenChange={setAddFoodModalOpen}>
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
                onClick={() => setAddFoodModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={confirmAddFood}
                disabled={!computedValues || computedValues.grams <= 0}
              >
                Add to {activeMeal}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateDiet;
