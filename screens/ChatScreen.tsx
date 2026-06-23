import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderEmail: string;
  createdAt: string;
  read: boolean;
}

export function ChatScreen({ user, chatId, otherUserId, otherUserName, dealTitle, buyerId, sellerId, onBack }: {
  user: User;
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  dealTitle?: string;
  buyerId?: string;
  sellerId?: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    getDoc(doc(db, 'users', otherUserId)).then(snap => {
      if (snap.exists()) setOtherProfile(snap.data());
    });
  }, [otherUserId]);

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      setLoading(false);
      msgs.forEach((msg: any) => {
        if (msg.senderId !== user.uid && !msg.read) {
          updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), { read: true });
        }
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const msgText = text.trim();
    setText('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: msgText,
        senderId: user.uid,
        senderEmail: user.email,
        createdAt: new Date().toISOString(),
        read: false,
      });
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, otherUserId],
        lastMessage: msgText,
        lastMessageAt: new Date().toISOString(),
        lastSenderId: user.uid,
        dealTitle: dealTitle || '',
        buyerId: buyerId || user.uid,
        sellerId: sellerId || otherUserId,
        buyerEmail: user.email,
        sellerName: otherUserName,
        unreadCount: 1,
      }, { merge: true });
      await addDoc(collection(db, 'notifications'), {
        toUserId: otherUserId,
        type: 'new_message',
        title: '💬 Новое сообщение',
        body: `${user.email?.split('@')[0]}: ${msgText}`,
        chatId,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) { console.error(e); }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const renderMessage = ({ item, index }: { item: Message, index: number }) => {
    const isMe = item.senderId === user.uid;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDate = !prevMsg || new Date(item.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
    return (
      <View>
        {showDate && (
          <View style={{ alignItems: 'center', marginVertical: 12 }}>
            <View style={{ backgroundColor: '#f0f0f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: '#999', fontSize: 12 }}>
                {new Date(item.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </Text>
            </View>
          </View>
        )}
        <View style={{ flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: 6, paddingHorizontal: 12 }}>
          {!isMe && (
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginRight: 6 }}>
              {otherProfile?.storeLogo
                ? <Image source={{ uri: otherProfile.storeLogo }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                : <Ionicons name="person" size={16} color="#FF4500" />
              }
            </View>
          )}
          <View style={{
            maxWidth: '75%',
            backgroundColor: isMe ? '#FF4500' : '#fff',
            borderRadius: 18,
            borderBottomRightRadius: isMe ? 4 : 18,
            borderBottomLeftRadius: isMe ? 18 : 4,
            padding: 12,
            elevation: 1,
            shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
          }}>
            <Text style={{ color: isMe ? '#fff' : '#1a1a1a', fontSize: 15, lineHeight: 20 }}>{item.text}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
              <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#aaa', fontSize: 11 }}>{formatTime(item.createdAt)}</Text>
              {isMe && (
                <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={14} color={item.read ? '#fff' : 'rgba(255,255,255,0.6)'} />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f5f5f5' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Шапка */}
      <View style={{ backgroundColor: '#FF4500', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <TouchableOpacity
  onPress={onBack}
  style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <Ionicons name="arrow-back" size={24} color="#fff" />
</TouchableOpacity>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
          {otherProfile?.storeLogo
            ? <Image source={{ uri: otherProfile.storeLogo }} style={{ width: 40, height: 40, borderRadius: 14 }} />
            : <Ionicons name="person" size={20} color="#fff" />
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
            {otherProfile?.storeName || otherUserName}
          </Text>
          {dealTitle && (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }} numberOfLines={1}>📦 {dealTitle}</Text>
          )}
        </View>
      </View>

      {/* Сообщения */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF4500" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
              <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 18, marginBottom: 6 }}>Начни общение!</Text>
              <Text style={{ color: '#999', textAlign: 'center', fontSize: 14 }}>
                {dealTitle ? `Задай вопрос о товаре\n"${dealTitle}"` : 'Напиши первое сообщение'}
              </Text>
            </View>
          }
        />
      )}

      {/* Поле ввода */}
      <View style={{ backgroundColor: '#fff', padding: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
        <TextInput
          style={{ flex: 1, backgroundColor: '#f8f8f8', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, borderWidth: 1.5, borderColor: '#f0f0f0' }}
          placeholder="Написать сообщение..."
          value={text}
          onChangeText={setText}
          multiline
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!text.trim()}
          style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: text.trim() ? '#FF4500' : '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="send" size={20} color={text.trim() ? '#fff' : '#aaa'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
