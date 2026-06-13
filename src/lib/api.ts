const BASE_URL = "/api";

const getStoredAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem("dietbyrd_user");
    if (!stored) return {};
    const user = JSON.parse(stored);
    if (!user?.id || !user?.role) return {};
    const headers: Record<string, string> = {
      "x-user-id": String(user.id),
      "x-user-role": String(user.role),
    };
    if (user.profileId) {
      headers["x-patient-id"] = String(user.profileId);
    }
    return headers;
  } catch {
    return {};
  }
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...options?.headers },
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
  email?: string | null;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  diagnosis: string | null;
  diagnoses?: string[] | null;
  diagnosis_description: string | null;
  referral_source: string;
  created_at: string;
  improvement_score?: number;
  improvement_updated_at?: string;
  dietary_preference?: string;
  assigned_rd_id?: number | null;
  assigned_dietician_name?: string | null;
  assigned_dietician_qualification?: string | null;
  user_phone?: string;
  food_restrictions?: string | null;
  height?: number | null;  // in cm
  weight?: number | null;  // in kg
  allergies?: string | string[] | null;  // Can be string or array from JSONB
  workout_frequency?: number | null;  // 0-7 times per week
  // Referring doctor info
  referring_doctor_id?: number | null;
  referring_doctor_name?: string | null;
  referring_doctor_qualification?: string | null;
  referring_doctor_clinic?: string | null;
  payment_status?: "paid" | "unpaid";
  payment_history?: Array<{
    payment_id: number;
    amount: number | string;
    currency?: string;
    status: "pending" | "success" | "failed" | "refunded" | "created" | string;
    consultations_purchased?: number;
    payment_method?: string;
    razorpay_payment_id?: string;
    paid_at?: string | null;
    created_at?: string;
  }>;
}

export const getPatients = () => request<Patient[]>("/patients");
export const getPatient = (id: number) => request<Patient>(`/patients/${id}`);
export const createPatient = (data: Partial<Patient>) =>
  request<Patient>("/patients", { method: "POST", body: JSON.stringify(data) });
