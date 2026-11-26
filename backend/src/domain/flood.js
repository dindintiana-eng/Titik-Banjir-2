const RISK = Object.freeze({
  SAFE: 'Aman',
  WARNING: 'Waspada',
  DANGER: 'Bahaya',
  UNKNOWN: 'Belum diketahui'
});

function getRiskLevel(depth, duration) {
  const hasDepth = depth !== null && depth !== undefined && depth !== '';
  const hasDuration = duration !== null && duration !== undefined && duration !== '';
  const depthValue = hasDepth ? Number(depth) : null;
  const durationValue = hasDuration ? Number(duration) : null;
  if (
    (depthValue !== null && !Number.isFinite(depthValue)) ||
    (durationValue !== null && !Number.isFinite(durationValue))
  ) return RISK.UNKNOWN;
  if ((depthValue !== null && depthValue >= 30) || (durationValue !== null && durationValue >= 3)) {
    return RISK.DANGER;
  }
  if ((depthValue !== null && depthValue >= 15) || (durationValue !== null && durationValue >= 1)) {
    return RISK.WARNING;
  }
  if (!hasDepth || !hasDuration) return RISK.UNKNOWN;
  return RISK.SAFE;
}

function getAccessAdvice(risk, roadCondition) {
  const condition = String(roadCondition || '').toLocaleLowerCase('id-ID');
  if (
    risk === RISK.DANGER ||
    /ditutup|terputus|tidak dapat dilalui|tidak bisa dilalui/.test(condition)
  ) {
    return 'Hentikan pengiriman sementara';
  }
  if (
    risk === RISK.WARNING ||
    /tergenang|sulit dilalui|terbatas/.test(condition)
  ) {
    return 'Hanya mobil box/truk; hindari motor kurir';
  }
  if (risk === RISK.SAFE) return 'Aman untuk motor kurir';
  return 'Data belum cukup untuk menilai akses';
}

module.exports = { RISK, getRiskLevel, getAccessAdvice };
