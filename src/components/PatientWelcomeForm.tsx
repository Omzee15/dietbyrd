import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Heart, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface PatientWelcomeFormProps {
  phone: string;
  onComplete: (userData: any) => void;
  inline?: boolean; // If true, renders without full-page wrapper
  onBack?: () => void; // Optional callback to go back
}

const diagnosisOptions = [
  { value: "diabetes", label: "Diabetes" },
  { value: "pcos", label: "PCOS" },
  { value: "thyroid", label: "Thyroid" },
  { value: "hypertension", label: "Hypertension" },
  { value: "obesity", label: "Obesity" },
  { value: "other", label: "Other" },
];

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export function PatientWelcomeForm({ phone, onComplete, inline = false, onBack }: PatientWelcomeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    diagnosis: "",
    diagnosisDescription: "",
    allergies: "",
    height: "",
    weight: "",
    workoutFrequency: "",
    dietaryPreference: "",
    state: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      toast.error("Please enter a valid age");
      return;
    }

    if (!formData.gender) {
      toast.error("Please select your gender");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/complete-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          age: parseInt(formData.age),
          gender: formData.gender,
          diagnosis: formData.diagnosis || null,
          diagnosisDescription: formData.diagnosisDescription.trim() || null,
          allergies: formData.allergies
            ? formData.allergies.split(",").map((a) => a.trim()).filter(Boolean)
            : [],
          height: formData.height ? parseFloat(formData.height) : null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          workoutFrequency: formData.workoutFrequency ? parseInt(formData.workoutFrequency) : null,
          dietaryPreference: formData.dietaryPreference || null,
          state: formData.state.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Failed to complete registration");
        setIsSubmitting(false);
        return;
      }

      toast.success("Welcome to DietbyRD! 🎉");
      onComplete(data.data);
    } catch (err) {
      console.error("Welcome form error:", err);
      toast.error("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Inline version - no wrapper, just the form content
  if (inline) {
    return (
      <>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Change Phone Number
          </button>
        )}
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Complete Your Profile</h2>
          <p className="text-slate-600 mt-2 text-sm font-medium">Phone: {phone}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Basic Information
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email Address (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-sm">State/Location (Optional)</Label>
                    <Input
                      id="state"
                      placeholder="e.g. Maharashtra"
                      value={formData.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="age" className="text-sm">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Your age"
                      min="1"
                      max="120"
                      value={formData.age}
                      onChange={(e) => handleChange("age", e.target.value)}
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gender" className="text-sm">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select your gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            </div>

            {/* Health Information */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Health Information
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="diagnosis" className="text-sm">Primary Health Concern (Optional)</Label>
                <Select value={formData.diagnosis} onValueChange={(value) => handleChange("diagnosis", value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select if applicable" />
                  </SelectTrigger>
                  <SelectContent>
                    {diagnosisOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.diagnosis && (
                <div className="space-y-1.5">
                  <Label htmlFor="diagnosisDescription" className="text-sm">Additional Details (Optional)</Label>
                  <Textarea
                    id="diagnosisDescription"
                    placeholder="Any additional information..."
                    value={formData.diagnosisDescription}
                    onChange={(e) => handleChange("diagnosisDescription", e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="allergies" className="text-sm">Allergies (Optional)</Label>
                <Input
                  id="allergies"
                  placeholder="e.g., Nuts, Dairy (comma-separated)"
                  value={formData.allergies}
                  onChange={(e) => handleChange("allergies", e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* Physical Metrics */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-900">Physical Metrics (Optional)</h3>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="height" className="text-sm">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
                    step="0.1"
                    min="50"
                    max="300"
                    value={formData.height}
                    onChange={(e) => handleChange("height", e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="weight" className="text-sm">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    step="0.1"
                    min="20"
                    max="500"
                    value={formData.weight}
                    onChange={(e) => handleChange("weight", e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="workoutFrequency" className="text-sm">Workouts/Week</Label>
                  <Input
                    id="workoutFrequency"
                    type="number"
                    placeholder="0-7"
                    min="0"
                    max="7"
                    value={formData.workoutFrequency}
                    onChange={(e) => handleChange("workoutFrequency", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dietaryPreference" className="text-sm">Dietary Preference (Optional)</Label>
                <Input
                  id="dietaryPreference"
                  placeholder="e.g., Vegetarian, Vegan"
                  value={formData.dietaryPreference}
                  onChange={(e) => handleChange("dietaryPreference", e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Your Account...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>

            <p className="text-xs text-center text-slate-400">
              By continuing, you agree to our terms of service and privacy policy.
            </p>
          </form>
      </>
    );
  }

  // Full-page version with Card wrapper
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900">
            Welcome to DietbyRD!
          </CardTitle>
          <CardDescription className="text-base">
            Please complete your profile to get started
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Your age"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Location (Optional)</Label>
                  <Input
                    id="state"
                    placeholder="e.g. Maharashtra"
                    value={formData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Health Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Health Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">Primary Health Concern (Optional)</Label>
                <Select value={formData.diagnosis} onValueChange={(value) => handleChange("diagnosis", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select if applicable" />
                  </SelectTrigger>
                  <SelectContent>
                    {diagnosisOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.diagnosis && (
                <div className="space-y-2">
                  <Label htmlFor="diagnosisDescription">Additional Details (Optional)</Label>
                  <Textarea
                    id="diagnosisDescription"
                    placeholder="Any additional information about your condition..."
                    value={formData.diagnosisDescription}
                    onChange={(e) => handleChange("diagnosisDescription", e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies (Optional)</Label>
                <Input
                  id="allergies"
                  placeholder="e.g., Nuts, Dairy, Gluten (comma-separated)"
                  value={formData.allergies}
                  onChange={(e) => handleChange("allergies", e.target.value)}
                />
                <p className="text-xs text-slate-500">Separate multiple allergies with commas</p>
              </div>
            </div>

            {/* Physical Metrics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Physical Metrics (Optional)</h3>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="e.g., 170"
                    step="0.1"
                    min="50"
                    max="300"
                    value={formData.height}
                    onChange={(e) => handleChange("height", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="e.g., 70"
                    step="0.1"
                    min="20"
                    max="500"
                    value={formData.weight}
                    onChange={(e) => handleChange("weight", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workoutFrequency">Workouts/Week</Label>
                  <Input
                    id="workoutFrequency"
                    type="number"
                    placeholder="0-7"
                    min="0"
                    max="7"
                    value={formData.workoutFrequency}
                    onChange={(e) => handleChange("workoutFrequency", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dietaryPreference">Dietary Preference (Optional)</Label>
                <Input
                  id="dietaryPreference"
                  placeholder="e.g., Vegetarian, Vegan, Non-vegetarian"
                  value={formData.dietaryPreference}
                  onChange={(e) => handleChange("dietaryPreference", e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Your Account...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>

            <p className="text-xs text-center text-slate-500">
              By continuing, you agree to our terms of service and privacy policy.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
