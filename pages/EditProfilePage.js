import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { useMatchType } from '../contexts/MatchTypeContext';
import EditProfilePageStyles from '../styles/EditProfileStyles';

const profileUpdateEndpoints = {
  Dating: '/api/Profile/UpdateDatingProfile',
  Business: '/api/Profile/UpdateBusinessProfile',
  Casual: '/api/Profile/UpdateCasualProfile',
  Study: '/api/Profile/UpdateStudyProfile',
  Sport: '/api/Profile/UpdateSportsProfile',
};
const getProfileEndpointMap = {
  Date: '/api/Profile/GetDatingProfile',
  Business: '/api/Profile/GetBusinessProfile',
  Casual: '/api/Profile/GetCasualProfile',
  Study: '/api/Profile/GetStudyProfile',
  Sport: '/api/Profile/GetSportsProfile',
};

const photoUploadEndpoint = '/api/Photo/UploadProfilePhotosForProfiles';

const lookupApis = {
  pronoun: '/api/GenderSexualOrientationPronoun/GetPronounById',
  orientation: '/api/GenderSexualOrientationPronoun/GetSexualOrientationById',
  genderDating: '/api/GenderSexualOrientationPronoun/GetDatingModeGenderById',
  genderOther: '/api/GenderSexualOrientationPronoun/GetOtherModeGenderById',
  tag: '/api/Tag/GetInterestTagById',
};

