import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { ChatScreen } from './ChatScreen';

export function BuyerChatsScreen({ user }: { user: User }) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    return onSnapshot(q, snap => {
      setChats(
        snap.docs
          .map(d => {
            const c: any = { id: d.id, ...d.data() };
            c.otherId = (c.participants || []).find((p: string) => p !== user.uid) || null;
            return c;
          })
          .filter(c => c.otherId)
          .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
      );
      setLoading(false);
    }, () => setLoading(false));
  }, [user]);

  useEffect(() => {
    const ids = Array.from(new Set(chats.map(c => c.otherId))).filter(id => !profiles[id]);
    if (ids.length === 0) return;
    (async () => {
      const found: Record<string, any> = {};
      for (const id of ids) {
        try {
          const s = await getDoc(doc(db, 'users', id));
          found[id] = s.exists() ? s.data() : {};
        } catch { found[id] = {}; }
      }
      setProfiles(p => ({ ...p, ...found }));
    })();
  }, [chats]);

  const nameOf = (chat: any) => {
    const p = profiles[chat.otherId] || {};
    return p.storeName || p.buyerName || chat.sellerName || 'Продавец';
  };

  if (selectedChat) return (
    <ChatScreen
      user={user}
      chatId={selectedChat.id}
      otherUserId={selectedChat.otherId}
      otherUserName={nameOf(selectedChat)}
      dealTitle={selectedChat.dealTitle}
      topInset={false}
      onBack={() => setSelectedChat(null)}
    />
  );

  const isUnread = (c: any) => c.unreadCount > 0 && c.lastSenderId !== user.uid;
  const unreadCount = chats.filter(isUnread).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>💬 Чаты</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>
              {unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Переписка с продавцами'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 14 }}>{unreadCount} новых</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flex: 1, marginTop: -20 }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF4500" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {chats.length === 0 ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 40, alignItems: 'center', marginTop: 8, elevation: 2 }}>
                <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 40 }}>💬</Text>
                </View>
                <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 20, marginBottom: 8 }}>Нет сообщений</Text>
                <Text style={{ color: '#999', textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
                  Напиши продавцу из карточки товара — нажми кнопку "Написать продавцу"
                </Text>
              </View>
            ) : chats.map(chat => {
              const hasUnread = isUnread(chat);
              const time = chat.lastMessageAt
                ? new Date(chat.lastMessageAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                : '';
              return (
                <TouchableOpacity
                  key={chat.id}
                  onPress={() => setSelectedChat(chat)}
                  style={{ backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2, borderWidth: hasUnread ? 2 : 0, borderColor: '#FF4500' }}
                >
                  <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="storefront" size={26} color="#FF4500" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 15, marginBottom: 2 }}>{nameOf(chat)}</Text>
                    {chat.dealTitle ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                        <Ionicons name="pricetag" size={11} color="#FF4500" />
                        <Text style={{ color: '#FF4500', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{chat.dealTitle}</Text>
                      </View>
                    ) : null}
                    <Text style={{ color: hasUnread ? '#1a1a1a' : '#999', fontSize: 13, fontWeight: hasUnread ? '600' : '400' }} numberOfLines={1}>
                      {chat.lastSenderId === user.uid ? 'Вы: ' : ''}{chat.lastMessage || 'Начни общение'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={{ color: '#ccc', fontSize: 11 }}>{time}</Text>
                    {hasUnread ? (
                      <View style={{ backgroundColor: '#FF4500', borderRadius: 10, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{chat.unreadCount}</Text>
                      </View>
                    ) : (
                      <Ionicons name="checkmark-done" size={16} color="#ccc" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
