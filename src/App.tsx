import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Doctor Pages
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorPatients from "./pages/doctor/Patients";
import DoctorReferrals from "./pages/doctor/Referrals";
import DoctorAnalytics from "./pages/doctor/Analytics";
import DoctorSettings from "./pages/doctor/Settings";

// Dietician Pages
import DieticianDashboard from "./pages/DieticianDashboard";
import DieticianSchedule from "./pages/dietician/Schedule";
import DieticianDiet from "./pages/dietician/Diet";
import DieticianSettings from "./pages/dietician/Settings";
import DieticianPatientDetail from "./pages/dietician/PatientDetail";
import DieticianCreateDiet from "./pages/dietician/CreateDiet";

// Patient Pages
import PatientDashboard from "./pages/PatientDashboard";
import PatientProfile from "./pages/patient/PatientProfile";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminPatients from "./pages/admin/Patients";
import AdminDoctors from "./pages/admin/Doctors";
import AdminDieticians from "./pages/admin/Dieticians";
import AdminReferrals from "./pages/admin/Referrals";
import AdminSettings from "./pages/admin/Settings";
import AdminJoinRequests from "./pages/admin/JoinRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />

            {/* Doctor routes */}
            <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/doctor/patients" element={<DoctorPatients />} />
              <Route path="/doctor/referrals" element={<DoctorReferrals />} />
              <Route path="/doctor/analytics" element={<DoctorAnalytics />} />
              <Route path="/doctor/settings" element={<DoctorSettings />} />
            </Route>

            {/* Dietician routes */}
            <Route element={<ProtectedRoute allowedRoles={["rd"]} />}>
              <Route path="/dietician" element={<DieticianDashboard />} />
              <Route path="/dietician/patient/:slug" element={<DieticianPatientDetail />} />
              <Route path="/dietician/patient/:slug/create-diet" element={<DieticianCreateDiet />} />
              <Route path="/dietician/schedule" element={<DieticianSchedule />} />
              <Route path="/dietician/diet" element={<DieticianDiet />} />
              <Route path="/dietician/settings" element={<DieticianSettings />} />
            </Route>

            {/* Patient routes */}
            <Route element={<ProtectedRoute allowedRoles={["patient"]} />}>
              <Route path="/patient" element={<PatientDashboard />} />
              <Route path="/patient/profile" element={<PatientProfile />} />
              <Route path="/patient/diet-plans" element={<PatientDashboard />} />
              <Route path="/patient/appointments" element={<PatientDashboard />} />
              <Route path="/patient/settings" element={<PatientDashboard />} />
            </Route>

            {/* Admin routes - multiple roles can access */}
            <Route element={<ProtectedRoute allowedRoles={["ops_manager", "founder", "tech_lead"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/patients" element={<AdminPatients />} />
              <Route path="/admin/doctors" element={<AdminDoctors />} />
              <Route path="/admin/dieticians" element={<AdminDieticians />} />
              <Route path="/admin/referrals" element={<AdminReferrals />} />
              <Route path="/admin/join-requests" element={<AdminJoinRequests />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