const EditProfilePage = () => {
  const navigation = useNavigation();
  const { activeSelection } = useMatchType();

  const [profileData, setProfileData] = useState(null);
  const [photos, setPhotos] = useState(Array(5).fill(null));
  const [bio, setBio] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagNames, setTagNames] = useState([]);
  const [gender, setGender] = useState(null);
  const [genderName, setGenderName] = useState('');
  const [pronoun, setPronoun] = useState(null);
  const [pronounName, setPronounName] = useState('');
  const [orientation, setOrientation] = useState([]);
  const [orientationNames, setOrientationNames] = useState([]);
  const [matchGender, setMatchGender] = useState([]);
  const [matchGenderNames, setMatchGenderNames] = useState([]);

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
      console.warn('❌ Could not parse JSON:', text);
      return {};
    }
  };

  const loadProfileData = async () => {
    try {
      console.log('🧭 Match type selected:', activeSelection);
      console.log('🔄 Fetching profile data...');
      const endpoint = getProfileEndpointMap[activeSelection];
      const profileRes = await fetchWithAuth(endpoint);

      if (!profileRes.response) {
        console.warn('⚠️ No profile data found.');
        return;
      }

      const data = profileRes.response;
      setProfileData(data);
      setBio(data.bio);
      setSelectedTags(data.interestTags || []);
      setGender(data.genderId);
      setPronoun(data.pronounId);
      setMatchGender(data.matchGender || []);
      if (activeSelection === 'Dating') setOrientation(data.sexualOrientation || []);

      const genderApi = activeSelection === 'Dating' ? lookupApis.genderDating : lookupApis.genderOther;

      const [g, p] = await Promise.all([
        fetchWithAuth(`${genderApi}?id=${data.genderId}`),
        fetchWithAuth(`${lookupApis.pronoun}?id=${data.pronounId}`)
      ]);
      setGenderName(g?.response?.name || '');
      setPronounName(p?.response?.name || '');

      if (activeSelection === 'Dating') {
        const oNames = await Promise.all(
          (data.sexualOrientation || []).map(id =>
            fetchWithAuth(`${lookupApis.orientation}?id=${id}`)
          )
        );
        setOrientationNames(oNames.map(o => o?.response?.name));
      }

      const mgNames = await Promise.all(
        data.matchGender.map(id =>
          fetchWithAuth(`${genderApi}?id=${id}`)
        )
      );
      setMatchGenderNames(mgNames.map(m => m?.response?.name));

      const tagResponses = await Promise.all(
        (data.interestTags || []).map(id =>
          fetchWithAuth(`${lookupApis.tag}?id=${id}`)
        )
      );
      setTagNames(tagResponses.map(t => t?.response?.name || `Tag ${t?.id}`));

      const profileTypeIdMap = {
        Dating: 1,
        Casual: 2,
        Sport: 3,
        Business: 4,
        Study: 5,
      };
      const photoRes = await fetchWithAuth(`/api/Photo/GetProfilePhotos?profileType=${profileTypeIdMap[activeSelection]}`);
      if (Array.isArray(photoRes.response)) {
        const ordered = Array(5).fill(null);
        photoRes.response.forEach(p => {
          if (p.order < 5) ordered[p.order] = p;
        });
        setPhotos(ordered);
        console.log('📸 Loaded photos:', ordered);
      }
    } catch (err) {
      console.error('❌ Error loading profile:', err);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [activeSelection]);

  const handleImageChange = (slotIndex) => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response) => {
      const asset = response.assets?.[0];
      if (!asset) return;
      const updated = [...photos];
      updated[slotIndex] = {
        uri: asset.uri,
        type: asset.type,
        name: asset.fileName || `photo-${slotIndex}.jpg`,
        order: slotIndex,
      };
      setPhotos(updated);
    });
  };

  const handleSave = async () => {
    try {
      const payload = {
        id: profileData.id,
        userId: profileData.userId,
        pronounId: pronoun,
        bio,
        interestTags: selectedTags,
        genderId: gender,
        matchGender,
      };
      if (activeSelection === 'Dating') payload.sexualOrientation = orientation;

      await fetchWithAuth(profileUpdateEndpoints[activeSelection], 'PUT', payload);
      await uploadPhotos();
      Alert.alert('✅ Success', 'Profile updated!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('❌ Error', err.message || 'Update failed');
    }
  };

  const uploadPhotos = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const formData = new FormData();
    photos.forEach((photo) => {
      if (photo?.uri) {
        formData.append('photos', {
          uri: photo.uri,
          type: photo.type,
          name: photo.name,
        });
      }
    });
    const profileTypeIdMap = {
      Dating: 1,
      Casual: 2,
      Sport: 3,
      Business: 4,
      Study: 5,
    };
    const res = await fetch(`https://api.matchaapp.net${photoUploadEndpoint}?profileType=${profileTypeIdMap[activeSelection]}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.errorMessages?.[0] || 'Upload failed');
    }
  };

  return (
    <ScrollView style={EditProfilePageStyles.container} contentContainerStyle={EditProfilePageStyles.contentContainer}>
      <TouchableOpacity style={{ margin: 20 }} onPress={() => navigation.goBack()}>
        <Text style={{ fontSize: 16, color: '#007AFF' }}>← Exit</Text>
      </TouchableOpacity>

      <Text style={EditProfilePageStyles.sectionTitle}>Edit Your Profile</Text>

      <View style={EditProfilePageStyles.section}>
        <Text style={EditProfilePageStyles.sectionTitle}>Photos</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {photos.map((photo, index) => (
            <TouchableOpacity key={index} onPress={() => handleImageChange(index)}>
              {photo?.uri || photo?.url ? (
                <Image source={{ uri: photo.uri || photo.url }} style={{ width: 100, height: 100, borderRadius: 10 }} />
              ) : (
                <View style={{
                  width: 100, height: 100, backgroundColor: '#EEE',
                  justifyContent: 'center', alignItems: 'center', borderRadius: 10
                }}>
                  <Text style={{ fontSize: 28, color: '#AAA' }}>+</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={EditProfilePageStyles.section}>
        <Text style={EditProfilePageStyles.sectionTitle}>Bio</Text>
        <TextInput
          style={[EditProfilePageStyles.input, EditProfilePageStyles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Edit your bio"
          multiline
        />
      </View>

      <TouchableOpacity style={EditProfilePageStyles.section} onPress={() => navigation.navigate('GenderSelectorModal', { gender, setGender, setGenderName })}>
        <Text style={EditProfilePageStyles.sectionTitle}>Gender</Text>
        <Text>{genderName || '>'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={EditProfilePageStyles.section} onPress={() => navigation.navigate('PronounSelectorModal', { pronoun, setPronoun, setPronounName })}>
        <Text style={EditProfilePageStyles.sectionTitle}>Pronoun</Text>
        <Text>{pronounName || '>'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={EditProfilePageStyles.section} onPress={() => navigation.navigate('MatchGenderSelectorModal', { matchGender, setMatchGender, setMatchGenderNames })}>
        <Text style={EditProfilePageStyles.sectionTitle}>Match With</Text>
        <Text>{matchGenderNames.join(', ') || '>'}</Text>
      </TouchableOpacity>

      {activeSelection === 'Dating' && (
        <TouchableOpacity style={EditProfilePageStyles.section} onPress={() => navigation.navigate('OrientationSelectorModal', { orientation, setOrientation, setOrientationNames })}>
          <Text style={EditProfilePageStyles.sectionTitle}>Sexual Orientation</Text>
          <Text>{orientationNames.join(', ') || '>'}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={EditProfilePageStyles.section} onPress={() => navigation.navigate('InterestTagSelectorModal', { selectedTags, setSelectedTags })}>
        <Text style={EditProfilePageStyles.sectionTitle}>Interests</Text>
        <View style={EditProfilePageStyles.interestsContainer}>
          {tagNames.map((tag, i) => (
            <View key={i} style={EditProfilePageStyles.interestBadge}>
              <Text style={EditProfilePageStyles.interestText}>{tag}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={EditProfilePageStyles.saveButton} onPress={handleSave}>
        <Text style={EditProfilePageStyles.saveButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default EditProfilePage;
