export const BADGE_PRICE = 1490;
export const SALES_REQUIRED = 50;
export const MAX_PER_BUYER = 3;

// Продажи для значка: только подтверждённые покупателем заказы, без самозаказов,
// не более MAX_PER_BUYER заказов от одного покупателя.
export function countValidSales(orders: any[], sellerId: string, sellerEmail?: string) {
  const perBuyer: Record<string, number> = {};
  let raw = 0;
  orders.forEach(o => {
    if (o.sellerId !== sellerId || o.status !== 'buyer_confirmed') return;
    raw++;
    if (!o.buyerId || o.buyerId === sellerId) return;
    if (sellerEmail && String(o.buyerEmail || '').toLowerCase() === sellerEmail.toLowerCase()) return;
    if (!(Number(o.price) > 0)) return;
    perBuyer[o.buyerId] = (perBuyer[o.buyerId] || 0) + 1;
  });
  let valid = 0;
  Object.values(perBuyer).forEach(n => { valid += Math.min(n, MAX_PER_BUYER); });
  return { valid, uniqueBuyers: Object.keys(perBuyer).length, raw };
}

// Значок активен: бесплатный (навсегда) ИЛИ платный с проверенным бизнесом и неистёкшим сроком
export function isBadgeActive(u: any): boolean {
  if (!u) return false;
  if (u.verifiedFree) return true;
  return !!(u.businessChecked && u.verifiedUntil && new Date(u.verifiedUntil) > new Date());
}

export function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
