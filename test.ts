import { generateAvailableSlots } from './src/utils/timeSlots.ts';
import { getLocalDateString } from './src/utils/timeSlots.ts';

console.log('Test date: 2026-05-28');
console.log('Current local date:', getLocalDateString());
const slots = generateAvailableSlots('2026-05-28', 'jonatas-id', 30, []);
console.log('Slots 28th:', slots);

const slots29 = generateAvailableSlots('2026-05-29', 'jonatas-id', 30, []);
console.log('Slots 29th:', slots29);
