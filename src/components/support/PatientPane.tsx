import { useQuery } from "@tanstack/react-query";
import { X, Calendar, User, FileText, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PatientPaneProps {
  patientId: number;
  onClose?: () => void;
  onMail: (name: string, email: string) => void;
}

export const PatientPane = ({ patientId, onClose, onMail }: PatientPaneProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["support-patient-details", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/support/patients/${patientId}/details`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const { data: documents } = useQuery({
    queryKey: ["support-patient-documents", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/support/patients/${patientId}/documents`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading patient details...</div>;
  if (error || !data) return <div className="flex-1 p-6 text-red-500 text-sm">Error loading patient details.</div>;

  const { patient, appointments, assigned_dietitian } = data;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b shrink-0 bg-muted/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
              {(patient.name || "?").split(" ").map((n: string) => n[0]).join("")}
            </div>
            <div>
              <h2 className="text-xl font-bold">{patient.name || "Unknown"}</h2>
              <div className="text-sm text-muted-foreground">
                {patient.age ? `${patient.age} yrs · ` : ""}{patient.gender || "Unknown"} · {patient.phone}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {patient.email && (
              <Button size="sm" variant="outline" onClick={() => onMail(patient.name || "Patient", patient.email)}>
                <Mail className="w-4 h-4 mr-2" /> Mail
              </Button>
            )}
            {onClose && (
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 p-3 rounded-lg border">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Diagnosis</p>
            <p className="text-sm font-medium capitalize mt-1">{patient.diagnosis || "Not specified"}</p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Dietary Pref</p>
            <p className="text-sm font-medium capitalize mt-1">{patient.dietary_preference || "Not set"}</p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Location</p>
            <p className="text-sm font-medium mt-1">{patient.state || "Unknown"}</p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Status</p>
            <Badge variant={patient.is_active ? "default" : "secondary"} className="mt-1 text-[10px]">
              {patient.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Assigned Dietitian
          </h3>
          {assigned_dietitian ? (
            <div className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{assigned_dietitian.name}</p>
                <p className="text-xs text-muted-foreground">{assigned_dietitian.qualification}</p>
              </div>
              <p className="text-xs text-muted-foreground">Since {new Date(assigned_dietitian.assigned_at).toLocaleDateString()}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No active diet plan / assigned dietitian.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Past Bookings ({appointments?.length || 0})
          </h3>
          <div className="space-y-2">
            {appointments && appointments.length > 0 ? appointments.map((appt: any) => (
              <div key={appt.id} className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm text-primary">{new Date(appt.scheduled_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">with {appt.dietitian_name} ({appt.duration_minutes}m)</p>
                </div>
                <Badge variant={appt.status === "completed" ? "default" : appt.status === "scheduled" ? "outline" : "secondary"}>
                  {appt.status}
                </Badge>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground italic">No past appointments found.</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Documentation
          </h3>
          <div className="space-y-2">
            {documents && documents.length > 0 ? documents.map((doc: any) => (
              <div key={doc.id} className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-sm truncate max-w-[200px]">{doc.original_filename}</p>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground italic">No documents uploaded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
