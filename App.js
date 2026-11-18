import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

const GREEN = '#2F8067';
const DARK = '#173C32';
const BG = '#F3F7F2';
const MUTED = '#718078';
const USERS_KEY = '@lambungcare_session_v2';
const complaintsStorageKey = (email) =>
  `@lambungcare_complaints_v1_${encodeURIComponent(email.trim().toLowerCase())}`;
const reminderStorageKey = (email) =>
  `@lambungcare_reminders_v1_${encodeURIComponent(email.trim().toLowerCase())}`;
const mealOptions = ['Sarapan', 'Makan siang', 'Makan malam', 'Camilan'];
const symptoms = ['Tidak ada', 'Heartburn', 'Mual', 'Kembung', 'Regurgitasi', 'Lainnya'];
const triggers = ['Pedas', 'Asam', 'Kopi/kafein', 'Berlemak', 'Cokelat', 'Mint', 'Lainnya'];
const tabItems = [
  ['Home', '⌂', 'Beranda'],
  ['Diary', '＋', 'Catatan'],
  ['Analysis', '◉', 'Keluhan'],
  ['Warnings', '⚠', 'Peringatan'],
  ['History', '▤', 'Riwayat makan'],
];

const storageKey = (email) =>
  `@lambungcare_entries_v2_${encodeURIComponent(email.trim().toLowerCase())}`;
const warningsStorageKey = (email) =>
  `@lambungcare_warnings_v2_${encodeURIComponent(email.trim().toLowerCase())}`;
const MAX_WARNINGS = 100;
const ANDROID_REMINDER_CHANNEL_ID = 'lambungcare-reminders-v1';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

async function ensureAndroidReminderChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_REMINDER_CHANNEL_ID, {
    name: 'Pengingat LambungCare',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: GREEN,
  });
}

// Panduan sarapan: dirangkum dari sumber kesehatan pada daftar expertSources di bawah.
const breakfastGuide = {
  eat: [
    { text: 'Oatmeal, roti gandum, atau nasi merah (karbohidrat kompleks tinggi serat).', source: 'HelloSehat' },
    { text: 'Buah yang manis dan tidak asam seperti pisang, pepaya, apel manis, melon, atau semangka.', source: 'Alodokter' },
    { text: 'Susu rendah lemak (skim atau 1%) atau susu nabati seperti almond, oat, atau kedelai.', source: 'UPMC' },
    { text: 'Teh herbal tanpa kafein dan tanpa mint sebagai pengganti kopi.', source: 'UPMC' },
    { text: 'Sayuran yang direbus atau dikukus, bukan digoreng atau bersantan kental.', source: 'UPMC' },
  ],
  avoid: [
    { text: 'Gorengan, makanan berlemak tinggi, dan makanan cepat saji.', source: 'NIDDK, Alodokter' },
    { text: 'Makanan pedas seperti sambal atau bubuk cabai.', source: 'NIDDK, Alodokter' },
    { text: 'Kopi dan minuman berkafein lain, serta cokelat.', source: 'NIDDK, Halodoc' },
    { text: 'Makanan atau minuman asam seperti jeruk, jus jeruk, tomat, dan saus tomat.', source: 'NIDDK, Alodokter' },
    { text: 'Produk mint/peppermint dan minuman bersoda.', source: 'NIDDK, Alodokter' },
    { text: 'Makanan atau minuman yang sangat panas atau sangat dingin.', source: 'UPMC' },
  ],
  habits: [
    'Makan dalam porsi sedang dan pelan-pelan; porsi besar dan terburu-buru dapat menaikkan tekanan di lambung (Alodokter).',
    'Jika gejala muncul saat berbaring, beri jarak makan dan berbaring minimal 3 jam (NIDDK).',
    'Tetap tegak setelah makan dan hindari pakaian yang terlalu ketat (Healthline).',
    'Pemicu tiap orang berbeda: gunakan diary LambungCare untuk menemukan pemicu pribadimu (Mayo Clinic, Harvard Health).',
  ],
};

