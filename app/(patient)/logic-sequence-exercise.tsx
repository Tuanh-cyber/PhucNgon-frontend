/**
 * Màn LÀM BÀI "SẮP XẾP HÌNH ẢNH" (logic_sequence) — LAYOUT 2 KHU (theo mẫu thiết kế):
 *
 *   KHU TRÊN  "Chọn hình bên dưới": KHO ảnh nguồn (đã xáo từ server), mỗi ảnh có nhãn
 *             số tham chiếu (vị trí trong kho, KHÔNG phải đáp án). Ảnh contain — không cắt.
 *   KHU DƯỚI  "Sắp xếp thứ tự": dãy N Ô ĐÍCH đánh số 1→N — nơi bệnh nhân xây trình tự.
 *
 * CƠ CHẾ TAP (không drag-drop):
 *   - Chạm ảnh ở KHO -> ảnh lấp vào Ô ĐÍCH TRỐNG ĐẦU TIÊN; ảnh mờ đi trong kho.
 *   - Chạm ô đích ĐÃ CÓ ảnh -> trả ảnh về kho, Ô ĐÓ THÀNH TRỐNG — các ô sau KHÔNG dồn.
 *     (Chọn cách KHÔNG DỒN: số ô cố định = vị trí tuyệt đối rõ ràng, khớp cách chấm
 *     đúng-vị-trí-tuyệt-đối của backend; tránh số "nhảy" gây rối người lớn tuổi.
 *     Chạm ảnh kho tiếp theo sẽ lấp đúng chỗ trống đó.)
 *   - "Xóa hết" -> mọi ảnh về kho, ô đích trống lại.
 *
 * ordered_step_ids = slots[0..N-1] theo đúng thứ tự Ô ĐÍCH — payload backend KHÔNG đổi.
 * "Kiểm tra kết quả" chỉ bật khi đủ N ô. Sau nộp: Ô ĐÍCH tô viền xanh/đỏ theo
 * step_feedback; sai thì hiện dải đáp án đúng. "Làm lại" LUÔN có (server xáo lại).
 * Audio hướng dẫn: tự phát 1 lần (web chặn autoplay -> nút 🔊 fallback). Cơ chế phiên
 * (sid/ids/index/scores, Bài X/10, session-summary) giữ nguyên.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { getLogicSequenceContent, submitLogicSequence } from '@/src/api/logicSequence';
import type { LogicSequenceContent, LogicSequenceSubmitResponse } from '@/src/types/api';

const GREEN = '#2E7D32';
const RED = '#D64545';
const BLUE = '#1976D2';
const PURPLE = '#7C4DFF';

export default function LogicSequenceExerciseScreen() {
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
  const exerciseId = ids[index] ?? '';
  const total = ids.length || 10;

  const [content, setContent] = useState<LogicSequenceContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Ô ĐÍCH: slots[i] = step_id đặt ở vị trí i+1, null = trống. ordered_step_ids = slots đủ.
  const [slots, setSlots] = useState<(string | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LogicSequenceSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // "Làm lại" -> GET lại (server xáo lại)

  // Audio hướng dẫn — phát/dừng qua ref (đổi bài/rời màn dừng ngay)
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

  // Tải bài (đổi bài hoặc "Làm lại")
  useEffect(() => {
    if (!exerciseId) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    setResult(null);
    setError(null);
    getLogicSequenceContent(exerciseId)
      .then((c) => {
        if (!active) return;
        setContent(c);
        setSlots(Array(c.step_count).fill(null)); // dãy ô đích trống 1..N
      })
      .catch(() => active && setLoadError('Không tải được bài. Vui lòng thử lại.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [exerciseId, reloadKey]);

  // TỰ PHÁT hướng dẫn 1 lần sau 1s; bị chặn autoplay -> im lặng, nút 🔊 là fallback.
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
  }, [content?.exercise_id, reloadKey]);

  // ── TAP: kho -> ô trống đầu tiên; ô có ảnh -> trả về kho (ô đó trống, KHÔNG dồn) ──
  function onTapPoolImage(stepId: string) {
    if (result || submitting) return;
    if (slots.includes(stepId)) return; // đã dùng — chạm ở kho không làm gì (mờ sẵn)
    const firstEmpty = slots.indexOf(null);
    if (firstEmpty === -1) return; // đã đầy
    setSlots((prev) => prev.map((v, i) => (i === firstEmpty ? stepId : v)));
  }

  function onTapSlot(slotIndex: number) {
    if (result || submitting) return;
    if (slots[slotIndex] === null) return; // ô trống — không làm gì
    setSlots((prev) => prev.map((v, i) => (i === slotIndex ? null : v)));
  }

  const filledCount = slots.filter(Boolean).length;
  const allFilled = content !== null && filledCount === content.step_count;

  async function onSubmit() {
    if (!content || !allFilled) return;
    setSubmitting(true);
    setError(null);
    try {
      // ordered_step_ids = đúng thứ tự Ô ĐÍCH 1->N (payload backend không đổi)
      setResult(
        await submitLogicSequence(exerciseId, slots as string[], sid ?? undefined),
      );
    } catch {
      setError('Không nộp được bài. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  function onRetry() {
    setReloadKey((k) => k + 1); // GET lại — server xáo lại thứ tự kho
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
    const nextId = ids[index + 1];
    if (nextId) {
      router.replace(
        `/(patient)/logic-sequence-exercise?sid=${sid}&ids=${params.ids}` +
          `&index=${index + 1}&scores=${scoresWithCurrent().join(',')}`,
      );
    } else {
      goSummary();
    }
  }

  const feedbackByStep = new Map(
    (result?.step_feedback ?? []).map((f) => [f.step_id, f]),
  );
  const imageByStep = new Map((content?.steps ?? []).map((s) => [s.step_id, s.image_url]));

  return (
    <View style={styles.screen}>
      {/* Header: ✕ = Dừng phiên; "Bài X/10" theo cơ chế phiên */}
      <View style={styles.header}>
        <Pressable onPress={goSummary} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.title}>Sắp xếp hình ảnh</Text>
        <Text style={styles.counter}>
          Bài {index + 1}/{total}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BLUE} />
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
          <Text style={styles.activityTitle}>{content.title}</Text>

          {/* ── KHU TRÊN: KHO ẢNH ── */}
          <Text style={styles.zoneLabel}>Chọn hình bên dưới</Text>
          <View style={styles.pool}>
            {content.steps.map((s, poolIdx) => {
              const used = slots.includes(s.step_id);
              const full = buildAssetUrl(s.image_url);
              return (
                <Pressable
                  key={s.step_id}
                  style={[styles.poolCard, used && styles.poolCardUsed]}
                  disabled={used || result !== null || submitting}
                  onPress={() => onTapPoolImage(s.step_id)}
                >
                  {full ? (
                    <Image source={{ uri: full }} style={styles.poolImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.imageMissing}>
                      <Text style={styles.imageMissingIcon}>🖼️</Text>
                    </View>
                  )}
                  {/* Nhãn số THAM CHIẾU (vị trí trong kho — KHÔNG phải đáp án) */}
                  <View style={styles.refBadge}>
                    <Text style={styles.refBadgeText}>{poolIdx + 1}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* ── KHU DƯỚI: DÃY Ô ĐÍCH 1→N ── */}
          <Text style={styles.zoneLabel}>Sắp xếp thứ tự</Text>
          <View style={styles.slotRow}>
            {slots.map((stepId, i) => {
              const fb = stepId ? feedbackByStep.get(stepId) : undefined;
              const full = stepId ? buildAssetUrl(imageByStep.get(stepId) ?? null) : null;
              return (
                <Pressable
                  key={i}
                  style={[
                    styles.slot,
                    stepId !== null && styles.slotFilled,
                    fb && (fb.correct ? styles.slotCorrect : styles.slotWrong),
                  ]}
                  onPress={() => onTapSlot(i)}
                >
                  {stepId && full ? (
                    <Image source={{ uri: full }} style={styles.slotImage} resizeMode="contain" />
                  ) : (
                    <Text style={styles.slotNumber}>{i + 1}</Text>
                  )}
                  {/* Số vị trí nhỏ ở góc khi ô đã có ảnh */}
                  {stepId ? (
                    <View
                      style={[
                        styles.slotBadge,
                        fb ? (fb.correct ? styles.badgeCorrect : styles.badgeWrong) : null,
                      ]}
                    >
                      <Text style={styles.slotBadgeText}>{i + 1}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Nghe hướng dẫn (dưới khu sắp xếp — theo mẫu) */}
          <Pressable style={styles.listenBtn} onPress={playInstruction}>
            <Text style={styles.listenBtnText}>🔊 Nghe lại hướng dẫn</Text>
          </Pressable>

          {!result ? (
            <>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.clearBtn, filledCount === 0 && styles.disabled]}
                  disabled={filledCount === 0}
                  onPress={() => setSlots(Array(content.step_count).fill(null))}
                >
                  <Text style={styles.clearBtnText}>🗑 Xóa hết</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitBtn, (!allFilled || submitting) && styles.disabled]}
                  disabled={!allFilled || submitting}
                  onPress={onSubmit}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      Kiểm tra kết quả ({filledCount}/{content.step_count})
                    </Text>
                  )}
                </Pressable>
              </View>
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
                    ? `🎉 Chính xác! ${Math.round(result.score)} điểm`
                    : 'Chưa đúng thứ tự — xem đáp án bên dưới rồi thử lại nhé'}
                </Text>
              </View>

              {!result.completed ? (
                <View style={styles.answerStrip}>
                  <Text style={styles.answerLabel}>Đáp án đúng:</Text>
                  <View style={styles.answerRow}>
                    {result.correct_order.map((stepId, i) => {
                      const full = buildAssetUrl(imageByStep.get(stepId) ?? null);
                      return (
                        <View key={stepId} style={styles.answerItem}>
                          {full ? (
                            <Image
                              source={{ uri: full }}
                              style={styles.answerImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <Text>🖼️</Text>
                          )}
                          <Text style={styles.answerNum}>{i + 1}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

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
  close: { fontSize: 22, color: BLUE, fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  counter: { fontSize: 18, fontWeight: 'bold', color: BLUE },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { fontSize: 15, color: '#666' },
  error: { fontSize: 15, color: RED, textAlign: 'center' },
  retryLoadBtn: {
    borderWidth: 1.5,
    borderColor: BLUE,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryLoadText: { color: BLUE, fontWeight: '600' },

  body: { padding: 20, paddingTop: 4, gap: 12 },
  activityTitle: { fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'center' },
  zoneLabel: { fontSize: 17, fontWeight: 'bold', color: GREEN, marginTop: 4 },

  // ── KHO ẢNH (khu trên) ──
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  poolCard: {
    width: '31%',
    aspectRatio: 3 / 4,          // thẻ dọc như mẫu
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dfe8df',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  poolCardUsed: { opacity: 0.25 }, // ảnh đã dùng -> mờ
  poolImage: { width: '100%', height: '100%' },
  imageMissing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageMissingIcon: { fontSize: 34 },
  refBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refBadgeText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  // ── Ô ĐÍCH (khu dưới) ──
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  slot: {
    width: 62,
    height: 62,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8fbf9a',
    borderStyle: 'dashed',       // ô trống nét đứt như mẫu
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbfffb',
    overflow: 'hidden',
  },
  slotFilled: { borderStyle: 'solid', borderColor: BLUE, backgroundColor: '#fff' },
  slotCorrect: { borderColor: GREEN, borderWidth: 3, backgroundColor: '#E7F5E9' },
  slotWrong: { borderColor: RED, borderWidth: 3, backgroundColor: '#FDEAEA' },
  slotNumber: { fontSize: 20, fontWeight: 'bold', color: GREEN },
  slotImage: { width: '100%', height: '100%' },
  slotBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCorrect: { backgroundColor: GREEN },
  badgeWrong: { backgroundColor: RED },
  slotBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  listenBtn: {
    backgroundColor: '#EFE8FF',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  listenBtnText: { color: PURPLE, fontSize: 16, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', gap: 12 },
  clearBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#999',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  clearBtnText: { fontSize: 16, fontWeight: '600', color: '#555' },
  submitBtn: {
    flex: 1.6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: GREEN,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitBtnText: { color: GREEN, fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.4 },

  resultBanner: { borderRadius: 12, padding: 14, borderWidth: 1 },
  resultOk: { backgroundColor: '#E7F5E9', borderColor: '#bfe3c6' },
  resultBad: { backgroundColor: '#FDEAEA', borderColor: '#f0c3c3' },
  resultText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },

  answerStrip: { gap: 6 },
  answerLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
  answerRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  answerItem: { alignItems: 'center', gap: 2 },
  answerImage: { width: 64, height: 48, borderRadius: 8, backgroundColor: '#fff' },
  answerNum: { fontSize: 13, fontWeight: 'bold', color: BLUE },

  retryBtn: {
    backgroundColor: '#E8912D',
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
