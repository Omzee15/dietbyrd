import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Register = lazy(() => import("./pages/Register"));

const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Refund = lazy(() => import("./pages/legal/Refund"));
const Cancellation = lazy(() => import("./pages/legal/Cancellation"));
const Reviews = lazy(() => import("./pages/Reviews"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const ContactUs = lazy(() => import("./pages/ContactUs"));

// Doctor Pages
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const DoctorPatients = lazy(() => import("./pages/doctor/Patients"));
const DoctorReferrals = lazy(() => import("./pages/doctor/Referrals"));
const DoctorAnalytics = lazy(() => import("./pages/doctor/Analytics"));
const DoctorSettings = lazy(() => import("./pages/doctor/Settings"));

// Dietician Pages
const DieticianDashboard = lazy(() => import("./pages/DieticianDashboard"));
const DieticianSchedule = lazy(() => import("./pages/dietician/Schedule"));
const DieticianDiet = lazy(() => import("./pages/dietician/Diet"));
const DieticianSettings = lazy(() => import("./pages/dietician/Settings"));
const DieticianPatientDetail = lazy(() => import("./pages/dietician/PatientDetail"));
const DieticianCreateDiet = lazy(() => import("./pages/dietician/CreateDiet"));
const DieticianFoodLibrary = lazy(() => import("./pages/dietician/FoodLibrary"));

// Patient Pages
const PatientDashboard = lazy(() => import("./pages/PatientDashboard"));
const PatientProfile = lazy(() => import("./pages/patient/PatientProfile"));
const PatientDietPlans = lazy(() => import("./pages/patient/PatientDietPlans"));
const PatientAppointments = lazy(() => import("./pages/patient/PatientAppointments"));
const PatientSupport = lazy(() => import("./pages/patient/PatientSupport"));
const Pay = lazy(() => import("./pages/Pay"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminPatients = lazy(() => import("./pages/admin/Patients"));
const AdminDoctors = lazy(() => import("./pages/admin/Doctors"));
const AdminDieticians = lazy(() => import("./pages/admin/Dieticians"));
const AdminReferrals = lazy(() => import("./pages/admin/Referrals"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminJoinRequests = lazy(() => import("./pages/admin/JoinRequests"));
const AdminFoodLibrary = lazy(() => import("./pages/admin/FoodLibrary"));
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const AdminMLTInterns = lazy(() => import("./pages/admin/MLTInterns"));
const AdminSupportTeam = lazy(() => import("./pages/admin/SupportTeam"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));

// MLT Intern Pages
const MLTInternDashboard = lazy(() => import("./pages/MLTInternDashboard"));
const MLTInternPatientDetail = lazy(() => import("./pages/mlt-intern/PatientDetail"));
const MLTInternDoctorDetail = lazy(() => import("./pages/mlt-intern/DoctorDetail"));
const MLTInternDieticianDetail = lazy(() => import("./pages/mlt-intern/DieticianDetail"));
const MLTInternJoinRequestDetail = lazy(() => import("./pages/mlt-intern/JoinRequestDetail"));

// Support Team Pages
const SupportDashboard = lazy(() => import("./pages/SupportDashboard"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

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
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
