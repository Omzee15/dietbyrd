const appointments = [
  {"id":25,"status":"scheduled","scheduled_at":"2026-06-19T12:00:00.000Z"},
  {"id":24,"status":"scheduled","scheduled_at":"2026-06-19T11:00:00.000Z"},
  {"id":26,"status":"scheduled","scheduled_at":"2026-06-15T13:00:00.000Z"},
  {"id":28,"status":"scheduled","scheduled_at":"2026-06-15T12:00:00.000Z"},
  {"id":27,"status":"scheduled","scheduled_at":"2026-06-15T09:00:00.000Z"},
  {"id":19,"status":"scheduled","scheduled_at":"2026-06-10T10:00:00.000Z"},
  {"id":20,"status":"cancelled","scheduled_at":"2026-06-08T12:00:00.000Z"},
  {"id":21,"status":"completed","scheduled_at":"2026-06-08T11:00:00.000Z"}
];

function parseIST(dateStr) {
  const naive = dateStr.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  return new Date(naive);
}

const isUpcomingAppointment = (appointment) =>
  (appointment.status === "confirmed" || appointment.status === "scheduled") &&
  parseIST(appointment.scheduled_at) > new Date();

const upcomingAppointments = (appointments || [])
  .filter((a) => isUpcomingAppointment(a))
  .sort((a, b) => parseIST(a.scheduled_at).getTime() - parseIST(b.scheduled_at).getTime());

const pastAppointments = (appointments || [])
  .filter((a) => !isUpcomingAppointment(a))
  .sort((a, b) => parseIST(b.scheduled_at).getTime() - parseIST(a.scheduled_at).getTime());

console.log("Upcoming length:", upcomingAppointments.length);
console.log("Past length:", pastAppointments.length);
