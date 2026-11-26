class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === '');
  if (missing.length) {
    throw new HttpError(400, `Field wajib belum diisi: ${missing.join(', ')}.`);
  }
}

function numberInRange(value, name, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new HttpError(400, `${name} harus berupa angka antara ${min} dan ${max}.`);
  }
  return number;
}

function integerInRange(value, name, min, max) {
  const number = numberInRange(value, name, min, max);
  if (!Number.isInteger(number)) throw new HttpError(400, `${name} harus berupa bilangan bulat.`);
  return number;
}

function validDate(value, name) {
  const date = String(value || '');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new HttpError(400, `${name} harus menggunakan format YYYY-MM-DD.`);
  const checked = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    checked.getUTCFullYear() !== Number(match[1]) ||
    checked.getUTCMonth() !== Number(match[2]) - 1 ||
    checked.getUTCDate() !== Number(match[3])
  ) throw new HttpError(400, `${name} bukan tanggal kalender yang valid.`);
  return date;
}

module.exports = { HttpError, asyncRoute, requireFields, numberInRange, integerInRange, validDate };
