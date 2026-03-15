// ══════════════════════════════════════════════════════════════
// Gelibolu Revival — Tarih Yardımcı Fonksiyonları
// ══════════════════════════════════════════════════════════════

export const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

/** ISO string → UTC Date */
export function isoToUTCDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

/** UTC Date → ISO string */
export function utcDateToISO(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Tarihe gün ekle */
export function addUTCDateDays(d, n) {
  return new Date(d.getTime() + n * 86400000);
}

/** ISO → Türkçe tarih formatı (ör: "18 Mart 1915") */
export function formatISOToTR(iso) {
  const d = isoToUTCDate(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${TR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** İki ISO string arasındaki gün farkı */
export function dayDiffISO(a, b) {
  return Math.round((isoToUTCDate(b).getTime() - isoToUTCDate(a).getTime()) / 86400000);
}

/** Değeri [min, max] aralığına sınırla (clamp) */
export function normalizeValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Serbest metin tarih ifadesini ISO formatına dönüştür.
 * Örnekler: "18 Mart 1915" → "1915-03-18", "Nisan–Mayıs 1915" → "1915-04-01"
 */
export function normalizeDateText(dateText, order = 0) {
  const raw = String(dateText || '').trim();
  if (!raw) return `1915-01-${String(Math.max(1, Math.min(28, order + 1))).padStart(2, '0')}`;
  const clean = raw.replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  const monthMap = {
    ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6,
    temmuz: 7, agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12
  };
  const normalizeMonth = (s) => String(s || '').toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');

  const full = clean.match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (full) {
    const m = monthMap[normalizeMonth(full[2])] || 1;
    return `${full[3]}-${String(m).padStart(2, '0')}-${String(Number(full[1])).padStart(2, '0')}`;
  }

  const rangedMonth = clean.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*-\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (rangedMonth) {
    const m = monthMap[normalizeMonth(rangedMonth[1])] || 1;
    return `${rangedMonth[3]}-${String(m).padStart(2, '0')}-01`;
  }

  const monthYear = clean.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (monthYear) {
    const m = monthMap[normalizeMonth(monthYear[1])] || 1;
    return `${monthYear[2]}-${String(m).padStart(2, '0')}-15`;
  }

  const yearOnly = clean.match(/\b(19\d{2})\b/);
  if (yearOnly) return `${yearOnly[1]}-01-01`;
  return `1915-01-${String(Math.max(1, Math.min(28, order + 1))).padStart(2, '0')}`;
}
