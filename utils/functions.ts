import '../firebase/config';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Регион должен совпадать с REGION в functions/index.js
const fns = getFunctions(getApp(), 'us-central1');

export async function callFn<T = any>(name: string, payload: any = {}): Promise<T> {
  const res = await httpsCallable(fns, name)(payload);
  return res.data as T;
}
