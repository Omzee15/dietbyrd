import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { updatePatientPreferences } from "@/lib/api";

interface PostBookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefilled if we already have one on file. */
  defaultEmail?: string | null;
  /** Whether to ask for email at all (hidden once we already have it). */
  askEmail?: boolean;
  /** Whether to ask for cultural context at all. */
  askCultural?: boolean;
  /** Fired after a successful save so the caller can refetch the patient. */
  onSaved?: () => void;
}

// Shown once right after a booking to pick up two optional details we don't
// otherwise have. Entirely skippable -- nothing here blocks the booking,
// which has already gone through by this point.
export function PostBookingDetailsDialog({
  open,
  onOpenChange,
  defaultEmail,
  askEmail = true,
  askCultural = true,
  onSaved,
}: PostBookingDetailsDialogProps) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [cultural, setCultural] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (saving) return;
    onOpenChange(false);
  };

  const handleSave = async () => {
    const payload: { email?: string; cultural_preferences?: string } = {};
    if (askEmail && email.trim()) payload.email = email.trim();
    if (askCultural && cultural.trim()) payload.cultural_preferences = cultural.trim();

    // Nothing filled in is the same as skipping -- don't make them feel
    // they've done something wrong.
    if (Object.keys(payload).length === 0) {
      close();
      return;
    }

    setSaving(true);
    try {
      await updatePatientPreferences(payload);
      toast.success("Thanks — saved to your profile");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      {/* Own Skip control in the top-right, so the default X is hidden to
          avoid two competing dismiss affordances in the same corner.
          w-[calc(100%-2rem)] keeps a gutter on phones (the base dialog is
          w-full, which would sit flush against both edges). */}
      <DialogContent
        className="[&>button]:hidden w-[calc(100%-2rem)] sm:w-full max-w-lg max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-2xl p-6 sm:p-7"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Appointment confirmed</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Two quick optional things that help us serve you better.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 -mt-1 -mr-1 px-2 py-1 rounded-md hover:bg-muted disabled:opacity-50"
          >
            Skip
          </button>
        </div>

        <div className="space-y-5 mt-5">
          {askEmail && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                So we can send you booking updates and reminders.
              </p>
            </div>
          )}

          {askCultural && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Do you have any cultural preferences?</label>
              <Textarea
                placeholder="I come from a bengali family and living in kolkata"
                value={cultural}
                onChange={(e) => setCultural(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Helps your dietitian plan around the food you actually eat.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button onClick={handleSave} disabled={saving} className="w-full h-11">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