// Setiap tautan berasal dari hasil pencarian web dan dapat dibuka langsung.
const expertSources = [
  { name: 'NIDDK (NIH, Amerika Serikat) - Eating, Diet, & Nutrition for GER & GERD', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/eating-diet-nutrition' },
  { name: 'Harvard Health Publishing - GERD diet: Foods to avoid to reduce acid reflux', url: 'https://www.health.harvard.edu/diseases-and-conditions/gerd-diet-foods-to-avoid-to-reduce-acid-reflux' },
  { name: 'Mayo Clinic - Q&A: Restrictive diet usually not necessary to control GERD', url: 'https://newsnetwork.mayoclinic.org/discussion/mayo-clinic-q-and-a-restrictive-diet-usually-not-necessary-to-control-symptoms-of-gerd/' },
  { name: 'Alodokter - Pola makan bagi penderita GERD', url: 'https://www.alodokter.com/pola-makan-bagi-penderita-gerd-yang-penting-diketahui' },
  { name: 'Alodokter - 8 pantangan GERD', url: 'https://www.alodokter.com/8-pantangan-gerd-yang-perlu-dihindari-agar-asam-lambung-membaik' },
  { name: 'Alodokter - 6 buah pantangan asam lambung', url: 'https://www.alodokter.com/6-buah-pantangan-asam-lambung-yang-sebaiknya-dihindari' },
  { name: 'Halodoc - Berbagai pantangan untuk pengidap GERD', url: 'https://www.halodoc.com/artikel/inilah-berbagai-pantangan-untuk-pengidap-gerd' },
  { name: 'HelloSehat - Diet untuk penderita GERD', url: 'https://hellosehat.com/pencernaan/gerd/diet-untuk-penderita-gerd/' },
  { name: 'UPMC HealthBeat - GERD diet', url: 'https://www.upmc.com/healthbeat/nutrition/gerd-diet-acid-reflux' },
  { name: 'About GERD (IFFGD) - Diet changes for GERD', url: 'https://aboutgerd.org/diet-lifestyle-changes/diet-changes-for-gerd.html' },
];

function monthKeyOf(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

function getEntryFoods(entry) {
  if (Array.isArray(entry.foods) && entry.foods.length) return entry.foods;
  return entry.food ? [entry.food] : [];
}

function parseTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

// Ringkasan konsumsi berdasarkan diary bulan berjalan. Angka ini hanya statistik pribadi,
// bukan batas medis atau rekomendasi jumlah konsumsi.
function computeFoodStatus(list, foodName, now = new Date(), complaintList = []) {
  const key = (foodName || '').trim().toLowerCase();
  if (!key) return null;
  const same = list.filter(item => getEntryFoods(item).some(food => food.trim().toLowerCase() === key));
  if (!same.length) return null;
  const symptomTotal = complaintList.filter(item => {
    const source = list.find(entry => entry.id === item.mealId);
    return source && getEntryFoods(source).some(food => food.trim().toLowerCase() === key);
  }).length;
  const currentMonth = monthKeyOf(now);
  const consumedThisMonth = same.filter(item => monthKeyOf(item.createdAt) === currentMonth).length;
  return {
    food: getEntryFoods(same[0]).find(food => food.trim().toLowerCase() === key).trim(),
    symptomTotal,
    consumedThisMonth,
    level: symptomTotal >= 2 ? 'repeat' : 'observe',
    label: symptomTotal >= 2 ? 'Keluhan berulang' : 'Perlu diamati',
  };
}

function statusSentence(status) {
  if (!status) return '';
  return `${status.food} sudah tercatat ${status.consumedThisMonth} kali bulan ini. ` +
    (status.symptomTotal
      ? `Keluhan juga pernah tercatat ${status.symptomTotal} kali setelah mengonsumsinya. Amati polanya dan sesuaikan dengan respons tubuhmu.`
      : 'Belum ada keluhan yang tercatat setelah makanan ini.');
}

// Draf pengingat disimpan saat pengguna mencatat keluhan setelah makan.
function buildWarningDraft(status) {
  if (!status) return '';
  return `PENGINGAT: ${status.food} tercatat bersama keluhan sebanyak ${status.symptomTotal} kali. ` +
    `Makanan ini sudah dicatat ${status.consumedThisMonth} kali pada bulan ini. ` +
    `${status.symptomTotal >= 2
      ? 'Keluhan tercatat berulang. Pertimbangkan mengurangi atau jeda sementara, lalu diskusikan dengan tenaga kesehatan bila keluhan berlanjut.'
      : 'Satu kejadian belum membuktikan makanan ini penyebab keluhan. Amati dan catat kembali bila terjadi.'} ` +
    'Pengingat ini berdasarkan diary pribadi, bukan diagnosis atau batas konsumsi medis.';
}

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
        {getEntryFoods(entry).map((item, index) => <Text key={`${item}-${index}`} style={styles.pill}>{item}</Text>)}
        {!!entry.portion && <Text style={styles.pill}>Porsi: {entry.portion}</Text>}
      </View>
      {!!entry.notes && <Text style={styles.body}>Catatan: {entry.notes}</Text>}
    </Card>
  );
}

function SourceLink({ name, url }) {
  async function openLink() {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Tautan tidak dapat dibuka', url);
    }
  }
  return (
    <Pressable onPress={openLink} style={styles.sourceRow}>
      <Text style={styles.sourceName}>{name}</Text>
      <Text style={styles.sourceUrl}>{url}</Text>
    </Pressable>
  );
}
function StatusBadgeText(level) {
  if (level === 'repeat' || level === 'stop' || level === 'limit') return 'Perlu diperhatikan';
  return 'Perlu diamati';
}

