import { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from 'firebase/auth';
import { deleteAccountCompletely } from '../utils/deleteAccount';

export function DeleteAccountModal({ visible, user, role, onClose }: {
  visible: boolean;
  user: User;
  role: 'buyer' | 'seller';
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => { if (busy) return; setPassword(''); onClose(); };

  const confirm = () => {
    if (!password) return Alert.alert('Введи пароль', 'Он нужен, чтобы подтвердить удаление.');
    Alert.alert(
      'Удалить аккаунт навсегда?',
      'Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить навсегда', style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAccountCompletely(user, role, password);
              // Аккаунта больше нет: приложение само вернёт на экран входа
              Alert.alert('Аккаунт удалён', 'Все ваши данные удалены.');
            } catch (e: any) {
              Alert.alert('Не удалось удалить', e.message || 'Попробуй ещё раз');
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const items = role === 'seller'
    ? ['Профиль магазина и значок подтверждения', 'Все ваши скидки и отзывы к ним', 'Счастливые часы, заявки, чаты и уведомления', 'Заказы останутся у покупателей для их истории']
    : ['Профиль и избранное', 'Чаты и уведомления', 'Жалобы в поддержку', 'В ваших заказах будут стёрты email, телефон и адрес'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' }}>
          <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#EF4444' }}>🗑 Удаление аккаунта</Text>
              <TouchableOpacity onPress={close} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: '#FEE2E2', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: '#B91C1C', fontWeight: '800', marginBottom: 8 }}>⚠️ Это навсегда</Text>
              {items.map(t => (
                <Text key={t} style={{ color: '#7F1D1D', fontSize: 13, lineHeight: 20 }}>• {t}</Text>
              ))}
            </View>

            <Text style={{ color: '#666', fontSize: 13, marginBottom: 6 }}>Аккаунт: <Text style={{ fontWeight: '700', color: '#1a1a1a' }}>{user.email}</Text></Text>
            <Text style={{ fontWeight: '700', color: '#333', marginBottom: 8 }}>Введи пароль для подтверждения</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f0f0f0', marginBottom: 16 }}>
              <Ionicons name="lock-closed-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' }}
                placeholder="Пароль"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!busy}
                placeholderTextColor="#ccc"
              />
            </View>

            {busy ? (
              <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                <ActivityIndicator size="large" color="#EF4444" />
                <Text style={{ color: '#999', marginTop: 8 }}>Удаляем данные...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={confirm} style={{ backgroundColor: '#EF4444', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Удалить аккаунт навсегда</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={close} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: '#666', fontWeight: '600' }}>Отмена</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
