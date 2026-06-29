/**
 * Helper to format school level (jenjang) from various possible fields
 */
export const formatJenjang = (school: any): string => {
  if (!school) return "-";
  
  // Prioritize string names
  const val = school.jenjang || school.bentuk_pendidikan || school.bentuk_pendidikan_is_str;
  if (val && typeof val === "string" && isNaN(Number(val.trim()))) {
    return val.trim();
  }
  
  // Map numeric IDs to standard text
  const idVal = school.bentuk_pendidikan_id || school.bentuk_pendidikan_id_str || school.bentuk_pendidikan || school.jenjang;
  const numId = Number(String(idVal).trim());
  if (!isNaN(numId)) {
    const idMap: Record<number, string> = {
      1: "SD",
      2: "SMP",
      3: "SMA",
      4: "SMK",
      5: "SD",
      6: "SMP",
      11: "MA",
      12: "MTs",
      13: "SMA",
      15: "SMK",
      16: "SLB",
      34: "PKBM"
    };
    if (idMap[numId]) return idMap[numId];
  }
  
  // Fallback to raw string
  return school.bentuk_pendidikan_id_str || school.bentuk_pendidikan_is_str || school.bentuk_pendidikan || school.jenjang || "-";
};

/**
 * Helper to format GTK education level from numeric codes or strings
 */
export const formatPendidikan = (eduVal: any): string => {
  if (!eduVal) return "-";
  const strVal = String(eduVal).trim();
  
  // If it is a non-numeric string (e.g., "S1", "S2"), return it
  if (isNaN(Number(strVal))) {
    return strVal;
  }
  
  // Map numeric codes to standard names
  const numId = Number(strVal);
  const eduMap: Record<number, string> = {
    1: "SD",
    2: "SMP",
    3: "SMA",
    4: "SMK",
    5: "D1",
    6: "D2",
    7: "D3",
    8: "D4",
    9: "S1",
    10: "S2",
    11: "S3",
    13: "MA"
  };
  
  return eduMap[numId] || strVal;
};
