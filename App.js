import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

const GREEN = '#2F8067';
const DARK = '#173C32';
const BG = '#F3F7F2';
const MUTED = '#718078';
const USERS_KEY = '@lambungcare_session_v2';
const mealOptions = ['Sarapan', 'Makan siang', 'Makan malam', 'Camilan'];
const symptoms = ['Tidak ada', 'Heartburn', 'Mual', 'Kembung', 'Regurgitasi', 'Lainnya'];
const triggers = ['Pedas', 'Asam', 'Kopi/kafein', 'Berlemak', 'Cokelat', 'Mint', 'Lainnya'];
const tabItems = [
  ['Home', '⌂', 'Beranda'],
  ['Diary', '＋', 'Catatan'],
  ['Analysis', '◉', 'Analisis'],
  ['Guide', '♡', 'Panduan'],
  ['History', '▤', 'Riwayat'],
];

const storageKey = (email) =>
  `@lambungcare_entries_v2_${encodeURIComponent(email.trim().toLowerCase())}`;

// Kategori berikut hanya membantu mencocokkan kata pada nama makanan dengan kategori pemicu umum.
// Hasilnya adalah pengingat untuk diamati, bukan diagnosis atau kepastian penyebab gejala.
const foodCategoryRules = [
  { category: 'Pedas', keywords: ['pedas', 'sambal', 'cabai', 'cabe', 'lada', 'merica'], advice: 'Jika keluhan berulang setelah makanan pedas, coba kurangi porsinya atau jeda sementara, lalu amati respons tubuh.' },
  { category: 'Asam', keywords: ['asam', 'jeruk', 'lemon', 'limau', 'cuka', 'tomat'], advice: 'Jika keluhan berulang setelah makanan/minuman asam, coba kurangi atau jeda sementara jenis yang tercatat dan amati respons tubuh.' },
  { category: 'Kopi/kafein', keywords: ['kopi', 'espresso', 'americano', 'cappuccino', 'latte', 'teh', 'matcha', 'energi'], advice: 'Jika keluhan berulang setelah minuman berkafein, coba kurangi jumlahnya atau pilih opsi tanpa kafein untuk dibandingkan.' },
  { category: 'Berlemak', keywords: ['goreng', 'gorengan', 'santan', 'keju', 'mentega', 'burger', 'pizza', 'fast food', 'berlemak'], advice: 'Jika keluhan berulang setelah makanan berlemak, coba porsi lebih kecil atau pilih cara masak yang lebih ringan.' },
  { category: 'Cokelat', keywords: ['cokelat', 'chocolate', 'kakao'], advice: 'Jika keluhan berulang setelah cokelat, coba jeda sementara dan catat apakah keluhan berkurang.' },
  { category: 'Mint', keywords: ['mint', 'peppermint', 'permen mint'], advice: 'Jika keluhan berulang setelah produk mint, coba jeda sementara produk tersebut dan amati perubahan.' },
  { category: 'Minuman bersoda', keywords: ['soda', 'soft drink', 'cola', 'karbonasi'], advice: 'Jika keluhan berulang setelah minuman bersoda, coba kurangi atau jeda sementara dan amati respons tubuh.' },
];

function getFoodCategory(foodName) {
  const normalized = (foodName || '').toLowerCase();
  return foodCategoryRules.find(rule => rule.keywords.some(word => normalized.includes(word))) || null;
}

