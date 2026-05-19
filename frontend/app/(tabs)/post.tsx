import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Share,
  Linking
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { generateMarketingPost } from '../services/api';

const FESTIVALS = [
  'Diwali 🪔',
  'Eid 🌙',
  'Christmas 🎄',
  'Holi 🎨',
  'New Year 🎉',
  'Independence Day 🇮🇳',
  'Raksha Bandhan 🤝',
  'Summer Special ☀️',
  'Winter Collection ❄️',
  'None (General)'
];

export default function PostGenerator() {
  const { darkMode } = useContext(ThemeContext);

  const [businessDescription, setBusinessDescription] = useState('');
  const [selectedFestival, setSelectedFestival] = useState('');
  const [offer, setOffer] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [generatedText, setGeneratedText] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // 🤖 GENERATE POST
  const handleGenerate = async () => {
    if (!businessDescription.trim()) {
      Alert.alert('Required', 'Please enter a description of your business or product.');
      return;
    }

    setLoading(true);
    setGeneratedText('');
    setImageUrl('');

    try {
      const festivalValue = selectedFestival === 'None (General)' ? '' : selectedFestival;
      const res = await generateMarketingPost(businessDescription, festivalValue, offer);

      if (res.error) {
        Alert.alert('Error', res.error);
      } else {
        setGeneratedText(res.text);
        setImageUrl(res.imageUrl);
      }
    } catch (err: any) {
      Alert.alert('Generation Failed', err.message || 'An error occurred while generating.');
    } finally {
      setLoading(false);
    }
  };

  // 💾 DOWNLOAD IMAGE
  const handleDownloadImage = async () => {
    if (!imageUrl) return;

    setDownloading(true);

    try {
      // 1. Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photos to save the marketing banner.');
        setDownloading(false);
        return;
      }

      // 2. Generate a local file path
      const filename = `walleto_marketing_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // 3. Download the file from Pollinations AI
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      // 4. Save to gallery
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      await MediaLibrary.createAlbumAsync('Walleto Banners', asset, false);

      Alert.alert('Success 🎉', 'Marketing banner saved to your gallery!');
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not save the image.');
    } finally {
      setDownloading(false);
    }
  };

  // 📢 SHARE POST
  const handleShare = async () => {
    try {
      await Share.share({
        message: generatedText,
      });
    } catch (err: any) {
      console.log('Share error:', err.message);
    }
  };

  // 💬 WHATSAPP SHARE
  const handleWhatsAppShare = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(generatedText)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // Fallback to web link
          return Linking.openURL(`https://wa.me/?text=${encodeURIComponent(generatedText)}`);
        }
      })
      .catch((err) => {
        Alert.alert('Error', 'Could not open WhatsApp');
      });
  };

  // 🎨 THEME COLORS
  const bg = darkMode ? '#121212' : '#f5f7fa';
  const card = darkMode ? '#1e1e1e' : '#fff';
  const text = darkMode ? '#fff' : '#111827';
  const subText = darkMode ? '#aaa' : '#4b5563';
  const inputBg = darkMode ? '#333' : '#f9fafb';
  const inputBorder = darkMode ? '#4b5563' : '#d1d5db';

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[styles.header, { color: text }]}>AI Marketing Assistant</Text>
      <Text style={[styles.subtitle, { color: subText }]}>
        Generate engaging WhatsApp broadcast posts and banner images tailored for occasions.
      </Text>

      {/* INPUT FORM CARD */}
      <View style={[styles.card, { backgroundColor: card }]}>
        <Text style={[styles.label, { color: text }]}>1. Business Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: inputBg, borderColor: inputBorder, color: text }
          ]}
          placeholder="e.g., A sweet shop selling fresh organic mango peda and kaju katli"
          placeholderTextColor={darkMode ? '#888' : '#aaa'}
          multiline
          numberOfLines={3}
          value={businessDescription}
          onChangeText={setBusinessDescription}
        />

        <Text style={[styles.label, { color: text }]}>2. Select Occasion / Festival</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.festivalsScroll}>
          {FESTIVALS.map((fest) => {
            const isSelected = selectedFestival === fest;
            return (
              <TouchableOpacity
                key={fest}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected ? '#16a34a' : darkMode ? '#333' : '#e5e7eb',
                  }
                ]}
                onPress={() => setSelectedFestival(fest)}
              >
                <Text
                  style={{
                    color: isSelected ? '#fff' : text,
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                >
                  {fest}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, { color: text }]}>3. Discount / Special Offer (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: text }]}
          placeholder="e.g., 20% off with code MANGO20 or Buy 1 Get 1 Free"
          placeholderTextColor={darkMode ? '#888' : '#aaa'}
          value={offer}
          onChangeText={setOffer}
        />

        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={loading}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateBtnText}>AI is generating post...</Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateBtnText}>Generate Marketing Post</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* RESULTS SECTION */}
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={[styles.loaderText, { color: subText }]}>
            Crafting copy and generating banner image...
          </Text>
        </View>
      )}

      {!loading && (generatedText || imageUrl) && (
        <View style={[styles.card, { backgroundColor: card, marginTop: 10 }]}>
          <Text style={[styles.resultsHeader, { color: text }]}>🎉 Your Marketing Post</Text>

          {/* Generated Banner Image */}
          {imageUrl && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUrl }} style={styles.bannerImage} resizeMode="cover" />
              <TouchableOpacity
                style={styles.downloadIconBtn}
                onPress={handleDownloadImage}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="download-outline" size={22} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Generated Marketing Text */}
          {generatedText && (
            <View style={[styles.textContainer, { backgroundColor: inputBg }]}>
              <Text style={[styles.generatedText, { color: text }]}>{generatedText}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.copyBtn]} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
              <Text style={styles.copyBtnText}>Share Post</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.whatsappBtn]} onPress={handleWhatsAppShare}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.whatsappBtnText}>Send WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {imageUrl && (
            <TouchableOpacity
              style={[styles.downloadBtn, { borderColor: darkMode ? '#444' : '#ccc' }]}
              onPress={handleDownloadImage}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color={text} style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="image-outline" size={18} color={text} style={{ marginRight: 8 }} />
              )}
              <Text style={[styles.downloadBtnText, { color: text }]}>
                {downloading ? 'Saving banner image...' : 'Download Banner Image'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20
  },
  card: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 10
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  festivalsScroll: {
    flexDirection: 'row',
    marginBottom: 14,
    marginTop: 2
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8
  },
  generateBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 15
  },
  generateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  loaderContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loaderText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center'
  },
  resultsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    height: 250,
    backgroundColor: '#eee'
  },
  bannerImage: {
    width: '100%',
    height: '100%'
  },
  downloadIconBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  textContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  generatedText: {
    fontSize: 14,
    lineHeight: 22
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  actionBtn: {
    flex: 0.48,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  copyBtn: {
    borderWidth: 1.5,
    borderColor: '#16a34a',
    backgroundColor: 'transparent'
  },
  copyBtnText: {
    color: '#16a34a',
    fontWeight: '600'
  },
  whatsappBtn: {
    backgroundColor: '#16a34a'
  },
  whatsappBtnText: {
    color: '#fff',
    fontWeight: '600'
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 6
  },
  downloadBtnText: {
    fontWeight: '600',
    fontSize: 14
  }
});
