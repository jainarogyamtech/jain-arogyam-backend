// "YYYY-MM-DD" input, parsed as a plain UTC calendar day. Date#setHours
// operates in the server's local timezone, so `new Date(x).setHours(23,59,59,999)`
// silently shifts the boundary by the server's UTC offset — this avoids that.
export const endOfDayUTC = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
};
