import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import modalStyles from './modalStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';

const InterestTagSelectorModal = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { selectedTags, onSelect } = route.params;

  const [allTags, setAllTags] = useState([]);
  const [current, setCurrent] = useState(selectedTags || []);

  useEffect(() => {
    const fetchTags = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      const res = await fetch('https://api.matchaapp.net/api/Tag/GetAllInterestTags', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllTags(data.response || []);
    };

    fetchTags();
  }, []);

  const toggleSelect = (id) => {
    if (current.includes(id)) {
      setCurrent(current.filter((tagId) => tagId !== id));
    } else {
      setCurrent([...current, id]);
    }
  };

  const handleDone = () => {
    if (current.length < 3) {
      alert('Please select at least 3 interest tags.');
      return;
    }
    if (current.length > 10) {
      alert('You can select a maximum of 10 interest tags.');
      return;
    }
  
    const selectedNames = allTags
      .filter((tag) => current.includes(tag.id))
      .map((tag) => tag.name);
  
    onSelect(current, selectedNames); // Send IDs and names back
    navigation.goBack();
  };

  return (
    <View style={modalStyles.container}>
      <View style={modalStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={modalStyles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={modalStyles.title}>Select Interests</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {allTags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            onPress={() => toggleSelect(tag.id)}
            style={[
              modalStyles.option,
              current.includes(tag.id) && modalStyles.selectedOption,
            ]}
          >
            <Text
              style={[
                modalStyles.optionText,
                current.includes(tag.id) && modalStyles.selectedOptionText,
              ]}
            >
              {tag.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={modalStyles.doneButton} onPress={handleDone}>
        <Text style={modalStyles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

export default InterestTagSelectorModal;