export const updatePatient = (id: number, data: Partial<Patient>) =>
  request<Patient>(`/patients/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const updatePatientImprovementScore = (patientId: number, score: number) =>
  request<{ score: number; updated_at: string }>(
    `/dietitian/patients/${patientId}/improvement-score`,
    { 
      method: "PATCH", 
      headers: { ...getStoredAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ score })
    }
  );

export const assignDoctor = (patientId: number, doctorId: number) =>
  request<{ referring_doctor_id: number; referring_doctor_name: string }>(`/patients/${patientId}/assign-doctor`, {
    method: "POST",
    body: JSON.stringify({ doctor_id: doctorId }),
  });

export const assignDietician = (patientId: number, dieticianId: number) =>
  request<{ dietician_name: string }>(`/patients/${patientId}/assign-dietician`, {
    method: "POST",
    body: JSON.stringify({ dietician_id: dieticianId }),
  });

export interface DoctorPatientSummary {
  id: number;
  name: string | null;
  phone: string;
  referred_at: string | null;
  payment_status: "paid" | "unpaid" | string;
  consultation_status: "booked" | "completed" | "not_yet" | string;
  improvement_score?: number;
  improvement_updated_at?: string;
}

export const getDoctorPatients = () =>
  request<DoctorPatientSummary[]>("/doctor/me/patients", {
    headers: getStoredAuthHeaders(),
  });

// ─── Patient Messages ─────────────────────────────────────────────────────────
export interface PatientMessage {
  id: string;
  type: 'referral_sms' | 'welcome_whatsapp' | 'otp' | string;
  channel: 'sms' | 'whatsapp';
  content: string;
  status: 'sent' | 'failed' | 'not_sent' | 'pending';
  sent_at: string;
  sent_by: string;
  to?: string;
  doctorName?: string;
  error?: string;
  [key: string]: unknown;
}

export const getPatientMessages = (patientId: number) =>
  request<PatientMessage[]>(`/patients/${patientId}/messages`);

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

export const verifyDoctor = (id: number) =>
  request<Pick<Doctor, "id" | "name" | "is_verified">>(`/doctors/${id}/verify`, { method: "PATCH" });

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
  clinic_name?: string | null;
  clinic_address?: string | null;
}

export const getDieticians = () => request<Dietician[]>("/dieticians");
export const getDietician = (id: number) => request<Dietician>(`/dieticians/${id}`);
export const getDieticianPatients = (id: number) => request<Patient[]>(`/dieticians/${id}/patients`);

// ─── Referrals ────────────────────────────────────────────────────────────────
export interface Referral {
  id: number;
  patient_id: number;
  referred_by_doctor_id: number;
  doctor_id?: number;
  source: string;
  notes: string | null;
  created_at?: string;
  referred_at?: string;
  patient_name?: string;
  patient_phone?: string;
  diagnosis?: string;
  doctor_name?: string;
  age?: number;
  gender?: string;
  is_registered?: boolean;
}

export interface UnregisteredReferral {
  id: number; // patient ID
  name: string | null;
  phone: string;
  age: number | null;
  gender: string | null;
  diagnosis: string | null;
  diagnosis_description: string | null;
  referral_source: string;
  created_at: string;
  referred_at: string;
  referral_method: string;
  doctor_id: number | null;
  doctor_name: string | null;
  doctor_clinic: string | null;
  doctor_qualification: string | null;
  message_sent: boolean;
  last_message_status: string | null;
}

export const getReferrals = () => request<Referral[]>("/referrals");
export const getDoctorReferrals = (doctorId: number) =>
  request<Referral[]>(`/referrals/doctor/${doctorId}`);
export const getUnregisteredReferrals = () => request<UnregisteredReferral[]>("/referrals/unregistered");

export interface CreateReferralResponse extends Referral {
  is_new_patient?: boolean;
  message?: string;
  referral_sms?: {
    sent?: boolean;
    reason?: string;
  };
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
  meeting_link?: string;
}

export const getConsultations = (filters?: { rd_id?: number; patient_id?: number; status?: string }) => {
  const params = new URLSearchParams();
  if (filters?.rd_id) params.set("rd_id", String(filters.rd_id));
  if (filters?.patient_id) params.set("patient_id", String(filters.patient_id));
  if (filters?.status) params.set("status", filters.status);
  return request<Consultation[]>(`/consultations?${params.toString()}`);
};

export const updateMeetingLink = (rdId: number, consultationId: number, link: string) =>
  request<Consultation>(`/rd/${rdId}/consultations/${consultationId}/link`, {
    method: "PUT",
    body: JSON.stringify({ meeting_link: link }),
  });

// Consultation preview for payment page
export const getConsultationPreview = (consultationId: number) =>
  request<{
    consultation_id: number;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    doctor_name?: string | null;
    diagnosis?: string | null;
    amount: number;
    currency: string;
    status: string;
  }>(`/consultations/${consultationId}/preview`);

export const resendPaymentLink = (consultationId: number) =>
  request<{ sent: boolean; payment_link?: string; message_result?: any }>(`/consultations/${consultationId}/resend-payment-link`, {
    method: "POST",
    headers: getStoredAuthHeaders(),
  });

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

export const getDietPlan = (id: number) =>
  request<DietPlan>(`/diet-plans/${id}`);

export const createDietPlan = (data: {
  patient_id: number;
  rd_id: number;
  plan_json: object;
  consultation_id?: number;
}) =>
  request<DietPlan>("/diet-plans", { method: "POST", body: JSON.stringify(data) });

export const updateDietPlan = (id: number, data: { plan_json: object }) =>
  request<DietPlan>(`/diet-plans/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// ─── Join Requests ────────────────────────────────────────────────────────────
export interface JoinRequest {
  id: number;
  phone: string;
  name: string;
  applicant_email?: string | null;
  requested_role: "doctor" | "rd";
  qualification: string;
  clinic_name?: string | null;
  clinic_address?: string | null;
  specializations?: string[] | null;
  about_yourself?: string | null;
  experience_years?: number | null;
  medical_license_number?: string | null;
  status: "pending" | "interview_sent" | "approved" | "rejected";
  rejection_reason?: string | null;
  admin_message?: string | null;
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

export const approveJoinRequest = (id: number, reviewedBy?: number, adminMessage?: string, commissionRate?: number) =>
  request<{ message: string }>(`/join-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "approve", reviewed_by: reviewedBy, admin_message: adminMessage, commission_rate: commissionRate }),
  });

export const rejectJoinRequest = (id: number, reviewedBy?: number, reason?: string, adminMessage?: string, delivery?: "email_first" | "email_only" | "whatsapp_only" | "both") =>
  request<any>(`/join-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "reject", reviewed_by: reviewedBy, rejection_reason: reason, admin_message: adminMessage, delivery }),
  });

export const scheduleInterview = (
  id: number,
  message?: string,
  delivery?: "email_first" | "email_only" | "whatsapp_only" | "both",
) =>
  request<{ email?: { sent: boolean; reason?: string }; whatsapp?: { sent: boolean; reason?: string }; status?: string }>(
    `/join-requests/${id}/schedule-interview`,
    {
      method: "POST",
      body: JSON.stringify({ message, delivery }),
    },
  );

