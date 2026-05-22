import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { generateMarketingPost } from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, StretchInY, Layout } from 'react-native-reanimated';

const FESTIVALS = [
  'Diwali 🪔', 'Eid 🌙', 'Christmas 🎄', 'Holi 🎨', 'New Year 🎉',
  'Independence Day 🇮🇳', 'Raksha Bandhan 🤝', 'Summer Special ☀️',
  'Winter Collection ❄️', 'None (General)'
];

export default function PostGenerator() {
  const { darkMode, t } = useContext(ThemeContext);

  const [businessDescription, setBusinessDescription] = useState('');
  const [selectedFestival, setSelectedFestival] = useState('');
  const [offer, setOffer] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleGenerate = async () => {
    if (!businessDescription.trim()) {
      Alert.alert('Required', 'Please enter a description of your business or product.');
      return;
    }
    setLoading(true); setGeneratedText(''); setImageUrl(''); setImageError(false); setImageLoading(false);
    try {
      const festivalValue = selectedFestival === 'None (General)' ? '' : selectedFestival;
      const res = await generateMarketingPost(businessDescription, festivalValue, offer);
      if (res.error) Alert.alert('Error', res.error);
      else {
        setGeneratedText(res.text);
        if (res.imageUrl) { setImageLoading(true); setImageError(false); setImageUrl(res.imageUrl); }
      }
    } catch (err: any) { Alert.alert('Generation Failed', err.message || 'An error occurred.'); }
    finally { setLoading(false); }
  };

  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    setDownloading(true);
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(imageUrl); const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl; link.download = `walleto_marketing_${Date.now()}.jpg`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(blobUrl);
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        if (status !== 'granted') { Alert.alert('Permission Denied', 'Need access to save banner.'); setDownloading(false); return; }
        const fileUri = `${FileSystem.documentDirectory}walleto_marketing_${Date.now()}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('Walleto Banners', asset, false);
        Alert.alert('Success 🎉', 'Banner saved to gallery!');
      }
    } catch (err: any) { Alert.alert('Download Failed', err.message); }
    finally { setDownloading(false); }
  };

  const handleShare = async () => {
    try {
      if (!generatedText && !imageUrl) return;
      if (!imageUrl) { await Clipboard.setStringAsync(generatedText); Alert.alert("Copied", "Text copied to clipboard!"); return; }
      await Clipboard.setStringAsync(generatedText);
      if (Platform.OS === 'web') {
        const response = await fetch(imageUrl); const blob = await response.blob(); const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = blobUrl; link.download = `walleto_marketing_${Date.now()}.jpg`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(blobUrl);
        window.alert('Text Copied! 📋\n\nImage downloading...'); return;
      }
      const fileUri = `${FileSystem.cacheDirectory}walleto_share_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      if (await Sharing.isAvailableAsync()) {
        Alert.alert('Text Copied! 📋', 'Marketing text copied to clipboard. Share the image now.');
        await Sharing.shareAsync(downloadResult.uri, { dialogTitle: 'Share Post' });
      } else { Alert.alert('Sharing not available', 'Text copied to clipboard.'); }
    } catch (err: any) { console.log('Share error:', err.message); }
  };

  const handleWhatsAppShare = async () => {
    try {
      if (!generatedText && !imageUrl) return;
      if (!imageUrl) {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(generatedText)}`;
        if (Platform.OS === 'web') window.open(waUrl, '_blank'); else await Linking.openURL(waUrl); return;
      }
      await Clipboard.setStringAsync(generatedText);
      if (Platform.OS === 'web') {
        const response = await fetch(imageUrl); const blob = await response.blob(); const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = blobUrl; link.download = `walleto_marketing_${Date.now()}.jpg`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(blobUrl);
        window.open(`https://wa.me/?text=${encodeURIComponent(generatedText)}`, '_blank'); return;
      }
      const fileUri = `${FileSystem.cacheDirectory}walleto_wa_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      if (await Sharing.isAvailableAsync()) {
        Alert.alert('Text Copied! 📋', '1. Select WhatsApp\n2. Pick contacts\n3. Paste text');
        await Sharing.shareAsync(downloadResult.uri, { dialogTitle: 'Share to WhatsApp' });
      } else { await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(generatedText)}`); }
    } catch (err: any) { console.log('WA Share error:', err.message); }
  };

  const handleRetryImage = () => {
    if (!imageUrl) return;
    setImageError(false); setImageLoading(true);
    const newUrl = imageUrl.replace(/&seed=\d+/, '') + `&seed=${Math.floor(Math.random() * 100000)}`;
    setImageUrl(newUrl);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        <Animated.View entering={FadeInDown.delay(50).springify()} style={st.header}>
          <Text style={[st.title, { color: t.text }]}>AI Studio</Text>
          <Text style={[st.subtitle, { color: t.subText }]}>Create stunning marketing posts and banners.</Text>
        </Animated.View>

        {/* Input Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={[st.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[st.inputLabel, { color: t.text }]}>Business / Product</Text>
          <TextInput
            style={[st.input, st.textArea, { backgroundColor: t.bg, borderColor: t.border, color: t.text }]}
            placeholder="e.g. Fresh organic mango peda..."
            placeholderTextColor={t.muted}
            multiline numberOfLines={3}
            value={businessDescription} onChangeText={setBusinessDescription}
          />

          <Text style={[st.inputLabel, { color: t.text }]}>Occasion</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {FESTIVALS.map(fest => {
              const isSelected = selectedFestival === fest;
              return (
                <TouchableOpacity key={fest} onPress={() => setSelectedFestival(fest)}
                  style={[st.pill, {
                    backgroundColor: isSelected ? t.accent : t.cardAlt,
                    borderColor: isSelected ? t.accent : t.border,
                  }]}>
                  <Text style={{ color: isSelected ? '#fff' : t.subText, fontWeight: isSelected ? '700' : '500', fontSize: 13 }}>{fest}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[st.inputLabel, { color: t.text }]}>Offer (Optional)</Text>
          <TextInput
            style={[st.input, { backgroundColor: t.bg, borderColor: t.border, color: t.text }]}
            placeholder="e.g. 20% off with code SALE20"
            placeholderTextColor={t.muted}
            value={offer} onChangeText={setOffer}
          />

          <TouchableOpacity style={[st.generateBtn, { opacity: loading ? 0.7 : 1 }]} onPress={handleGenerate} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                <Text style={st.generateBtnText}>Generating magic...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={st.generateBtnText}>Generate Post</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Loading */}
        {loading && (
          <Animated.View entering={StretchInY} style={st.loadingState}>
            <ActivityIndicator size="large" color={t.accent} />
            <Text style={[st.loadingStateText, { color: t.subText }]}>Crafting your perfect post...</Text>
          </Animated.View>
        )}

        {/* Results */}
        {!loading && (generatedText || imageUrl) && (
          <Animated.View entering={FadeInUp.springify()} style={[st.card, { backgroundColor: t.card, borderColor: t.border, marginTop: 16 }]}>
            <Text style={[st.resultTitle, { color: t.text }]}>Your Post</Text>

            {imageUrl && (
              <View style={st.imageContainer}>
                {imageLoading && (
                  <View style={st.imageOverlay}>
                    <ActivityIndicator size="large" color={t.accent} />
                    <Text style={{ color: '#fff', marginTop: 10, fontWeight: '600' }}>Generating banner...</Text>
                  </View>
                )}
                {imageError ? (
                  <View style={[st.imageOverlay, { backgroundColor: t.cardAlt }]}>
                    <Ionicons name="image-outline" size={40} color={t.muted} />
                    <Text style={{ color: t.subText, marginTop: 10, marginBottom: 16 }}>Image failed to load</Text>
                    <TouchableOpacity style={[st.retryBtn, { backgroundColor: t.accent }]} onPress={handleRetryImage}>
                      <Text style={st.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Image source={{ uri: imageUrl }} style={st.bannerImage} resizeMode="cover"
                    onLoad={() => setImageLoading(false)} onError={() => { setImageLoading(false); setImageError(true); }} />
                )}
                {!imageLoading && !imageError && (
                  <TouchableOpacity style={st.dlIconBtn} onPress={handleDownloadImage} disabled={downloading}>
                    {downloading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download" size={20} color="#fff" />}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {generatedText && (
              <View style={[st.textResult, { backgroundColor: t.bg, borderColor: t.border }]}>
                <Text style={[st.generatedText, { color: t.text }]}>{generatedText}</Text>
              </View>
            )}

            <View style={st.actionRow}>
              <TouchableOpacity style={[st.actionBtn, { borderWidth: 1.5, borderColor: t.accent }]} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color={t.accent} />
                <Text style={[st.actionBtnText, { color: t.accent }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtn, { backgroundColor: t.primary }]} onPress={handleWhatsAppShare}>
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={[st.actionBtnText, { color: '#fff' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  card: { padding: 20, borderRadius: 20, borderWidth: 1 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, marginRight: 8, borderWidth: 1 },
  generateBtn: {
    backgroundColor: '#6366F1', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loadingState: { padding: 40, alignItems: 'center', marginTop: 20 },
  loadingStateText: { marginTop: 16, fontSize: 14, fontWeight: '500' },
  resultTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  imageContainer: { height: 280, borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#0F172A', position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  dlIconBtn: { position: 'absolute', bottom: 12, right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  textResult: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  generatedText: { fontSize: 14, lineHeight: 22 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12 },
  actionBtnText: { fontWeight: '700', fontSize: 14, marginLeft: 8 },
});
