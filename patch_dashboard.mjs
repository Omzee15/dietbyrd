import fs from 'fs';

let content = fs.readFileSync('src/pages/DoctorDashboard.tsx', 'utf8');

// 1. Add createReferral, lookupPhoneNumber to imports
content = content.replace(
  'getDoctorPatients, getMe, MeUser, Referral, DoctorPatientSummary',
  'createReferral, lookupPhoneNumber, getDoctorPatients, getMe, MeUser, Referral, DoctorPatientSummary'
);

// 2. Add Send to lucide-react imports
content = content.replace(
  'UserPlus, Users, BarChart3, MessageCircle, Search, ArrowLeft, X, IndianRupee, TrendingUp, Loader2, LogOut, Settings, ChevronDown, UserCheck, Plus, Trash2',
  'UserPlus, Users, BarChart3, MessageCircle, Search, ArrowLeft, X, IndianRupee, TrendingUp, Loader2, LogOut, Settings, ChevronDown, UserCheck, Plus, Trash2, Send'
);

// 3. Add diagnosisOptions
if (!content.includes('diagnosisOptions')) {
  content = content.replace(
    '// Phone validation: 10 digits',
    'const diagnosisOptions = [\n  "diabetes", "pcos", "thyroid", "hypertension", "obesity", "other"\n];\n\n// Phone validation: 10 digits'
  );
}

// 4. Update ActiveView type
content = content.replace(
  'type ActiveView = "refer" | "patients" | "admin" | "assistants";',
  'type ActiveView = "refer_patient" | "overview" | "patients" | "admin" | "assistants";'
);

// 5. Update defaultTab to overview
content = content.replace(
  'const DoctorDashboard = ({ defaultTab = "refer" }: DoctorDashboardProps) => {',
  'const DoctorDashboard = ({ defaultTab = "overview" }: DoctorDashboardProps) => {'
);

// 6. Update URL syncing logic
const oldUrlSync = `  useEffect(() => {
    if (location.pathname === "/doctor/patients") {
      setActiveView("patients");
    } else if (location.pathname === "/doctor/admin" || location.pathname === "/doctor/analytics") {
      setActiveView("admin");
    } else if (location.pathname === "/doctor/assistants") {
      setActiveView("assistants");
    } else if (location.pathname === "/doctor") {
      setActiveView("refer");
    }
  }, [location.pathname]);`;

const newUrlSync = `  useEffect(() => {
    if (location.pathname === "/doctor/patients") {
      setActiveView("patients");
    } else if (location.pathname === "/doctor/admin" || location.pathname === "/doctor/analytics") {
      setActiveView("admin");
    } else if (location.pathname === "/doctor/assistants") {
      setActiveView("assistants");
    } else if (location.pathname === "/doctor/referrals") {
      setActiveView("refer_patient");
    } else if (location.pathname === "/doctor") {
      setActiveView("overview");
    }
  }, [location.pathname]);`;

content = content.replace(oldUrlSync, newUrlSync);

// 7. Add form state
const formState = `
  // Form state
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState(diagnosisOptions[0]);

  const { data: phoneSuggestions = [] } = useQuery({
    queryKey: ["phone-lookup", patientPhone],
    queryFn: () => lookupPhoneNumber(patientPhone),
    enabled: patientPhone.length === 10 && isValidIndianPhone(patientPhone),
    staleTime: 30000,
  });

  const isExistingPatient = phoneSuggestions.some((patient: any) => patient.phone === patientPhone);
  
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneForDisplay(value);
    setPatientPhone(formatted);
  };
`;

content = content.replace(
  '// Assistant management state (only for doctors)',
  formState + '\n  // Assistant management state (only for doctors)'
);

// 8. Add form mutation
const formMutation = `
  // Create referral mutation
  const createReferralMutation = useMutation({
    mutationFn: createReferral,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["doctorReferrals"] });
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });

      if (data?.referral_sms?.sent) {
        const referredPatientName = data.patient_name?.trim() || patientName.trim() || "patient";
        toast.success(\`Onboarding message to the \${referredPatientName} sent.\`);
      }

      setPatientName("");
      setPatientPhone("");
      setClinicalNotes("");
      setDiagnosis(diagnosisOptions[0]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create referral");
    },
  });

  const handleSubmitReferral = () => {
    if (!patientPhone || !currentDoctor?.id) {
      toast.error("Please enter patient phone number");
      return;
    }
    if (!isValidIndianPhone(patientPhone)) {
      toast.error("Please enter a valid 10-digit Indian mobile number starting with 6-9");
      return;
    }
    createReferralMutation.mutate({
      patient_name: patientName,
      phone: patientPhone,
      diagnosis,
      diagnosis_description: clinicalNotes,
      doctor_id: currentDoctor.id,
    } as any);
  };
`;

content = content.replace(
  '// Create assistant mutation (only for doctors)',
  formMutation + '\n  // Create assistant mutation (only for doctors)'
);

// 9. Update nav click mapping
content = content.replace(
  'refer: "/doctor",',
  'refer_patient: "/doctor/referrals",\n      overview: "/doctor",'
);

// 10. Update the view rendering (Change activeView === "refer" to activeView === "overview")
content = content.replace(
  '{!selectedPatient && activeView === "refer" && (',
  '{!selectedPatient && activeView === "overview" && ('
);

// 11. Inject the Refer Patient form view
const referPatientView = `
            {/* Help Patient view */}
            {!selectedPatient && activeView === "refer_patient" && (
              <div className="p-6 space-y-6">
                {/* Refer Patient Form */}
                <div className="bg-card rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">Refer a New Patient</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient Name</label>
                      <Input 
                        placeholder="e.g. Priya Sharma" 
                        className="mt-1.5" 
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile Number *</label>
                      <Input 
                        type="tel"
                        inputMode="numeric"
                        placeholder="9876543210" 
                        className="mt-1.5" 
                        value={patientPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        maxLength={10}
                        pattern="[6-9][0-9]{9}"
                      />
                      {patientPhone && !isValidIndianPhone(patientPhone) && (
                        <p className="text-xs text-red-500 mt-1">Enter valid 10-digit number starting with 6-9</p>
                      )}
                      {patientPhone.length === 10 && isValidIndianPhone(patientPhone) && isExistingPatient && (
                        <p className="text-xs text-amber-600 mt-1">This number already exists</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Diagnosis</label>
                      <select value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm capitalize">
                        {diagnosisOptions.map((d) => (<option key={d} value={d} className="capitalize">{d}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 mt-4 items-end">
                    <div className="flex-1 w-full">
                      <Input 
                        placeholder="Optional: clinical notes for the dietician..." 
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="gap-2 px-6 w-full md:w-auto" 
                      onClick={handleSubmitReferral}
                      disabled={createReferralMutation.isPending}
                    >
                      {createReferralMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Send Referral <Send className="w-4 h-4" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
`;

content = content.replace(
  '{/* Help Patient view */}',
  referPatientView + '\n            {/* Overview view */}'
);

fs.writeFileSync('src/pages/DoctorDashboard.tsx', content, 'utf8');
