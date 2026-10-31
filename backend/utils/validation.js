function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}
function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function validDateRange(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const now = Date.now();
  return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) &&
    start.getTime() > now && end.getTime() > start.getTime() &&
    end.getTime() - start.getTime() <= 12 * 60 * 60 * 1000;
}
module.exports = { cleanString, isEmail, validDateRange };
