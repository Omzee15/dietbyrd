import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Users, Video, CheckCircle, XCircle, AlertCircle, BanIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDieticianAppointments, updateAppointmentStatus, getDieticianBlockedSlots, addBlockedSlot, removeBlockedSlot, type DieticianAppointment } from "@/lib/api";
import { parseIST } from "@/lib/utils";
import { toast } from "sonner";

type ScheduleFilter = "today" | "tomorrow" | "this_week" | "all";
type CalendarView = "week" | "list";

interface DisplayConsultation {
  id: number;
  patient: string;
  type: string;
  date: string;
  time: string;
  status: "today" | "tomorrow" | "this_week";
}

interface DieticianCalendarScheduleProps {
  consultations: DisplayConsultation[];
  scheduleFilter: ScheduleFilter;
  setScheduleFilter: (filter: ScheduleFilter) => void;
  dieticianId?: number;
}

const DieticianCalendarSchedule = ({
  consultations,
  scheduleFilter,
  setScheduleFilter,
  dieticianId,
}: DieticianCalendarScheduleProps) => {
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    appointment: DieticianAppointment | null;
    action: "completed" | "no_show" | "cancelled" | null;
    notes: string;
  }>({ open: false, appointment: null, action: null, notes: "" });
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveType, setLeaveType] = useState<"full_day" | "time_slot">("full_day");
  const [leaveStartTime, setLeaveStartTime] = useState("");
  const [leaveEndTime, setLeaveEndTime] = useState("");
  const [showLeaveList, setShowLeaveList] = useState(false);
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: () =>
      updateAppointmentStatus(
        statusDialog.appointment!.id,
        statusDialog.action!,
        statusDialog.action === "completed" ? statusDialog.notes : undefined
      ),
    onSuccess: (_, __, ___) => {
      queryClient.invalidateQueries({ queryKey: ["dietician-appointments"] });
      toast.success(`Appointment marked as ${statusDialog.action!.replace("_", " ")}`);
      setStatusDialog({ open: false, appointment: null, action: null, notes: "" });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const openStatusDialog = (apt: DieticianAppointment, action: "completed" | "no_show" | "cancelled") => {
    setStatusDialog({ open: true, appointment: apt, action, notes: "" });
  };

  // Fetch blocked slots for the next 60 days
  const today60 = new Date(); today60.setDate(today60.getDate() + 60);
  const { data: blockedSlots = [] } = useQuery({
    queryKey: ["dietician-blocked-slots", dieticianId],
    queryFn: () => getDieticianBlockedSlots(
      dieticianId!,
      new Date().toISOString().split("T")[0],
      today60.toISOString().split("T")[0]
    ),
    enabled: !!dieticianId,
  });

  const blockedDateSet = useMemo(() => {
    const s = new Set<string>();
    blockedSlots.forEach((b) => {
      const d = b.blocked_date_str || b.blocked_date;
      s.add(typeof d === "string" ? d.split("T")[0] : "");
    });
    return s;
  }, [blockedSlots]);

  const addLeaveMutation = useMutation({
    mutationFn: () =>
      addBlockedSlot(dieticianId!, {
        blocked_date: leaveDate,
        reason: leaveReason || undefined,
        start_time: leaveType === "time_slot" ? leaveStartTime : undefined,
        end_time: leaveType === "time_slot" ? leaveEndTime : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dietician-blocked-slots", dieticianId] });
      toast.success("Leave marked successfully");
      setLeaveDialog(false);
      setLeaveDate("");
      setLeaveReason("");
      setLeaveType("full_day");
      setLeaveStartTime("");
      setLeaveEndTime("");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to mark leave"),
  });

  const removeLeaveMutation = useMutation({
    mutationFn: (slotId: number) => removeBlockedSlot(dieticianId!, slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dietician-blocked-slots", dieticianId] });
      toast.success("Leave removed");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove leave"),
  });

  const handleAddLeave = () => {
    if (!leaveReason.trim()) {
      toast.error("Please enter a reason for the leave");
      return;
    }
    if (leaveType === "time_slot") {
      if (!leaveStartTime || !leaveEndTime) {
        toast.error("Please select both start and end times");
        return;
      }
      if (leaveStartTime >= leaveEndTime) {
        toast.error("End time must be after start time");
        return;
      }
    }
    addLeaveMutation.mutate();
  };

  const isBlocked = (date: Date) => blockedDateSet.has(date.toISOString().split("T")[0]);

  // Calculate week dates
  const weekDates = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day + weekOffset * 7);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [weekOffset]);

  // Fetch appointments from API for calendar view
  const { data: calendarAppointments } = useQuery({
    queryKey: ["dietician-appointments", dieticianId, weekDates[0]?.toISOString(), weekDates[6]?.toISOString()],
    queryFn: () =>
      getDieticianAppointments(dieticianId!, {
        start_date: weekDates[0].toISOString().split("T")[0],
        end_date: weekDates[6].toISOString().split("T")[0],
      }),
    enabled: !!dieticianId && calendarView === "week",
  });

  // Group appointments by date for calendar view
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, DieticianAppointment[]> = {};
    (calendarAppointments || []).forEach((apt) => {
      const dateKey = parseIST(apt.scheduled_at).toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(apt);
    });
    return grouped;
  }, [calendarAppointments]);

  // Filter consultations for list view
  const filteredConsultations = consultations.filter((c) => {
    if (scheduleFilter === "all") return true;
    return c.status === scheduleFilter;
  });

  // Time slots for week view (6 AM to 9 PM)
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const hour = 6 + i;
    return {
      hour,
      label: `${hour > 12 ? hour - 12 : hour === 12 ? 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`,
    };
  });

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const formatLeaveDate = (value?: string | null) => {
    if (!value) return "Date unavailable";

    const datePart = String(value).split("T")[0];
    const parsed = new Date(`${datePart}T00:00:00`);

    return Number.isNaN(parsed.getTime())
      ? String(value)
      : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  // Get appointments for a specific date and hour
  const getAppointmentsForSlot = (date: Date, hour: number) => {
    const dateKey = date.toDateString();
    if (!appointmentsByDate[dateKey]) return [];
    return appointmentsByDate[dateKey].filter((apt) => {
      const aptHour = parseIST(apt.scheduled_at).getHours();
      return aptHour === hour;
    });
  };

  // Calculate stats
  const todayCount = (calendarAppointments || []).filter(
    (apt) => parseIST(apt.scheduled_at).toDateString() === new Date().toDateString() && apt.status === "scheduled"
  ).length;

  const weekCount = (calendarAppointments || []).filter((apt) => apt.status === "scheduled").length;

  return (
    <div className="p-6 space-y-4">
      {/* Header with view toggle and navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={calendarView === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setCalendarView("week")}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Calendar
          </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => {
                setLeaveDate("");
                setLeaveReason("");
                setLeaveType("full_day");
                setLeaveStartTime("");
                setLeaveEndTime("");
                setLeaveDialog(true);
              }}
            >
            <BanIcon className="w-4 h-4 mr-2" />
            Mark Leave
          </Button>
          {blockedSlots.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setShowLeaveList(true)}
            >
              {blockedSlots.length} leave{blockedSlots.length !== 1 ? "s" : ""}
            </Button>
          )}
          <Button
            variant={calendarView === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setCalendarView("list")}
          >
            <Clock className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>

        {calendarView === "week" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {formatMonthYear(weekDates[3])}
            </span>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                Today
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayCount}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{weekCount}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(calendarAppointments || []).filter((a) => a.status === "completed").length}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Video className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(calendarAppointments || []).filter((a) => a.consultation_type === "first").length}
                </p>
                <p className="text-xs text-muted-foreground">First Consults</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      {calendarView === "week" && (
        <div className="border rounded-xl overflow-hidden bg-card">
          {/* Week header */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-3 bg-muted/50 border-r">
              <span className="text-xs font-medium text-muted-foreground">Time</span>
            </div>
            {weekDates.map((date) => (
              <div
                key={date.toISOString()}
                className={`p-3 text-center border-r last:border-r-0 cursor-pointer transition-colors ${
                  isBlocked(date)
                    ? "bg-orange-50 border-orange-200"
                    : isToday(date) ? "bg-primary/10" : isSelected(date) ? "bg-muted" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedDate(date)}
              >
                <p className="text-xs text-muted-foreground">{formatDate(date).split(" ")[0]}</p>
                <p
                  className={`text-lg font-semibold ${
                    isBlocked(date) ? "text-orange-500" : isToday(date) ? "text-primary" : ""
                  }`}
                >
                  {date.getDate()}
                </p>
                {isBlocked(date) && <p className="text-[9px] text-orange-400 font-medium">Leave</p>}
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="max-h-[500px] overflow-y-auto">
            {timeSlots.map(({ hour, label }) => (
              <div key={hour} className="grid grid-cols-8 border-b last:border-b-0 min-h-[60px]">
                <div className="p-2 border-r bg-muted/30 flex items-start">
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                {weekDates.map((date) => {
                  const appointments = getAppointmentsForSlot(date, hour);
                  const blocked = isBlocked(date);
                  return (
                    <div
                      key={`${date.toISOString()}-${hour}`}
                      className={`p-1 border-r last:border-r-0 relative ${
                        blocked ? "bg-orange-50/60" : isToday(date) ? "bg-primary/5" : ""
                      }`}
                    >
                      {blocked && <div className="absolute inset-0 bg-orange-100/40 pointer-events-none" />}
                      {appointments.map((apt) => {
                        const isPast = parseIST(apt.scheduled_at) < new Date();
                        return (
                          <div
                            key={apt.id}
                            className={`p-2 rounded-lg text-xs transition-all ${
                              apt.status === "scheduled"
                                ? "bg-primary/20 text-primary-foreground border border-primary/30"
                                : apt.status === "completed"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <p className="font-medium truncate">{apt.patient_name || "Patient"}</p>
                            <p className="text-[10px] opacity-75">
                              {parseIST(apt.scheduled_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </p>
                            {apt.status === "scheduled" && isPast && (
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={() => openStatusDialog(apt, "completed")}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded text-[9px] py-0.5 font-medium"
                                >
                                  Done
                                </button>
                                <button
                                  onClick={() => openStatusDialog(apt, "no_show")}
                                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-[9px] py-0.5 font-medium"
                                >
                                  No-show
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {calendarView === "list" && (
        <>
          <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
            {([
              { key: "today", label: "Today" },
              { key: "tomorrow", label: "Tomorrow" },
              { key: "this_week", label: "This Week" },
              { key: "all", label: "All" },
            ] as const).map((f) => (
              <Button
                key={f.key}
                variant={scheduleFilter === f.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setScheduleFilter(f.key)}
                className="text-xs"
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3">
            {(calendarAppointments || [])
              .filter((apt) => {
                if (scheduleFilter === "all") return true;
                const d = parseIST(apt.scheduled_at);
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const weekEnd = new Date(today);
                weekEnd.setDate(today.getDate() + 7);
                if (scheduleFilter === "today") return d.toDateString() === today.toDateString();
                if (scheduleFilter === "tomorrow") return d.toDateString() === tomorrow.toDateString();
                if (scheduleFilter === "this_week") return d >= today && d <= weekEnd;
                return true;
              })
              .map((apt) => {
                const isPast = new Date(apt.scheduled_at) < new Date();
                return (
                  <div key={apt.id} className="bg-card border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {getInitials(apt.patient_name || "")}
                      </div>
                      <div>
                        <div className="font-medium">{apt.patient_name || "Patient"}</div>
                        <div className="text-sm text-muted-foreground">
                          {apt.consultation_type} ·{" "}
                          {new Date(apt.scheduled_at).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(apt.scheduled_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                        <Badge
                          className={
                            apt.status === "scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : apt.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : apt.status === "no_show"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {apt.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {apt.status === "scheduled" && isPast && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => openStatusDialog(apt, "completed")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => openStatusDialog(apt, "no_show")}
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            No-show
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => openStatusDialog(apt, "cancelled")}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            {(calendarAppointments || []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No consultations scheduled</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Status update dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => !open && setStatusDialog({ open: false, appointment: null, action: null, notes: "" })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusDialog.action === "completed"
                ? "Mark as Completed"
                : statusDialog.action === "no_show"
                ? "Mark as No-Show"
                : "Cancel Appointment"}
            </DialogTitle>
          </DialogHeader>

          {statusDialog.appointment && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {statusDialog.appointment.patient_name}
                </span>{" "}
                —{" "}
                {new Date(statusDialog.appointment.scheduled_at.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "")).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>

              {statusDialog.action === "completed" && (
                <div className="space-y-2">
                  <Label>Session Notes (optional)</Label>
                  <Textarea
                    placeholder="Add notes about this consultation..."
                    rows={4}
                    value={statusDialog.notes}
                    onChange={(e) =>
                      setStatusDialog((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              )}

              {statusDialog.action === "no_show" && (
                <p className="text-sm text-orange-600 bg-orange-50 rounded-lg p-3">
                  This will mark the patient as a no-show. The consultation slot will be freed.
                </p>
              )}

              {statusDialog.action === "cancelled" && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  This will cancel the appointment. The patient's consultation count will not be affected.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialog({ open: false, appointment: null, action: null, notes: "" })}
            >
              Close
            </Button>
            <Button
              disabled={statusMutation.isPending}
              className={
                statusDialog.action === "completed"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : statusDialog.action === "no_show"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
              onClick={() => statusMutation.mutate()}
            >
              {statusMutation.isPending
                ? "Saving..."
                : statusDialog.action === "completed"
                ? "Mark Complete"
                : statusDialog.action === "no_show"
                ? "Mark No-Show"
                : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Leave Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Leave</DialogTitle>
            <DialogDescription>Block a day so patients cannot book appointments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLeaveDate(new Date().toISOString().split("T")[0])}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const t = new Date();
                  t.setDate(t.getDate() + 1);
                  setLeaveDate(t.toISOString().split("T")[0]);
                }}
              >
                Tomorrow
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const t = new Date();
                  t.setDate(t.getDate() + 2);
                  setLeaveDate(t.toISOString().split("T")[0]);
                }}
              >
                Day after tomorrow
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={leaveDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setLeaveDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <RadioGroup value={leaveType} onValueChange={(value) => setLeaveType(value as "full_day" | "time_slot")}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="full_day" id="leave_full_day" />
                  <Label htmlFor="leave_full_day">Full day</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="time_slot" id="leave_time_slot" />
                  <Label htmlFor="leave_time_slot">Specific time slot</Label>
                </div>
              </RadioGroup>
            </div>
            {leaveType === "time_slot" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From <span className="text-red-500">*</span></Label>
                  <Select value={leaveStartTime} onValueChange={setLeaveStartTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(slot => (
                        <SelectItem key={`start-${slot.hour}`} value={`${slot.hour.toString().padStart(2, '0')}:00`}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To <span className="text-red-500">*</span></Label>
                  <Select value={leaveEndTime} onValueChange={setLeaveEndTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(slot => (
                        <SelectItem key={`end-${slot.hour}`} value={`${slot.hour.toString().padStart(2, '0')}:00`}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason <span style={{ color: "var(--red)" }}>*</span></Label>
              <Input
                placeholder="e.g. Personal, Travel, Sick leave"
                required
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialog(false)}>Cancel</Button>
            <Button
              disabled={!leaveDate || !leaveReason.trim() || addLeaveMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleAddLeave}
            >
              {addLeaveMutation.isPending ? "Saving..." : "Mark Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave List Dialog */}
      <Dialog open={showLeaveList} onOpenChange={setShowLeaveList}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upcoming Leaves</DialogTitle>
            <DialogDescription>Manage your blocked / leave days.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
            {blockedSlots.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No leaves marked.</p>
            )}
            {blockedSlots.map((slot) => {
              const d = slot.blocked_date_str || slot.blocked_date;
              const dateLabel = formatLeaveDate(d);
              
              const formatTimeStr = (t: string) => {
                if (!t) return "";
                const [h, m] = t.split(":");
                let hour = parseInt(h, 10);
                const ampm = hour >= 12 ? "PM" : "AM";
                hour = hour % 12 || 12;
                return `${hour}:${m} ${ampm}`;
              };
              
              return (
                <div key={slot.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{dateLabel}</p>
                    {slot.start_time && slot.end_time ? (
                      <p className="text-xs text-muted-foreground">
                        {formatTimeStr(slot.start_time)} – {formatTimeStr(slot.end_time)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Full day</p>
                    )}
                    {slot.reason && <p className="text-xs text-muted-foreground">{slot.reason}</p>}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={() => removeLeaveMutation.mutate(slot.id)}
                    disabled={removeLeaveMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveList(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default DieticianCalendarSchedule;
