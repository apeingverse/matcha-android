import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/MePageStyles';
import { useMatchType } from '../contexts/MatchTypeContext';
import { useNavigation } from '@react-navigation/native';




const profileEndpoints = {
  Date: '/api/Profile/GetDatingProfile',
  Business: '/api/Profile/GetBusinessProfile',
  Casual: '/api/Profile/GetCasualProfile',
  Study: '/api/Profile/GetStudyProfile',
  Sport: '/api/Profile/GetSportsProfile',
};

const profileTypeIdMap = {
  Date: 1,
  Casual: 2,
  Sport: 3,
  Business: 4,
  Study: 5,
};

const lookupApis = {
  pronoun: '/api/GenderSexualOrientationPronoun/GetPronounById',
  orientation: '/api/GenderSexualOrientationPronoun/GetSexualOrientationById',
  tag: '/api/Tag/GetInterestTagById',
  genderDating: '/api/GenderSexualOrientationPronoun/GetDatingModeGenderById',
  genderOther: '/api/GenderSexualOrientationPronoun/GetOtherModeGenderById',
};

const MePage = () => {
  const { activeSelection } = useMatchType();
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [profileInfo, setProfileInfo] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [resolvedData, setResolvedData] = useState({
    gender: '',
    pronoun: '',
    orientation: [],
    matchGender: [],
    tags: [],
  });

  const fetchWithAuth = async (url, method = 'GET', body = null) => {
    const token = await AsyncStorage.getItem('accessToken');
    const res = await fetch(`https://api.matchaapp.net${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('⚠️ Could not parse response:', text);
      return {};
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('accessToken');
    navigation.replace('Login');
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userRes = await fetchWithAuth('/api/Authentication/Profile');
        setUserInfo(userRes.response);

        const profileRes = await fetchWithAuth(profileEndpoints[activeSelection]);
        if (!profileRes.response) {
          setProfileInfo(null);
          setPhotos([]);
          return;
        }

        const profile = profileRes.response;
        setProfileInfo(profile);

        const profileTypeId = profileTypeIdMap[activeSelection];
        const photoRes = await fetchWithAuth(`/api/Photo/GetProfilePhotos?profileType=${profileTypeId}`);
        console.log(`📷 Full photo response for ${activeSelection}:`, photoRes);

        setPhotos(Array.isArray(photoRes) ? photoRes : []);


        const genderApi =
          activeSelection === 'Date'
            ? lookupApis.genderDating
            : lookupApis.genderOther;

        const [gender, pronoun] = await Promise.all([
          fetchWithAuth(`${genderApi}?id=${profile.genderId}`),
          fetchWithAuth(`${lookupApis.pronoun}?id=${profile.pronounId}`),
        ]);

        const orientationNames = profile.sexualOrientation?.length
          ? await Promise.all(
              profile.sexualOrientation.map((id) =>
                fetchWithAuth(`${lookupApis.orientation}?id=${id}`)
              )
            )
          : [];

        const matchGenderNames = await Promise.all(
          profile.matchGender.map((id) =>
            fetchWithAuth(`${genderApi}?id=${id}`)
          )
        );

        const tagNames = await Promise.all(
          profile.interestTags.map((id) =>
            fetchWithAuth(`${lookupApis.tag}?id=${id}`)
          )
        );

        setResolvedData({
          gender: gender.response.name,
          pronoun: pronoun.response.name,
          orientation: orientationNames.map((o) => o.response.name),
          matchGender: matchGenderNames.map((g) => g.response.name),
          tags: (tagNames || []).map((t) => t.response?.name),

        });
      } catch (err) {
        console.error('❌ Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeSelection]);

  return (
    <ScrollView contentContainerStyle={[styles.container, styles.contentContainer]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text>Loading profile...</Text>
        </View>
      ) : !profileInfo ? (
        <Text style={styles.value}>No profile created for this match type yet.</Text>
      ) : (
        <>
          {/* Top Header with Image & Name */}
          <View style={styles.header}>
            {photos.length > 0 && (
              <Image
                source={{ uri: photos[0].url }}
                style={styles.profileImage}
              />
            )}
            <View style={styles.headerContent}>
              <Text style={styles.userName}>
                {userInfo?.firstName} {userInfo?.lastName}
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditProfilePage')}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
  
          {/* Personal Info Block */}
          <View style={styles.personalInfoSection}>
            <Text style={styles.sectionTitle}>Personal Info</Text>
            <Text style={styles.infoText}>Email: {userInfo?.email}</Text>
            <Text style={styles.infoText}>Date of Birth: {userInfo?.dob}</Text>
            <Text style={styles.infoText}>Gender: {resolvedData.gender}</Text>
            <Text style={styles.infoText}>Pronoun: {resolvedData.pronoun}</Text>
            <Text style={styles.infoText}>Match With: {resolvedData.matchGender.join(', ')}</Text>
            {activeSelection === 'Date' && (
              <Text style={styles.infoText}>Sexual Orientation: {resolvedData.orientation.join(', ')}</Text>
            )}
          </View>
  
          {/* Bio Block */}
          <View style={styles.bioSection}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <Text style={styles.infoText}>{profileInfo.bio || 'No bio available.'}</Text>
          </View>
  
          {/* Interests Block */}
          <View style={styles.interestsSection}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {resolvedData.tags.length > 0 ? (
                resolvedData.tags.map((tag, index) => (
                  <View key={index} style={styles.interestBadge}>
                    <Text style={styles.interestText}>{tag}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.infoText}>No interests added.</Text>
              )}
            </View>
          </View>
  
          {/* Photos Block */}
          <View style={styles.interestsSection}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photoContainer}>
              {photos.length > 0 ? (
                photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo.url }}
                    style={styles.photoThumbnail}
                  />
                ))
              ) : (
                <Text style={styles.infoText}>No profile photos found.</Text>
              )}
            </View>
          </View>
        </>
      )}
  
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
};

export default MePage;
