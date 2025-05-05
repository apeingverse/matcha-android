// ChatPage.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
const ChatPage = () => {
  const [matches, setMatches] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const res = await fetch('https://api.matchaapp.net/api/Match/GetMatchesForChat', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/plain',
      },
    });
    const data = await res.json();
    setMatches(data.response || []);
  };

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView style={{ padding: 15 }}>
      <Text style={styles.header}>Chats</Text>
      {matches.map((item) => (
        <TouchableOpacity
          key={item.profileId}
          style={styles.userBar}
          onPress={() => navigation.navigate('UserChatPage', {
            matchId: item.matchId,
            senderProfileId: item.lastMessage?.receiverProfileId, // logged-in user
            receiverProfileId: item.lastMessage?.senderProfileId, // other person
            user: {
              fullName: item.fullName,
              profilePicture: item.profilePicture,
            }
          })}
          
        >
          <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
          <View>
            <Text style={styles.name}>{item.fullName}</Text>
            <Text style={styles.message} numberOfLines={1}>
              {item.lastMessage?.content || 'No messages yet'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    marginBottom: 10,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  name: { fontSize: 16, fontWeight: '600' },
  message: { fontSize: 14, color: '#555', marginTop: 2 },
});

export default ChatPage;
