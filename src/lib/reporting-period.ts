/** Maximum date on which a recorded transaction may appear in a monthly snapshot. */
export function monthEndDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

export function reportingCutoff(month: string, today: string) {
  const end = monthEndDate(month);
  return end < today ? end : today;
}

export function recordedInMonth(date: string, month: string, cutoff: string) {
  return date.startsWith(month) && date <= cutoff;
}
