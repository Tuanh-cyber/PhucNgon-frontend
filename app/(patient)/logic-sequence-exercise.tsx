/**
 * Màn LÀM BÀI "SẮP XẾP HÌNH ẢNH" (logic_sequence) — RUNNER RIÊNG trong phiên,
 * TÁCH khỏi exercise-detail (bài nói) để không đụng 1 dòng nào của luồng nói.
 *
 * URL params (cùng cơ chế phiên với bài nói — F5 giữ nguyên bài):
 *   sid   = therapy_session_id
 *   ids   = 10 exercise_id của phiên, phân tách phẩy
 *   index = vị trí bài hiện tại (header "Bài X/10")
 *   scores= điểm tích lũy (cho session-summary tính TB)
 *
 * TAP-TO-ORDER (không drag-drop, không thư viện gesture):
 *   - Chạm ảnh CHƯA chọn -> gán số thứ tự kế tiếp (badge 1,2,3...).
 *   - Chạm ảnh ĐÃ chọn -> BỎ CHỌN ảnh đó, các số phía sau tự dồn lại (badge = vị trí
 *     trong mảng picked -> tự đúng, UX đơn giản rõ ràng).
 *   - "Xóa hết" làm lại từ đầu. "Nộp" chỉ bật khi đủ step_count ảnh.
 *
 * Sau nộp: tô viền XANH/ĐỎ theo step_feedback (đúng vị trí tuyệt đối); sai -> hiện
 * dải đáp án đúng (correct_order) để học. "Làm lại" LUÔN có (rule R4) -> GET lại để
 * server XÁO LẠI. Audio hướng dẫn: tự phát 1 lần sau khi tải (web chặn autoplay ->
 * nút 🔊 là fallback, không crash — cùng pattern flashcard).
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
  const [picked, setPicked] = useState<string[]>([]); // thứ tự bệnh nhân chạm
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LogicSequenceSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // "Làm lại" -> GET lại (server xáo lại)

  // Audio hướng dẫn — mọi phát/dừng qua ref (đổi bài/rời màn là dừng ngay)
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

  // Tải bài (đổi bài hoặc "Làm lại" -> server xáo lại)
  useEffect(() => {
    if (!exerciseId) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    setPicked([]);
    setResult(null);
    setError(null);
    getLogicSequenceContent(exerciseId)
      .then((c) => active && setContent(c))
      .catch(() => active && setLoadError('Không tải được bài. Vui lòng thử lại.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [exerciseId, reloadKey]);

  // TỰ PHÁT hướng dẫn 1 lần sau khi bài tải xong (1s); bị chặn autoplay -> im lặng,
  // nút 🔊 là fallback. Cleanup cả 2 pha như các màn khác.
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

  // ── TAP-TO-ORDER ──
  function onTapImage(stepId: string) {
    if (result || submitting) return; // đã nộp -> khóa lưới cho tới khi Làm lại/chuyển bài
    setPicked((prev) =>
      prev.includes(stepId)
        ? prev.filter((id) => id !== stepId) // bỏ chọn -> số phía sau tự dồn
        : [...prev, stepId],
    );
  }

  async function onSubmit() {
    if (!content || picked.length !== content.step_count) return;
    setSubmitting(true);
    setError(null);
    try {
      setResult(await submitLogicSequence(exerciseId, picked, sid ?? undefined));
    } catch {
      setError('Không nộp được bài. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  function onRetry() {
    // LUÔN cho làm lại (rule R4) — GET lại để server XÁO LẠI thứ tự hiển thị
    setReloadKey((k) => k + 1);
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

  // feedback map để tô màu sau nộp
  const feedbackByStep = new Map(
    (result?.step_feedback ?? []).map((f) => [f.step_id, f]),
  );
  const imageByStep = new Map((content?.steps ?? []).map((s) => [s.step_id, s.image_url]));

  return (
    <View style={styles.screen}>
      {/* Header: ✕ = Dừng phiên; tiến độ Bài X/10 theo cơ chế phiên */}
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
          <Text style={styles.hint}>
            Chạm các hình theo ĐÚNG trình tự hành động (1 → {content.step_count})
          </Text>

          <Pressable style={styles.listenBtn} onPress={playInstruction}>
            <Text style={styles.listenBtnText}>🔊 Nghe hướng dẫn</Text>
          </Pressable>

          {/* Lưới ảnh 2 CỘT — tap-to-order; sau nộp tô viền + nền theo step_feedback.
              Ảnh dùng CONTAIN (thấy TRỌN nội dung, KHÔNG cắt — bài này phải nhìn đủ
              hành động mới suy ra thứ tự); phần trống nền trắng. 3 ảnh -> ô to hơn,
              thường vừa 1 màn; 4-5 ảnh -> ScrollView bọc sẵn, cuộn được. */}
          <View style={styles.grid}>
            {content.steps.map((s) => {
              const orderIdx = picked.indexOf(s.step_id); // -1 = chưa chọn
              const fb = feedbackByStep.get(s.step_id);
              const full = buildAssetUrl(s.image_url);
              return (
                <Pressable
                  key={s.step_id}
                  style={[
                    styles.cell,
                    content.step_count <= 3 && styles.cellLarge,
                    orderIdx >= 0 && !result && styles.cellPicked,
                    fb && (fb.correct ? styles.cellCorrect : styles.cellWrong),
                  ]}
                  onPress={() => onTapImage(s.step_id)}
                >
                  {full ? (
                    <Image source={{ uri: full }} style={styles.image} resizeMode="contain" />
                  ) : (
                    <View style={styles.imageMissing}>
                      <Text style={styles.imageMissingIcon}>🖼️</Text>
                    </View>
                  )}
                  {/* Badge số thứ tự đã chạm (trước nộp) / vị trí đã đặt (sau nộp) */}
                  {orderIdx >= 0 ? (
                    <View
                      style={[
                        styles.badge,
                        fb ? (fb.correct ? styles.badgeCorrect : styles.badgeWrong) : null,
                      ]}
                    >
                      <Text style={styles.badgeText}>{orderIdx + 1}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* ── TRƯỚC NỘP: Xóa hết + Nộp ── */}
          {!result ? (
            <>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.clearBtn, picked.length === 0 && styles.disabled]}
                  disabled={picked.length === 0}
                  onPress={() => setPicked([])}
                >
                  <Text style={styles.clearBtnText}>🗑 Xóa hết</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.submitBtn,
                    (picked.length !== content.step_count || submitting) && styles.disabled,
                  ]}
                  disabled={picked.length !== content.step_count || submitting}
                  onPress={onSubmit}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      ➡️ Nộp ({picked.length}/{content.step_count})
                    </Text>
                  )}
                </Pressable>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          ) : (
            /* ── SAU NỘP: kết quả + đáp án (nếu sai) + Làm lại / Tiếp / Dừng ── */
            <>
              <View
                style={[
                  styles.resultBanner,
                  result.completed ? styles.resultOk : styles.resultBad,
                ]}
              >
                <Text
                  style={[
                    styles.resultText,
                    { color: result.completed ? GREEN : RED },
                  ]}
                >
                  {result.completed
                    ? `🎉 Chính xác! ${Math.round(result.score)} điểm`
                    : 'Chưa đúng thứ tự — xem đáp án bên dưới rồi thử lại nhé'}
                </Text>
              </View>

              {/* Sai -> dải đáp án đúng thu nhỏ để học */}
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

  body: { padding: 20, paddingTop: 4, gap: 14 },
  activityTitle: { fontSize: 24, fontWeight: 'bold', color: '#222', textAlign: 'center' },
  hint: { fontSize: 15, color: '#555', textAlign: 'center' },
  listenBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
  },
  listenBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  cell: {
    width: '46%',
    aspectRatio: 4 / 3,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#ddd',
    overflow: 'hidden',
    // Nền TRẮNG cho phần trống của contain (ảnh thu vừa trọn khung, không cắt)
    backgroundColor: '#fff',
  },
  // 3 ảnh (level 1): ô to hơn — 2 trên 1 dưới, thường vừa 1 màn không cuộn
  cellLarge: { width: '48%', aspectRatio: 1.15 },
  cellPicked: { borderColor: BLUE },
  // Sau nộp: viền dày + NỀN nhuộm nhạt để màu vẫn đọc rõ dù ảnh contain có khoảng trắng
  cellCorrect: { borderColor: GREEN, borderWidth: 4, backgroundColor: '#E7F5E9' },
  cellWrong: { borderColor: RED, borderWidth: 4, backgroundColor: '#FDEAEA' },
  image: { width: '100%', height: '100%' },
  imageMissing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageMissingIcon: { fontSize: 40 },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCorrect: { backgroundColor: GREEN },
  badgeWrong: { backgroundColor: RED },
  badgeText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

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
    flex: 1.4,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#1B5E3A',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.4 },

  resultBanner: { borderRadius: 12, padding: 14, borderWidth: 1 },
  resultOk: { backgroundColor: '#E7F5E9', borderColor: '#bfe3c6' },
  resultBad: { backgroundColor: '#FDEAEA', borderColor: '#f0c3c3' },
  resultText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },

  answerStrip: { gap: 6 },
  answerLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
  answerRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  answerItem: { alignItems: 'center', gap: 2 },
  answerImage: { width: 64, height: 48, borderRadius: 8 },
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
