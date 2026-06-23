import { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from './notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { MapScreen } from './screens/MapScreen';
import { FavoritesScreen } from './screens/FavoritesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CitySelectScreen } from './screens/CitySelectScreen';

const Tab = createBottomTabNavigator();
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState('');
  const [appReady, setAppReady] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [cityLoaded, setCityLoaded] = useState(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    const prepare = async () => {
      // Загружаем сохранённый город
      const savedCity = await AsyncStorage.getItem('userCity');
      if (savedCity) setUserCity(savedCity);
      setCityLoaded(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAppReady(true);
      await SplashScreen.hideAsync();
    };
    prepare();

    notificationListener.current = Notifications.addNotificationReceivedListener(n => console.log(n));
    responseListener.current = Notifications.addNotificationResponseReceivedListener(r => console.log(r));
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserRole(data.role);
          // Для покупателя берём его город
          if (data.role === 'buyer' && data.buyerCity && !userCity) {
            setUserCity(data.buyerCity);
            await AsyncStorage.setItem('userCity', data.buyerCity);
          }
        }
        await registerForPushNotifications(u.uid);
      } else setUserRole('');
    });
  }, []);

  if (!appReady) return (
    <View style={{ flex: 1, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 64, fontWeight: 'bold', color: '#fff', letterSpacing: 4 }}>O-GO</Text>
      <Text style={{ fontSize: 18, color: '#fff', marginTop: 12, opacity: 0.9 }}>Все скидки в одном месте</Text>
      <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
    </View>
  );

  // Показываем выбор города если не выбран
  if (cityLoaded && !userCity) {
    return <CitySelectScreen onSelect={(city) => setUserCity(city)} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              'Главная': 'home',
              'Поиск': 'search',
              'Карта': 'map',
              'Избранное': 'heart',
              'Профиль': 'person',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF4500',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: { paddingBottom: 5, height: 60 },
          headerStyle: { backgroundColor: '#FF4500' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        })}
      >
        <Tab.Screen name="Главная">{() => <HomeScreen user={user} userCity={userCity} />}</Tab.Screen>
        <Tab.Screen name="Поиск">{() => <SearchScreen user={user} userCity={userCity} />}</Tab.Screen>
        <Tab.Screen name="Карта">{() => <MapScreen user={user} userCity={userCity} />}</Tab.Screen>
        <Tab.Screen name="Избранное">{() => <FavoritesScreen user={user} />}</Tab.Screen>
        <Tab.Screen name="Профиль">{() => <ProfileScreen user={user} userRole={userRole} userCity={userCity} onCityChange={setUserCity} />}</Tab.Screen>
        </Tab.Navigator>    
        </NavigationContainer>
  );
}