// ─── Appointment Booking ──────────────────────────────────────────────────────
export interface DieticianAvailability {
  id: number;
  rd_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface AvailableSlot {
  date: string;
  start_time: string;
  datetime: string;
  duration_minutes: number;
  is_booked?: boolean;
  rd_id?: number;
  dietician_name?: string;
}

export interface Appointment {
  id: number;
  registered_patient_id: number;
  rd_id: number;
  scheduled_at: string;
  consultation_type: string;
  status: string;
  booked_by_patient: boolean;
  patient_notes?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  dietician_name?: string;
  dietician_qualification?: string;
  patient_name?: string;
}

export const getDieticianAvailability = (dieticianId: number) =>
  request<DieticianAvailability[]>(`/dieticians/${dieticianId}/availability`);

export const setDieticianAvailability = (
  dieticianId: number,
  schedules: Array<{ day_of_week: number; start_time: string; end_time: string; slot_duration_minutes?: number }>
) =>
  request<DieticianAvailability[]>(`/dieticians/${dieticianId}/availability`, {
    method: "POST",
    body: JSON.stringify({ schedules }),
  });

export const getAvailableSlots = (dieticianId: number, startDate: string, endDate: string) =>
  request<AvailableSlot[]>(`/dieticians/${dieticianId}/available-slots?start_date=${startDate}&end_date=${endDate}`);

export const getAllDieticianSlots = (startDate: string, endDate: string) =>
  request<AvailableSlot[]>(`/dieticians/all-available-slots?start_date=${startDate}&end_date=${endDate}`);

export const bookAppointment = (data: {
  patient_id: number;
  rd_id?: number | null;
  scheduled_at: string;
  consultation_type?: string;
  patient_notes?: string;
}) =>
  request<Appointment>("/appointments/book", {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface UnassignedAppointment {
  id: number;
  scheduled_at: string;
  consultation_type: string;
  status: string;
  created_at: string;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  patient_diagnosis: string | null;
}

export const getUnassignedAppointments = () =>
  request<UnassignedAppointment[]>("/appointments/unassigned");

export interface AutoAssignResult {
  assigned: number;
  total_pending: number;
  details: { consultation_id: number; scheduled_at: string; patient_name?: string; assigned: boolean; rd_name?: string; reason?: string }[];
}

export const triggerAutoAssign = () =>
  request<AutoAssignResult>("/appointments/trigger-auto-assign", { method: "POST" });

export const getPatientAppointments = (patientId: number, options?: { status?: string; upcoming_only?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.upcoming_only) params.set("upcoming_only", "true");
  return request<Appointment[]>(`/patients/${patientId}/appointments?${params.toString()}`);
};

export const getPatientMeAppointments = (options?: { status?: string; upcoming_only?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.upcoming_only) params.set("upcoming_only", "true");
  const query = params.toString();
  return request<Appointment[]>(`/patient/me/appointments${query ? `?${query}` : ""}`, {
    headers: getStoredAuthHeaders(),
  });
};

export const cancelAppointment = (appointmentId: number, cancelledBy?: string) =>
  request<Appointment>(`/appointments/${appointmentId}/cancel`, {
    method: "PUT",
    body: JSON.stringify({ cancelled_by: cancelledBy }),
  });

export const rescheduleAppointment = (appointmentId: number, newScheduledAt: string, patientNotes?: string) =>
  request<Appointment>(`/appointments/${appointmentId}/reschedule`, {
    method: "PUT",
    body: JSON.stringify({ new_scheduled_at: newScheduledAt, patient_notes: patientNotes }),
  });

export const updateAppointmentStatus = (
  appointmentId: number,
  status: "completed" | "no_show" | "cancelled",
  rdNotes?: string
) =>
  request<Appointment>(`/appointments/${appointmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, rd_notes: rdNotes }),
  });


export interface BlockedSlot {
  id: number;
  rd_id: number;
  blocked_date: string;
  blocked_date_str?: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  dietician_name?: string;
}

export const getDieticianBlockedSlots = (dieticianId: number, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return request<BlockedSlot[]>(`/dieticians/${dieticianId}/blocked-slots?${params.toString()}`);
};

export const getAllDieticianBlockedSlots = (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return request<BlockedSlot[]>(`/all-dietician-blocked-slots?${params.toString()}`);
};

export const addBlockedSlot = (
  dieticianId: number,
  data: { blocked_date: string; start_time?: string; end_time?: string; reason?: string }
) =>
  request<BlockedSlot>(`/dieticians/${dieticianId}/blocked-slots`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const removeBlockedSlot = (dieticianId: number, slotId: number) =>
  request<{ message: string }>(`/dieticians/${dieticianId}/blocked-slots/${slotId}`, {
    method: "DELETE",
  });

// ─── Consultation Packages & Razorpay ─────────────────────────────────────────
export interface ConsultationPackage {
  id: number;
  name: string;
  num_consultations: number;
  price: number; // in paise
  discount_percentage: number;
  is_active: boolean;
  description?: string;
}

export interface PaymentOrder {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  patient_id: number;
  package_id: number;
}

export const getConsultationPackages = () =>
  request<ConsultationPackage[]>("/consultation-packages");

export const createPaymentOrder = (data: {
  patient_id: number;
  package_id: number;
  amount: number;
  discounted_amount?: number;
}) =>
  request<PaymentOrder>("/payments/create-order", {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface CouponValidation {
  id: number;
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  discount_applied: number; // in rupees
  max_discount_amount?: number | null;
  min_purchase_amount: number;
}

export const validateCoupon = (code: string, orderAmountRupees: number) =>
  request<CouponValidation>("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, order_amount: orderAmountRupees }),
  });

export const applyCoupon = (
  couponId: number,
  data: { user_id?: number; patient_id?: number; discount_applied: number; order_amount: number }
) =>
  request<{ id: number }>(`/coupons/${couponId}/apply`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const verifyPayment = (data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) =>
  request<{ success: boolean; consultations_added: number }>("/payments/verify", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ─── Dietician Appointments (for calendar view) ──────────────────────────────
export interface Review {
  id: string;
  patient_id: number;
  patient_name?: string | null;
  rating: number;
  body: string;
  condition_tag?: string | null;
  is_approved: boolean;
  created_at: string;
  approved_at?: string | null;
}

export const getApprovedReviews = (limit = 20, offset = 0) =>
  request<Review[]>(`/reviews?approved=1&limit=${limit}&offset=${offset}`);

export const getReviewEligibility = () =>
  request<{ eligible: boolean; has_completed_paid_consultation: boolean; has_reviewed: boolean; reason?: string }>("/reviews/me/status", {
    headers: getStoredAuthHeaders(),
  });

export const submitReview = (data: { rating: number; body: string; condition_tag?: string }) =>
  request<Review>("/reviews", {
    method: "POST",
    headers: getStoredAuthHeaders(),
    body: JSON.stringify(data),
  });

export const getAdminReviews = (approved?: boolean) =>
  request<Review[]>(`/admin/reviews${typeof approved === "boolean" ? `?approved=${approved ? "1" : "0"}` : ""}`, {
    headers: getStoredAuthHeaders(),
  });

export const updateAdminReview = (id: string, is_approved: boolean) =>
  request<Review>(`/admin/reviews/${id}`, {
    method: "PATCH",
    headers: getStoredAuthHeaders(),
    body: JSON.stringify({ is_approved }),
  });

export interface PatientDocument {
  id: string;
  patient_id: number;
  kind: "blood_report" | "prescription" | "other";
  file_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number;
  created_at: string;
  signed_url?: string | null;
}

export const getMyDocuments = () =>
  request<PatientDocument[]>("/patient/me/documents", { headers: getStoredAuthHeaders() });

export const uploadMyDocument = (file: File, kind: PatientDocument["kind"]) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
  return request<PatientDocument>("/patient/me/documents", {
    method: "POST",
    headers: getStoredAuthHeaders(),
    body: formData,
  });
};

export const deleteMyDocument = (id: string) =>
  request<{ id: string }>(`/patient/me/documents/${id}`, {
    method: "DELETE",
    headers: getStoredAuthHeaders(),
  });

export const getPatientDocumentsForCareTeam = (patientId: number) =>
  request<PatientDocument[]>(`/rd/patients/${patientId}/documents`, { headers: getStoredAuthHeaders() });

export interface DieticianAppointment extends Appointment {
  patient_name?: string;
  patient_phone?: string;
  diagnosis?: string;
}

export const getDieticianAppointments = (
  dieticianId: number,
  options?: { start_date?: string; end_date?: string; status?: string }
) => {
  const params = new URLSearchParams();
  if (options?.start_date) params.set("start_date", options.start_date);
  if (options?.end_date) params.set("end_date", options.end_date);
  if (options?.status) params.set("status", options.status);
  return request<DieticianAppointment[]>(`/dieticians/${dieticianId}/appointments?${params.toString()}`);
};

export type StoredUser = {
  id: string;
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
  [key: string]: any;
};

export function getMe(): StoredUser | null {
  try {
    const raw = localStorage.getItem('dietbyrd_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoredUser) : null;
  } catch {
    return null;
  }
}

export const updatePassword = (data: { currentPassword: string; newPassword: string }) => request<void>("/user/password", { method: "PUT", body: JSON.stringify(data) });
