import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  ChevronDown,
  Edit3,
  FileText,
  ExternalLink,
  Heart,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Save,
  Scale,
  User,
  Upload,
  UtensilsCrossed,
  X,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import AppSidebar from "@/components/AppSidebar";
import { DashboardFooter } from "@/components/DashboardFooter";
import { deleteMyDocument, getMyDocuments, getPatient, getPatientDietPlans, updatePatient, uploadMyDocument } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getPatientSidebarSections } from "@/lib/patient-sidebar";

const PatientProfile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Edit state for body details
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [bodyDetails, setBodyDetails] = useState({
    age: "",
    height: "",
    weight: "",
    allergies: "",
  });
  const [bodyErrors, setBodyErrors] = useState<{ age?: string; height?: string; weight?: string }>({});
  const [documentKind, setDocumentKind] = useState<"blood_report" | "prescription" | "other">("blood_report");

  // Edit state for personal info
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalDetails, setPersonalDetails] = useState({
    name: "",
    email: "",
    age: 0,
    gender: "",
    address: "",
  });

  // Edit state for health info
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [healthDetails, setHealthDetails] = useState({
    diagnosis: "",
    dietary_preference: "",
    allergies: "",
    current_weight: "",
    target_weight: "",
  });

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", user?.profileId],
    queryFn: () => getPatient(user!.profileId!),
    enabled: !!user?.profileId,
  });

  const { data: dietPlans } = useQuery({
    queryKey: ["patient-diet-plans", user?.profileId],
    queryFn: () => getPatientDietPlans(user!.profileId!),
    enabled: !!user?.profileId,
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["patient-documents"],
    queryFn: getMyDocuments,
    enabled: !!user?.id,
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: (file: File) => uploadMyDocument(file, documentKind),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents"] });
      toast.success("Document uploaded successfully");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to upload document"),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => deleteMyDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents"] });
      toast.success("Document deleted");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete document"),
  });

  // Update patient mutation — body details
  const updatePatientMutation = useMutation({
    mutationFn: (data: { age?: number; height?: number; weight?: number; allergies?: string }) =>
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

  // Update patient mutation — personal info
  const updatePersonalMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string | null; age?: number; gender?: string; address?: string }) =>
      updatePatient(user!.profileId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
      toast.success("Personal information updated successfully!");
      setIsEditingPersonal(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update personal information");
    },
  });

  // Update patient mutation - health info
  const updateHealthMutation = useMutation({
    mutationFn: (data: { diagnosis?: string; dietary_preference?: string; allergies?: string; current_weight?: number; target_weight?: number; }) =>
      updatePatient(user!.profileId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", user?.profileId] });
      toast.success("Health information updated successfully!");
      setIsEditingHealth(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update health information");
    },
  });

  const validateBodyAge = (value: string): string => {
    if (!value.trim()) return "";
    if (!/^\d+$/.test(value)) return "Please enter an age between 1 and 100.";
    const age = Number(value);
    if (age < 1 || age > 100) return "Please enter an age between 1 and 100.";
    return "";
  };

  const validateBodyHeight = (value: string): string => {
    if (!value.trim()) return "";
    const height = Number(value);
    if (!Number.isFinite(height) || height < 2 || height > 9) {
      return "Please enter a height between 2 ft and 9 ft.";
    }
    return "";
  };

  const validateBodyWeight = (value: string): string => {
    if (!value.trim()) return "";
    const weight = Number(value);
    if (!Number.isFinite(weight) || weight < 10 || weight > 300) {
      return "Please enter a weight between 10 kg and 300 kg.";
    }
    return "";
  };

  const validateBodyDetails = () => ({
    age: validateBodyAge(bodyDetails.age),
    height: validateBodyHeight(bodyDetails.height),
    weight: validateBodyWeight(bodyDetails.weight),
  });

  const hasBodyErrors = Object.values(bodyErrors).some(Boolean);

  const updateBodyField = (field: "age" | "height" | "weight", value: string) => {
    const nextValue = field === "age"
      ? value.replace(/\D/g, "")
      : value.replace(/[^0-9.]/g, "");
    setBodyDetails((prev) => ({ ...prev, [field]: nextValue }));
    const validator =
      field === "age" ? validateBodyAge :
      field === "height" ? validateBodyHeight :
      validateBodyWeight;
    setBodyErrors((prev) => ({ ...prev, [field]: validator(nextValue) }));
  };

  const handleEditBody = () => {
    setBodyDetails({
      age: patient?.age ? String(patient.age) : "",
      height: (patient as any)?.height ? String((patient as any).height) : "",
      weight: (patient as any)?.weight ? String((patient as any).weight) : "",
    });
    setBodyErrors({});
    setIsEditingBody(true);
  };

  const handleSaveBody = () => {
    const nextErrors = validateBodyDetails();
    setBodyErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    updatePatientMutation.mutate({
      age: bodyDetails.age ? parseInt(bodyDetails.age, 10) : undefined,
      height: bodyDetails.height ? parseFloat(bodyDetails.height) : undefined,
      weight: bodyDetails.weight ? parseFloat(bodyDetails.weight) : undefined,
    });
  };

  const handleEditHealth = () => {
    setHealthDetails({
      diagnosis: patient?.diagnosis || "",
      dietary_preference: (patient as any)?.dietary_preference || "",
      allergies: Array.isArray(patient?.allergies)
        ? patient.allergies.join(", ")
        : (patient?.allergies || ""),
      current_weight: (patient as any)?.current_weight || latestWeight?.current || "",
      target_weight: (patient as any)?.target_weight || latestWeight?.target || "",
    });
    setIsEditingHealth(true);
  };

  const handleSaveHealth = () => {
    const trimmedAllergies = healthDetails.allergies.trim();
    updateHealthMutation.mutate({
      diagnosis: healthDetails.diagnosis.trim() || undefined,
      dietary_preference: healthDetails.dietary_preference.trim() || undefined,
      allergies: trimmedAllergies ? trimmedAllergies : undefined,
      current_weight: healthDetails.current_weight ? parseFloat(healthDetails.current_weight as string) : undefined,
      target_weight: healthDetails.target_weight ? parseFloat(healthDetails.target_weight as string) : undefined,
    });
  };

  const handleEditPersonal = () => {
    setPersonalDetails({
      name: patient?.name || "",
      email: patient?.email || "",
      age: patient?.age || 0,
      gender: patient?.gender || "",
      address: (patient as any)?.address || "",
    });
    setIsEditingPersonal(true);
  };

  const handleSavePersonal = () => {
    if (!personalDetails.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    if (personalDetails.age && (personalDetails.age < 1 || personalDetails.age > 100)) {
      toast.error("Please enter a valid age between 1 and 100.");
      return;
    }
    updatePersonalMutation.mutate({
      name: personalDetails.name.trim() || undefined,
      email: personalDetails.email.trim() || null,
      age: personalDetails.age || undefined,
      gender: personalDetails.gender || undefined,
      address: personalDetails.address.trim() || undefined,
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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

  // Get latest weight from diet plans
  const latestWeight = dietPlans?.find((p) => p.is_active)?.plan_json?.weight || 
    dietPlans?.[0]?.plan_json?.weight;

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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/patient")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">My Profile</h1>
          </div>
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
            <span className="ml-2 text-muted-foreground">Loading profile...</span>
          </div>
        )}

        {/* Content */}
        {!isLoading && patient && (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-3xl font-bold text-primary mb-4">
                    {getInitials(patient.name || "?")}
                  </div>
                  <h2 className="text-2xl font-bold">{patient.name || "Patient"}</h2>
                  <p className="text-muted-foreground mt-1">
                    Patient ID: #{patient.id}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary" className="capitalize">
                      {patient.dietary_preference || "No preference"}
                    </Badge>
                    {patient.diagnosis && (
                      <Badge variant="outline" className="capitalize">
                        {patient.diagnosis}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  {!isEditingPersonal ? (
                    <Button variant="ghost" size="sm" onClick={handleEditPersonal}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingPersonal(false)}
                        disabled={updatePersonalMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSavePersonal}
                        disabled={updatePersonalMutation.isPending}
                      >
                        {updatePersonalMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone - always read-only */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Phone Number</p>
                      <p className="font-semibold">{patient.phone || patient.user_phone || "Not provided"}</p>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingPersonal ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                         <Input
                          id="personal-name"
                          type="text"
                          value={personalDetails.name}
                          onChange={(e) => setPersonalDetails({ ...personalDetails, name: e.target.value.replace(/[^a-zA-Z\s.\-']/g, "") })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('personal-age')?.focus(); } }}
                          placeholder="Your name"
                          className="h-8"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p>
                        <p className="font-semibold">{patient.name || "Not provided"}</p>
                      </div>
                    )}
                  </div>

                  {/* Age */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingPersonal ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Age (years)</p>
                        <Input
                          id="personal-age"
                          type="number"
                          value={personalDetails.age || ""}
                          onChange={(e) => setPersonalDetails({ ...personalDetails, age: parseInt(e.target.value) || 0 })}
                          min={1}
                          max={100}
                          onKeyDown={(e) => { if (['e', 'E', '+', '-', '.'].includes(e.key)) { e.preventDefault(); } else if (e.key === 'Enter') { e.preventDefault(); document.getElementById('personal-email')?.focus(); } }}
                          placeholder="Your age"
                          className="h-8"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Age</p>
                        <p className="font-semibold">{patient.age ? `${patient.age} years` : "Not provided"}</p>
                      </div>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingPersonal ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gender</p>
                        <Select
                          value={personalDetails.gender}
                          onValueChange={(value) => setPersonalDetails({ ...personalDetails, gender: value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Gender</p>
                        <p className="font-semibold capitalize">{patient.gender || "Not specified"}</p>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingPersonal ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                        <Input
                          id="personal-email"
                          type="email"
                          value={personalDetails.email}
                          onChange={(e) => setPersonalDetails({ ...personalDetails, email: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('personal-address')?.focus(); } }}
                          placeholder="your@email.com"
                          className="h-8"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                        <p className="font-semibold">{patient.email || "Not provided"}</p>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingPersonal ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Address</p>
                        <Input
                          id="personal-address"
                          type="text"
                          value={personalDetails.address}
                          onChange={(e) => setPersonalDetails({ ...personalDetails, address: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSavePersonal(); } }}
                          placeholder="Your address"
                          className="h-8"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Address</p>
                        <p className="font-semibold">{(patient as any).address || "Not provided"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* My Body Details - Editable */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Scale className="w-5 h-5" />
                    My Body Details
                  </CardTitle>
                  {!isEditingBody ? (
                    <Button variant="ghost" size="sm" onClick={handleEditBody}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsEditingBody(false)}
                        disabled={updatePatientMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSaveBody}
                        disabled={updatePatientMutation.isPending || hasBodyErrors}
                      >
                        {updatePatientMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Age */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingBody ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Age (years)</p>
                        <Input
                          id="body-age"
                          type="number"
                          value={bodyDetails.age}
                          min={1}
                          max={100}
                          step={1}
                          onChange={(e) => updateBodyField("age", e.target.value)}
                          onKeyDown={(e) => { if (["e", "E", "+", "-", "."].includes(e.key)) { e.preventDefault(); } else if (e.key === 'Enter') { e.preventDefault(); document.getElementById('body-height')?.focus(); } }}
                          onBlur={() =>
                            setBodyErrors((prev) => ({
                              ...prev,
                              age: validateBodyAge(bodyDetails.age),
                            }))
                          }
                          placeholder="Enter age"
                          className="h-8"
                        />
                        {bodyErrors.age && (
                          <p className="text-[13px] text-[#C53030] mt-1">{bodyErrors.age}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Age</p>
                        <p className="font-semibold">{patient.age ? `${patient.age} years` : "Not set"}</p>
                      </div>
                    )}
                  </div>

                  {/* Height */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Ruler className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingBody ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Height (ft)</p>
                        <Input
                          id="body-height"
                          type="number"
                          value={bodyDetails.height}
                          min={2}
                          max={9}
                          step={0.1}
                          onChange={(e) => updateBodyField("height", e.target.value)}
                          onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) { e.preventDefault(); } else if (e.key === 'Enter') { e.preventDefault(); document.getElementById('body-weight')?.focus(); } }}
                          onBlur={() =>
                            setBodyErrors((prev) => ({
                              ...prev,
                              height: validateBodyHeight(bodyDetails.height),
                            }))
                          }
                          placeholder="e.g., 5.8"
                          className="h-8"
                        />
                        {bodyErrors.height && (
                          <p className="text-[13px] text-[#C53030] mt-1">{bodyErrors.height}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Height</p>
                        <p className="font-semibold">{(patient as any)?.height ? `${(patient as any).height} ft` : "Not set"}</p>
                      </div>
                    )}
                  </div>

                  {/* Weight */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                      <Scale className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingBody ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Weight (kg)</p>
                        <Input
                          id="body-weight"
                          type="number"
                          value={bodyDetails.weight}
                          min={10}
                          max={300}
                          step={0.1}
                          onChange={(e) => updateBodyField("weight", e.target.value)}
                          onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) { e.preventDefault(); } else if (e.key === 'Enter') { e.preventDefault(); if (!hasBodyErrors) handleSaveBody(); } }}
                          onBlur={() =>
                            setBodyErrors((prev) => ({
                              ...prev,
                              weight: validateBodyWeight(bodyDetails.weight),
                            }))
                          }
                          placeholder="e.g., 70"
                          className="h-8"
                        />
                        {bodyErrors.weight && (
                          <p className="text-[13px] text-[#C53030] mt-1">{bodyErrors.weight}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Weight</p>
                        <p className="font-semibold">{(patient as any)?.weight ? `${(patient as any).weight} kg` : "Not set"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card id="reports">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Blood Reports & Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <Select value={documentKind} onValueChange={(value: "blood_report" | "prescription" | "other") => setDocumentKind(value)}>
                    <SelectTrigger className="md:w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blood_report">Blood Report</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer hover:bg-primary/90">
                    <Upload className="w-4 h-4" />
                    Upload Document
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = "";
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error("File must be 10 MB or smaller");
                          return;
                        }
                        uploadDocumentMutation.mutate(file);
                      }}
                    />
                  </label>
                </div>

                {documentsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{doc.original_filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.kind.replace("_", " ")} · {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {doc.signed_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={doc.signed_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" /> View
                              </a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => deleteDocumentMutation.mutate(doc.id)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="w-5 h-5" />
                    Health Information
                  </CardTitle>
                  {!isEditingHealth ? (
                    <Button variant="ghost" size="sm" onClick={handleEditHealth}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingHealth(false)}
                        disabled={updateHealthMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveHealth}
                        disabled={updateHealthMutation.isPending}
                      >
                        {updateHealthMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingHealth ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Diagnosis</p>
                        <Select
                          value={healthDetails.diagnosis}
                          onValueChange={(value) => setHealthDetails({ ...healthDetails, diagnosis: value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select diagnosis" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="diabetes">Diabetes</SelectItem>
                            <SelectItem value="hypertension">Hypertension</SelectItem>
                            <SelectItem value="obesity">Obesity</SelectItem>
                            <SelectItem value="pcos">PCOS</SelectItem>
                            <SelectItem value="thyroid">Thyroid</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Diagnosis</p>
                        <p className="font-semibold capitalize">{patient.diagnosis || "General wellness"}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingHealth ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dietary Preference</p>
                        <Select
                          value={healthDetails.dietary_preference}
                          onValueChange={(value) => setHealthDetails({ ...healthDetails, dietary_preference: value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vegetarian">Vegetarian</SelectItem>
                            <SelectItem value="vegan">Vegan</SelectItem>
                            <SelectItem value="non-vegetarian">Non-Vegetarian</SelectItem>
                            <SelectItem value="eggetarian">Eggetarian</SelectItem>
                            <SelectItem value="pescatarian">Pescatarian</SelectItem>
                            <SelectItem value="jain">Jain</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Dietary Preference</p>
                        <p className="font-semibold capitalize">{(patient as any).dietary_preference || "Not specified"}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-primary" />
                    </div>
                    {isEditingHealth ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Weight (kg)</p>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="e.g. 72"
                          className="h-8"
                          value={healthDetails.current_weight}
                          onChange={(e) => setHealthDetails({ ...healthDetails, current_weight: e.target.value })}
                          min={20}
                          max={300}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Weight</p>
                        <p className="font-semibold capitalize">{(patient as any)?.current_weight || latestWeight?.current ? `${(patient as any)?.current_weight || latestWeight?.current} kg` : "Not recorded"}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-green-600" />
                    </div>
                    {isEditingHealth ? (
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target Weight (kg)</p>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="e.g. 65"
                          className="h-8"
                          value={healthDetails.target_weight}
                          onChange={(e) => setHealthDetails({ ...healthDetails, target_weight: e.target.value })}
                          min={20}
                          max={300}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Target Weight</p>
                        <p className="font-semibold capitalize">{(patient as any)?.target_weight || latestWeight?.target ? `${(patient as any)?.target_weight || latestWeight?.target} kg` : "Not set"}</p>
                      </div>
                    )}
                  </div>

                </div>

                {patient.diagnosis_description && (
                  <>
                    <Separator />
                    <div className="p-4 bg-muted/30 rounded-xl">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Health Notes</p>
                      <p className="text-sm leading-relaxed">{patient.diagnosis_description}</p>
                    </div>
                  </>
                )}

                {isEditingHealth ? (
                  <div className="mt-4 p-4 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Allergies (optional)
                    </p>
                    <Textarea
                      value={healthDetails.allergies}
                      onChange={(e) =>
                        setHealthDetails({ ...healthDetails, allergies: e.target.value })
                      }
                      maxLength={500}
                      placeholder="e.g., Peanuts, shellfish, lactose intolerance"
                      className="min-h-[92px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {healthDetails.allergies.length}/500
                    </p>
                  </div>
                ) : patient.allergies ? (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900">
                    <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Allergies</p>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      {Array.isArray(patient.allergies) 
                        ? patient.allergies.join(", ") 
                        : patient.allergies}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Referring Doctor */}
            {patient.doctor_name && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Referring Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {getInitials(patient.doctor_name)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{patient.doctor_name}</p>
                      {patient.doctor_specialization && (
                        <p className="text-sm text-muted-foreground capitalize">
                          {patient.doctor_specialization}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Account Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold text-primary">{dietPlans?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Diet Plans</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold text-green-600">
                      {dietPlans?.filter((p) => p.is_active).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Active Plans</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold text-blue-600">
                      {patient.created_at ? Math.floor((Date.now() - new Date(patient.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Days with us</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-3xl font-bold text-orange-600">
                      {dietPlans?.[0]?.plan_json?.totals?.calories || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">Daily Calories</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        <DashboardFooter />
      </main>
    </div>
  );
};

export default PatientProfile;
