const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp();
const db = admin.firestore();

// Регион должен совпадать с utils/functions.ts. Если при деплое триггер Firestore
// ругается на регион, укажи регион своей базы (Firestore → Данные → расположение).
const REGION = 'us-central1';
setGlobalOptions({ region: REGION, maxInstances: 10 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-2.5-flash'; // проверь актуальное имя в aistudio.google.com
const AI_DAILY_LIMIT = 60;

// ===== Публичный профиль магазина =====
const PUBLIC_FIELDS = [
  'storeName', 'storeLogo', 'storeCategory', 'storeDescription', 'storeAddress', 'storePhone', 'city',
  'verifiedFree', 'verifiedUntil', 'businessChecked',
  'mapHighlighted', 'mapHighlightedUntil', 'hasBanner', 'bannerUntil', 'bannerImage', 'isBlocked',
];

function pickPublic(u) {
  const out = { role: 'seller', updatedAt: new Date().toISOString() };
  PUBLIC_FIELDS.forEach(k => { if (u[k] !== undefined) out[k] = u[k]; });
  return out;
}

exports.syncPublicProfile = onDocumentWritten('users/{uid}', async (event) => {
  const uid = event.params.uid;
  const after = event.data && event.data.after && event.data.after.exists ? event.data.after.data() : null;
  const ref = db.collection('publicProfiles').doc(uid);
  if (!after || after.role !== 'seller') {
    await ref.delete().catch(() => {});
    return;
  }
  await ref.set(pickPublic(after));
});

async function assertAdmin(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Войдите в аккаунт');
  const a = await db.collection('admins').doc(req.auth.uid).get();
  if (!a.exists) throw new HttpsError('permission-denied', 'Только для администратора');
}

// Разовое заполнение для уже существующих продавцов (кнопка в админке)
exports.backfillPublicProfiles = onCall(async (req) => {
  await assertAdmin(req);
  const snap = await db.collection('users').where('role', '==', 'seller').get();
  let count = 0;
  for (const d of snap.docs) {
    await db.collection('publicProfiles').doc(d.id).set(pickPublic(d.data()));
    count++;
  }
  return { count };
});

// ===== Kaspi-реквизиты продавца (только вошедшему, по одному продавцу) =====
exports.getSellerPayment = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Войдите в аккаунт');
  const sellerId = req.data && req.data.sellerId;
  if (typeof sellerId !== 'string' || !sellerId) throw new HttpsError('invalid-argument', 'Нет продавца');
  const s = await db.collection('users').doc(sellerId).get();
  if (!s.exists || s.data().role !== 'seller') return null;
  const u = s.data();
  if (!u.kaspiPhone || !u.kaspiName) return null;
  return { phone: u.kaspiPhone, name: u.kaspiName };
});

// ===== Заказы: все изменения статуса только здесь =====
const FLOW = ['pending', 'accepted', 'packed', 'sent', 'delivered'];
const clip = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

exports.orderAction = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Войдите в аккаунт');
  const { orderId, action, data } = req.data || {};
  if (typeof orderId !== 'string' || !orderId) throw new HttpsError('invalid-argument', 'Нет заказа');
  const uid = req.auth.uid;
  const ref = db.collection('orders').doc(orderId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Заказ не найден');
    const o = snap.data();
    const now = new Date().toISOString();

    if (action === 'advance') {
      if (o.sellerId !== uid) throw new HttpsError('permission-denied', 'Это не ваш заказ');
      if (o.status === 'awaiting_payment_confirmation') {
        throw new HttpsError('failed-precondition', 'Сначала подтвердите получение оплаты');
      }
      const i = FLOW.indexOf(o.status);
      if (i < 0 || i === FLOW.length - 1) throw new HttpsError('failed-precondition', 'Статус нельзя изменить');
      const next = FLOW[i + 1];
      const upd = { status: next, updatedAt: now, ['statusHistory.' + next]: now };

      if (next === 'packed' || next === 'sent') {
        const d = data || {};
        const courierPhone = clip(d.courierPhone, 40) || o.courierPhone || '';
        const deliveryDate = clip(d.deliveryDate, 120) || o.deliveryDate || '';
        const deliveryNote = clip(d.deliveryNote, 500);
        const okPhoto = typeof d.packagingPhoto === 'string'
          && d.packagingPhoto.startsWith('data:image/') && d.packagingPhoto.length <= 700000;
        const photo = okPhoto ? d.packagingPhoto : (o.packagingPhoto || null);
        if (next === 'sent') {
          if (!courierPhone || !deliveryDate) throw new HttpsError('failed-precondition', 'Укажите телефон курьера и время доставки');
          if (!photo) throw new HttpsError('failed-precondition', 'Добавьте фото упаковки');
        }
        Object.assign(upd, { courierPhone, deliveryDate, deliveryNote });
        if (photo) { upd.packagingPhoto = photo; upd.packagingPhotoAt = o.packagingPhotoAt || now; }
      }
      tx.update(ref, upd);

    } else if (action === 'confirmPayment') {
      if (o.sellerId !== uid) throw new HttpsError('permission-denied', 'Это не ваш заказ');
      if (o.paymentMethod !== 'kaspi' || o.paymentStatus !== 'awaiting_confirmation') {
        throw new HttpsError('failed-precondition', 'Оплата не ожидает подтверждения');
      }
      tx.update(ref, { paymentStatus: 'confirmed', status: 'pending', updatedAt: now });

    } else if (action === 'confirmReceived') {
      if (o.buyerId !== uid) throw new HttpsError('permission-denied', 'Это не ваш заказ');
      if (o.status !== 'delivered') throw new HttpsError('failed-precondition', 'Заказ ещё не доставлен');
      tx.update(ref, { status: 'buyer_confirmed', buyerConfirmedAt: now, updatedAt: now });

    } else {
      throw new HttpsError('invalid-argument', 'Неизвестное действие');
    }
  });
  return { ok: true };
});

// ===== Gemini: ключ только на сервере =====
exports.askGemini = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Войдите в аккаунт, чтобы пользоваться ИИ');
    const { prompt, imageBase64 } = req.data || {};
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 60000) {
      throw new HttpsError('invalid-argument', 'Некорректный запрос');
    }
    if (imageBase64 !== undefined && (typeof imageBase64 !== 'string' || imageBase64.length > 7000000)) {
      throw new HttpsError('invalid-argument', 'Фото слишком большое');
    }

    // Лимит запросов в сутки на пользователя
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const usageRef = db.collection('aiUsage').doc(req.auth.uid + '_' + day);
    await db.runTransaction(async (tx) => {
      const u = await tx.get(usageRef);
      const n = u.exists ? u.data().count : 0;
      if (n >= AI_DAILY_LIMIT) throw new HttpsError('resource-exhausted', 'Дневной лимит ИИ исчерпан, попробуйте завтра');
      tx.set(usageRef, { count: n + 1, uid: req.auth.uid, day });
    });

    try {
      const model = new GoogleGenerativeAI(GEMINI_API_KEY.value()).getGenerativeModel({ model: GEMINI_MODEL });
      let parts = [prompt];
      if (imageBase64) {
        const m = imageBase64.match(/^data:(image\/\w+);base64,/);
        parts.push({
          inlineData: { mimeType: m ? m[1] : 'image/jpeg', data: imageBase64.replace(/^data:image\/\w+;base64,/, '') },
        });
      }
      const result = await model.generateContent(parts);
      return { text: result.response.text() };
    } catch (e) {
      console.error('Gemini error', e && e.message);
      throw new HttpsError('internal', 'ИИ временно недоступен');
    }
  }
);
