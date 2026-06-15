import { useQuery } from "@tanstack/react-query";
import { X, Calendar, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DieticianPaneProps {
  dieticianId: number;
  onClose: () => void;
  onMail: (name: string, email: string) => void;
}

export const DieticianPane = ({ dieticianId, onClose, onMail }: DieticianPaneProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["support-dietician-details", dieticianId],
    queryFn: async () => {
      const res = await fetch(`/api/support/dieticians/${dieticianId}/details`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading dietitian details...</div>;
  if (error || !data) return <div className="flex-1 p-6 text-red-500 text-sm">Error loading dietitian details.</div>;

  const { dietician, appointments } = data;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b shrink-0 bg-muted/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
              {(dietician.name || "?").split(" ").map((n: string) => n[0]).join("")}
            </div>
            <div>
              <h2 className="text-xl font-bold">{dietician.name || "Unknown"}</h2>
              <div className="text-sm text-muted-foreground">
                {dietician.qualification} · {dietician.phone}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dietician.email && (
              <Button size="sm" variant="outline" onClick={() => onMail(dietician.name || "Dietitian", dietician.email)}>
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
            <p className="text-sm font-medium mt-1">{new Date(dietician.created_at).toLocaleDateString()}</p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg border">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Status</p>
            <Badge variant={dietician.is_active ? "default" : "secondary"} className="mt-1 text-[10px]">
              {dietician.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        
        {dietician.specialization && dietician.specialization.length > 0 && (
          <div className="bg-muted/30 p-3 rounded-lg border">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Specializations</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {dietician.specialization.map((spec: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{spec}</Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Past Bookings ({appointments?.length || 0})
          </h3>
          <div className="space-y-2">
            {appointments && appointments.length > 0 ? appointments.map((appt: any) => (
              <div key={appt.id} className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm text-primary">{new Date(appt.scheduled_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">with Patient: {appt.patient_name}</p>
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
      </div>
    </div>
  );
};
