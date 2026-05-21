import { Appointment } from '../context/AppContext';

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

export const generateAvailableSlots = (
  date: string,
  professionalId: string,
  serviceDuration: number, // in minutes
  appointments: Appointment[],
  shopOpenTime: string = '08:00',
  shopCloseTime: string = '20:00',
  intervalMinutes: number = 15 // suggests slots every 15 mins
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
  const currentDateStr = now.toISOString().split('T')[0];
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const slots: string[] = [];

  // Determine the start time for the slots
  // If the selected date is today, don't allow slots in the past
  const startMin = (date === currentDateStr && currentMin > openMin) 
    ? Math.ceil(currentMin / intervalMinutes) * intervalMinutes // round up to next interval
    : openMin;

  for (let min = startMin; min + serviceDuration <= closeMin; min += intervalMinutes) {
    const slotStart = min;
    const slotEnd = min + serviceDuration;

    // Check if this slot conflicts with any existing appointment
    const hasConflict = proAppointments.some(appt => {
      const apptStart = parseTimeToMinutes(appt.time);
      // Fallback to duration of 30 mins if endTime is somehow missing
      const apptEnd = appt.endTime ? parseTimeToMinutes(appt.endTime) : apptStart + 30;

      // Conflict logic: 
      // (slotStart < apptEnd) AND (slotEnd > apptStart)
      // Wait, let's be careful. A slot ending at 09:30 and appt starting at 09:30 is NOT a conflict.
      return slotStart < apptEnd && slotEnd > apptStart;
    });

    if (!hasConflict) {
      slots.push(formatMinutesToTime(slotStart));
    }
  }

  return slots;
};
