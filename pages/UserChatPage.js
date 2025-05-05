import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Entypo from 'react-native-vector-icons/Entypo';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  startSignalRConnection, 
  sendMessage, 
  stopConnection, 
  markMessagesAsRead,
  deleteMessage
} from '../services/signalRService';

const UserChatPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { matchId, user, senderProfileId, receiverProfileId } = route.params;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUserOnline, setIsUserOnline] = useState(false);
  const scrollRef = useRef();
  const messageInputRef = useRef();

  useEffect(() => {
    const setupSignalR = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) return;

        await startSignalRConnection(token, {
            ReceiveMessage: (id, receiverId, text) => {
                const message = {
                  id: id,
                  content: text,
                  senderProfileId: receiverId,
                  receiverProfileId: senderProfileId,
                  timeStamp: new Date().toISOString(),
                  isRead: false,
                  isDeleted: false,
                  isModified: false,
                  type: 0
                };
              
                setMessages(prev => [...prev, message]);
                markMessagesAsRead(senderProfileId, receiverProfileId, matchId);
              }
              
              ,
          UserOnline: (profileId) => {
            if (profileId === receiverProfileId) setIsUserOnline(true);
          },
          UserOffline: (profileId) => {
            if (profileId === receiverProfileId) setIsUserOnline(false);
          },
          OnlineMatches: (matches) => {
            if (matches.includes(receiverProfileId)) setIsUserOnline(true);
          },
          MessageDeleted: (messageId) => {
            setMessages(prev => prev.map(msg => 
              msg.id === messageId ? { ...msg, content: "This message was deleted", isDeleted: true } : msg
            ));
          }
        });

        fetchMessages();
      } catch (error) {
        console.error("SignalR setup error:", error);
      }
    };

    setupSignalR();

    return () => stopConnection();
  }, []);

  const fetchMessages = async () => {
    setIsLoading(true);
    const token = await AsyncStorage.getItem('accessToken');
    try {
      const res = await fetch(`https://api.matchaapp.net/api/Chat/GetChatMessages?matchId=${matchId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/plain',
        },
      });
      const data = await res.json();
      if (data?.response) {
        const parsedMessages = data.response.map(msg => ({
          ...msg,
          content: msg.isDeleted ? "This message was deleted" : msg.content,
        }));
      
        setMessages(parsedMessages);
      
        const unread = parsedMessages.filter(msg =>
          msg.senderProfileId === receiverProfileId && !msg.isRead
        );
      
        if (unread.length > 0) {
          markMessagesAsRead(senderProfileId, receiverProfileId, matchId);
        }
      }
      
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      await sendMessage(senderProfileId, receiverProfileId, inputText);
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: inputText,
        senderProfileId,
        receiverProfileId,
        type: 0,
        timeStamp: new Date().toISOString(),
        isRead: false,
        isDeleted: false,
        isModified: false
      }]);
      setInputText('');
    } catch (err) {
        console.log(senderProfileId, receiverProfileId, inputText);
      console.error("Send message error:", err);
      alert("Failed to send message.");
    }
  };

  const confirmDeleteMessage = async (msg) => {
    try {
      await deleteMessage(senderProfileId, receiverProfileId, msg.id);
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, content: "This message was deleted", isDeleted: true } : m
      ));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete message");
    }
  };

  const handleLongPressMessage = (msg) => {
    if (msg.senderProfileId === senderProfileId) {
      confirmDeleteMessage(msg);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color="#000" />
          </TouchableOpacity>
          <Image source={{ uri: user?.profilePicture }} style={styles.avatar} />
          <View style={styles.headerUserInfo}>
            <Text style={styles.userName}>{user?.fullName}</Text>
            {isUserOnline && <Text style={styles.onlineStatus}>Online</Text>}
          </View>
          <TouchableOpacity style={styles.dots}>
            <Entypo name="dots-three-vertical" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD54F" />
          </View>
        ) : (
          <ScrollView
            style={styles.chatBody}
            contentContainerStyle={{ paddingBottom: 20 }}
            ref={scrollRef}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg, i) => (
              <TouchableOpacity
                key={i}
                onLongPress={() => handleLongPressMessage(msg)}
                activeOpacity={msg.senderProfileId === senderProfileId ? 0.6 : 1}
              >
                <View
                  style={[
                    styles.messageBubble,
                    msg.senderProfileId === senderProfileId ? styles.myMsg : styles.otherMsg,
                    msg.isDeleted && styles.deletedMsg
                  ]}
                >
                  <Text style={msg.isDeleted ? styles.deletedText : null}>
                    {msg.content}
                  </Text>
                  <View style={styles.messageFooter}>
                    <Text style={styles.messageTime}>
                      {formatMessageTime(msg.timeStamp)}
                    </Text>
                    {msg.senderProfileId === senderProfileId && (
                      <Ionicons
                        name={msg.isRead ? "checkmark-done" : "checkmark"}
                        size={16}
                        color={msg.isRead ? "#4CAF50" : "#999"}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.bottomBar}>
          <TouchableOpacity>
            <Ionicons name="image-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TextInput
            ref={messageInputRef}
            style={styles.input}
            placeholder="Aa"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFEF8' },
  wrapper: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  headerUserInfo: {
    flexDirection: 'column',
    flex: 1,
    marginLeft: 10,
  },
  avatar: {
    width: 32, height: 32, borderRadius: 16, marginLeft: 10,
  },
  userName: {
    fontSize: 16, fontWeight: '600',
  },
  onlineStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  dots: { padding: 8 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBody: { flex: 1, padding: 12 },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFD54F',
    borderBottomRightRadius: 4,
  },
  otherMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F1F1',
    borderBottomLeftRadius: 4,
  },
  deletedMsg: {
    backgroundColor: '#F5F5F5',
  },
  deletedText: {
    fontStyle: 'italic',
    color: '#999',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    alignItems: 'center',
  },
  messageTime: {
    fontSize: 10,
    color: '#888',
    marginRight: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopColor: '#ccc',
    borderTopWidth: 1,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    marginHorizontal: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  sendButton: {
    backgroundColor: '#FFD54F',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default UserChatPage;