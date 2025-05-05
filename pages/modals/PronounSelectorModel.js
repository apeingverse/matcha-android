import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import modalStyles from './modalStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PronounSelectorModal = ({ route, navigation }) => {
  const { selectedPronoun, onSelect } = route.params;
  const [pronouns, setPronouns] = useState([]);
  const [current, setCurrent] = useState(selectedPronoun);

  useEffect(() => {
    const fetchPronouns = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      const res = await fetch('https://api.matchaapp.net/api/GenderSexualOrientationPronoun/GetAllPronouns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPronouns(data.response || []);
    };

    fetchPronouns();
  }, []);

  return (
    <View style={modalStyles.container}>
      <View style={modalStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={modalStyles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={modalStyles.title}>Select Pronoun</Text>
      </View>

      <ScrollView>
        {pronouns.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => setCurrent(item.id)}
            style={[
              modalStyles.option,
              current === item.id && modalStyles.selectedOption,
            ]}
          >
            <Text
              style={[
                modalStyles.optionText,
                current === item.id && modalStyles.selectedOptionText,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={modalStyles.doneButton}
        onPress={() => {
          onSelect(current);
          navigation.goBack();
        }}
      >
        <Text style={modalStyles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PronounSelectorModal;
