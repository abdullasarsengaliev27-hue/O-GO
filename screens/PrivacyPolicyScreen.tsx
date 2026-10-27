import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onClose: () => void;
}

export function PrivacyPolicyScreen({ onClose }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Шапка */}
      <View style={{ backgroundColor: '#FF4500', paddingTop: 54, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', flex: 1 }}>Политика конфиденциальности</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 }}>O-GO</Text>
          <Text style={{ color: '#999', fontSize: 13, marginBottom: 20 }}>Последнее обновление: октябрь 2026</Text>

          {[
            {
              title: '1. Какие данные мы собираем',
              content: `• Имя и фамилия\n• Номер телефона\n• Адрес электронной почты\n• Город проживания\n• Адреса доставки\n• История заказов и покупок\n• Данные об устройстве (для уведомлений)`
            },
            {
              title: '2. Как мы используем ваши данные',
              content: `• Для создания и управления вашим аккаунтом\n• Для обработки и доставки заказов\n• Для отправки уведомлений о скидках\n• Для улучшения работы приложения\n• Для связи с вами по вопросам заказов`
            },
            {
              title: '3. Передача данных третьим лицам',
              content: `Мы НЕ продаём и НЕ передаём ваши персональные данные третьим лицам, за исключением:\n\n• Продавцов — только для выполнения заказа (имя, адрес, телефон)\n• Служб доставки — для доставки товара\n• Firebase (Google) — для хранения данных`
            },
            {
              title: '4. Хранение данных',
              content: `Ваши данные хранятся на защищённых серверах Firebase (Google Cloud). Мы используем шифрование для защиты ваших данных. Данные хранятся до момента удаления аккаунта.`
            },
            {
              title: '5. Ваши права',
              content: `Вы имеете право:\n\n• Просматривать свои данные в профиле\n• Изменять свои данные в настройках\n• Удалить свой аккаунт и все данные\n• Отказаться от уведомлений\n• Запросить копию своих данных`
            },
            {
              title: '6. Данные несовершеннолетних',
              content: `Приложение O-GO предназначено для лиц старше 16 лет. Мы сознательно не собираем данные детей до 16 лет. Если вам стало известно, что ребёнок предоставил нам свои данные — свяжитесь с нами.`
            },
            {
              title: '7. Cookies и аналитика',
              content: `Приложение использует анонимную аналитику для улучшения работы сервиса. Мы отслеживаем только общую статистику использования (количество просмотров, категории), но не личные действия конкретного пользователя.`
            },
            {
              title: '8. Контакты',
              content: `По вопросам конфиденциальности обращайтесь:\n\nEmail: support@o-go.kz\nКазахстан, 2026`
            },
          ].map((section, i) => (
            <View key={i} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 }}>{section.title}</Text>
              <Text style={{ color: '#555', fontSize: 14, lineHeight: 22 }}>{section.content}</Text>
              {i < 7 && <View style={{ height: 1, backgroundColor: '#f0f0f0', marginTop: 16 }} />}
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: '#FFF0EB', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#FF4500' + '30' }}>
          <Text style={{ fontWeight: '700', color: '#FF4500', marginBottom: 6 }}>⚖️ Соответствие законодательству</Text>
          <Text style={{ color: '#666', fontSize: 13, lineHeight: 20 }}>
            Данная политика соответствует Закону Республики Казахстан «О персональных данных и их защите» от 21 мая 2013 года № 94-V.
          </Text>
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={{ backgroundColor: '#FF4500', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 32 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Понятно, закрыть</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
