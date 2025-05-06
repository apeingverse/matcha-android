// ChatPage.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const modeNames = {
  1: 'Date',
  2: 'Casual',
  3: 'Sport',
  4: 'Business',
  5: 'Study',
};

const ChatPage = () => {
  const [matches, setMatches] = useState([]);
  const [activeMode, setActiveMode] = useState(1);
  const navigation = useNavigation();

  useEffect(() => {
    fetchMatches();
  }, [activeMode]);

  const fetchMatches = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const res = await fetch('https://api.matchaapp.net/api/Match/GetMatchesForChat', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/plain',
      },
    });
    const data = await res.json();
    const filtered = (data.response || []).filter(item => item.matchModeType === activeMode);
    setMatches(filtered);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modeSelector}>
        {Object.entries(modeNames).map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setActiveMode(Number(key))}>
            <Text style={[styles.modeLabel, activeMode === Number(key) && styles.activeMode]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={{ padding: 15 }} contentContainerStyle={{ paddingBottom: 80 }}>
        <Text style={styles.header}>Chats</Text>
        {matches.map((item) => (
          <TouchableOpacity
            key={item.profileId}
            style={styles.userBar}
            onPress={async () => {
              const token = await AsyncStorage.getItem('accessToken');
              const matchType = modeNames[activeMode].toLowerCase();

              const res = await fetch('https://api.matchaapp.net/api/Profile/GetLoggedInUserProfileState', {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/json',
                },
              });

              const profileState = await res.json();
              const profileData = profileState?.response;

              const profileIdMap = {
                date: profileData?.datingProfileId,
                casual: profileData?.casualProfileId,
                sport: profileData?.sportsProfileId,
                business: profileData?.businessProfileId,
                study: profileData?.studyProfileId,
              };

              const senderProfileId = profileIdMap[matchType];

              if (!senderProfileId) {
                console.warn("❌ Could not resolve senderProfileId from profile state. Debug:", { profileData, matchType });
                return;
              }

              await AsyncStorage.setItem('activeMatchType', matchType);

              navigation.navigate('UserChatPage', {
                matchId: item.matchId,
                receiverProfileId: item.profileId,
                senderProfileId,
                matchType,
                user: {
                  fullName: item.fullName,
                  profilePicture: item.profilePicture,
                }
              });
            }}
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
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  modeLabel: {
    fontSize: 16,
    color: '#AAA',
    fontWeight: '500',
  },
  activeMode: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default ChatPage;
