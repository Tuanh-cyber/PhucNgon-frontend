/**
 * Màn "Học từ vựng" — flashcard 90 từ (ảnh + từ + audio phát âm).
 *
 * - Dữ liệu: GET /vocabulary qua apiClient (src/api/vocabulary.ts) — baseURL từ env
 *   như mọi API khác; ảnh/audio là đường dẫn /static/... -> ghép bằng buildAssetUrl().
 * - Mỗi thẻ: ảnh + từ + nhãn chủ đề + nút phát âm; TỰ PHÁT audio 1 lần khi thẻ hiện.
 *   Web có thể CHẶN autoplay khi chưa có tương tác (chính sách trình duyệt) -> catch
 *   nuốt lỗi, KHÔNG crash, nút "🔊 Phát âm" luôn hiển thị làm fallback. Từ tương tác
 *   đầu tiên trở đi (bấm Tiếp/Trước/chip lọc) autoplay chạy bình thường.
 *   Mobile: chưa cài expo-audio -> bỏ qua autoplay, nút phát hiện message (nhất quán
 *   với màn làm bài exercise-detail).
 * - Điều hướng: Trước / Tiếp + tiến độ "12/90". Lọc theo chủ đề bằng dải chip
 *   (Tất cả + 6 chủ đề) — lọc client-side trên list 90 từ đã tải, đổi lọc về thẻ đầu.
 * - Mọi audio đang phát đi qua playingRef -> đổi thẻ / rời màn là dừng ngay.
 */

import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { buildAssetUrl } from '@/src/api/client';
import { getVocabulary } from '@/src/api/vocabulary';
import { BottomNav } from '@/src/components/BottomNav';
import { TOPIC_DISPLAY_NAME, TOPIC_ICON, topicDisplayName } from '@/src/constants/exercises';
import type { VocabularyItem } from '@/src/types/api';

const GREEN = '#2E7D32';
const PURPLE = '#7C4DFF';
const RED = '#D64545';

export default function FlashcardsScreen() {
  const router = useRouter();

  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null); // null = Tất cả
  const [index, setIndex] = useState(0);
  const [audioNote, setAudioNote] = useState<string | null>(null);

  // Audio đang phát — dừng được khi đổi thẻ/rời màn (không để tiếng chồng nhau).
  const playingRef = useRef<HTMLAudioElement | null>(null);

  function stopPlaying() {
    playingRef.current?.pause();
    playingRef.current = null;
  }

  function load() {
    setLoading(true);
    setError(null);
    getVocabulary()
      .then(setItems)
      .catch(() => setError('Không tải được danh sách từ vựng. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  // Rời màn -> dừng audio.
  useEffect(() => stopPlaying, []);

  // Lọc client-side; đổi lọc -> về thẻ đầu tiên.
  const filtered = useMemo(
    () => (topicFilter ? items.filter((v) => v.topic === topicFilter) : items),
    [items, topicFilter],
  );
  const card = filtered[index] ?? null;

  function playAudio(v: VocabularyItem | null) {
    if (!v) return;
    const full = buildAssetUrl(v.audio_url);
    if (!full) {
      setAudioNote('Từ này chưa có audio.');
      return;
    }
    setAudioNote(null);
    if (Platform.OS === 'web') {
      stopPlaying();
      const audio = new Audio(full);
      playingRef.current = audio;
      void audio.play().catch(() => setAudioNote('Không phát được audio.'));
    } else {
      // TODO(mobile): phát bằng expo-audio khi bổ sung bản native.
      setAudioNote('Bản demo: phát audio hiện chỉ hỗ trợ trên web.');
    }
  }

  // TỰ PHÁT 1 lần khi thẻ hiện (đổi index/lọc). Autoplay bị trình duyệt chặn khi chưa
  // có tương tác -> catch im lặng, nút "🔊 Phát âm" là fallback; KHÔNG crash.
  useEffect(() => {
    if (!card || Platform.OS !== 'web') return;
    const full = buildAssetUrl(card.audio_url);
    if (!full) return;
    stopPlaying();
    const audio = new Audio(full);
    playingRef.current = audio;
    void audio.play().catch(() => undefined); // bị chặn autoplay -> im lặng
    return stopPlaying;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.vocab_id]);

  function go(delta: number) {
    setAudioNote(null);
    setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(filtered.length - 1, 0)));
  }

  function pickTopic(t: string | null) {
    setTopicFilter(t);
    setIndex(0);
    setAudioNote(null);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>📚 Học từ vựng</Text>
        {filtered.length > 0 ? (
          <Text style={styles.progress}>
            {index + 1}/{filtered.length}
          </Text>
        ) : (
          <View style={styles.progressSpacer} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.muted}>Đang tải từ vựng...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {/* Chip lọc chủ đề: Tất cả + 6 chủ đề */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              <Chip
                label="Tất cả"
                active={topicFilter === null}
                onPress={() => pickTopic(null)}
              />
              {Object.keys(TOPIC_DISPLAY_NAME).map((t) => (
                <Chip
                  key={t}
                  label={`${TOPIC_ICON[t] ?? '📚'} ${TOPIC_DISPLAY_NAME[t]}`}
                  active={topicFilter === t}
                  onPress={() => pickTopic(t)}
                />
              ))}
            </View>
          </ScrollView>

          {card ? (
            <>
              {/* Thẻ từ vựng */}
              <View style={styles.card}>
                <CardImage url={card.image_url} />
                <Text style={styles.word}>{card.word}</Text>
                <Text style={styles.topicLabel}>
                  {TOPIC_ICON[card.topic] ?? '📚'} {topicDisplayName(card.topic)}
                </Text>
                <Pressable style={styles.playBtn} onPress={() => playAudio(card)}>
                  <Text style={styles.playBtnText}>🔊 Phát âm</Text>
                </Pressable>
                {audioNote ? <Text style={styles.audioNote}>{audioNote}</Text> : null}
              </View>

              {/* Trước / Tiếp */}
              <View style={styles.navRow}>
                <Pressable
                  style={[styles.navBtn, index === 0 && styles.navBtnDisabled]}
                  onPress={() => go(-1)}
                  disabled={index === 0}
                >
                  <Text style={styles.navBtnText}>‹ Trước</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.navBtn,
                    styles.navBtnNext,
                    index >= filtered.length - 1 && styles.navBtnDisabled,
                  ]}
                  onPress={() => go(1)}
                  disabled={index >= filtered.length - 1}
                >
                  <Text style={styles.navBtnText}>Tiếp ›</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.muted}>Chưa có từ vựng trong chủ đề này.</Text>
          )}
        </ScrollView>
      )}

      <BottomNav active="home" />
    </View>
  );
}

