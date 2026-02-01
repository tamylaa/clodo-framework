// Normalize feature arrays for consistent internal representation
export function normalizeFeatures(featuresArray = []) {
  if (!Array.isArray(featuresArray)) return [];

  const normalized = new Set(featuresArray.map(f => f && String(f).trim()));

  // Backwards compatibility: if 'kv' is present, ensure provider flag 'upstash' is also present
  if (normalized.has('kv') && !normalized.has('upstash')) {
    normalized.add('upstash');
  }

  return Array.from(normalized);
}

export default normalizeFeatures;