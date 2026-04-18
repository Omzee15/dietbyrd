const BASE_URL = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data.data as T;
}

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthCheck = () =>
  fetch("/api/health").then((r) => r.json());

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getAnalytics = () =>
  request<{
    total_patients: number;
    total_referrals: number;
    active_doctors: number;
    active_dieticians: number;
  }>("/analytics");

// ─── Patients ─────────────────────────────────────────────────────────────────
export interface Patient {
  id: number;
  name: string | null;
  phone: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  diagnosis: string | null;
  diagnosis_description: string | null;
  referral_source: string;
  created_at: string;
  dietary_preference?: string;
  assigned_rd_id?: number | null;
  assigned_dietician_name?: string | null;
  user_phone?: string;
  food_restrictions?: string | null;
  height?: number | null;  // in cm
  weight?: number | null;  // in kg
  allergies?: string | null;
}

export const getPatients = () => request<Patient[]>("/patients");
export const getPatient = (id: number) => request<Patient>(`/patients/${id}`);
export const createPatient = (data: Partial<Patient>) =>
  request<Patient>("/patients", { method: "POST", body: JSON.stringify(data) });
export const updatePatient = (id: number, data: Partial<Patient>) =>
  request<Patient>(`/patients/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const assignDietician = (patientId: number, dieticianId: number) =>
  request<{ dietician_name: string }>(`/patients/${patientId}/assign-dietician`, {
    method: "POST",
    body: JSON.stringify({ dietician_id: dieticianId }),
  });

// ─── Doctors ──────────────────────────────────────────────────────────────────
export interface Doctor {
  id: number;
  name: string;
  qualification: string;
  clinic_name: string | null;
  clinic_address: string | null;
  default_diagnosis: string;
  is_verified: boolean;
  phone?: string;
  total_referrals?: number;
}

export interface DoctorStats {
  total_referred: number;
  total_onboarded: number;
  total_commission: number;
}

export const getDoctors = () => request<Doctor[]>("/doctors");
export const getDoctor = (id: number) => request<Doctor>(`/doctors/${id}`);
export const getDoctorStats = (id: number) => request<DoctorStats>(`/doctors/${id}/stats`);
export const createDoctor = (data: Partial<Doctor> & { phone: string }) =>
  request<Doctor>("/doctors", { method: "POST", body: JSON.stringify(data) });

// ─── Assistants ───────────────────────────────────────────────────────────────
export interface Assistant {
  id: number;
  user_id: number | null;
  doctor_id: number;
  name: string;
  phone?: string;
  created_at: string;
}

export const getDoctorAssistants = (doctorId: number) =>
  request<Assistant[]>(`/doctors/${doctorId}/assistants`);
export const createAssistant = (data: { doctor_id: number; name: string; phone: string; password: string }) =>
  request<Assistant>("/assistants", { method: "POST", body: JSON.stringify(data) });
export const deleteAssistant = (id: number) =>
  request<{ message: string }>(`/assistants/${id}`, { method: "DELETE" });

// ─── Dieticians ───────────────────────────────────────────────────────────────
export interface Dietician {
  id: number;
  name: string;
  qualification: string;
  specializations: string[] | null;
  is_active: boolean;
  phone?: string;
  active_patients?: number;
}

export const getDieticians = () => request<Dietician[]>("/dieticians");
export const getDietician = (id: number) => request<Dietician>(`/dieticians/${id}`);
export const getDieticianPatients = (id: number) => request<Patient[]>(`/dieticians/${id}/patients`);

// ─── Referrals ────────────────────────────────────────────────────────────────
export interface Referral {
  id: number;
  patient_id: number;
  referred_by_doctor_id: number;
  source: string;
  notes: string | null;
  created_at: string;
  patient_name?: string;
  patient_phone?: string;
  diagnosis?: string;
  doctor_name?: string;
  age?: number;
  gender?: string;
}

export const getReferrals = () => request<Referral[]>("/referrals");
export const getDoctorReferrals = (doctorId: number) =>
  request<Referral[]>(`/referrals/doctor/${doctorId}`);

export interface CreateReferralResponse extends Referral {
  is_new_patient?: boolean;
  message?: string;
}
export const createReferral = (data: {
  patient_name: string;
  phone: string;
  diagnosis?: string;
  diagnosis_description?: string;
  notes?: string;
  doctor_id: number;
}) => request<CreateReferralResponse>("/referrals", { method: "POST", body: JSON.stringify(data) });

// Phone lookup for doctor referral autocomplete
export interface PhoneLookupResult {
  id: number;
  name: string | null;
  phone: string;
  diagnosis: string | null;
}
export const lookupPhoneNumber = (phone: string) =>
  request<PhoneLookupResult[]>(`/patients/lookup-phone?phone=${encodeURIComponent(phone)}`);

// ─── Consultations ────────────────────────────────────────────────────────────
export interface Consultation {
  id: number;
  patient_id: number;
  rd_id: number;
  type: string;
  status: string;
  scheduled_at: string;
  patient_name?: string;
  dietician_name?: string;
}

export const getConsultations = (filters?: { rd_id?: number; patient_id?: number; status?: string }) => {
  const params = new URLSearchParams();
  if (filters?.rd_id) params.set("rd_id", String(filters.rd_id));
  if (filters?.patient_id) params.set("patient_id", String(filters.patient_id));
  if (filters?.status) params.set("status", filters.status);
  return request<Consultation[]>(`/consultations?${params.toString()}`);
};

// ─── Diet Plans ───────────────────────────────────────────────────────────────
export interface DietPlan {
  id: number;
  registered_patient_id: number;
  rd_id: number;
  consultation_id: number | null;
  plan_json: {
    meals?: Array<{
      name: string;
      items: Array<{
        name: string;
        nameHindi?: string;
        quantity: number;
        unit: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }>;
    }>;
    totals?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    targets?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    weight?: {
      current: number | null;
      target: number | null;
    };
    createdAt?: string;
  };
  is_active: boolean;
  issued_at: string;
  sent_via_whatsapp: boolean;
  sent_to_portal: boolean;
  sent_to_doctor: boolean;
  view_count: number;
  total_view_time_seconds: number;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  dietician_name?: string;
}

export const getPatientDietPlans = (patientId: number) =>
  request<DietPlan[]>(`/patients/${patientId}/diet-plans`);

export const createDietPlan = (data: {
  patient_id: number;
  rd_id: number;
  plan_json: object;
  consultation_id?: number;
}) =>
  request<DietPlan>("/diet-plans", { method: "POST", body: JSON.stringify(data) });

// ─── Join Requests ────────────────────────────────────────────────────────────
export interface JoinRequest {
  id: number;
  phone: string;
  name: string;
  requested_role: "doctor" | "rd";
  qualification: string;
  clinic_name?: string | null;
  clinic_address?: string | null;
  specializations?: string[] | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
  reviewed_by?: number | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export const getJoinRequests = (status?: string) => {
  const params = status ? `?status=${status}` : "";
  return request<JoinRequest[]>(`/join-requests${params}`);
};

export const createJoinRequest = (data: {
  phone: string;
  password: string;
  name: string;
  role: "doctor" | "rd";
  qualification: string;
  clinic_name?: string;
  clinic_address?: string;
  specializations?: string[];
}) => request<JoinRequest>("/join-requests", { method: "POST", body: JSON.stringify(data) });

export const approveJoinRequest = (id: number, reviewedBy?: number) =>
  request<{ message: string }>(`/join-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "approve", reviewed_by: reviewedBy }),
  });

export const rejectJoinRequest = (id: number, reviewedBy?: number, reason?: string) =>
  request<{ message: string }>(`/join-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "reject", reviewed_by: reviewedBy, rejection_reason: reason }),
  });
