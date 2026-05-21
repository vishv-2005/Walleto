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
  Linking,
  Platform
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
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
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 🤖 GENERATE POST
  const handleGenerate = async () => {
    if (!businessDescription.trim()) {
      Alert.alert('Required', 'Please enter a description of your business or product.');
      return;
    }

    setLoading(true);
    setGeneratedText('');
    setImageUrl('');
    setImageError(false);
    setImageLoading(false);

    try {
      const festivalValue = selectedFestival === 'None (General)' ? '' : selectedFestival;
      const res = await generateMarketingPost(businessDescription, festivalValue, offer);

      if (res.error) {
        Alert.alert('Error', res.error);
      } else {
        setGeneratedText(res.text);
        if (res.imageUrl) {
          setImageLoading(true);
          setImageError(false);
          setImageUrl(res.imageUrl);
        }
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
      if (Platform.OS === 'web') {
        // Web: fetch image as blob and trigger browser download
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `walleto_marketing_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        Alert.alert('Success 🎉', 'Banner image download started!');
      } else {
        // Native: use expo-file-system + expo-media-library
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need access to your photos to save the marketing banner.');
          setDownloading(false);
          return;
        }

        const filename = `walleto_marketing_${Date.now()}.jpg`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('Walleto Banners', asset, false);

        Alert.alert('Success 🎉', 'Marketing banner saved to your gallery!');
      }
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not save the image.');
    } finally {
      setDownloading(false);
    }
  };

  // 📢 SHARE POST
  const handleShare = async () => {
    try {
      if (!generatedText && !imageUrl) return;

      // No image — just share text
      if (!imageUrl) {
        await Share.share({ message: generatedText });
        return;
      }

      if (Platform.OS === 'web') {
        // Try Web Share API first
        if (navigator.share) {
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'marketing.jpg', { type: blob.type });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'Walleto Marketing',
                text: generatedText,
                files: [file]
              });
              return;
            }
          } catch (e) {
            console.log('Web share failed', e);
          }
        }
        
        // Fallback for Web — download image + copy text
        await Clipboard.setStringAsync(generatedText);
        window.alert('Text Copied! 📋\n\nThe marketing text is copied to your clipboard. Downloading the banner image now so you can share them both.');
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `walleto_marketing_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      // ─── Native (Android/iOS) ───
      // 1) Download image to cache
      const filename = `walleto_share_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      // 2) Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      if (!fileInfo.exists) {
        // Image download failed — fall back to text-only share
        await Share.share({ message: generatedText });
        return;
      }

      // 3) Copy text to clipboard
      await Clipboard.setStringAsync(generatedText);

      // 4) Open native share sheet with image
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        Alert.alert('Text Copied! 📋', 'Marketing text copied to clipboard. Now select where to share the banner image, then paste the text.');
        await Sharing.shareAsync(downloadResult.uri, {
          dialogTitle: 'Share Marketing Post',
          mimeType: 'image/jpeg',
          UTI: 'public.jpeg',
        });
      } else {
        // Sharing not available — share text only
        await Share.share({ message: generatedText });
      }
    } catch (err: any) {
      console.log('Share error:', err.message);
      // Last resort: share text only
      try {
        await Share.share({ message: generatedText });
      } catch (e) {
        Alert.alert('Share Failed', 'Could not share the post.');
      }
    }
  };

  // 💬 WHATSAPP SHARE
  const handleWhatsAppShare = async () => {
    try {
      if (!generatedText && !imageUrl) return;

      // No image — open WhatsApp directly with text
      if (!imageUrl) {
        if (Platform.OS === 'web') {
          window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(generatedText)}`, '_blank');
        } else {
          const waUrl = `whatsapp://send?text=${encodeURIComponent(generatedText)}`;
          const supported = await Linking.canOpenURL(waUrl);
          if (supported) {
            await Linking.openURL(waUrl);
          } else {
            await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(generatedText)}`);
          }
        }
        return;
      }

      // Has image — need to share via share sheet
      await Clipboard.setStringAsync(generatedText);

      if (Platform.OS === 'web') {
        // Web: download image + open WhatsApp Web
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `walleto_marketing_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(generatedText)}`, '_blank');
        return;
      }

      // ─── Native (Android/iOS) ───
      // 1) Download image to cache
      const filename = `walleto_wa_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      // 2) Verify file
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      if (!fileInfo.exists) {
        // Download failed — open WhatsApp with just text
        const waUrl = `whatsapp://send?text=${encodeURIComponent(generatedText)}`;
        const supported = await Linking.canOpenURL(waUrl);
        if (supported) {
          await Linking.openURL(waUrl);
        } else {
          await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(generatedText)}`);
        }
        return;
      }

      // 3) Open share sheet — user picks WhatsApp from the list
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        Alert.alert(
          'Text Copied! 📋',
          'Marketing text copied to clipboard!\n\n1. Select WhatsApp from the share menu\n2. Pick your contacts\n3. Paste the text in the message box'
        );
        await Sharing.shareAsync(downloadResult.uri, {
          dialogTitle: 'Share to WhatsApp',
          mimeType: 'image/jpeg',
          UTI: 'public.jpeg',
        });
      } else {
        // Sharing not available — just open WhatsApp with text
        const waUrl = `whatsapp://send?text=${encodeURIComponent(generatedText)}`;
        const supported = await Linking.canOpenURL(waUrl);
        if (supported) {
          await Linking.openURL(waUrl);
        } else {
          await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(generatedText)}`);
        }
      }
    } catch (err: any) {
      console.log('WA Share error:', err.message);
      // Last resort: try opening WhatsApp with text
      try {
        const waUrl = `whatsapp://send?text=${encodeURIComponent(generatedText)}`;
        await Linking.openURL(waUrl);
      } catch (e) {
        Alert.alert('Share Failed', 'Could not open WhatsApp. Make sure WhatsApp is installed.');
      }
    }
  };

  // 🔄 RETRY IMAGE LOAD
  const handleRetryImage = () => {
    if (!imageUrl) return;
    setImageError(false);
    setImageLoading(true);
    // Append a new seed to force a fresh image generation
    const separator = imageUrl.includes('?') ? '&' : '?';
    const newUrl = imageUrl.replace(/&seed=\d+/, '') + `&seed=${Math.floor(Math.random() * 100000)}`;
    setImageUrl(newUrl);
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
              {imageLoading && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="large" color="#16a34a" />
                  <Text style={[styles.imageLoadingText, { color: subText }]}>
                    Generating banner image...{'\n'}This may take 10-20 seconds
                  </Text>
                </View>
              )}

              {imageError ? (
                <View style={styles.imageErrorContainer}>
                  <Ionicons name="image-outline" size={48} color={subText} />
                  <Text style={[styles.imageErrorText, { color: subText }]}>
                    Image failed to load
                  </Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={handleRetryImage}>
                    <Ionicons name="refresh-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
              )}

              {!imageLoading && !imageError && (
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
              )}
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

          {imageUrl && !imageError && !imageLoading && (
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
    height: 280,
    backgroundColor: '#eee'
  },
  bannerImage: {
    width: '100%',
    height: '100%'
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,245,245,0.9)',
    zIndex: 10,
  },
  imageLoadingText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  imageErrorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,245,245,0.9)',
  },
  imageErrorText: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
