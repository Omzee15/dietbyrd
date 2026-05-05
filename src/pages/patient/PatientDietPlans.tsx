import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Heart,
  Loader2,
  LogOut,
  Scale,
  Settings,
  Target,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type DietPlan,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const PatientDietPlans = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);

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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get the current active diet plan
  const activeDietPlan = dietPlans?.find((p: DietPlan) => p.is_active);

  // PDF Download function
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
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DietByRD - Diet Plan', pageWidth / 2, 20, { align: 'center' });
    
    // Patient info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Patient: ${patient?.name || 'N/A'}`, 15, 35);
    doc.text(`Date: ${formatDate(plan.issued_at || plan.created_at)}`, 15, 42);
    
    // Weight info
    let yPos = 55;
    if (plan.plan_json?.weight?.current || plan.plan_json?.weight?.target) {
      doc.setFont('helvetica', 'bold');
      doc.text('Weight Information', 15, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      if (plan.plan_json?.weight?.current) {
        doc.text(`Current: ${plan.plan_json.weight.current} kg`, 20, yPos);
        yPos += 6;
      }
      if (plan.plan_json?.weight?.target) {
        doc.text(`Target: ${plan.plan_json.weight.target} kg`, 20, yPos);
        yPos += 6;
      }
      yPos += 5;
    }
    
    prototypes.forEach((prototype, prototypeIndex) => {
      if (prototypeIndex > 0) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('DietByRD - Diet Plan', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
      }

      const prototypeName = prototype.name || `Prototype ${prototypeIndex + 1}`;
      const prototypeMeals = prototype.meals || [];
      const prototypeTotals = prototype.totals || calculateTotalsFromMeals(prototypeMeals);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(prototypeName, 15, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Daily Nutrition Targets', 15, yPos);
      yPos += 7;

      const nutritionData = [
        ['Calories', `${Math.round(prototypeTotals.calories || 0)} kcal`],
        ['Protein', `${(prototypeTotals.protein || 0).toFixed(1)} g`],
        ['Carbohydrates', `${(prototypeTotals.carbs || 0).toFixed(1)} g`],
        ['Fat', `${(prototypeTotals.fat || 0).toFixed(1)} g`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Nutrient', 'Amount']],
        body: nutritionData,
        theme: 'grid',
        headStyles: { fillColor: [76, 175, 80] },
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable.finalY + 10;

      prototypeMeals.forEach((meal) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
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
            <span className="ml-2 text-muted-foreground">Loading diet plans...</span>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="p-6 space-y-6">
            {/* Current Active Diet Plan */}
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

            {/* No diet plans message */}
            {(!dietPlans || dietPlans.length === 0) && (
              <Card>
                <CardContent className="py-16 text-center">
                  <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No Diet Plans Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your personalized diet plan will appear here once your dietician creates one for you.
                    Please check back soon!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientDietPlans;
