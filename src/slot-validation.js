const formats = new Set(['open','private','blue_hour','night']);
const priceUnits = new Set(['person','slot']);

export function validateSlotInput(input){
  const format = String(input.format || '');
  const priceUnit = String(input.priceUnit || '');
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  const priceAmount = Number(input.priceAmount);
  const capacity = Number(input.capacity);

  if(!formats.has(format)) throw new Error('Choisissez un format de créneau valide.');
  if(!priceUnits.has(priceUnit)) throw new Error('Choisissez un mode de tarification valide.');
  if(Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) throw new Error('Renseignez une date et des horaires valides.');
  if(endAt <= startAt) throw new Error('L’heure de fin doit être après l’heure de début.');
  if(endAt - startAt > 14 * 3600000) throw new Error('Un créneau ne peut pas dépasser 14 heures.');
  if(!Number.isFinite(priceAmount) || priceAmount < 0 || priceAmount > 5000) throw new Error('Renseignez un tarif compris entre 0 et 5 000 €.');
  if(!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new Error('La capacité doit être comprise entre 1 et 100 personnes.');

  return {format,startAt:startAt.toISOString(),endAt:endAt.toISOString(),priceAmount,priceUnit,capacity};
}

export function slotsOverlap(candidate, slots = []){
  const start = new Date(candidate.startAt).getTime();
  const end = new Date(candidate.endAt).getTime();
  return slots.some(slot => {
    if(['cancelled','blocked'].includes(slot.status)) return false;
    return start < new Date(slot.end_at || slot.endAt).getTime() && end > new Date(slot.start_at || slot.startAt).getTime();
  });
}
