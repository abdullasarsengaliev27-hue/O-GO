import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase/config';

Notifications.setNotificationHandler({
 handleNotification: async () => ({
   shouldShowBanner: true,
   shouldShowList: true,
   shouldPlaySound: true,
   shouldSetBadge: true,
 }),
});

export async function registerForPushNotifications(userId: string) {
 try {
   const { status } = await Notifications.requestPermissionsAsync();
   if (status !== 'granted') return;
   const token = await Notifications.getExpoPushTokenAsync();
   await updateDoc(doc(db, 'users', userId), {
     pushToken: token.data,
   });
 } catch (e) {
   console.log('Push notification error:', e);
 }
}

export async function sendLocalNotification(title: string, body: string) {
 try {
   await Notifications.scheduleNotificationAsync({
     content: { title, body, sound: true },
     trigger: null,
   });
 } catch (e) {
   console.log('Local notification error:', e);
 }
}