export default function App() {
  const openingReminderShown = useRef(false);
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [page, setPage] = useState('Home');
  const [entries, setEntries] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [warnings, setWarnings] = useState([]);

  const [meal, setMeal] = useState('Sarapan');
  const [foods, setFoods] = useState(['']);
  const [portion, setPortion] = useState('Sedang');
  const [notes, setNotes] = useState('');
  const [times, setTimes] = useState({
    Sarapan: '07:00', 'Makan siang': '12:00', 'Makan malam': '18:30', Camilan: '15:00'
  });
  const [bedtime, setBedtime] = useState('22:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [complaintMealId, setComplaintMealId] = useState('');
  const [complaintSymptom, setComplaintSymptom] = useState('Heartburn');
  const [complaintSeverity, setComplaintSeverity] = useState('Ringan');
  const [complaintTrigger, setComplaintTrigger] = useState('');
  const [complaintNotes, setComplaintNotes] = useState('');

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

  // Memuat riwayat peringatan setiap kali akun berubah (login, sesi tersimpan, atau keluar).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.email) {
        setWarnings([]);
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(warningsStorageKey(session.email));
        const parsed = raw ? JSON.parse(raw) : [];
        if (!cancelled) setWarnings(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        if (!cancelled) setWarnings([]);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.email]);

  useEffect(() => {
    if (!session?.email || !notificationsEnabled || Platform.OS === 'web' || openingReminderShown.current) return;
    openingReminderShown.current = true;
    (async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (!permission.granted) return;
        await ensureAndroidReminderChannel();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Pengingat LambungCare',
            body: 'Jangan lupa cek jadwal makan dan minum hari ini. Makan perlahan dan ikuti pengingat waktu tidurmu.',
            data: { kind: 'opening-reminder' },
            priority: Notifications.AndroidNotificationPriority.MAX,
            sound: 'default',
          },
          trigger: Platform.OS === 'android'
            ? { channelId: ANDROID_REMINDER_CHANNEL_ID }
            : null,
        });
      } catch (error) {
        Alert.alert('Notifikasi', 'Pengingat saat membuka aplikasi tidak dapat ditampilkan. Periksa izin notifikasi.');
      }
    })();
  }, [session?.email, notificationsEnabled]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.email) {
        setComplaints([]);
        setNotificationsEnabled(false);
        return;
      }
      try {
        const [raw, savedReminderSettings, scheduled] = await Promise.all([
          AsyncStorage.getItem(complaintsStorageKey(session.email)),
          AsyncStorage.getItem(reminderStorageKey(session.email)),
          Platform.OS === 'web' ? Promise.resolve([]) : Notifications.getAllScheduledNotificationsAsync(),
        ]);
        const parsed = raw ? JSON.parse(raw) : [];
        const reminderSettings = savedReminderSettings ? JSON.parse(savedReminderSettings) : null;
        if (!cancelled) {
          setComplaints(Array.isArray(parsed) ? parsed : []);
          if (reminderSettings?.times && typeof reminderSettings.times === 'object') setTimes(reminderSettings.times);
          if (typeof reminderSettings?.bedtime === 'string') setBedtime(reminderSettings.bedtime);
          setNotificationsEnabled(scheduled.some(item => item.content.data?.kind === 'daily-reminder'));
        }
      } catch (error) {
        if (!cancelled) {
          setComplaints([]);
          Alert.alert('Pengingat', 'Pengaturan pengingat atau catatan keluhan tidak dapat dibaca.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [session?.email]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    function openComplaint(response) {
      const data = response.notification.request.content.data;
      if (data?.kind !== 'meal-followup') return;
      const mealId = data.mealId;
      if (typeof mealId === 'string') setComplaintMealId(mealId);
      setPage('Analysis');
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(openComplaint);
    (async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          openComplaint(response);
          await Notifications.clearLastNotificationResponseAsync();
        }
      } catch (error) {
        Alert.alert('Notifikasi', 'Pengingat terakhir tidak dapat dibuka.');
      }
    })();
    return () => subscription.remove();
  }, []);

  async function persistWarnings(next) {
    if (!session?.email) return;
    const trimmed = next.slice(0, MAX_WARNINGS);
    try {
      await AsyncStorage.setItem(warningsStorageKey(session.email), JSON.stringify(trimmed));
      setWarnings(trimmed);
    } catch (error) {
      Alert.alert('Gagal menyimpan peringatan', 'Periksa ruang penyimpanan perangkat.');
    }
  }

  async function persistComplaints(next) {
    if (!session?.email) return false;
    try {
      await AsyncStorage.setItem(complaintsStorageKey(session.email), JSON.stringify(next));
      setComplaints(next);
      return true;
    } catch (error) {
      Alert.alert('Gagal menyimpan keluhan', 'Periksa ruang penyimpanan perangkat.');
      return false;
    }
  }

  async function activateReminders() {
    if (Platform.OS === 'web') {
      Alert.alert('Notifikasi tidak tersedia', 'Pengingat terjadwal tersedia pada aplikasi Android dan iOS.');
      return;
    }
    const parsedMeals = mealOptions.map(item => ({ meal: item, time: parseTime(times[item]) }));
    const sleepTime = parseTime(bedtime);
    if (parsedMeals.some(item => !item.time) || !sleepTime) {
      Alert.alert('Format waktu tidak valid', 'Gunakan format 24 jam HH:MM, misalnya 07:00.');
      return;
    }
    try {
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin notifikasi diperlukan', 'Izinkan notifikasi pada pengaturan perangkat untuk menerima pengingat.');
        return;
      }
      await ensureAndroidReminderChannel();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(scheduled
        .filter(item => item.content.data?.kind === 'daily-reminder')
        .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
      for (const item of parsedMeals) {
        // Pengingat utama sesuai jadwal makan yang dipilih pengguna.
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Waktu ${item.meal.toLowerCase()}`,
            body: 'Sudah waktunya makan. Jika belum makan, usahakan jangan melewatkan jadwal; makan dengan porsi nyaman dan perlahan.',
            data: { kind: 'daily-reminder', category: 'meal' },
            priority: Notifications.AndroidNotificationPriority.MAX,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            channelId: ANDROID_REMINDER_CHANNEL_ID,
            hour: item.time.hour,
            minute: item.time.minute,
          },
        });

        // Pengingat susulan 30 menit kemudian untuk jadwal yang tertunda.
        const delayedMinutes = (item.time.hour * 60 + item.time.minute + 30) % 1440;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Pengingat: ${item.meal.toLowerCase()} tertunda`,
            body: 'Jika kamu belum makan, cek kembali jadwalmu dan makanlah saat memungkinkan. Aplikasi tidak dapat mengetahui otomatis apakah kamu sudah makan.',
            data: { kind: 'daily-reminder', category: 'meal-delay' },
            priority: Notifications.AndroidNotificationPriority.MAX,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            channelId: ANDROID_REMINDER_CHANNEL_ID,
            hour: Math.floor(delayedMinutes / 60),
            minute: delayedMinutes % 60,
          },
        });
      }
      for (const time of ['09:00', '13:00', '17:00']) {
        const waterTime = parseTime(time);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Pengingat minum',
            body: 'Cek apakah kamu sudah minum hari ini. Jika belum, minumlah sesuai kebutuhan tubuh dan arahan tenaga kesehatan.',
            data: { kind: 'daily-reminder', category: 'water' },
            priority: Notifications.AndroidNotificationPriority.MAX,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            channelId: ANDROID_REMINDER_CHANNEL_ID,
            hour: waterTime.hour,
            minute: waterTime.minute,
          },
        });
      }

      const sleepReminderMinutes = (sleepTime.hour * 60 + sleepTime.minute - 120 + 1440) % 1440;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Persiapan waktu tidur',
          body: 'Sekitar 2 jam menuju waktu tidur pilihanmu. Hindari makan lalu langsung berbaring; ikuti saran tenaga kesehatan tentang jarak makan dan tidur.',
          data: { kind: 'daily-reminder', category: 'bedtime' },
          priority: Notifications.AndroidNotificationPriority.MAX,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          channelId: ANDROID_REMINDER_CHANNEL_ID,
          hour: Math.floor(sleepReminderMinutes / 60),
          minute: sleepReminderMinutes % 60,
        },
      });
      setNotificationsEnabled(true);
      try {
        await AsyncStorage.setItem(reminderStorageKey(session.email), JSON.stringify({ times, bedtime }));
      } catch (error) {
        Alert.alert('Pengingat aktif', 'Notifikasi sudah dijadwalkan, tetapi waktu pilihan tidak dapat disimpan untuk sesi berikutnya.');
        return;
      }
      Alert.alert(
        'Pengingat aktif',
        'Pengingat akan muncul berurutan: pada setiap jadwal makan, 30 menit setelah jadwal makan, tiga kali untuk minum, dan 2 jam sebelum waktu tidur.'
      );
    } catch (error) {
      Alert.alert('Gagal mengatur pengingat', 'Periksa izin notifikasi dan coba lagi.');
    }
  }

  async function disableReminders() {
    if (Platform.OS === 'web') return;
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(scheduled
        .filter(item => ['daily-reminder', 'meal-followup'].includes(item.content.data?.kind))
        .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
      setNotificationsEnabled(false);
      Alert.alert('Pengingat dimatikan', 'Semua pengingat LambungCare yang terjadwal telah dibatalkan.');
    } catch (error) {
      Alert.alert('Gagal mematikan pengingat', 'Coba lagi beberapa saat.');
    }
  }

  async function scheduleMealFollowUp(entry) {
    if (!notificationsEnabled || Platform.OS === 'web') return;
    try {
      const granted = await Notifications.getPermissionsAsync();
      if (!granted.granted) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Bagaimana kondisi lambungmu?',
          body: `Sudah sekitar 2 jam sejak kamu mencatat ${entry.food}. Ketuk untuk mencatat keluhan, jika ada.`,
          data: { kind: 'meal-followup', mealId: entry.id },
          priority: Notifications.AndroidNotificationPriority.MAX,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          channelId: ANDROID_REMINDER_CHANNEL_ID,
          date: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      Alert.alert('Pengingat tindak lanjut gagal', 'Catatan tersimpan, tetapi pengingat 2 jam tidak dapat dijadwalkan.');
    }
  }

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
    const foodList = foods.map(item => item.trim()).filter(Boolean);
    if (!foodList.length) {
      Alert.alert('Makanan belum diisi', 'Masukkan nama makanan atau minuman.');
      return;
    }
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      meal, food: foodList.join(', '), foods: foodList, portion,
      notes: notes.trim(), createdAt: new Date().toISOString()
    };
    Keyboard.dismiss();
    persist([entry, ...entries]);
    setComplaintMealId(entry.id);
    scheduleMealFollowUp(entry);
    setFoods(['']);
    setPortion('Sedang');
    setNotes('');
    setPage('History');
    Alert.alert('Tersimpan', 'Catatan makanan berhasil ditambahkan. Catat keluhan dan dugaan pemicu di fitur Keluhan.');
  }

  async function saveComplaint() {
    const selectedMeal = entries.find(item => item.id === complaintMealId);
    if (!selectedMeal) {
      Alert.alert('Pilih catatan makan', 'Pilih makanan yang ingin dikaitkan dengan keluhan ini.');
      return;
    }
    if (complaintSymptom === 'Tidak ada') {
      Alert.alert('Pilih keluhan', 'Pilih keluhan yang kamu rasakan, atau tutup form jika tidak ada keluhan.');
      return;
    }
    const complaint = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mealId: selectedMeal.id,
      food: selectedMeal.food,
      meal: selectedMeal.meal,
      portion: selectedMeal.portion || 'Tidak tercatat',
      symptom: complaintSymptom,
      severity: complaintSeverity,
      trigger: complaintTrigger,
      notes: complaintNotes.trim(),
      createdAt: new Date().toISOString(),
    };
    const saved = await persistComplaints([complaint, ...complaints]);
    if (saved) {
      setComplaintNotes('');
      setComplaintTrigger('');
      const firstFood = getEntryFoods(selectedMeal)[0];
      const status = computeFoodStatus(
        entries,
        firstFood,
        new Date(),
        [complaint, ...complaintHistory]
      );
      if (status && status.symptomTotal >= 2) {
        const warning = {
          id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          food: status.food,
          kind: 'gejala',
          level: 'repeat',
          message: buildWarningDraft(status),
          createdAt: new Date().toISOString(),
        };
        persistWarnings([warning, ...warnings]);
        Alert.alert('Pola keluhan berulang', `${warning.message}\n\nJika gejala berat atau menetap, hubungi tenaga kesehatan.`);
      } else {
        Alert.alert('Keluhan tersimpan', 'Keluhan dicatat terpisah dari riwayat makanan.');
      }
    }
  }

  function clearWarnings() {
    Alert.alert('Hapus riwayat peringatan?', 'Semua riwayat peringatan untuk akun ini akan dihapus dari perangkat. Catatan makanan tidak ikut terhapus.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => persistWarnings([]) }
    ]);
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

  const complaintHistory = useMemo(() => {
    const savedMealIds = new Set(
      complaints.filter(item => item.id === `c-${item.mealId}`).map(item => item.mealId)
    );
    const legacy = entries
      .filter(item => item.symptom && item.symptom !== 'Tidak ada' && !savedMealIds.has(item.id))
      .map(item => ({
        id: `legacy-${item.id}`,
        mealId: item.id,
        food: item.food,
        meal: item.meal,
        portion: item.portion || 'Tidak tercatat',
        symptom: item.symptom,
        severity: item.severity || 'Tidak tercatat',
        notes: item.notes || '',
        createdAt: item.createdAt,
      }));
    return [...complaints, ...legacy].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [complaints, entries]);
  const symptomCount = complaintHistory.filter(
    item => new Date(item.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const foodAnalysis = useMemo(() => {
    const groups = {};
    entries.forEach(item => {
      getEntryFoods(item).forEach(foodName => {
        const key = foodName.trim().toLowerCase();
        if (!key) return;
        if (!groups[key]) groups[key] = { food: foodName.trim(), count: 0, symptoms: {}, triggers: {} };
        groups[key].count += 1;
        if (item.trigger && item.trigger !== 'Belum dipilih') {
          groups[key].triggers[item.trigger] = (groups[key].triggers[item.trigger] || 0) + 1;
        }
      });
    });
    complaintHistory.forEach(complaint => {
      const sourceEntry = entries.find(item => item.id === complaint.mealId);
      const foodNames = sourceEntry ? getEntryFoods(sourceEntry) : [complaint.food];
      foodNames.forEach(foodName => {
        const key = (foodName || '').trim().toLowerCase();
        if (!key) return;
        if (!groups[key]) groups[key] = { food: foodName.trim(), count: 0, symptoms: {}, triggers: {} };
        groups[key].symptoms[complaint.symptom] = (groups[key].symptoms[complaint.symptom] || 0) + 1;
        if (complaint.trigger) {
          groups[key].triggers[complaint.trigger] = (groups[key].triggers[complaint.trigger] || 0) + 1;
        }
      });
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [entries, complaintHistory]);

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

  // Statistik jumlah konsumsi setiap makanan pada bulan berjalan.
  const monthlyStatuses = useMemo(() => {
    const currentMonth = monthKeyOf(new Date());
    const groups = {};
    entries.forEach(item => {
      if (monthKeyOf(item.createdAt) !== currentMonth) return;
      getEntryFoods(item).forEach(foodName => {
        const key = foodName.trim().toLowerCase();
        if (!key) return;
        if (!groups[key]) groups[key] = { food: foodName.trim(), consumedThisMonth: 0, symptomTotal: 0 };
        groups[key].consumedThisMonth += 1;
      });
    });
    complaintHistory.forEach(complaint => {
      if (monthKeyOf(complaint.createdAt) !== currentMonth) return;
      const sourceEntry = entries.find(item => item.id === complaint.mealId);
      (sourceEntry ? getEntryFoods(sourceEntry) : [complaint.food]).forEach(foodName => {
        const key = (foodName || '').trim().toLowerCase();
        if (key && groups[key]) groups[key].symptomTotal += 1;
      });
    });
    return Object.values(groups).sort((a, b) => b.consumedThisMonth - a.consumedThisMonth);
  }, [entries, complaintHistory]);

  const warningHistory = useMemo(() => [
    ...warnings.map(item => ({ ...item, recordType: 'warning' })),
    ...entries.map(item => ({
      id: `meal-${item.id}`,
      recordType: 'meal',
      meal: item.meal,
      food: item.food,
      portion: item.portion,
      notes: item.notes,
      createdAt: item.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [warnings, entries]);

  // Peringatan langsung saat pengguna mengetik makanan yang sudah pernah memicu keluhan.
  const liveStatus = useMemo(
    () => (foods[0]?.trim() ? computeFoodStatus(entries, foods[0], new Date(), complaintHistory) : null),
    [foods, entries, complaintHistory]
  );
  const currentMonthLabel = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  const monthlyFoodCount = monthlyStatuses.length;

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
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleEmoji}>🛏️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.bold}>Waktu tidur</Text>
                <Text style={styles.muted}>Pengingat 2 jam sebelumnya</Text>
              </View>
              <TextInput
                value={bedtime}
                onChangeText={setBedtime}
                style={styles.timeInput}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                placeholder="22:00"
              />
            </View>
            <Text style={styles.note}>Pengingat minum muncul pukul 09.00, 13.00, dan 17.00. Setiap jadwal makan memiliki pengingat utama dan pengingat susulan 30 menit kemudian jika jadwal tertunda. Aplikasi tidak dapat mendeteksi otomatis apakah kamu sudah makan atau minum.</Text>
            <Text style={styles.note}>Pengingat makan perlahan muncul pada jadwal makan utama. Pengingat tidur dikirim sekitar 2 jam sebelum waktu tidur pilihanmu. Hindari makan lalu langsung berbaring; sebagian panduan GERD menyarankan memberi jarak sekitar 3 jam sebelum berbaring. Ikuti arahan tenaga kesehatan.</Text>
            <PrimaryButton label={notificationsEnabled ? 'PERBARUI PENGINGAT' : 'AKTIFKAN PENGINGAT'} onPress={activateReminders} />
            {notificationsEnabled && <PrimaryButton secondary label="MATIKAN PENGINGAT" onPress={disableReminders} />}
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
                <PrimaryButton label="LIHAT RIWAYAT KELUHAN" onPress={() => setPage('Analysis')} />
              </Card>
            </>
          )}

          <Text style={styles.section}>Ringkasan konsumsi bulan ini</Text>
          <Card style={styles.analysisIntro}>
            <View style={styles.entryTop}>
              <Text style={styles.statNumber}>{monthlyFoodCount}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.bold}>Jenis makanan tercatat</Text>
                <Text style={styles.muted}>{currentMonthLabel}</Text>
              </View>
            </View>
            {monthlyStatuses.slice(0, 3).map(item => (
              <View key={`home-month-${item.food.toLowerCase()}`} style={styles.reminderItem}>
                <Text style={styles.bold}>{item.food}</Text>
                <Text style={styles.body}>{item.consumedThisMonth} kali dicatat bulan ini · {item.symptomTotal} catatan keluhan</Text>
              </View>
            ))}
            <Text style={styles.note}>Jumlah ini hanya ringkasan diary, bukan batas konsumsi yang ditetapkan secara medis.</Text>
            <PrimaryButton label="LIHAT PERINGATAN" onPress={() => setPage('Warnings')} />
          </Card>

          <Text style={styles.section}>Tips hari ini</Text>
          <Card style={styles.tipCard}>
            <Text style={styles.bold}>🌿 Kenali pemicu pribadi</Text>
            <Text style={styles.body}>Pemicu keluhan bisa berbeda pada setiap orang. Catat makanan dan gejala untuk membantu melihat pola.</Text>
          </Card>
          <Card style={styles.tipCard}>
            <Text style={styles.bold}>📖 Panduan kesehatan</Text>
            <Text style={styles.body}>Baca tips kebiasaan makan, pilihan sarapan, dan sumber informasi kesehatan.</Text>
            <PrimaryButton secondary label="BUKA PANDUAN" onPress={() => setPage('Guide')} />
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
              {foods.map((item, index) => (
                <View key={`food-${index}`} style={styles.foodInputRow}>
                  <TextInput
                    value={item}
                    onChangeText={value => setFoods(old => old.map((foodItem, foodIndex) => foodIndex === index ? value : foodItem))}
                    placeholder={index === 0 ? 'Contoh: nasi goreng' : 'Tambahkan makanan/minuman'}
                    placeholderTextColor="#9AA59E"
                    style={[styles.input, styles.foodInput]}
                    autoCapitalize="sentences"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={false}
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {index > 0 && (
                    <Pressable onPress={() => setFoods(old => old.filter((_, foodIndex) => foodIndex !== index))} style={styles.removeFoodButton}>
                      <Text style={styles.removeFoodText}>−</Text>
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable
                onPress={() => {
                  if (foods.length >= 10) {
                    Alert.alert('Batas makanan', 'Maksimal 10 makanan/minuman dalam satu catatan.');
                    return;
                  }
                  setFoods(old => [...old, '']);
                }}
                style={styles.addFoodButton}
              >
                <Text style={styles.addFoodText}>＋  Tambah makanan/minuman</Text>
              </Pressable>

              {liveStatus && (
                <View style={liveStatus.level === 'observe' ? styles.liveWarnSoft : styles.liveWarnStrong}>
                  <Text style={styles.liveWarnTitle}>⚠ {liveStatus.label}: {liveStatus.food}</Text>
                  <Text style={styles.body}>{statusSentence(liveStatus)}</Text>
                  {liveStatus.symptomTotal >= 2 && <Text style={styles.note}>Keluhan pernah tercatat lebih dari sekali. Amati respons tubuh dan pertimbangkan berkonsultasi jika keluhan berlanjut.</Text>}
                </View>
              )}

              <Label>PORSI</Label>
              <View style={styles.chipWrap}>{['Sedikit', 'Sedang', 'Banyak'].map(item =>
                <Chip key={item} label={item} selected={portion === item} onPress={() => setPortion(item)} />
              )}</View>

              <Label>CATATAN TAMBAHAN</Label>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Catatan tentang makanan atau porsimu (opsional)"
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
          <Text style={styles.title}>Keluhan</Text>
          <Text style={styles.subtitle}>Catat gejala, dugaan pemicu, dan catatan keluhan di halaman ini. Data tersebut disimpan terpisah dari catatan makanan.</Text>
          <Card style={styles.analysisIntro}>
            <Text style={styles.bold}>Pemeriksaan setelah makan</Text>
            <Text style={styles.body}>Pengingat 2 jam setelah makan dapat membawamu ke sini. Waktu munculnya keluhan dicatat saat kamu mengirim form; satu kejadian tidak membuktikan makanan sebagai penyebab.</Text>
          </Card>
          <Card style={styles.formCard}>
            <Label>MAKANAN YANG BERKAITAN</Label>
            <View style={styles.chipWrap}>
              {entries.slice(0, 10).map(item => (
                <Chip
                  key={item.id}
                  label={`${item.meal}: ${item.food}`}
                  selected={complaintMealId === item.id}
                  onPress={() => setComplaintMealId(item.id)}
                />
              ))}
            </View>
            {!entries.length && <Text style={styles.body}>Buat catatan makanan terlebih dahulu agar keluhan dapat dikaitkan.</Text>}
            <Label>GEJALA</Label>
            <View style={styles.chipWrap}>{symptoms.filter(item => item !== 'Tidak ada').map(item =>
              <Chip key={item} label={item} selected={complaintSymptom === item} onPress={() => setComplaintSymptom(item)} />
            )}</View>
            <Label>TINGKAT KELUHAN</Label>
            <View style={styles.chipWrap}>{['Ringan', 'Sedang', 'Berat'].map(item =>
              <Chip key={item} label={item} selected={complaintSeverity === item} onPress={() => setComplaintSeverity(item)} />
            )}</View>
            <Label>DUGAAN PEMICU (OPSIONAL)</Label>
            <View style={styles.chipWrap}>{triggers.map(item =>
              <Chip
                key={item}
                label={item}
                selected={complaintTrigger === item}
                onPress={() => setComplaintTrigger(old => old === item ? '' : item)}
              />
            )}</View>
            <Label>CATATAN (OPSIONAL)</Label>
            <TextInput
              value={complaintNotes}
              onChangeText={setComplaintNotes}
              placeholder="Contoh: keluhan mulai terasa setelah makan"
              placeholderTextColor="#9AA59E"
              style={[styles.input, styles.notesInput]}
              multiline
              textAlignVertical="top"
            />
            <PrimaryButton label="SIMPAN KELUHAN" onPress={saveComplaint} />
          </Card>
          <Text style={styles.section}>Riwayat keluhan</Text>
          {complaintHistory.length ? complaintHistory.map(item => (
            <Card key={item.id} style={styles.reminderCard}>
              <View style={styles.entryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.muted}>{dateFmt(item.createdAt)} · {item.meal || 'Waktu makan tidak tercatat'}</Text>
                  <Text style={styles.entryFood}>{item.symptom}</Text>
                </View>
                <Text style={styles.pill}>{item.severity}</Text>
              </View>
              <Text style={styles.body}>Makanan terkait: {item.food}</Text>
              {!!item.portion && <Text style={styles.body}>Porsi makanan: {item.portion}</Text>}
              {!!item.trigger && <Text style={styles.body}>Dugaan pemicu: {item.trigger}</Text>}
              {!!item.notes && <Text style={styles.body}>Catatan: {item.notes}</Text>}
            </Card>
          )) : <Empty text="Belum ada keluhan tercatat. Kamu bisa mencatat keluhan di atas atau menambahkannya setelah pengingat 2 jam." />}
          <Text style={styles.note}>Keluhan adalah laporan pribadi, bukan diagnosis. Jika keluhan sering muncul atau memburuk, konsultasikan dengan tenaga kesehatan.</Text>
        </ScrollView>
      )}

      {page === 'Warnings' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Peringatan makanan</Text>
          <Text style={styles.subtitle}>Ringkasan konsumsi dan catatan keluhan pada {currentMonthLabel}.</Text>
          <Card style={styles.analysisIntro}>
            <Text style={styles.bold}>Tentang pengingat ini</Text>
            <Text style={styles.body}>LambungCare menghitung berapa kali makanan dicatat dalam diary dan menampilkan makanan yang pernah disertai keluhan. Aplikasi tidak menetapkan jatah atau batas konsumsi bulanan karena pemicu dan toleransi setiap orang berbeda.</Text>
          </Card>

          <Text style={styles.section}>Konsumsi bulan ini</Text>
          {monthlyStatuses.length ? monthlyStatuses.map(item => (
            <Card key={`status-${item.food.toLowerCase()}`} style={item.symptomTotal >= 2 ? styles.reminderCard : null}>
              <View style={styles.entryTop}>
                <Text style={styles.entryFood}>{item.food}</Text>
                <Text style={styles.pill}>{item.consumedThisMonth} kali</Text>
              </View>
              <Text style={styles.body}>Dicatat bersama keluhan: {item.symptomTotal} kali.</Text>
              {item.symptomTotal > 0 && <Text style={styles.note}>Perhatikan apakah keluhan muncul kembali. Catatan ini belum membuktikan penyebabnya.</Text>}
            </Card>
          )) : <Empty text="Belum ada makanan yang dicatat pada bulan ini. Tambahkan catatan untuk melihat ringkasannya." />}

          <Text style={styles.section}>Riwayat peringatan dan catatan makan</Text>
          {warningHistory.length ? warningHistory.map(item => (
            <Card key={item.id} style={styles.reminderCard}>
              <View style={styles.entryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.muted}>
                    {dateFmt(item.createdAt)} · {item.recordType === 'meal'
                      ? `Catatan ${item.meal || 'makan'}`
                      : item.kind === 'melewati-batas' ? 'Catatan versi sebelumnya' : 'Keluhan tercatat'}
                  </Text>
                  <Text style={styles.entryFood}>{item.food}</Text>
                </View>
                <Text style={styles.pill}>{item.recordType === 'meal' ? 'Dicatat' : StatusBadgeText(item.level)}</Text>
              </View>
              {item.recordType === 'meal' ? (
                <>
                  {!!item.portion && <Text style={styles.body}>Porsi: {item.portion}</Text>}
                  {!!item.notes && <Text style={styles.body}>Catatan: {item.notes}</Text>}
                </>
              ) : (
                <Text style={styles.body}>{item.kind === 'melewati-batas' ? 'Catatan ini berasal dari versi sebelumnya yang menggunakan hitungan batas bulanan. Angka tersebut bukan standar medis. Gunakan ringkasan konsumsi sebagai informasi diary saja.' : item.message}</Text>
              )}
            </Card>
          )) : <Empty text="Catatan makanan dari semua waktu makan dan peringatan akan tampil di sini setelah dicatat." />}
          {warnings.length > 0 && <PrimaryButton secondary label="HAPUS RIWAYAT PERINGATAN" onPress={clearWarnings} />}
          <Text style={styles.note}>LambungCare bukan alat diagnosis atau pengganti konsultasi medis.</Text>
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
          <Text style={styles.section}>Panduan sarapan</Text>
          <Text style={styles.subtitle}>Dirangkum dari sumber kesehatan yang tertera di bawah.</Text>
          <Card style={styles.tipCard}>
            <Text style={styles.bold}>✅ Pilihan sarapan yang umumnya lebih aman</Text>
            {breakfastGuide.eat.map(item => (
              <Text key={item.text} style={styles.body}>• {item.text} <Text style={styles.sourceTag}>({item.source})</Text></Text>
            ))}
          </Card>
          <Card style={styles.warningCard}>
            <Text style={styles.bold}>⛔ Sebaiknya dihindari saat sarapan</Text>
            {breakfastGuide.avoid.map(item => (
              <Text key={item.text} style={styles.body}>• {item.text} <Text style={styles.sourceTag}>({item.source})</Text></Text>
            ))}
          </Card>
          <Card>
            <Text style={styles.bold}>🕒 Kebiasaan saat sarapan</Text>
            {breakfastGuide.habits.map(item => (
              <Text key={item} style={styles.body}>• {item}</Text>
            ))}
          </Card>
          <Text style={styles.note}>Daftar ini panduan umum. Mayo Clinic dan Harvard Health menegaskan pemicu tiap orang berbeda, jadi sesuaikan dengan hasil diary dan saran tenaga kesehatan atau ahli gizi.</Text>

          <Text style={styles.section}>Sumber pakar</Text>
          <Text style={styles.subtitle}>Ketuk tautan untuk membuka sumber asli.</Text>
          <Card>
            {expertSources.map(item => <SourceLink key={item.url} name={item.name} url={item.url} />)}
          </Card>
          <Text style={styles.note}>LambungCare bukan alat diagnosis atau pengganti konsultasi medis.</Text>
        </ScrollView>
      )}

      {page === 'History' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Riwayat makanan</Text>
          <Text style={styles.subtitle}>Daftar makanan/minuman dan porsi yang tersimpan untuk {session.email}. Riwayat keluhan ada di tab Keluhan.</Text>
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
  screen: { flex: 1, backgroundColor: '#F5F8F6' },
  loadingScreen: { flex: 1, backgroundColor: '#F5F8F6', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loginScreen: { flex: 1, backgroundColor: '#F5F8F6' },
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
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 34, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  profileButton: { backgroundColor: '#E2EFE7', width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  profileEmoji: { fontSize: 20 },
  profileAction: { color: GREEN, fontSize: 9, fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 17, borderWidth: 1, borderColor: '#E8EFEB', gap: 11, elevation: 2, shadowColor: '#244C3B', shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  hero: { backgroundColor: '#E4F2EA', borderColor: '#D6E9DC', padding: 22, minHeight: 230, justifyContent: 'center', overflow: 'hidden', elevation: 5 },
  heroDecor: { position: 'absolute', right: 13, top: 8, width: 110, height: 105, borderRadius: 30, backgroundColor: '#D3E9DA', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
  heroEmoji: { fontSize: 55 },
  heroLeaf: { position: 'absolute', right: 4, bottom: 2, fontSize: 26 },
  tag: { color: GREEN, fontSize: 9, fontWeight: '900', letterSpacing: 1, backgroundColor: '#D0E6D8', alignSelf: 'flex-start', padding: 7, borderRadius: 20 },
  heroTitle: { color: DARK, fontSize: 27, lineHeight: 33, fontWeight: '900', maxWidth: '90%' },
  heroDesc: { color: '#587065', fontSize: 12, lineHeight: 18, maxWidth: '94%' },
  button: { backgroundColor: GREEN, padding: 16, borderRadius: 15, alignItems: 'center', elevation: 3, shadowColor: '#1D5946', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  buttonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  buttonSecondary: { backgroundColor: '#F9ECEA', elevation: 0, shadowOpacity: 0 },
  buttonSecondaryText: { color: '#A33F36' },
  section: { color: DARK, fontSize: 18, fontWeight: '800', marginTop: 7, letterSpacing: -0.3 },
  subtitle: { color: MUTED, fontSize: 12, lineHeight: 19, marginTop: -8 },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, minHeight: 112, justifyContent: 'center' },
  statIcon: { fontSize: 18 },
  statNumber: { color: DARK, fontSize: 29, fontWeight: '800', letterSpacing: -0.8 },
  muted: { color: MUTED, fontSize: 10 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#EDF0EC' },
  scheduleEmoji: { fontSize: 20 },
  bold: { color: DARK, fontSize: 13, fontWeight: '900' },
  timeInput: { backgroundColor: '#F2F6F2', color: DARK, width: 78, textAlign: 'center', borderRadius: 9, padding: 8, fontSize: 12, fontWeight: '800' },
  note: { color: '#89968D', fontSize: 10, lineHeight: 15 },
  body: { color: '#617168', fontSize: 13, lineHeight: 20 },
  title: { color: DARK, fontSize: 26, fontWeight: '800', letterSpacing: -0.7 },
  label: { color: '#718078', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginTop: 7 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderRadius: 22, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#F2F5F0', borderWidth: 1, borderColor: '#E5EAE3' },
  chipSelected: { backgroundColor: '#E0EFE5', borderColor: GREEN },
  chipText: { color: '#6F7D73', fontSize: 10, fontWeight: '700' },
  chipTextSelected: { color: DARK },
  input: { borderWidth: 1, borderColor: '#DDE7DE', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, color: DARK, fontSize: 14, backgroundColor: '#FAFCFA', minHeight: 47 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 75 },
  showPassword: { position: 'absolute', right: 12, padding: 8 },
  showPasswordText: { color: GREEN, fontSize: 11, fontWeight: '800' },
  notesInput: { height: 82, textAlignVertical: 'top' },
  formCard: { padding: 16, gap: 11 },
  foodInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foodInput: { flex: 1 },
  addFoodButton: { backgroundColor: '#E8F3EB', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D5E7D9' },
  addFoodText: { color: GREEN, fontSize: 12, fontWeight: '800' },
  removeFoodButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#FDF0EE', alignItems: 'center', justifyContent: 'center' },
  removeFoodText: { color: '#A33F36', fontSize: 22, fontWeight: '700' },
  tipCard: { backgroundColor: '#EDF6EF', borderColor: '#D9EBDD' },
  warningCard: { backgroundColor: '#FFF5E8', borderColor: '#F2E4CC' },
  analysisIntro: { backgroundColor: '#EAF4EE' },
  reminderCard: { backgroundColor: '#FFF8EC', borderColor: '#F0DFC0' },
  reminderTitle: { color: '#80551F', fontSize: 13, fontWeight: '900' },
  reminderItem: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0E5D2' },
  suggestionCard: { backgroundColor: '#EFF7F0', borderColor: '#D8E9DA' },
  suggestionHeading: { color: DARK, fontSize: 14, fontWeight: '900' },
  dangerCard: { backgroundColor: '#FDF0EE', borderColor: '#F0CFC9' },
  dangerTitle: { color: '#A33F36', fontSize: 13, fontWeight: '900' },
  dangerText: { color: '#A33F36', fontSize: 12, lineHeight: 19, fontWeight: '700' },
  liveWarnSoft: { backgroundColor: '#FFF8EC', borderColor: '#F0DFC0', borderWidth: 1, borderRadius: 11, padding: 12, gap: 5 },
  liveWarnStrong: { backgroundColor: '#FDF0EE', borderColor: '#F0CFC9', borderWidth: 1, borderRadius: 11, padding: 12, gap: 5 },
  liveWarnTitle: { color: '#80551F', fontSize: 12, fontWeight: '900' },
  sourceRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EDF0EC', gap: 2 },
  sourceName: { color: DARK, fontSize: 12, fontWeight: '800' },
  sourceUrl: { color: GREEN, fontSize: 10, lineHeight: 15, textDecorationLine: 'underline' },
  sourceTag: { color: MUTED, fontSize: 10 },
  analysisEmoji: { fontSize: 28 },
  analysisLabel: { color: GREEN, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  entryTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryFood: { color: DARK, fontSize: 16, fontWeight: '900', flex: 1 },
  deleteText: { color: '#A34B40', fontWeight: '800', fontSize: 11 },
  pill: { backgroundColor: '#EEF4EE', color: GREEN, padding: 7, borderRadius: 8, fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  empty: { alignItems: 'center', padding: 25 },
  emptyIcon: { fontSize: 28 },
  guideIcon: { fontSize: 25 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E8EFEB', paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 20 : 10, elevation: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  tabIcon: { color: '#9AA59D', fontSize: 21 },
  tabIconActive: { color: GREEN, fontWeight: '900' },
  tabLabel: { color: '#9AA59D', fontSize: 8, fontWeight: '700' },
  tabLabelActive: { color: GREEN, fontWeight: '900' },
});