function getSymptomReminder(entry) {
  if (!entry || entry.symptom === 'Tidak ada') return '';
  const category = getFoodCategory(entry.food);
  const categoryText = category
    ? ` Nama makanan ini terdeteksi berkaitan dengan kategori ${category.category}.`
    : ' Nama makanan ini belum cocok dengan kategori pemicu yang dikenali aplikasi.';
  return `Kamu mencatat ${entry.symptom.toLowerCase()} setelah mengonsumsi ${entry.food}.${categoryText} Catat kembali jika hal serupa terjadi. Satu kejadian belum membuktikan makanan tersebut penyebabnya.`;
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}
function Chip({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}
function PrimaryButton({ label, onPress, secondary = false }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary]}>
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{label}</Text>
    </Pressable>
  );
}
function dateFmt(value) {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
function Empty({ text }) {
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyIcon}>🌱</Text>
      <Text style={styles.bold}>Belum ada data</Text>
      <Text style={styles.body}>{text}</Text>
    </Card>
  );
}
function EntryCard({ entry, onDelete }) {
  return (
    <Card>
      <View style={styles.entryTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.muted}>{entry.meal} · {dateFmt(entry.createdAt)}</Text>
          <Text style={styles.entryFood}>{entry.food}</Text>
        </View>
        <Pressable onPress={() => onDelete(entry.id)} hitSlop={10}>
          <Text style={styles.deleteText}>Hapus</Text>
        </Pressable>
      </View>
      <View style={styles.chipWrap}>
        <Text style={styles.pill}>Keluhan: {entry.symptom}</Text>
        {entry.symptom !== 'Tidak ada' && <Text style={styles.pill}>Tingkat: {entry.severity}</Text>}
      </View>
      <Text style={styles.body}>Dugaan pemicu: {entry.trigger || 'Belum dipilih'}</Text>
      {!!entry.notes && <Text style={styles.body}>Catatan: {entry.notes}</Text>}
    </Card>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [page, setPage] = useState('Home');
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [meal, setMeal] = useState('Sarapan');
  const [food, setFood] = useState('');
  const [symptom, setSymptom] = useState('Tidak ada');
  const [trigger, setTrigger] = useState('');
  const [severity, setSeverity] = useState('Ringan');
  const [notes, setNotes] = useState('');
  const [times, setTimes] = useState({
    Sarapan: '07:00', 'Makan siang': '12:00', 'Makan malam': '18:30', Camilan: '15:00'
  });

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(USERS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) {
            setSession(parsed);
            await loadEntries(parsed.email);
          }
        }
      } catch (error) {
        Alert.alert('Penyimpanan', 'Sesi sebelumnya tidak dapat dibaca. Silakan login kembali.');
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  async function loadEntries(userEmail) {
    setLoaded(false);
    try {
      const raw = await AsyncStorage.getItem(storageKey(userEmail));
      const parsed = raw ? JSON.parse(raw) : [];
      setEntries(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      setEntries([]);
      Alert.alert('Penyimpanan', 'Catatan tidak dapat dibaca dari perangkat.');
    } finally {
      setLoaded(true);
    }
  }

  async function login() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      Alert.alert('Data belum lengkap', 'Masukkan email dan password terlebih dahulu.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      Alert.alert('Format email', 'Masukkan alamat email dengan format yang benar, misalnya nama@email.com.');
      return;
    }
    const newSession = { email: cleanEmail };
    try {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(newSession));
      setSession(newSession);
      setPage('Home');
      setPassword('');
      await loadEntries(cleanEmail);
    } catch (error) {
      Alert.alert('Login gagal', 'Tidak dapat menyimpan sesi pada perangkat.');
    }
  }

  async function logout() {
    Alert.alert('Keluar dari akun?', 'Sesi login akan dihapus dari perangkat. Catatan lokal tetap tersimpan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive', onPress: async () => {
          try {
            await AsyncStorage.removeItem(USERS_KEY);
            setSession(null);
            setEntries([]);
            setEmail('');
            setPassword('');
            setPage('Home');
          } catch (error) {
            Alert.alert('Gagal keluar', 'Silakan coba lagi.');
          }
        }
      }
    ]);
  }

  async function persist(next) {
    if (!session?.email) return;
    try {
      await AsyncStorage.setItem(storageKey(session.email), JSON.stringify(next));
      setEntries(next);
    } catch (error) {
      Alert.alert('Gagal menyimpan', 'Periksa ruang penyimpanan perangkat.');
    }
  }

  function saveEntry() {
    if (!food.trim()) {
      Alert.alert('Makanan belum diisi', 'Masukkan nama makanan atau minuman.');
      return;
    }
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      meal, food: food.trim(), symptom, trigger: trigger || 'Belum dipilih',
      severity: symptom === 'Tidak ada' ? 'Tidak ada' : severity,
      notes: notes.trim(), createdAt: new Date().toISOString()
    };
    Keyboard.dismiss();
    persist([entry, ...entries]);
    setFood('');
    setSymptom('Tidak ada');
    setTrigger('');
    setSeverity('Ringan');
    setNotes('');
    setPage(entry.symptom === 'Tidak ada' ? 'History' : 'Analysis');
    if (entry.symptom !== 'Tidak ada') {
      Alert.alert('Pengingat LambungCare', `${getSymptomReminder(entry)}\n\nSaran: pantau gejala dan hindari menyimpulkan pemicu dari satu catatan saja.`);
    } else {
      Alert.alert('Tersimpan', 'Catatan makanan berhasil ditambahkan.');
    }
  }

  function deleteEntry(id) {
    Alert.alert('Hapus catatan?', 'Catatan ini akan dihapus dari perangkat.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => persist(entries.filter(item => item.id !== id)) }
    ]);
  }

  const todayEntries = useMemo(
    () => entries.filter(item => new Date(item.createdAt).toDateString() === new Date().toDateString()),
    [entries]
  );
  const symptomCount = todayEntries.filter(item => item.symptom !== 'Tidak ada').length;

  const foodAnalysis = useMemo(() => {
    const groups = {};
    entries.forEach(item => {
      const key = item.food.trim().toLowerCase();
      if (!key) return;
      if (!groups[key]) groups[key] = { food: item.food.trim(), count: 0, symptoms: {}, triggers: {} };
      groups[key].count += 1;
      if (item.symptom !== 'Tidak ada') {
        groups[key].symptoms[item.symptom] = (groups[key].symptoms[item.symptom] || 0) + 1;
      }
      if (item.trigger && item.trigger !== 'Belum dipilih') {
        groups[key].triggers[item.trigger] = (groups[key].triggers[item.trigger] || 0) + 1;
      }
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [entries]);

  // Pengingat personal: makanan ditandai untuk diamati bila pernah dicatat bersama gejala.
  // Status "pola berulang" baru muncul jika gejala tercatat minimal dua kali pada makanan yang sama.
  const foodAlerts = useMemo(() => foodAnalysis
    .map(item => {
      const symptomTotal = Object.values(item.symptoms).reduce((sum, count) => sum + count, 0);
      const category = getFoodCategory(item.food);
      return { ...item, symptomTotal, category, repeated: symptomTotal >= 2 };
    })
    .filter(item => item.symptomTotal > 0)
    .sort((a, b) => b.symptomTotal - a.symptomTotal), [foodAnalysis]);

  const avoidSuggestions = useMemo(() => {
    const suggestions = {};
    foodAlerts.forEach(item => {
      const selectedTriggers = Object.keys(item.triggers);
      const categoryName = selectedTriggers.length ? selectedTriggers[0] : item.category?.category;
      if (!categoryName) return;
      const rule = foodCategoryRules.find(candidate => candidate.category === categoryName);
      if (!suggestions[categoryName]) {
        suggestions[categoryName] = {
          category: categoryName,
          foods: [],
          count: 0,
          advice: rule?.advice || 'Amati kategori ini pada catatan berikutnya. Jika keluhan berulang, diskusikan dengan tenaga kesehatan.'
        };
      }
      suggestions[categoryName].foods.push(item.food);
      suggestions[categoryName].count += item.symptomTotal;
    });
    return Object.values(suggestions).sort((a, b) => b.count - a.count);
  }, [foodAlerts]);

  if (checkingSession) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.brand}>Lambung<Text style={{ color: GREEN }}>Care</Text></Text>
        <Text style={styles.body}>Menyiapkan aplikasi...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <KeyboardAvoidingView
        style={styles.loginScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <ExpoStatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.loginContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <View style={styles.loginIllustration}>
            <View style={styles.illustrationCircle}>
              <Text style={styles.illustrationEmoji}>🌿</Text>
              <Text style={styles.illustrationSmall}>♡</Text>
            </View>
          </View>
          <Text style={styles.overline}>HEALTH & LIFESTYLE COMPANION</Text>
          <Text style={styles.loginTitle}>Selamat datang di{'\n'}LambungCare</Text>
          <Text style={styles.loginSubtitle}>
            Catat makanan, kenali keluhan, dan bangun kebiasaan yang lebih nyaman untuk tubuhmu.
          </Text>
          <Card style={styles.loginCard}>
            <Text style={styles.loginCardTitle}>Masuk untuk melanjutkan</Text>
            <Label>EMAIL</Label>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nama@email.com"
              placeholderTextColor="#9AA59E"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              returnKeyType="next"
              blurOnSubmit={false}
            />
            <Label>PASSWORD</Label>
            <View style={styles.passwordWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan password"
                placeholderTextColor="#9AA59E"
                style={[styles.input, styles.passwordInput]}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={login}
              />
              <Pressable onPress={() => setShowPassword(value => !value)} style={styles.showPassword}>
                <Text style={styles.showPasswordText}>{showPassword ? 'Sembunyi' : 'Lihat'}</Text>
              </Pressable>
            </View>
            <PrimaryButton label="MASUK" onPress={login} />
            <Text style={styles.loginFootnote}>
              Demo lokal: email dan password apa pun yang tidak kosong dapat digunakan. Tidak ada akun server.
            </Text>
          </Card>
          <Text style={styles.disclaimer}>LambungCare bukan alat diagnosis atau pengganti konsultasi medis.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ExpoStatusBar style="dark" />

      {page === 'Home' && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="always">
          <View style={styles.header}>
            <View>
              <Text style={styles.overline}>HEALTH & LIFESTYLE</Text>
              <Text style={styles.brand}>Lambung<Text style={{ color: GREEN }}>Care</Text></Text>
              <Text style={styles.welcomeText}>Halo, {session.email}</Text>
            </View>
            <Pressable style={styles.profileButton} onPress={logout}>
              <Text style={styles.profileEmoji}>👤</Text>
              <Text style={styles.profileAction}>Keluar</Text>
            </Pressable>
          </View>

          <Card style={styles.hero}>
            <View style={styles.heroDecor}><Text style={styles.heroEmoji}>🩺</Text><Text style={styles.heroLeaf}>🌿</Text></View>
            <Text style={styles.tag}>DAILY WELLNESS</Text>
            <Text style={styles.heroTitle}>Rawat kebiasaan,{"\n"}dengarkan tubuhmu.</Text>
            <Text style={styles.heroDesc}>Catat makanan dan keluhan untuk membantu mengenali pola pribadimu.</Text>
            <PrimaryButton label="＋  CATAT MAKANAN" onPress={() => setPage('Diary')} />
          </Card>

          <Text style={styles.section}>Ringkasan hari ini</Text>
          <Text style={styles.subtitle}>Berdasarkan catatan yang kamu buat.</Text>
          <View style={styles.statRow}>
            <Card style={styles.statCard}><Text style={styles.statIcon}>🍽️</Text><Text style={styles.statNumber}>{todayEntries.length}</Text><Text style={styles.muted}>Catatan makan</Text></Card>
            <Card style={styles.statCard}><Text style={styles.statIcon}>♡</Text><Text style={styles.statNumber}>{symptomCount}</Text><Text style={styles.muted}>Catatan keluhan</Text></Card>
          </View>

          <Text style={styles.section}>Jadwal makan</Text>
          <Card>
            {mealOptions.map((item, index) => (
              <View key={item} style={styles.scheduleRow}>
                <Text style={styles.scheduleEmoji}>{['☀️', '🌤️', '🌙', '🍎'][index]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bold}>{item}</Text>
                  <Text style={styles.muted}>Jadwal pribadi</Text>
                </View>
                <TextInput
                  value={times[item]}
                  onChangeText={value => setTimes(old => ({ ...old, [item]: value }))}
                  style={styles.timeInput}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  placeholder="07:00"
                />
              </View>
            ))}
            <Text style={styles.note}>Jadwal dapat disesuaikan dengan rutinitas. Saat ini jadwal belum mengirim notifikasi otomatis.</Text>
          </Card>

          {foodAlerts.length > 0 && (
            <>
              <Text style={styles.section}>Pengingat makananmu</Text>
              <Card style={styles.reminderCard}>
                <Text style={styles.reminderTitle}>🔔 Ada catatan makanan yang perlu diperhatikan</Text>
                {foodAlerts.slice(0, 2).map(item => (
                  <View key={item.food.toLowerCase()} style={styles.reminderItem}>
                    <Text style={styles.bold}>{item.food}</Text>
                    <Text style={styles.body}>{item.symptomTotal} catatan keluhan · {item.repeated ? 'pola berulang tercatat' : 'baru tercatat sekali'}</Text>
                  </View>
                ))}
                <Text style={styles.note}>Ini pengingat berdasarkan diary kamu, bukan bukti bahwa makanan tersebut penyebab gejala.</Text>
                <PrimaryButton label="LIHAT REKOMENDASI" onPress={() => setPage('Analysis')} />
              </Card>
            </>
          )}

          <Text style={styles.section}>Tips hari ini</Text>
          <Card style={styles.tipCard}>
            <Text style={styles.bold}>🌿 Kenali pemicu pribadi</Text>
            <Text style={styles.body}>Pemicu keluhan bisa berbeda pada setiap orang. Catat makanan dan gejala untuk membantu melihat pola.</Text>
          </Card>
          <Text style={styles.section}>Catatan terbaru</Text>
          {entries.length ? entries.slice(0, 2).map(item => <EntryCard key={item.id} entry={item} onDelete={deleteEntry} />) :
            <Empty text="Belum ada catatan. Mulai catat makananmu hari ini." />}
        </ScrollView>
      )}

      {page === 'Diary' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            <Text style={styles.title}>Catatan makanan</Text>
            <Text style={styles.subtitle}>Catat makanan dan bagaimana perasaanmu setelahnya.</Text>
            <Card style={styles.formCard}>
              <Label>WAKTU MAKAN</Label>
              <View style={styles.chipWrap}>{mealOptions.map(item =>
                <Chip key={item} label={item} selected={meal === item} onPress={() => setMeal(item)} />
              )}</View>

              <Label>MAKANAN / MINUMAN *</Label>
              <TextInput
                value={food}
                onChangeText={setFood}
                placeholder="Contoh: nasi, ayam, air putih"
                placeholderTextColor="#9AA59E"
                style={styles.input}
                autoCapitalize="sentences"
                autoCorrect={false}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <Label>KELUHAN SETELAH MAKAN</Label>
              <View style={styles.chipWrap}>{symptoms.map(item =>
                <Chip key={item} label={item} selected={symptom === item} onPress={() => setSymptom(item)} />
              )}</View>

              {symptom !== 'Tidak ada' && <>
                <Label>TINGKAT KELUHAN</Label>
                <View style={styles.chipWrap}>{['Ringan', 'Sedang', 'Berat'].map(item =>
                  <Chip key={item} label={item} selected={severity === item} onPress={() => setSeverity(item)} />
                )}</View>
              </>}

              <Label>DUGAAN PEMICU (OPSIONAL)</Label>
              <View style={styles.chipWrap}>{triggers.map(item =>
                <Chip key={item} label={item} selected={trigger === item} onPress={() => setTrigger(old => old === item ? '' : item)} />
              )}</View>

              <Label>CATATAN TAMBAHAN</Label>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Misalnya: makan terburu-buru..."
                placeholderTextColor="#9AA59E"
                style={[styles.input, styles.notesInput]}
                multiline
                textAlignVertical="top"
                autoCorrect={false}
                blurOnSubmit={false}
              />
              <PrimaryButton label="SIMPAN CATATAN" onPress={saveEntry} />
            </Card>
            <Text style={styles.note}>Catatan disimpan secara lokal pada perangkat dan dipisahkan berdasarkan email login.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {page === 'Analysis' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Analisis makanan & gejala</Text>
          <Text style={styles.subtitle}>Lihat catatan makanan yang pernah kamu konsumsi dan keluhan yang kamu laporkan.</Text>
          <Card style={styles.analysisIntro}>
            <Text style={styles.analysisEmoji}>🔎</Text>
            <Text style={styles.bold}>Kenali pola tubuhmu</Text>
            <Text style={styles.body}>Analisis ini merangkum catatanmu. Hubungan yang terlihat bukan bukti bahwa makanan tertentu pasti menyebabkan gejala.</Text>
          </Card>
          <View style={styles.statRow}>
            <Card style={styles.statCard}><Text style={styles.statNumber}>{entries.length}</Text><Text style={styles.muted}>Total catatan</Text></Card>
            <Card style={styles.statCard}><Text style={styles.statNumber}>{entries.filter(item => item.symptom !== 'Tidak ada').length}</Text><Text style={styles.muted}>Catatan bergejala</Text></Card>
          </View>
          <Text style={styles.section}>Peringatan dari catatanmu</Text>
          {foodAlerts.length ? foodAlerts.map(item => (
            <Card key={`alert-${item.food.toLowerCase()}`} style={item.repeated ? styles.reminderCard : styles.analysisIntro}>
              <View style={styles.entryTop}>
                <Text style={styles.entryFood}>{item.food}</Text>
                <Text style={styles.pill}>{item.repeated ? 'Pola berulang' : 'Perlu diamati'}</Text>
              </View>
              <Text style={styles.body}>Gejala yang tercatat: {Object.entries(item.symptoms).map(([name, count]) => `${name} (${count}x)`).join(', ')}.</Text>
              {item.category ? <Text style={styles.body}>Kategori yang mungkin perlu diamati: {item.category.category}.</Text> : null}
              <Text style={styles.note}>{item.repeated ? 'Gejala tercatat lebih dari sekali setelah makanan ini. Pertimbangkan mengurangi atau jeda sementara makanan tersebut, lalu catat apakah keluhan berubah.' : 'Gejala baru tercatat satu kali. Amati dahulu dan catat jika terjadi lagi sebelum menyimpulkan.'}</Text>
            </Card>
          )) : <Empty text="Belum ada catatan makanan yang disertai keluhan. Jika kamu mencatat gejala setelah makan, pengingat akan muncul di sini." />}

          <Text style={styles.section}>Rekomendasi yang perlu diamati</Text>
          {avoidSuggestions.length ? avoidSuggestions.map(item => (
            <Card key={`suggest-${item.category}`} style={styles.suggestionCard}>
              <Text style={styles.suggestionHeading}>🌿 {item.category}</Text>
              <Text style={styles.body}>Terkait catatan: {Array.from(new Set(item.foods)).join(', ')}.</Text>
              <Text style={styles.body}>{item.advice}</Text>
            </Card>
          )) : <Card style={styles.suggestionCard}><Text style={styles.body}>Belum ada kategori yang dapat direkomendasikan. Isi kolom dugaan pemicu pada diary atau catat nama makanan dan gejala setelah mengonsumsinya.</Text></Card>}
          <Text style={styles.note}>Rekomendasi ini bersifat pengamatan pribadi, bukan daftar pantangan medis. Hindari makanan hanya jika memang berulang kali memicu keluhan pada dirimu; konsultasikan perubahan pola makan dengan tenaga kesehatan.</Text>

          <Text style={styles.section}>Makanan yang paling sering dicatat</Text>
          {foodAnalysis.length ? foodAnalysis.map(item => {
            const symptomList = Object.entries(item.symptoms).sort((a, b) => b[1] - a[1]);
            const triggerList = Object.entries(item.triggers).sort((a, b) => b[1] - a[1]);
            return (
              <Card key={item.food.toLowerCase()}>
                <View style={styles.entryTop}>
                  <Text style={styles.entryFood}>{item.food}</Text>
                  <Text style={styles.pill}>{item.count} kali dicatat</Text>
                </View>
                <Text style={styles.analysisLabel}>GEJALA YANG PERNAH DILAPORKAN</Text>
                {symptomList.length
                  ? symptomList.map(([name, count]) => <Text key={name} style={styles.body}>• {name}: {count} kali</Text>)
                  : <Text style={styles.body}>Belum ada keluhan yang dicatat setelah makanan ini.</Text>}
                {triggerList.length > 0 && <>
                  <Text style={styles.analysisLabel}>DUGAAN PEMICU YANG DIPILIH</Text>
                  {triggerList.map(([name, count]) => <Text key={name} style={styles.body}>• {name}: {count} kali</Text>)}
                </>}
              </Card>
            );
          }) : <Empty text="Belum cukup data untuk dianalisis. Tambahkan beberapa catatan makanan dan keluhan terlebih dahulu." />}
          <Card style={styles.tipCard}>
            <Text style={styles.bold}>🩺 Catatan kesehatan</Text>
            <Text style={styles.body}>Catat kapan gejala muncul, seberapa berat, dan berapa lama berlangsung. Konsultasikan keluhan yang sering muncul atau memburuk dengan tenaga kesehatan.</Text>
          </Card>
        </ScrollView>
      )}

      {page === 'Guide' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Panduan kebiasaan</Text>
          <Text style={styles.subtitle}>Informasi umum untuk membantu kebiasaan sehari-hari.</Text>
          <Card style={styles.warningCard}>
            <Text style={styles.bold}>Penting untuk diingat</Text>
            <Text style={styles.body}>Tidak ada daftar makanan yang wajib dihindari semua orang dengan GERD. Pemicu tiap orang berbeda.</Text>
          </Card>
          {[
            ['🍽️', 'Porsi dan waktu makan', 'Sebagian orang merasa lebih nyaman dengan porsi lebih kecil dan tidak makan terlalu dekat dengan waktu berbaring. Sesuaikan dengan arahan tenaga kesehatan.'],
            ['📝', 'Catat pemicu pribadi', 'Pemicu tidak sama pada semua orang. Gunakan diary untuk menemukan pola, bukan membuat pantangan universal.'],
            ['☕', 'Perhatikan makanan tertentu', 'Pedas, asam, berlemak, cokelat, mint, dan kafein dapat memicu keluhan pada sebagian orang. Amati respons tubuh.'],
            ['🛏️', 'Jarak makan dan berbaring', 'Jika gejala malam muncul, tanyakan kepada tenaga kesehatan tentang kebiasaan makan dan waktu berbaring yang sesuai.'],
            ['🩺', 'Kapan mencari bantuan', 'Keluhan sering atau memburuk perlu dikonsultasikan. Kesulitan menelan, muntah darah, atau nyeri dada berat perlu pertolongan medis segera.']
          ].map(([icon, title, description]) => (
            <Card key={title}>
              <Text style={styles.guideIcon}>{icon}</Text>
              <Text style={styles.bold}>{title}</Text>
              <Text style={styles.body}>{description}</Text>
            </Card>
          ))}
          <Text style={styles.note}>LambungCare bukan alat diagnosis atau pengganti konsultasi medis.</Text>
        </ScrollView>
      )}

      {page === 'History' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Riwayat catatan</Text>
          <Text style={styles.subtitle}>Catatan makanan dan keluhan yang tersimpan untuk {session.email}.</Text>
          {!loaded ? <Text style={styles.body}>Memuat...</Text> :
            entries.length ? entries.map(item => <EntryCard key={item.id} entry={item} onDelete={deleteEntry} />) :
              <Empty text="Riwayat masih kosong. Catatan yang disimpan akan tampil di sini." />}
          {entries.length > 0 && <PrimaryButton secondary label="HAPUS SEMUA CATATAN" onPress={() =>
            Alert.alert('Hapus semua?', 'Semua catatan untuk akun ini akan dihapus dari perangkat.', [
              { text: 'Batal', style: 'cancel' },
              { text: 'Hapus', style: 'destructive', onPress: () => persist([]) }
            ])
          } />}
        </ScrollView>
      )}

      <View style={styles.tabBar}>
        {tabItems.map(([id, icon, label]) => (
          <Pressable key={id} onPress={() => { Keyboard.dismiss(); setPage(id); }} style={styles.tabItem}>
            <Text style={[styles.tabIcon, page === id && styles.tabIconActive]}>{icon}</Text>
            <Text style={[styles.tabLabel, page === id && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  loadingScreen: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loginScreen: { flex: 1, backgroundColor: BG },
  loginContent: { padding: 22, paddingTop: 30, paddingBottom: 35, gap: 13, flexGrow: 1, justifyContent: 'center' },
  loginIllustration: { alignItems: 'center', marginBottom: 4 },
  illustrationCircle: { width: 142, height: 142, borderRadius: 71, backgroundColor: '#DDEFE4', alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: '#ECF5EE', elevation: 8, shadowColor: '#244C3B', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 7 } },
  illustrationEmoji: { fontSize: 62 },
  illustrationSmall: { position: 'absolute', right: 19, top: 19, color: GREEN, fontSize: 29, fontWeight: '900' },
  overline: { color: MUTED, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  brand: { color: DARK, fontSize: 29, fontWeight: '900' },
  welcomeText: { color: MUTED, fontSize: 10, marginTop: 2, maxWidth: 245 },
  loginTitle: { color: DARK, fontSize: 29, lineHeight: 35, fontWeight: '900' },
  loginSubtitle: { color: MUTED, fontSize: 12, lineHeight: 19 },
  loginCard: { padding: 19, gap: 12, marginTop: 5 },
  loginCardTitle: { color: DARK, fontWeight: '900', fontSize: 15, marginBottom: 2 },
  loginFootnote: { color: MUTED, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  disclaimer: { color: MUTED, fontSize: 10, textAlign: 'center', lineHeight: 15 },
  content: { padding: 17, paddingTop: 16, paddingBottom: 30, gap: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  profileButton: { backgroundColor: '#E2EFE7', width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  profileEmoji: { fontSize: 20 },
  profileAction: { color: GREEN, fontSize: 9, fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E6EDE6', gap: 10, elevation: 3, shadowColor: '#1C4938', shadowOpacity: 0.055, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  hero: { backgroundColor: '#E3F1E8', borderColor: '#D0E5D7', padding: 21, minHeight: 245, justifyContent: 'center', overflow: 'hidden', elevation: 5 },
  heroDecor: { position: 'absolute', right: 13, top: 8, width: 110, height: 105, borderRadius: 30, backgroundColor: '#D3E9DA', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
  heroEmoji: { fontSize: 55 },
  heroLeaf: { position: 'absolute', right: 4, bottom: 2, fontSize: 26 },
  tag: { color: GREEN, fontSize: 9, fontWeight: '900', letterSpacing: 1, backgroundColor: '#D0E6D8', alignSelf: 'flex-start', padding: 7, borderRadius: 20 },
  heroTitle: { color: DARK, fontSize: 27, lineHeight: 33, fontWeight: '900', maxWidth: '90%' },
  heroDesc: { color: '#587065', fontSize: 12, lineHeight: 18, maxWidth: '94%' },
  button: { backgroundColor: GREEN, padding: 15, borderRadius: 12, alignItems: 'center', elevation: 3, shadowColor: '#1D5946', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  buttonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  buttonSecondary: { backgroundColor: '#F9ECEA', elevation: 0, shadowOpacity: 0 },
  buttonSecondaryText: { color: '#A33F36' },
  section: { color: DARK, fontSize: 17, fontWeight: '900', marginTop: 5 },
  subtitle: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: -9 },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, minHeight: 105, justifyContent: 'center' },
  statIcon: { fontSize: 18 },
  statNumber: { color: DARK, fontSize: 26, fontWeight: '900' },
  muted: { color: MUTED, fontSize: 10 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#EDF0EC' },
  scheduleEmoji: { fontSize: 20 },
  bold: { color: DARK, fontSize: 13, fontWeight: '900' },
  timeInput: { backgroundColor: '#F2F6F2', color: DARK, width: 78, textAlign: 'center', borderRadius: 9, padding: 8, fontSize: 12, fontWeight: '800' },
  note: { color: '#89968D', fontSize: 10, lineHeight: 15 },
  body: { color: '#65736B', fontSize: 12, lineHeight: 19 },
  title: { color: DARK, fontSize: 27, fontWeight: '900' },
  label: { color: '#6B7D71', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 5 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#F2F5F0', borderWidth: 1, borderColor: '#E5EAE3' },
  chipSelected: { backgroundColor: '#E0EFE5', borderColor: GREEN },
  chipText: { color: '#6F7D73', fontSize: 10, fontWeight: '700' },
  chipTextSelected: { color: DARK },
  input: { borderWidth: 1, borderColor: '#DDE7DE', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 12, color: DARK, fontSize: 14, backgroundColor: '#FAFCFA', minHeight: 47 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 75 },
  showPassword: { position: 'absolute', right: 12, padding: 8 },
  showPasswordText: { color: GREEN, fontSize: 11, fontWeight: '800' },
  notesInput: { height: 82, textAlignVertical: 'top' },
  formCard: { padding: 16, gap: 11 },
  tipCard: { backgroundColor: '#EDF6EF', borderColor: '#D9EBDD' },
  warningCard: { backgroundColor: '#FFF5E8', borderColor: '#F2E4CC' },
  analysisIntro: { backgroundColor: '#EAF4EE' },
  reminderCard: { backgroundColor: '#FFF8EC', borderColor: '#F0DFC0' },
  reminderTitle: { color: '#80551F', fontSize: 13, fontWeight: '900' },
  reminderItem: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0E5D2' },
  suggestionCard: { backgroundColor: '#EFF7F0', borderColor: '#D8E9DA' },
  suggestionHeading: { color: DARK, fontSize: 14, fontWeight: '900' },
  analysisEmoji: { fontSize: 28 },
  analysisLabel: { color: GREEN, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryFood: { color: DARK, fontSize: 16, fontWeight: '900', flex: 1 },
  deleteText: { color: '#A34B40', fontWeight: '800', fontSize: 11 },
  pill: { backgroundColor: '#EEF4EE', color: GREEN, padding: 7, borderRadius: 8, fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  empty: { alignItems: 'center', padding: 25 },
  emptyIcon: { fontSize: 28 },
  guideIcon: { fontSize: 25 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E4EAE3', paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 20 : 9, elevation: 12 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  tabIcon: { color: '#9AA59D', fontSize: 21 },
  tabIconActive: { color: GREEN },
  tabLabel: { color: '#9AA59D', fontSize: 9, fontWeight: '700' },
  tabLabelActive: { color: GREEN, fontWeight: '900' },
});
