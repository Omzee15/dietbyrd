import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Pages
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Register from "./pages/Register";

import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import Refund from "./pages/legal/Refund";
import Cancellation from "./pages/legal/Cancellation";
import Reviews from "./pages/Reviews";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import ContactUs from "./pages/ContactUs";

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
import DieticianFoodLibrary from "./pages/dietician/FoodLibrary";

// Patient Pages
import PatientDashboard from "./pages/PatientDashboard";
import PatientProfile from "./pages/patient/PatientProfile";
import PatientDietPlans from "./pages/patient/PatientDietPlans";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientSupport from "./pages/patient/PatientSupport";
import Pay from "./pages/Pay";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminPatients from "./pages/admin/Patients";
import AdminDoctors from "./pages/admin/Doctors";
import AdminDieticians from "./pages/admin/Dieticians";
import AdminReferrals from "./pages/admin/Referrals";
import AdminSettings from "./pages/admin/Settings";
import AdminJoinRequests from "./pages/admin/JoinRequests";
import AdminFoodLibrary from "./pages/admin/FoodLibrary";
import AdminCoupons from "./pages/admin/Coupons";
import AdminMLTInterns from "./pages/admin/MLTInterns";
import AdminSupportTeam from "./pages/admin/SupportTeam";
import AdminReviews from "./pages/admin/Reviews";

// MLT Intern Pages
import MLTInternDashboard from "./pages/MLTInternDashboard";
import MLTInternPatientDetail from "./pages/mlt-intern/PatientDetail";
import MLTInternDoctorDetail from "./pages/mlt-intern/DoctorDetail";
import MLTInternDieticianDetail from "./pages/mlt-intern/DieticianDetail";
import MLTInternJoinRequestDetail from "./pages/mlt-intern/JoinRequestDetail";

// Support Team Pages
import SupportDashboard from "./pages/SupportDashboard";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <PWAUpdatePrompt />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Index />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join" element={<Index />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/cancellation" element={<Cancellation />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/pay" element={<Pay />} />

            {/* Doctor routes - doctors and their assistants */}
            <Route element={<ProtectedRoute allowedRoles={["doctor", "assistant"]} />}>
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/doctor/patients" element={<DoctorPatients />} />
              <Route path="/doctor/patient/:slug/create-diet" element={<DieticianCreateDiet />} />
              <Route path="/doctor/patient/:slug/edit-diet/:planId" element={<DieticianCreateDiet />} />
              <Route path="/doctor/referrals" element={<DoctorReferrals />} />
              <Route path="/doctor/admin" element={<DoctorAnalytics />} />
              <Route path="/doctor/analytics" element={<DoctorAnalytics />} />
              <Route path="/doctor/assistants" element={<DoctorDashboard defaultTab="assistants" />} />
              <Route path="/doctor/settings" element={<DoctorSettings />} />
            </Route>

            {/* Dietician routes */}
            <Route element={<ProtectedRoute allowedRoles={["rd"]} />}>
              <Route path="/dietician" element={<DieticianDashboard />} />
              <Route path="/dietician/patients" element={<DieticianDashboard />} />
              <Route path="/dietician/patient/:slug" element={<DieticianPatientDetail />} />
              <Route path="/dietician/patient/:slug/create-diet" element={<DieticianCreateDiet />} />
              <Route path="/dietician/patient/:slug/edit-diet/:planId" element={<DieticianCreateDiet />} />
              <Route path="/dietician/schedule" element={<DieticianSchedule />} />
              <Route path="/dietician/diet" element={<DieticianDiet />} />
              <Route path="/dietician/food-library" element={<DieticianFoodLibrary />} />
              <Route path="/dietician/settings" element={<DieticianSettings />} />
            </Route>

            {/* Patient routes */}
            <Route element={<ProtectedRoute allowedRoles={["patient"]} />}>
              <Route path="/patient" element={<PatientDashboard />} />
              <Route path="/patient/profile" element={<PatientProfile />} />
              <Route path="/patient/diet-plans" element={<PatientDietPlans />} />
              <Route path="/patient/appointments" element={<PatientAppointments />} />
              <Route path="/patient/support" element={<PatientSupport />} />
            </Route>

            {/* Admin routes - multiple roles can access */}
            <Route element={<ProtectedRoute allowedRoles={["ops_manager", "founder", "tech_lead"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/patients" element={<AdminPatients />} />
              <Route path="/admin/doctors" element={<AdminDoctors />} />
              <Route path="/admin/dieticians" element={<AdminDieticians />} />
              <Route path="/admin/mlt-interns" element={<AdminMLTInterns />} />
              <Route path="/admin/support-team" element={<AdminSupportTeam />} />
              <Route path="/admin/referrals" element={<AdminReferrals />} />
              <Route path="/admin/join-requests" element={<AdminJoinRequests />} />
              <Route path="/admin/food-library" element={<AdminFoodLibrary />} />
              <Route path="/admin/coupons" element={<AdminCoupons />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* MLT Intern routes */}
            <Route element={<ProtectedRoute allowedRoles={["mlt_intern"]} />}>
              <Route path="/mlt-intern" element={<Navigate to="/mlt-intern/patients" replace />} />
              <Route path="/mlt-intern/patients" element={<MLTInternDashboard />} />
              <Route path="/mlt-intern/doctors" element={<MLTInternDashboard />} />
              <Route path="/mlt-intern/dieticians" element={<MLTInternDashboard />} />
              <Route path="/mlt-intern/join-requests" element={<MLTInternDashboard />} />
              <Route path="/mlt-intern/unregistered-referrals" element={<MLTInternDashboard />} />
              <Route path="/mlt-intern/food-library" element={<MLTInternDashboard />} />
              <Route path="/mlt-intern/leaves" element={<MLTInternDashboard />} />
              <Route path="/mlt-intern/patient/:id" element={<MLTInternPatientDetail />} />
              <Route path="/mlt-intern/doctor/:id" element={<MLTInternDoctorDetail />} />
              <Route path="/mlt-intern/dietician/:id" element={<MLTInternDieticianDetail />} />
              <Route path="/mlt-intern/join-request/:id" element={<MLTInternJoinRequestDetail />} />
            </Route>

            {/* Support Team routes */}
            <Route element={<ProtectedRoute allowedRoles={["support_intern"]} />}>
              <Route path="/support" element={<SupportDashboard />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

