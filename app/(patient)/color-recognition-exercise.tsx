/**
 * Màn LÀM BÀI "NHẬN DIỆN MÀU SẮC" (color_recognition) — RUNNER RIÊNG trong phiên,
 * bắt chước Y KHUÔN logic-sequence-exercise (tách khỏi bài nói, không đụng gì cũ).
 *
 * URL params (cơ chế phiên chung — F5 giữ nguyên bài): sid / ids (10 exercise_code
 * "CLR...") / index / scores.
 *
 * - GET /color-recognition/{code}: audio hỏi màu (TỰ PHÁT 1 lần sau 1s; web chặn
 *   autoplay -> nút 🔊 fallback, không crash) + 4 Ô MÀU vẽ từ HEX (View
 *   backgroundColor — KHÔNG ảnh, KHÔNG hiện tên màu: bài kiểm nhận diện màu).
 * - Lưới 2x2 ô LỚN (bệnh nhân lớn tuổi dễ chạm). Chạm 1 ô = chọn (viền nổi bật);
 *   chạm ô khác = ĐỔI lựa chọn (chỉ 1). "Nộp" bật khi đã chọn.
 * - Sau nộp: FEEDBACK BẰNG VIỀN dày + badge ✓/✗ (KHÔNG đổi nền ô — nền chính là màu
 *   của đề bài, đổi là lẫn): ô đúng viền XANH + ✓; chọn sai -> ô đã chọn viền ĐỎ + ✗.
 * - "🔁 Làm lại" LUÔN có (rule R4) -> GET lại (server xáo bộ nhiễu khác), attempt tăng.
 *   "Bài tiếp theo" / "Dừng phiên" -> cơ chế phiên (session-summary) như các dạng khác.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { buildAssetUrl } from '@/src/api/client';
import {
  getColorRecognitionContent,
  submitColorRecognition,
} from '@/src/api/colorRecognition';
import type {
  ColorRecognitionContent,
  ColorRecognitionSubmitResponse,
} from '@/src/types/api';

const GREEN = '#2E7D32';
const RED = '#D64545';
const ORANGE = '#E8912D';

export default function ColorRecognitionExerciseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sid?: string;
    ids?: string;
    index?: string;
    scores?: string;
  }>();
  const sid = params.sid ?? null;
  const ids = params.ids ? params.ids.split(',') : [];
  const index = Number(params.index ?? '0');
  const sessionScores = params.scores ? params.scores.split(',').filter(Boolean) : [];
  const exerciseCode = ids[index] ?? '';
  const total = ids.length || 10;

  const [content, setContent] = useState<ColorRecognitionContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null); // color_id đã chạm
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ColorRecognitionSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // "Làm lại" -> GET lại (xáo bộ nhiễu khác)

  // Audio hỏi màu — phát/dừng qua ref (đổi bài/rời màn dừng ngay), như các màn khác
  const playingRef = useRef<HTMLAudioElement | null>(null);
  function stopPlaying() {
    playingRef.current?.pause();
    playingRef.current = null;
  }
  function playInstruction() {
    const full = buildAssetUrl(content?.instruction_audio_url ?? null);
    if (!full || Platform.OS !== 'web') return;
    stopPlaying();
    const audio = new Audio(full);
    playingRef.current = audio;
    void audio.play().catch(() => undefined);
  }

  // Tải bài (đổi bài / Làm lại)
  useEffect(() => {
    if (!exerciseCode) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    setSelected(null);
    setResult(null);
    setError(null);
    getColorRecognitionContent(exerciseCode)
      .then((c) => active && setContent(c))
      .catch(() => active && setLoadError('Không tải được bài. Vui lòng thử lại.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [exerciseCode, reloadKey]);

  // TỰ PHÁT audio hỏi màu 1 lần sau 1s; bị chặn autoplay -> im lặng (nút 🔊 fallback)
  useEffect(() => {
    if (!content || Platform.OS !== 'web') return;
    const full = buildAssetUrl(content.instruction_audio_url);
    if (!full) return;
    const timer = setTimeout(() => {
      stopPlaying();
      const audio = new Audio(full);
      playingRef.current = audio;
      void audio.play().catch(() => undefined);
    }, 1000);
    return () => {
      clearTimeout(timer);
      stopPlaying();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.exercise_code, reloadKey]);

  async function onSubmit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      setResult(await submitColorRecognition(exerciseCode, selected, sid ?? undefined));
    } catch {
      setError('Không nộp được bài. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  function onRetry() {
    setReloadKey((k) => k + 1); // GET lại -> server chọn bộ nhiễu + thứ tự khác
  }

  function scoresWithCurrent(): string[] {
    const s = [...sessionScores];
    if (result) s.push(String(Math.round(result.score)));
    return s;
  }

  function goSummary() {
    router.replace(
      `/(patient)/session-summary?sid=${sid}&scores=${scoresWithCurrent().join(',')}`,
    );
  }

  function onNext() {
    const nextCode = ids[index + 1];
    if (nextCode) {
      router.replace(
        `/(patient)/color-recognition-exercise?sid=${sid}&ids=${params.ids}` +
          `&index=${index + 1}&scores=${scoresWithCurrent().join(',')}`,
      );
    } else {
      goSummary();
    }
  }

  return (
    <View style={styles.screen}>
      {/* Header: ✕ = Dừng phiên; "Bài X/10" theo cơ chế phiên */}
      <View style={styles.header}>
        <Pressable onPress={goSummary} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.title}>Nhận diện màu sắc</Text>
        <Text style={styles.counter}>
          Bài {index + 1}/{total}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.muted}>Đang tải bài...</Text>
        </View>
      ) : loadError || !content ? (
        <View style={styles.center}>
          <Text style={styles.error}>{loadError ?? 'Không có dữ liệu.'}</Text>
          <Pressable style={styles.retryLoadBtn} onPress={() => setReloadKey((k) => k + 1)}>
            <Text style={styles.retryLoadText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.hint}>Nghe câu hỏi và chạm vào Ô MÀU đúng</Text>

          <Pressable style={styles.listenBtn} onPress={playInstruction}>
            <Text style={styles.listenBtnText}>🔊 Nghe lại câu hỏi</Text>
          </Pressable>

          {/* Lưới 2x2 ô màu — VẼ TỪ HEX, không ảnh, KHÔNG hiện tên màu.
              Feedback sau nộp = VIỀN dày + badge ✓/✗ (không đổi nền ô). */}
          <View style={styles.grid}>
            {content.options.map((o) => {
              const isSelected = selected === o.color_id;
              const isCorrectTile = result ? o.color_id === result.correct_color_id : false;
              const isWrongPick =
                result && !result.is_correct ? o.color_id === selected : false;
              return (
                <Pressable
                  key={o.color_id}
                  style={[
                    styles.tile,
                    { backgroundColor: o.hex_code },
                    isSelected && !result && styles.tileSelected,
                    isCorrectTile && styles.tileCorrect,
                    isWrongPick && styles.tileWrong,
                  ]}
                  disabled={submitting || result !== null}
                  onPress={() => setSelected(o.color_id)} // chạm ô khác = đổi lựa chọn (chỉ 1)
                >
                  {isSelected && !result ? (
                    <View style={styles.pickBadge}>
                      <Text style={styles.pickBadgeText}>👆</Text>
                    </View>
                  ) : null}
                  {isCorrectTile ? (
                    <View style={[styles.fbBadge, styles.fbBadgeCorrect]}>
                      <Text style={styles.fbBadgeText}>✓</Text>
                    </View>
                  ) : null}
                  {isWrongPick ? (
                    <View style={[styles.fbBadge, styles.fbBadgeWrong]}>
                      <Text style={styles.fbBadgeText}>✗</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {!result ? (
            <>
              <Pressable
                style={[styles.submitBtn, (!selected || submitting) && styles.disabled]}
                disabled={!selected || submitting}
                onPress={onSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>➡️ Nộp</Text>
                )}
              </Pressable>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          ) : (
            <>
              <View
                style={[
                  styles.resultBanner,
                  result.completed ? styles.resultOk : styles.resultBad,
                ]}
              >
                <Text
                  style={[styles.resultText, { color: result.completed ? GREEN : RED }]}
                >
                  {result.completed
                    ? `🎉 Đúng rồi! ${Math.round(result.score)} điểm`
                    : 'Chưa đúng — ô có dấu ✓ mới là màu đúng, thử lại nhé'}
                </Text>
              </View>

              <Pressable style={styles.retryBtn} onPress={onRetry}>
                <Text style={styles.retryBtnText}>🔁 Làm lại bài này</Text>
              </Pressable>
              <Pressable style={styles.nextBtn} onPress={onNext}>
                <Text style={styles.nextBtnText}>
                  {index + 1 >= total ? 'Hoàn thành' : 'Bài tiếp theo →'}
                </Text>
              </Pressable>
              <Pressable style={styles.stopBtn} onPress={goSummary}>
                <Text style={styles.stopBtnText}>⏹ Dừng phiên</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
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
    paddingBottom: 8,
  },
  close: { fontSize: 22, color: ORANGE, fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  counter: { fontSize: 18, fontWeight: 'bold', color: ORANGE },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { fontSize: 15, color: '#666' },
  error: { fontSize: 15, color: RED, textAlign: 'center' },
  retryLoadBtn: {
    borderWidth: 1.5,
    borderColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryLoadText: { color: ORANGE, fontWeight: '600' },

  body: { padding: 20, paddingTop: 4, gap: 16 },
  hint: { fontSize: 16, fontWeight: '600', color: '#444', textAlign: 'center' },
  listenBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#B86E12',
  },
  listenBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  tile: {
    width: '46%',
    aspectRatio: 1.25,           // ô LỚN, dễ chạm cho người lớn tuổi
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: { borderWidth: 5, borderColor: '#333' },       // đã chọn: viền đậm tối
  // FEEDBACK BẰNG VIỀN + badge — KHÔNG đổi nền (nền = màu đề bài)
  tileCorrect: { borderWidth: 6, borderColor: GREEN },
  tileWrong: { borderWidth: 6, borderColor: RED },

  pickBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pickBadgeText: { fontSize: 16 },
  fbBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  fbBadgeCorrect: { borderColor: GREEN },
  fbBadgeWrong: { borderColor: RED },
  fbBadgeText: { fontSize: 18, fontWeight: 'bold', color: '#222' },

  submitBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#1B5E3A',
  },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  disabled: { opacity: 0.4 },

  resultBanner: { borderRadius: 12, padding: 14, borderWidth: 1 },
  resultOk: { backgroundColor: '#E7F5E9', borderColor: '#bfe3c6' },
  resultBad: { backgroundColor: '#FDEAEA', borderColor: '#f0c3c3' },
  resultText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },

  retryBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#B86E12',
  },
  retryBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  nextBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#1B5E3A',
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  stopBtn: {
    borderWidth: 1.5,
    borderColor: RED,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  stopBtnText: { color: RED, fontSize: 15, fontWeight: 'bold' },
});
