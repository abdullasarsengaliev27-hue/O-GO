import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from 'firebase/auth';
import { ChatScreen } from '../ChatScreen';

export function SellerChats({ user }: { user: User }) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'chats'), where('sellerId', '==', user.uid));
    return onSnapshot(q, snap => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
      setLoading(false);
    });
  }, [user]);

  if (selectedChat) return (
    <ChatScreen
      user={user}
      chatId={selectedChat.id}
      otherUserId={selectedChat.buyerId}
      otherUserName={selectedChat.buyerEmail?.split('@')[0] || 'Покупатель'}
      dealTitle={selectedChat.dealTitle}
      onBack={() => setSelectedChat(null)}
    />
  );

  const unreadChats = chats.filter(c => c.unreadCount > 0 && c.lastSenderId !== user.uid).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>💬 Чаты</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>
          {unreadChats > 0 ? `${unreadChats} непрочитанных` : 'Переписка с покупателями'}
        </Text>
      </View>

      {loading ? <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {chats.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 56, marginBottom: 16 }}>💬</Text>
              <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 20, marginBottom: 8 }}>Нет чатов</Text>
              <Text style={{ color: '#999', textAlign: 'center', fontSize: 14 }}>Покупатели напишут вам из карточек товаров</Text>
            </View>
          ) : chats.map(chat => {
            const hasUnread = chat.unreadCount > 0 && chat.lastSenderId !== user.uid;
            return (
              <TouchableOpacity
                key={chat.id}
                onPress={() => setSelectedChat(chat)}
                style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, borderWidth: hasUnread ? 2 : 0, borderColor: '#FF4500' }}
              >
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="person" size={24} color="#FF4500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 15 }}>
                    {chat.buyerEmail?.split('@')[0] || 'Покупатель'}
                  </Text>
                  {chat.dealTitle && <Text style={{ color: '#FF4500', fontSize: 12, marginBottom: 2 }} numberOfLines={1}>📦 {chat.dealTitle}</Text>}
                  <Text style={{ color: hasUnread ? '#1a1a1a' : '#999', fontSize: 13, fontWeight: hasUnread ? '600' : '400' }} numberOfLines={1}>
                    {chat.lastMessage || 'Начало переписки'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {chat.lastMessageAt && (
                    <Text style={{ color: '#ccc', fontSize: 11 }}>
                      {new Date(chat.lastMessageAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </Text>
                  )}
                  {hasUnread && (
                    <View style={{ backgroundColor: '#FF4500', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{chat.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
