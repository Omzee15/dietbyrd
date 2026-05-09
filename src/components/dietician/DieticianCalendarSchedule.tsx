import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getDieticianAppointments, type DieticianAppointment } from "@/lib/api";

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
      const dateKey = new Date(apt.scheduled_at).toDateString();
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
      const aptHour = new Date(apt.scheduled_at).getHours();
      return aptHour === hour;
    });
  };

  // Calculate stats
  const todayCount = (calendarAppointments || []).filter(
    (apt) => new Date(apt.scheduled_at).toDateString() === new Date().toDateString() && apt.status === "scheduled"
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
                  isToday(date) ? "bg-primary/10" : isSelected(date) ? "bg-muted" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedDate(date)}
              >
                <p className="text-xs text-muted-foreground">{formatDate(date).split(" ")[0]}</p>
                <p
                  className={`text-lg font-semibold ${
                    isToday(date) ? "text-primary" : ""
                  }`}
                >
                  {date.getDate()}
                </p>
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
                  return (
                    <div
                      key={`${date.toISOString()}-${hour}`}
                      className={`p-1 border-r last:border-r-0 ${
                        isToday(date) ? "bg-primary/5" : ""
                      }`}
                    >
                      {appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className={`p-2 rounded-lg text-xs cursor-pointer transition-all hover:ring-2 ring-primary/30 ${
                            apt.status === "scheduled"
                              ? "bg-primary/20 text-primary-foreground border border-primary/30"
                              : apt.status === "completed"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <p className="font-medium truncate">{apt.patient_name || "Patient"}</p>
                          <p className="text-[10px] opacity-75">
                            {new Date(apt.scheduled_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))}
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
            {filteredConsultations.map((c) => (
              <div key={c.id} className="bg-card border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {getInitials(c.patient)}
                  </div>
                  <div>
                    <div className="font-medium">{c.patient}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.type} · {c.date}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="text-sm font-medium">{c.time}</div>
                    <Badge
                      variant="outline"
                      className={
                        c.status === "today"
                          ? "text-primary border-primary/30"
                          : c.status === "tomorrow"
                          ? "text-blue-500 border-blue-500/30"
                          : "text-muted-foreground border-border"
                      }
                    >
                      {c.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline">
                    Join
                  </Button>
                </div>
              </div>
            ))}
            {filteredConsultations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No consultations scheduled</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DieticianCalendarSchedule;
