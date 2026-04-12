import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  LogOut,
  Minus,
  Phone,
  Plus,
  Scale,
  Search,
  Settings,
  Target,
  Trash2,
  User,
  Users,
  UtensilsCrossed,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  getPatientDietPlans,
  createDietPlan,
  getDietician,
  type Patient,
  type DietPlan,
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

// ─── Food Database ────────────────────────────────────────────────────────────
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
  { name: "Apple", nameHindi: "सेब", caloriesPer100: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: "Spinach", nameHindi: "पालक", caloriesPer100: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: "Salmon", nameHindi: "सैल्मन मछली", caloriesPer100: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Quinoa", nameHindi: "क्विनोआ", caloriesPer100: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: "Sweet Potato", nameHindi: "शकरकंद", caloriesPer100: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: "Tofu", nameHindi: "टोफू", caloriesPer100: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { name: "Chickpeas", nameHindi: "छोले", caloriesPer100: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  { name: "Broccoli", nameHindi: "ब्रोकोली", caloriesPer100: 34, protein: 2.8, carbs: 7, fat: 0.4 },
];

// ─── Component ────────────────────────────────────────────────────────────────
const PatientDetail = () => {
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

  const { data: dietPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["patient-diet-plans", patientId],
    queryFn: () => getPatientDietPlans(patientId),
    enabled: !!patientId,
  });

  // Create diet plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (planData: { patient_id: number; rd_id: number; plan_json: object }) =>
      createDietPlan(planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-diet-plans", patientId] });
      toast.success("Diet plan saved successfully!");
      setShowDietCreator(false);
      resetMeals();
    },
    onError: (error: Error) => {
      toast.error(`Failed to save diet plan: ${error.message}`);
    },
  });

  // UI State
  const [showDietCreator, setShowDietCreator] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [activeMeal, setActiveMeal] = useState("Breakfast");
  const [searchTerm, setSearchTerm] = useState("");
  const [meals, setMeals] = useState<MealSlot[]>([
    { name: "Breakfast", items: [] },
    { name: "Mid-Morning", items: [] },
    { name: "Lunch", items: [] },
    { name: "Evening Snack", items: [] },
    { name: "Dinner", items: [] },
  ]);

  // Weight tracking state
  const [currentWeight, setCurrentWeight] = useState<string>("");
  const [targetWeight, setTargetWeight] = useState<string>("");

  const dailyTarget = { calories: 1800, protein: 90, carbs: 200, fat: 60 };

  const resetMeals = () => {
    setMeals([
      { name: "Breakfast", items: [] },
      { name: "Mid-Morning", items: [] },
      { name: "Lunch", items: [] },
      { name: "Evening Snack", items: [] },
      { name: "Dinner", items: [] },
    ]);
    setActiveMeal("Breakfast");
    setSearchTerm("");
    setCurrentWeight("");
    setTargetWeight("");
  };

  // Handlers
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const searchResults = searchTerm.length >= 2
    ? foodDatabase.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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

  const isLoading = patientLoading || plansLoading;

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle="Dietician Portal"
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dietician")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Patient Details</h1>
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
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading patient data...</span>
          </div>
        )}

        {/* Content */}
        {!isLoading && patient && (
          <div className="p-6 space-y-6">
            {/* Patient Info Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                      {getInitials(patient.name || "?")}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{patient.name || "Unknown Patient"}</h2>
                      <p className="text-muted-foreground">
                        {patient.diagnosis || "No diagnosis"} · Age {patient.age || "N/A"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-sm px-3 py-1"
                  >
                    {patient.gender || "Unknown"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{patient.phone || patient.user_phone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Age</p>
                      <p className="font-medium">{patient.age || "N/A"} years</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dietary Preference</p>
                      <p className="font-medium capitalize">{patient.dietary_preference || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Registered</p>
                      <p className="font-medium">{formatDate(patient.created_at)}</p>
                    </div>
                  </div>
                </div>

                {patient.diagnosis_description && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Diagnosis Details</p>
                    <p className="text-sm">{patient.diagnosis_description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Previous Diet Charts Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5" />
                  Diet Charts History
                </CardTitle>
                <Button onClick={() => navigate(`/dietician/patient/${slug}/create-diet`)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Diet
                </Button>
              </CardHeader>
              <CardContent>
                {dietPlans && dietPlans.length > 0 ? (
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
                                {plan.plan_json?.totals?.calories || 0} kcal daily target
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {plan.is_active && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                <Check className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Eye className="w-4 h-4" />
                              <span>{plan.view_count || 0} views</span>
                            </div>
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
                              {/* Summary */}
                              <div className="grid grid-cols-4 gap-3">
                                {[
                                  {
                                    label: "Calories",
                                    value: plan.plan_json.totals?.calories || 0,
                                    unit: "kcal",
                                    color: "text-orange-600",
                                  },
                                  {
                                    label: "Protein",
                                    value: plan.plan_json.totals?.protein || 0,
                                    unit: "g",
                                    color: "text-blue-600",
                                  },
                                  {
                                    label: "Carbs",
                                    value: plan.plan_json.totals?.carbs || 0,
                                    unit: "g",
                                    color: "text-green-600",
                                  },
                                  {
                                    label: "Fat",
                                    value: plan.plan_json.totals?.fat || 0,
                                    unit: "g",
                                    color: "text-yellow-600",
                                  },
                                ].map((item) => (
                                  <div
                                    key={item.label}
                                    className="text-center p-3 bg-background rounded-lg"
                                  >
                                    <p className="text-xs text-muted-foreground">{item.label}</p>
                                    <p className={`text-lg font-bold ${item.color}`}>
                                      {item.value}
                                      <span className="text-xs font-normal ml-0.5">{item.unit}</span>
                                    </p>
                                  </div>
                                ))}
                              </div>

                              {/* Weight Info */}
                              {plan.plan_json.weight && (plan.plan_json.weight.current || plan.plan_json.weight.target) && (
                                <div className="grid grid-cols-2 gap-3">
                                  {plan.plan_json.weight.current && (
                                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                      <Scale className="w-5 h-5 text-muted-foreground" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Current Weight</p>
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
                                              {item.name} ({item.quantity}
                                              {item.unit})
                                            </span>
                                            <span>{item.calories} kcal</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground italic">
                                        No items
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                {plan.pdf_url && (
                                  <Button variant="outline" size="sm" className="gap-2">
                                    <Download className="w-4 h-4" />
                                    Download PDF
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Eye className="w-4 h-4" />
                                  View Full Plan
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No diet charts created yet</p>
                    <p className="text-xs mt-1">
                      Click "Create New Diet" to create the first diet plan
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Diet Creator Modal/Section */}
            {showDietCreator && (
              <Card className="border-2 border-primary/30">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create New Diet Plan for {patient.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDietCreator(false);
                      resetMeals();
                    }}
                  >
                    Cancel
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Weight tracking section */}
                  <div className="p-4 border-b bg-muted/30">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Weight Tracking
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Scale className="w-4 h-4 text-muted-foreground" />
                          Current Weight (kg)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g. 75"
                          value={currentWeight}
                          onChange={(e) => setCurrentWeight(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          Target Weight (kg)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g. 65"
                          value={targetWeight}
                          onChange={(e) => setTargetWeight(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                    {currentWeight && targetWeight && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        {parseFloat(currentWeight) > parseFloat(targetWeight) ? (
                          <span className="text-orange-600">
                            Goal: Lose {(parseFloat(currentWeight) - parseFloat(targetWeight)).toFixed(1)} kg
                          </span>
                        ) : parseFloat(currentWeight) < parseFloat(targetWeight) ? (
                          <span className="text-green-600">
                            Goal: Gain {(parseFloat(targetWeight) - parseFloat(currentWeight)).toFixed(1)} kg
                          </span>
                        ) : (
                          <span className="text-blue-600">Goal: Maintain current weight</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex">
                    {/* Meals sidebar */}
                    <div className="w-48 border-r p-4 space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Daily Meals
                      </div>
                      {meals.map((meal) => {
                        const cal = Math.round(getMealCalories(meal));
                        return (
                          <button
                            key={meal.name}
                            onClick={() => setActiveMeal(meal.name)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                              activeMeal === meal.name
                                ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span>{meal.name}</span>
                              <span className="text-xs text-muted-foreground">{cal} kcal</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Food search and items */}
                    <div className="flex-1 p-6">
                      <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          placeholder="Search food..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-12 h-12 text-base rounded-xl border-2"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-card border-2 border-t-0 rounded-b-xl shadow-lg z-10 max-h-64 overflow-y-auto">
                            {searchResults.map((food, i) => (
                              <button
                                key={i}
                                onClick={() => addFoodToMeal(food)}
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

                      {/* Current meal items */}
                      <div className="space-y-3">
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
                                    className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-muted transition-colors"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <div className="text-center min-w-[50px]">
                                    <div className="font-semibold text-sm">{item.quantity}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase">
                                      {item.unit}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => updateQuantity(activeMeal, item.id, 10)}
                                    className="w-7 h-7 rounded-md border flex items-center justify-center hover:bg-muted transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-sm font-semibold min-w-[60px] text-right">
                                  {Math.round(item.calories * factor)} kcal
                                </span>
                                <button
                                  onClick={() => removeItem(activeMeal, item.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
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
                    </div>

                    {/* Nutrition summary sidebar */}
                    <div className="w-72 border-l p-6 space-y-6">
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

                      <Button
                        onClick={handleSaveDietPlan}
                        className="w-full"
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
                    </div>
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
              <p className="text-muted-foreground">Patient not found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/dietician")}>
                Back to Patients
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientDetail;