/** Chip lọc chủ đề. */
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** Ảnh từ vựng; null/lỗi tải -> placeholder emoji, không màn trắng. */
function CardImage({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  const full = buildAssetUrl(url);
  // Đổi thẻ -> reset trạng thái lỗi của ảnh cũ
  useEffect(() => setFailed(false), [url]);
  if (!full || failed) {
    return (
      <View style={styles.imageBox}>
        <Text style={styles.imageEmoji}>🖼️</Text>
      </View>
    );
  }
  return (
    <View style={styles.imageBox}>
      <Image
        source={{ uri: full }}
        style={styles.image}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
  },
  back: { fontSize: 16, color: GREEN, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  progress: { fontSize: 18, fontWeight: 'bold', color: GREEN, minWidth: 60, textAlign: 'right' },
  progressSpacer: { minWidth: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { fontSize: 15, color: '#666', textAlign: 'center' },
  error: { fontSize: 15, color: RED, textAlign: 'center' },
  retryBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  body: { padding: 20, paddingTop: 4, gap: 16 },

  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#ddd2f5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#faf9fd',
  },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipText: { fontSize: 14, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#faf9fd',
    borderWidth: 1,
    borderColor: '#eceaf4',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  imageBox: {
    width: '100%',
    height: 220,
    backgroundColor: '#E7F5E9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageEmoji: { fontSize: 90 },
  word: { fontSize: 34, fontWeight: 'bold', color: '#222', textAlign: 'center' },
  topicLabel: { fontSize: 15, color: PURPLE, fontWeight: '600' },
  playBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderBottomWidth: 4,
    borderBottomColor: '#5C35CC',
  },
  playBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  audioNote: { fontSize: 14, color: '#888' },

  navRow: { flexDirection: 'row', gap: 12 },
  navBtn: {
    flex: 1,
    backgroundColor: '#8E8E93',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#6d6d72',
  },
  navBtnNext: { backgroundColor: GREEN, borderBottomColor: '#1B5E3A' },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
