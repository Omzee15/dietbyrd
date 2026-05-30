import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LogOut, User, Phone, Stethoscope, Activity, Scale, Ruler, Wheat, Dumbbell, MessageSquare, CheckCircle, XCircle, Clock, Calendar, Users, UtensilsCrossed, UserPlus, Apple, FileText } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPatient, getPatientDocumentsForCareTeam, getPatientMessages, getPatientAppointments, PatientMessage, Appointment } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const MLTInternPatientDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { logout } = useAuth();

  const patientId = parseInt(id || "0", 10);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId),
    enabled: !!patientId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["patientMessages", patientId],
    queryFn: () => getPatientMessages(patientId),
    enabled: !!patientId,
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["patientAppointments", patientId],
    queryFn: () => getPatientAppointments(patientId),
    enabled: !!patientId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["patient-documents-care-team", patientId],
    queryFn: () => getPatientDocumentsForCareTeam(patientId),
    enabled: !!patientId,
  });

  const formatMessageType = (type: string) => {
    const typeMap: Record<string, string> = {
      'referral_sms': 'Referral SMS',
      'welcome_whatsapp': 'Welcome WhatsApp',
      'otp': 'OTP',
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sidebarSections = [
    {
      title: "View",
      items: [
        { label: "Patients", href: "/mlt-intern/patients", icon: Users },
        { label: "Doctors", href: "/mlt-intern/doctors", icon: Stethoscope },
        { label: "Dieticians", href: "/mlt-intern/dieticians", icon: UtensilsCrossed },
        { label: "Join Requests", href: "/mlt-intern/join-requests", icon: UserPlus },
        { label: "Food Library", href: "/mlt-intern/food-library", icon: Apple },
      ],
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar title="DietByRD" subtitle="MLT Intern" sections={sidebarSections} bottomContent={bottomContent} />

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/mlt-intern")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patients
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Patient Details</h1>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Loading patient details...</CardContent>
            </Card>
          ) : !patient ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">Patient not found</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {patient.name || "Unknown Patient"}
                    </span>
                    <Badge variant={patient.payment_status === "paid" ? "default" : "secondary"}>
                      {patient.payment_status === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Patient ID</p>
                    <p className="font-medium">#{patient.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium flex items-center gap-2"><Phone className="w-4 h-4" />{patient.phone || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Age</p>
                    <p className="font-medium">{patient.age || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Gender</p>
                    <p className="font-medium capitalize">{patient.gender || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Diagnosis</p>
                    <p className="font-medium">{patient.diagnosis || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Referral Source</p>
                    <p className="font-medium">{patient.referral_source || "Direct"}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Stethoscope className="w-4 h-4" />
                      Care Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500">Assigned Dietician</p>
                      <p className="font-medium">{patient.assigned_dietician_name || "Not assigned"}</p>
                      <p className="text-sm text-gray-500">{patient.assigned_dietician_qualification || ""}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Referring Doctor</p>
                      <p className="font-medium">{patient.referring_doctor_name || "N/A"}</p>
                      <p className="text-sm text-gray-500">{patient.referring_doctor_qualification || ""}</p>
                      <p className="text-sm text-gray-500">{patient.referring_doctor_clinic || ""}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="w-4 h-4" />
                      Health & Lifestyle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Ruler className="w-3 h-3" />Height</p>
                        <p className="font-medium">{patient.height ? `${patient.height} cm` : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Scale className="w-3 h-3" />Weight</p>
                        <p className="font-medium">{patient.weight ? `${patient.weight} kg` : "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Wheat className="w-3 h-3" />Dietary Preference</p>
                      <p className="font-medium">{patient.dietary_preference || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Food Restrictions</p>
                      <p className="font-medium">{patient.food_restrictions || "None"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Allergies</p>
                      <p className="font-medium">
                        {patient.allergies 
                          ? (Array.isArray(patient.allergies) 
                              ? patient.allergies.join(", ") 
                              : patient.allergies)
                          : "None"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Dumbbell className="w-3 h-3" />Workout Frequency</p>
                      <p className="font-medium">
                        {patient.workout_frequency !== null && patient.workout_frequency !== undefined
                          ? `${patient.workout_frequency} times/week`
                          : "N/A"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {documents.length === 0 ? (
                    <p className="text-sm text-gray-500">No documents uploaded yet.</p>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{doc.original_filename}</p>
                          <p className="text-xs text-gray-500">{doc.kind.replace("_", " ")} · {new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                        {doc.signed_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.signed_url} target="_blank" rel="noreferrer">View</a>
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Status</p>
                    <Badge variant={patient.payment_status === "paid" ? "default" : "secondary"}>
                      {patient.payment_status === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Payment History</p>
                    {!patient.payment_history || patient.payment_history.length === 0 ? (
                      <p className="text-sm text-gray-500">No payment records found.</p>
                    ) : (
                      <div className="space-y-2">
                        {patient.payment_history.map((payment) => (
                          <div key={payment.payment_id} className="rounded-md border border-gray-200 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium">Payment ID: #{payment.payment_id}</p>
                              <Badge variant={payment.status === "success" ? "default" : "secondary"}>
                                {payment.status}
                              </Badge>
                            </div>
                            <div className="mt-1 space-y-0.5">
                              <p className="text-sm text-gray-700">
                                Amount: {payment.currency || "INR"} {(Number(payment.amount || 0) / 100).toFixed(2)}
                              </p>
                              {payment.razorpay_payment_id && (
                                <p className="text-xs text-gray-500">
                                  Razorpay ID: {payment.razorpay_payment_id}
                                </p>
                              )}
                              {payment.consultations_purchased && (
                                <p className="text-xs text-gray-500">
                                  Consultations: {payment.consultations_purchased}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Date: {new Date(payment.paid_at || payment.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="w-4 h-4" />
                    Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {appointmentsLoading ? (
                    <p className="text-sm text-gray-500">Loading appointments...</p>
                  ) : appointments.length === 0 ? (
                    <p className="text-sm text-gray-500">No appointments scheduled yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {appointments.map((appointment: Appointment) => (
                        <div key={appointment.id} className="rounded-md border border-gray-200 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">Appointment #{appointment.id}</span>
                            <Badge variant={appointment.status === "completed" ? "default" : appointment.status === "cancelled" ? "destructive" : "secondary"}>
                              {appointment.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-700">
                              <strong>Dietician:</strong> {appointment.dietician_name || "N/A"}
                            </p>
                            {appointment.dietician_qualification && (
                              <p className="text-sm text-gray-500">
                                {appointment.dietician_qualification}
                              </p>
                            )}
                            <p className="text-sm text-gray-700">
                              <strong>Scheduled:</strong> {new Date(appointment.scheduled_at.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "")).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-700">
                              <strong>Type:</strong> {appointment.consultation_type || "General"}
                            </p>
                            {appointment.patient_notes && (
                              <div className="mt-2 bg-gray-50 rounded p-2">
                                <p className="text-xs text-gray-500 mb-1">Patient Notes:</p>
                                <p className="text-sm text-gray-700">{appointment.patient_notes}</p>
                              </div>
                            )}
                            {appointment.cancelled_at && (
                              <p className="text-xs text-red-500">
                                Cancelled: {new Date(appointment.cancelled_at.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "")).toLocaleString()}
                                {appointment.cancelled_by && ` by ${appointment.cancelled_by}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{patient.diagnosis_description || "No additional diagnosis notes available."}</p>
                  <p className="text-xs text-gray-500 mt-4">Created on: {new Date(patient.created_at).toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="w-4 h-4" />
                    Message History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messagesLoading ? (
                    <p className="text-sm text-gray-500">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-500">No messages sent to this patient yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message: PatientMessage) => (
                        <div key={message.id} className="rounded-md border border-gray-200 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(message.status)}
                              <span className="text-sm font-medium">{formatMessageType(message.type)}</span>
                              <Badge variant="outline" className="text-xs">
                                {message.channel.toUpperCase()}
                              </Badge>
                            </div>
                            <Badge variant={getStatusBadgeVariant(message.status)}>
                              {message.status}
                            </Badge>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                            <span>Sent: {new Date(message.sent_at).toLocaleString()}</span>
                            {message.doctorName && (
                              <span>Referred by: Dr. {message.doctorName}</span>
                            )}
                            {message.error && (
                              <span className="text-red-500">Error: {message.error}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default MLTInternPatientDetail;
