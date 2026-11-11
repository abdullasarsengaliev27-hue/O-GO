import { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { styles } from './styles';
import { callFn } from '../utils/functions';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { compressToBase64 } from '../utils/imageToBase64';

type PaymentMethod = 'cash' | 'kaspi';

export function OrderModal({ deal, user, visible, onClose }: {
  deal: any, user: User | null, visible: boolean, onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [house, setHouse] = useState('');
  const [apartment, setApartment] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [sellerKaspi, setSellerKaspi] = useState<{ phone: string, name: string } | null>(null);

  const hasSizes = deal?.sizes && deal.sizes.length > 0;
  const hasColors = deal?.colorVariants && deal.colorVariants.length > 0;
  const fullAddress = [city, street, house, apartment, extraInfo].filter(Boolean).join(', ');

  useEffect(() => {
    if (!deal?.sellerId || !visible || !user) return;
    let alive = true;
    callFn<{ phone: string, name: string } | null>('getSellerPayment', { sellerId: deal.sellerId })
      .then(r => { if (alive && r && r.phone && r.name) setSellerKaspi({ phone: r.phone, name: r.name }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [deal?.sellerId, visible, user?.uid]);

  const reset = () => {
    setStep(1); setSelectedSize(''); setSelectedColor('');
    setCity(''); setStreet(''); setHouse(''); setApartment('');
    setExtraInfo(''); setPhone(''); setPaymentMethod('cash');
    setComment(''); setReceiptImage(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const goToStep2 = () => {
    if (hasSizes && !selectedSize) return Alert.alert('Выберите размер');
    if (hasColors && !selectedColor) return Alert.alert('Выберите цвет');
    setStep(2);
  };

  const goToStep3 = () => {
    if (!city || !street || !house || !phone) return Alert.alert('Ошибка', 'Заполни адрес и телефон');
    setStep(3);
  };

  // Любое фото чека -> сжатый base64 (~до 420 КБ)
  const processReceipt = async (uri: string) => {
    setReceiptBusy(true);
    try {
      setReceiptImage(await compressToBase64(uri, { maxWidth: 1280, maxBytes: 420 * 1024 }));
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось обработать фото');
    }
    setReceiptBusy(false);
  };

  const pickReceipt = async (fromCamera = false) => {
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Нет доступа к камере');
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (!result.canceled) await processReceipt(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Нет доступа к фото');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, quality: 1,
      });
      if (!result.canceled) await processReceipt(result.assets[0].uri);
    }
  };

  const pickReceiptFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      await processReceipt(result.assets[0].uri);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить файл');
    }
  };

  const placeOrder = async () => {
    if (!user) return Alert.alert('Войдите', 'Чтобы оформить заказ');
    if (paymentMethod === 'kaspi' && !receiptImage) {
      return Alert.alert('⚠️ Прикрепи чек', 'Загрузи скриншот чека об оплате через Kaspi');
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'orders'), {
        dealId: deal.id,
        dealTitle: deal.title,
        price: deal.newPrice,
        oldPrice: deal.oldPrice,
        marketPrice: deal.marketPrice || null,
        discount: deal.discount,
        category: deal.category,
        storeName: deal.store,
        sellerId: deal.sellerId,
        sellerEmail: deal.sellerEmail,
        buyerId: user.uid,
        buyerEmail: user.email,
        selectedSize: selectedSize || null,
        selectedColor: selectedColor || null,
        address: fullAddress,
        city, street, house, apartment,
        phone, comment,
        paymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'pending' : 'awaiting_confirmation',
        receiptImage: paymentMethod === 'kaspi' ? receiptImage : null,
        status: paymentMethod === 'kaspi' ? 'awaiting_payment_confirmation' : 'pending',
        statusHistory: { pending: new Date().toISOString() },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await addDoc(collection(db, 'notifications'), {
        toUserId: deal.sellerId,
        type: 'new_order',
        title: paymentMethod === 'kaspi' ? '💳 Новый заказ (Kaspi)!' : '🛒 Новый заказ!',
        body: `${user.email?.split('@')[0]} заказал "${deal.title}"${paymentMethod === 'kaspi' ? ' — проверь чек оплаты' : ''}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        '✅ Заказ оформлен!',
        paymentMethod === 'kaspi'
          ? 'Продавец проверит ваш чек и подтвердит оплату.'
          : 'Продавец получил уведомление и скоро свяжется с вами.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setLoading(false);
  };

  const StepIndicator = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 }}>
      {[1, 2, 3].map(s => (
        <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: step >= s ? '#FF4500' : '#ddd', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{s}</Text>
          </View>
          {s < 3 && <View style={{ width: 30, height: 2, backgroundColor: step > s ? '#FF4500' : '#ddd' }} />}
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ backgroundColor: '#FF4500', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={step > 1 ? () => setStep(s => (s - 1) as any) : handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name={step > 1 ? 'arrow-back' : 'close'} size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold' }}>
            {step === 1 ? '🛍 Параметры' : step === 2 ? '📍 Адрес' : '💳 Оплата'}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        <StepIndicator />

        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">

          {/* ШАГ 1 */}
          {step === 1 && (
            <>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 17, marginBottom: 6 }}>{deal?.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: '#FF4500', fontWeight: 'bold', fontSize: 22 }}>{Number(deal?.newPrice).toLocaleString()} ₸</Text>
                  <Text style={{ color: '#aaa', textDecorationLine: 'line-through' }}>{Number(deal?.oldPrice).toLocaleString()} ₸</Text>
                  <View style={{ backgroundColor: '#FF4500', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>-{deal?.discount}%</Text>
                  </View>
                </View>
              </View>

              {hasSizes && (
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 12 }}>📏 Размер</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {deal.sizes.map((size: string) => {
                      const oos = deal.outOfStockSizes?.includes(size);
                      const sel = selectedSize === size;
                      return (
                        <TouchableOpacity key={size} disabled={oos} onPress={() => setSelectedSize(size)}
                          style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: oos ? '#f0f0f0' : sel ? '#FF4500' : '#fff', borderWidth: 2, borderColor: oos ? '#ddd' : sel ? '#FF4500' : '#eee', opacity: oos ? 0.5 : 1 }}>
                          <Text style={{ color: oos ? '#aaa' : sel ? '#fff' : '#333', fontWeight: 'bold' }}>{size}{oos ? '\nнет' : ''}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {hasColors && (
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 12 }}>🎨 Цвет</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {deal.colorVariants.map((variant: any) => {
                      const sel = selectedColor === variant.color;
                      return (
                        <TouchableOpacity key={variant.color} onPress={() => setSelectedColor(variant.color)} style={{ alignItems: 'center', gap: 4 }}>
                          <View style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', borderWidth: 3, borderColor: sel ? '#FF4500' : 'transparent' }}>
                            {variant.image
                              ? <Image source={{ uri: variant.image }} style={{ width: 72, height: 72 }} resizeMode="cover" />
                              : <View style={{ width: 72, height: 72, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 24 }}>🎨</Text></View>
                            }
                          </View>
                          <Text style={{ fontSize: 12, color: sel ? '#FF4500' : '#666', fontWeight: sel ? 'bold' : 'normal' }}>{variant.color}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.bigBtn} onPress={goToStep2}>
                <Text style={styles.bigBtnText}>Далее → Адрес доставки</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ШАГ 2 */}
          {step === 2 && (
            <>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 14 }}>📍 Адрес доставки</Text>
                <Text style={styles.label}>Город *</Text>
                <TextInput style={styles.input} placeholder="Алматы" value={city} onChangeText={setCity} placeholderTextColor="#aaa" />
                <Text style={styles.label}>Улица *</Text>
                <TextInput style={styles.input} placeholder="ул. Абая" value={street} onChangeText={setStreet} placeholderTextColor="#aaa" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Дом *</Text>
                    <TextInput style={styles.input} placeholder="45" value={house} onChangeText={setHouse} keyboardType="numeric" placeholderTextColor="#aaa" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Квартира</Text>
                    <TextInput style={styles.input} placeholder="12" value={apartment} onChangeText={setApartment} placeholderTextColor="#aaa" />
                  </View>
                </View>
                <Text style={styles.label}>Телефон *</Text>
                <TextInput style={styles.input} placeholder="+7 777 123 45 67" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#aaa" />
                <Text style={styles.label}>Комментарий</Text>
                <TextInput style={[styles.input, { height: 70 }]} placeholder="Позвоните за 30 минут..." value={comment} onChangeText={setComment} multiline placeholderTextColor="#aaa" />
              </View>
              <TouchableOpacity style={styles.bigBtn} onPress={goToStep3}>
                <Text style={styles.bigBtnText}>Далее → Способ оплаты</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ШАГ 3 */}
          {step === 3 && (
            <>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 12 }}>🧾 Итог заказа</Text>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#666' }}>Товар:</Text>
                    <Text style={{ fontWeight: 'bold', color: '#222', flex: 1, textAlign: 'right' }} numberOfLines={1}>{deal?.title}</Text>
                  </View>
                  {selectedSize ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#666' }}>Размер:</Text><Text style={{ fontWeight: 'bold' }}>{selectedSize}</Text></View> : null}
                  {selectedColor ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#666' }}>Цвет:</Text><Text style={{ fontWeight: 'bold' }}>{selectedColor}</Text></View> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#666' }}>Адрес:</Text>
                    <Text style={{ fontWeight: 'bold', flex: 1, textAlign: 'right' }} numberOfLines={2}>{fullAddress}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: '#f0f0f0', marginVertical: 6 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#666' }}>Сумма:</Text>
                    <Text style={{ fontWeight: 'bold', color: '#FF4500', fontSize: 18 }}>{Number(deal?.newPrice).toLocaleString()} ₸</Text>
                  </View>
                </View>
              </View>

              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 12 }}>💳 Способ оплаты</Text>

                <TouchableOpacity
                  onPress={() => setPaymentMethod('cash')}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: paymentMethod === 'cash' ? '#FF4500' : '#eee', marginBottom: 10, backgroundColor: paymentMethod === 'cash' ? '#FFF0EB' : '#fff' }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: paymentMethod === 'cash' ? '#FF4500' : '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    {paymentMethod === 'cash' && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF4500' }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15 }}>💵 Наличными / Kaspi QR</Text>
                    <Text style={{ color: '#999', fontSize: 12 }}>Оплата при получении товара</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (!sellerKaspi) return Alert.alert('⚠️', 'Продавец не указал реквизиты Kaspi. Используйте оплату при получении.');
                    setPaymentMethod('kaspi');
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: paymentMethod === 'kaspi' ? '#FF4500' : '#eee', backgroundColor: paymentMethod === 'kaspi' ? '#FFF0EB' : '#fff' }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: paymentMethod === 'kaspi' ? '#FF4500' : '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    {paymentMethod === 'kaspi' && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF4500' }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15 }}>📱 Kaspi перевод</Text>
                    <Text style={{ color: '#999', fontSize: 12 }}>Перевод на карту продавца + чек</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'kaspi' && sellerKaspi && (
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 12 }}>📱 Реквизиты для перевода</Text>

                  <View style={{ backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                    <Text style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>Получатель:</Text>
                    <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 8 }}>{sellerKaspi.name}</Text>
                    <Text style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>Номер телефона:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: 'bold', color: '#FF4500', fontSize: 18 }}>{sellerKaspi.phone}</Text>
                      <TouchableOpacity
                        onPress={async () => {
                          await Clipboard.setStringAsync(sellerKaspi.phone);
                          Alert.alert('✅ Скопировано!', sellerKaspi.phone);
                        }}
                        style={{ backgroundColor: '#FF4500', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Ionicons name="copy" size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Копировать</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ backgroundColor: '#E8F5E9', borderRadius: 10, padding: 10, marginBottom: 12 }}>
                    <Text style={{ color: '#4CAF50', fontSize: 13 }}>
                      1. Переведи <Text style={{ fontWeight: 'bold' }}>{Number(deal?.newPrice).toLocaleString()} ₸</Text> на номер выше{'\n'}
                      2. Сделай скриншот чека{'\n'}
                      3. Загрузи скриншот ниже (любой размер)
                    </Text>
                  </View>

                  <Text style={[styles.label, { color: '#f44336' }]}>📸 Скриншот/фото чека об оплате *</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TouchableOpacity
                      onPress={() => pickReceipt(false)}
                      disabled={receiptBusy}
                      style={{ flex: 1, backgroundColor: '#FFF0EB', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: '#FF4500' }}
                    >
                      <Ionicons name="image" size={24} color="#FF4500" />
                      <Text style={{ color: '#FF4500', fontWeight: '600', fontSize: 12, marginTop: 4 }}>Галерея</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => pickReceipt(true)}
                      disabled={receiptBusy}
                      style={{ flex: 1, backgroundColor: '#FFF0EB', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: '#FF4500' }}
                    >
                      <Ionicons name="camera" size={24} color="#FF4500" />
                      <Text style={{ color: '#FF4500', fontWeight: '600', fontSize: 12, marginTop: 4 }}>Камера</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={pickReceiptFile}
                      disabled={receiptBusy}
                      style={{ flex: 1, backgroundColor: '#FFF0EB', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: '#FF4500' }}
                    >
                      <Ionicons name="document" size={24} color="#FF4500" />
                      <Text style={{ color: '#FF4500', fontWeight: '600', fontSize: 12, marginTop: 4 }}>Файл</Text>
                    </TouchableOpacity>
                  </View>

                  {receiptBusy && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 8 }}>
                      <ActivityIndicator color="#FF4500" />
                      <Text style={{ color: '#999', fontSize: 13 }}>Обрабатываем фото...</Text>
                    </View>
                  )}

                  {receiptImage && !receiptBusy && (
                    <View style={{ marginBottom: 8 }}>
                      <Image source={{ uri: receiptImage }} style={{ width: '100%', height: 200, borderRadius: 10 }} resizeMode="contain" />
                      <TouchableOpacity onPress={() => setReceiptImage(null)} style={{ marginTop: 6 }}>
                        <Text style={{ color: '#f44336', textAlign: 'center', fontSize: 13 }}>✕ Удалить и загрузить другой</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {!receiptImage && !receiptBusy && (
                    <View style={{ backgroundColor: '#FFF9E6', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FFD700' }}>
                      <Text style={{ color: '#666', fontSize: 12 }}>⚠️ Без чека заказ не будет принят продавцом</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <Text style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: 6 }}>🛡 Гарантия O-GO</Text>
                <Text style={{ color: '#555', fontSize: 13 }}>✓ Продавец сразу получит уведомление</Text>
                <Text style={{ color: '#555', fontSize: 13 }}>✓ Статус заказа в реальном времени</Text>
                <Text style={{ color: '#555', fontSize: 13 }}>✓ Телефон курьера при отправке</Text>
              </View>

              {loading
                ? <ActivityIndicator size="large" color="#FF4500" />
                : <TouchableOpacity
                    style={[styles.bigBtn, receiptBusy && { opacity: 0.5 }]}
                    onPress={placeOrder}
                    disabled={receiptBusy}
                  >
                    <Text style={styles.bigBtnText}>
                      {paymentMethod === 'kaspi' ? '📱 Отправить заказ с чеком' : '✅ Оформить заказ'}
                    </Text>
                  </TouchableOpacity>
              }
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
