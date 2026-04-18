import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit3,
  FileText,
  Heart,
  Loader2,
  LogOut,
  Ruler,
  Save,
  Scale,
  Settings,
  Target,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  type DietPlan,
  type Consultation,
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

// TDEE using Mifflin-St Jeor equation with moderate activity level (1.55)
const calculateTDEE = (
  weight: number,
  heightCm: number,
  age: number | null,
  gender: string | null
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
  
  // Multiply by activity factor (moderate activity = 1.55)
  return Math.round(bmr * 1.55);
};

// ─── Component ────────────────────────────────────────────────────────────────
const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);

  // Body details editing state
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [bodyHeight, setBodyHeight] = useState<string>("");
  const [bodyWeight, setBodyWeight] = useState<string>("");
  const [bodyAllergies, setBodyAllergies] = useState<string>("");

  // Get patient data using the profileId from auth context
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["patient", user?.profileId],
    queryFn: () => getPatient(user!.profileId!),
    enabled: !!user?.profileId,
  });

  // Update patient mutation for body details
  const updatePatientMutation = useMutation({
    mutationFn: (data: { height?: number; weight?: number; allergies?: string }) =>
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

  // Sync body details form with patient data
  const handleEditBodyDetails = () => {
    setBodyHeight(patient?.height?.toString() || "");
    setBodyWeight(patient?.weight?.toString() || "");
    setBodyAllergies(patient?.allergies || "");
    setIsEditingBody(true);
  };

  const handleSaveBodyDetails = () => {
    updatePatientMutation.mutate({
      height: bodyHeight ? parseFloat(bodyHeight) : undefined,
      weight: bodyWeight ? parseFloat(bodyWeight) : undefined,
      allergies: bodyAllergies || undefined,
    });
  };

  // Calculate BMI and TDEE dynamically
  const currentBMI = patient?.weight && patient?.height 
    ? calculateBMI(patient.weight, patient.height) 
    : null;
  const currentTDEE = patient?.weight && patient?.height && patient?.age
    ? calculateTDEE(patient.weight, patient.height, patient.age, patient.gender)
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

  // Get the active diet plan
  const activeDietPlan = dietPlans?.find((plan) => plan.is_active);

  // Get weight tracking from most recent diet plan
  const latestWeight = activeDietPlan?.plan_json?.weight || dietPlans?.[0]?.plan_json?.weight;

  // PDF generation function
  const downloadDietPlanPDF = (plan: DietPlan) => {
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
    if (plan.plan_json?.weight) {
      yPos += 7;
      if (plan.plan_json.weight.current) {
        doc.text(`Current Weight: ${plan.plan_json.weight.current} kg`, 15, yPos);
      }
      if (plan.plan_json.weight.target) {
        doc.text(`Target Weight: ${plan.plan_json.weight.target} kg`, 100, yPos);
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
    const totals = plan.plan_json?.totals as { calories?: number; protein?: number; carbs?: number; fat?: number } || {};
    const summaryData = [
      ['Calories', `${totals.calories || 0} kcal`],
      ['Protein', `${totals.protein || 0} g`],
      ['Carbohydrates', `${totals.carbs || 0} g`],
      ['Fat', `${totals.fat || 0} g`],
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
    
    // Get the final Y position after the table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Meal Plans
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Meal Plan', 15, yPos);
    
    const meals = plan.plan_json?.meals || [];
    meals.forEach((meal: any) => {
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
      
      const mealCalories = meal.items?.reduce((sum: number, item: any) => sum + (item.calories || 0), 0) || 0;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(10);
      doc.text(`${mealCalories} kcal`, pageWidth - 15, yPos, { align: 'right' });
      
      if (meal.items && meal.items.length > 0) {
        yPos += 5;
        const mealData = meal.items.map((item: any) => [
          item.name + (item.nameHindi ? ` (${item.nameHindi})` : ''),
          `${item.quantity || ''} ${item.unit || 'g'}`,
          `${item.calories || 0}`,
          `${item.protein || 0}`,
          `${item.carbs || 0}`,
          `${item.fat || 0}`,
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Body Measurements Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

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

            {/* Upcoming Appointments */}
            {upcomingConsultations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                              {consultation.type === "initial" ? "Initial Consultation" : "Follow-up"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(consultation.scheduled_at)} at {formatTime(consultation.scheduled_at)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {consultation.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
    </div>
  );
};

export default PatientDashboard;
