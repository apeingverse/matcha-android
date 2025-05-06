import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');

const MatchUserCard = ({ profileId, matchModeEnum }) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // Guard clause for missing parameters
      if (!profileId || !matchModeEnum) {
        console.warn("Missing profileId or matchModeEnum");
        return;
      }
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const res = await fetch(`https://api.matchaapp.net/api/Match/GetMatchProfileDetails?profileId=${profileId}&matchModeEnum=${matchModeEnum}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        const data = await res.json();
        console.log(data);
        if (data?.response) {
          setProfile(data.response);
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };

    fetchProfile();
  }, [profileId, matchModeEnum]);

  useEffect(() => {
    console.log("MatchUserCard received profileId:", profileId, "matchModeEnum:", matchModeEnum);
  }, [profileId, matchModeEnum]);

  if (!profile) {
    return <View style={styles.overlay}><Text style={{ color: '#fff' }}>Loading...</Text></View>;
  }

  const getCity = (location) => {
    if (!location) return '';
    const parts = location.split(',').map((p) => p.trim());
    return parts.length > 1 ? parts[1] : parts[0];
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.fullImageContainer}>
            <Image
              source={{ uri: profile.photoUrls?.[0] }}
              style={styles.fullImage}
              resizeMode="cover"
            />
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>
                {profile.fullName}, {profile.age}
              </Text>
              <Text style={styles.userLocation}>
                {getCity(profile.location)}
              </Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.pillGroup}>
              <View style={styles.pill}><Text style={styles.pillText}>{profile.pronoun}</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>{profile.gender}</Text></View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About Me</Text>
              <Text style={styles.sectionText}>{profile.bio}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Interests</Text>
              <View style={styles.pillGroup}>
                {profile.interestTags?.map((tag, i) => (
                  <View key={i} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            {profile.photoUrls?.length > 1 && (
              <View>
                {profile.photoUrls.slice(1).map((photo, idx) => (
                  <View key={idx} style={styles.fullImageContainer}>
                    <Image
                      source={{ uri: photo }}
                      style={styles.fullImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1111,
  },
  card: {
    backgroundColor: '#FFFDF1',
    borderRadius: 20,
    overflow: 'hidden',
    width: '90%',
    height: height * 0.85,
  },
  fullImageContainer: {
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    height: 250,
  },
  userInfoContainer: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userLocation: {
    fontSize: 14,
    color: '#fff',
  },
  detailsContainer: {
    backgroundColor: '#F2EED7',
    paddingTop: 20,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  pill: {
    backgroundColor: '#EEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    margin: 5,
  },
  pillText: {
    fontSize: 14,
    color: '#555',
  },
  tagPill: {
    backgroundColor: '#DFFFD6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    margin: 5,
  },
  tagText: {
    color: '#333',
    fontSize: 14,
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginRight: 10,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    color: '#333',
  }
});

export default MatchUserCard;
