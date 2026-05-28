import { Appointment, Service } from '../context/AppContext';

export const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

export const formatMinutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const totalMin = parseTimeToMinutes(timeStr) + minutesToAdd;
  return formatMinutesToTime(totalMin);
};

/**
 * Resolves the actual end time for an appointment.
 * Old appointments may have end_time === start_time (data integrity bug).
 * In that case we fall back to the service's duration or a default of 30 min.
 */
export const resolveApptEndTime = (
  appt: Appointment,
  services?: Service[],
  defaultDuration = 30
): string => {
  const apptStartMin = parseTimeToMinutes(appt.time);
  
  // If endTime is missing or equals start time → calculate from service duration
  if (!appt.endTime || appt.endTime === appt.time || parseTimeToMinutes(appt.endTime) <= apptStartMin) {
    const svc = services?.find(s => s.id === appt.serviceId);
    const duration = svc?.duration || defaultDuration;
    return formatMinutesToTime(apptStartMin + duration);
  }

  return appt.endTime;
};

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateAvailableSlots = (
  date: string,
  professionalId: string,
  serviceDuration: number, // in minutes
  appointments: Appointment[],
  shopOpenTime: string = '08:00',
  shopCloseTime: string = '20:00',
  intervalMinutes: number = 15, // suggests slots every 15 mins
  services?: Service[]
): string[] => {
  if (!date || !professionalId || !serviceDuration) return [];

  // Filter appointments for this specific pro, on this date, that are NOT cancelled
  const proAppointments = appointments.filter(
    a => a.professionalId === professionalId && 
         a.date === date && 
         a.status !== 'cancelled'
  );

  const openMin = parseTimeToMinutes(shopOpenTime);
  const closeMin = parseTimeToMinutes(shopCloseTime);
  
  const now = new Date();
  const currentDateStr = getLocalDateString(now);
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const slots: string[] = [];

  // Determine the start time for the slots.
  // If the selected date is today, don't allow slots in the past.
  const startMin = (date === currentDateStr && currentMin > openMin) 
    ? Math.ceil(currentMin / intervalMinutes) * intervalMinutes // round up to next interval
    : openMin;

  for (let min = startMin; min + serviceDuration <= closeMin; min += intervalMinutes) {
    const slotStart = min;
    const slotEnd = min + serviceDuration;

    // Check if this slot conflicts with any existing appointment
    const hasConflict = proAppointments.some(appt => {
      const apptStart = parseTimeToMinutes(appt.time);
      // Resolve the real end time (handles old data where end_time === start_time)
      const resolvedEnd = resolveApptEndTime(appt, services);
      const apptEnd = parseTimeToMinutes(resolvedEnd);

      // Conflict: new slot overlaps with an existing appointment block
      // A slot from 09:30-10:00 does NOT conflict with an appt ending at 09:30
      return slotStart < apptEnd && slotEnd > apptStart;
    });

    if (!hasConflict) {
      slots.push(formatMinutesToTime(slotStart));
    }
  }

  return slots;
};
