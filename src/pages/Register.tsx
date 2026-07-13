import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Heart, Leaf } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CitySearchCombobox } from "@/components/CitySearchCombobox";
import { getAuthHeaders } from "@/lib/api";

interface TokenData {
  patientPhone: string;
  patientName: string;
  doctorId: number;
  doctorName: string;
  diagnosis: string;
  diagnosisDescription: string;
}

type RegistrationStep = "loading" | "form" | "success" | "error";

const diagnosisOptions = [
  "diabetes", "pcos", "thyroid", "hypertension", "obesity", "other"
];

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [step, setStep] = useState<RegistrationStep>("loading");
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("");
  const [city, setCity] = useState("");

  // Verify token or short ref code on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const ref = searchParams.get("ref");
        const token = searchParams.get("token");

        if (!ref && !token) {
          setError("No registration link provided. Please use the link sent to your phone.");
          setStep("error");
          return;
        }

        let response: Response;
        if (ref) {
          response = await fetch(`/api/referrals/verify-ref?ref=${encodeURIComponent(ref)}`);
        } else {
          response = await fetch(`/api/referrals/verify-token?token=${encodeURIComponent(token!)}`);
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || "Invalid or expired registration link. Please request a new referral.");
          setStep("error");
          return;
        }

        setTokenData(data.data);
        setStep("form");
      } catch (err) {
        setError(`Failed to verify registration link: ${err instanceof Error ? err.message : "Unknown error"}`);
        setStep("error");
      }
    };

    verifyToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenData) {
      toast.error("Token data not available");
      return;
    }

    // Validation
    if (!password || !confirmPassword) {
      toast.error("Please enter and confirm your password");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (!age || !gender || !dietaryPreference || !city) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Sign up the patient
      const authResult = await signup(
        tokenData.patientPhone,
        password,
        tokenData.patientName
      );

      if (!authResult.success) {
        throw new Error(authResult.error || "Signup failed");
      }

      // Update patient profile with additional info
      try {
        const updateResponse = await fetch("/api/patients/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            age: parseInt(age),
            gender,
            dietary_preference: dietaryPreference,
            diagnosis: tokenData.diagnosis,
            city,
          }),
        });

        if (!updateResponse.ok) {
          console.warn("Failed to update patient profile, but signup succeeded");
        }
      } catch (profileErr) {
        console.warn("Could not update profile:", profileErr);
      }

      // Show success and redirect
      setStep("success");
      setTimeout(() => {
        navigate("/patient");
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Verifying your registration link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Link Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => navigate("/")}
            className="w-full"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center max-w-md mx-4">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to DietByRD!</h2>
            <p className="text-gray-600 mb-2">Your registration is complete.</p>
            <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Welcome Section */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full">
              <Leaf className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Referred Patient</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">DietByRD</span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed">
              You have been referred by
            </p>

            <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-blue-500">
              <p className="text-sm text-gray-500 mb-2">Referred by</p>
              <p className="text-2xl font-bold text-gray-900">
                Dr. {tokenData?.doctorName || "Your Doctor"}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-indigo-500">
              <p className="text-sm text-gray-500 mb-2">Your Focus Area</p>
              <p className="text-xl font-semibold text-gray-900 capitalize">
                {tokenData?.diagnosis || "Health Management"}
              </p>
              {tokenData?.diagnosisDescription && (
                <p className="text-sm text-gray-600 mt-2">{tokenData.diagnosisDescription}</p>
              )}
            </div>

            <div className="flex items-start gap-3 text-gray-700">
              <Heart className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
              <p className="text-sm">
                Our nutrition experts are here to help you achieve your health goals with personalized guidance.
              </p>
            </div>
          </div>
        </div>

        {/* Registration Form Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Registration</h2>
          <p className="text-gray-600 mb-8">
            Enter your details to get started on your health journey
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name (read-only from token) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                value={tokenData?.patientName || ""}
                disabled
                className="bg-gray-50"
              />
            </div>

            {/* Phone (read-only from token) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <Input
                type="tel"
                value={tokenData?.patientPhone || ""}
                disabled
                className="bg-gray-50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="Enter your password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="Enter your age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="1"
                max="150"
                required
              />
              {age && parseInt(age) < 18 && parseInt(age) > 0 && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-medium mb-1">Important notice for under-18 registration</p>
                  <p>Nutrition guidance is equally important for younger individuals, and Diet By RD consultations are available for users under 18 as well.</p>
                  <p className="mt-1">However, for individuals below 18 years of age, the booking must be completed by a parent or legal guardian to comply with applicable healthcare and data protection requirements.</p>
                </div>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender <span className="text-red-500">*</span>
              </label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <CitySearchCombobox
                value={city}
                onChange={setCity}
              />
            </div>

            {/* Dietary Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Preference <span className="text-red-500">*</span>
              </label>
              <Select value={dietaryPreference} onValueChange={setDietaryPreference}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your dietary preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="non-vegetarian">Non-Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Complete Registration
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By registering, you agree to our{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
