import { EmailAuthProvider, reauthenticateWithCredential, deleteUser, User } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/config';

async function deleteWhere(col: string, field: string, value: string) {
  const snap = await getDocs(query(collection(db, col), where(field, '==', value)));
  for (const d of snap.docs) await deleteDoc(d.ref);
}

async function deleteSubcollection(path: string[]) {
  const snap = await getDocs(collection(db, path[0], ...path.slice(1)));
  for (const d of snap.docs) await deleteDoc(d.ref);
}

// Удаляет ТОЛЬКО отзывы этого пользователя на скидках всех продавцов.
// Возвращает, сколько отзывов удалено.
async function deleteUserReviews(uid: string, email: string): Promise<number> {
  const mail = email.toLowerCase();
  let removed = 0;
  const deals = await getDocs(collection(db, 'deals'));
  for (const deal of deals.docs) {
    const reviews = await getDocs(collection(db, 'deals', deal.id, 'reviews'));
    for (const r of reviews.docs) {
      const d: any = r.data();
      const mine =
        d.userId === uid || d.uid === uid || d.buyerId === uid ||
        (d.userEmail && String(d.userEmail).toLowerCase() === mail) ||
        (d.email && String(d.email).toLowerCase() === mail);
      if (mine) { await deleteDoc(r.ref); removed++; }
    }
  }
  return removed;
}

export async function deleteAccountCompletely(user: User, role: string, password: string) {
  if (!user.email) throw new Error('У аккаунта нет email');

  // 1. Проверка пароля
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } catch (e: any) {
    if (['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(e.code)) {
      throw new Error('Неверный пароль');
    }
    if (e.code === 'auth/too-many-requests') throw new Error('Слишком много попыток. Попробуй позже.');
    throw new Error('Не удалось подтвердить пароль: ' + (e.message || e.code));
  }

  const uid = user.uid;
  const email = user.email.toLowerCase();

  // 2. Отзывы пользователя на чужих скидках (пока аккаунт ещё существует)
  await deleteUserReviews(uid, email);

  // 3. Чаты
  const chats = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', uid)));
  for (const c of chats.docs) {
    await deleteSubcollection(['chats', c.id, 'messages']);
    await deleteDoc(c.ref);
  }

  // 4. Общие данные
  await deleteWhere('notifications', 'toUserId', uid);
  await deleteWhere('support', 'userId', uid);

  // 5. По роли
  if (role === 'seller') {
    const deals = await getDocs(query(collection(db, 'deals'), where('sellerId', '==', uid)));
    for (const d of deals.docs) {
      await deleteSubcollection(['deals', d.id, 'reviews']); // отзывы на его скидках
      await deleteDoc(d.ref);
    }
    await deleteWhere('happyHours', 'sellerId', uid);
    await deleteWhere('badgeApplications', 'sellerId', uid);
    await deleteWhere('sellerApplications', 'email', email);
    await deleteDoc(doc(db, 'approvedSellers', email)).catch(() => {});
  } else {
    await deleteSubcollection(['users', uid, 'favorites']);
    const orders = await getDocs(query(collection(db, 'orders'), where('buyerId', '==', uid)));
    for (const o of orders.docs) {
      await updateDoc(o.ref, {
        buyerEmail: 'удалённый пользователь',
        phone: '', address: '', street: '', house: '', apartment: '', comment: '',
        buyerDeleted: true,
      });
    }
  }

  // 6. Профиль и аккаунт входа
  await deleteDoc(doc(db, 'users', uid));
  await deleteUser(user);
  await AsyncStorage.multiRemove(['selectedCity', 'userCity']).catch(() => {});
}
