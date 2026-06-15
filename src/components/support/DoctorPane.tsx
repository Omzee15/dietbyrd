import { useQuery } from "@tanstack/react-query";
import { X, Calendar, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DoctorPaneProps {
  doctorId: number;
  onClose: () => void;
  onMail: (name: string, email: string) => void;
}

export const DoctorPane = ({ doctorId, onClose, onMail }: DoctorPaneProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["support-doctor-details", doctorId],
    queryFn: async () => {
      const res = await fetch(`/api/support/doctors/${doctorId}/details`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading doctor details...</div>;
  if (error || !data) return <div className="flex-1 p-6 text-red-500 text-sm">Error loading doctor details.</div>;

  const { doctor, appointments } = data;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b shrink-0 bg-muted/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
              {(doctor.name || "?").split(" ").map((n: string) => n[0]).join("")}
            </div>
            <div>
              <h2 className="text-xl font-bold">{doctor.name || "Unknown"}</h2>
              <div className="text-sm text-muted-foreground">
                Doctor · {doctor.phone}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {doctor.email && (
              <Button size="sm" variant="outline" onClick={() => onMail(doctor.name || "Doctor", doctor.email)}>
                <Mail className="w-4 h-4 mr-2" /> Mail
              </Button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 p-3 rounded-lg border">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Joined</p>
            <p className="text-sm font-medium mt-1">{new Date(doctor.created_at).toLocaleDateString()}</p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Status</p>
            <Badge variant={doctor.is_active ? "default" : "secondary"} className="mt-1 text-[10px]">
              {doctor.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Past Bookings ({appointments?.length || 0})
          </h3>
          <div className="space-y-2">
            {appointments && appointments.length > 0 ? appointments.map((appt: any) => (
              <div key={appt.id} className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center">
                <p className="font-medium text-sm text-primary">{new Date(appt.scheduled_at).toLocaleString()}</p>
                <Badge>{appt.status}</Badge>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground italic">No past appointments found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
