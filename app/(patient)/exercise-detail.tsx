/**
 * Màn LÀM BÀI — render KHÁC NHAU theo exercise_type từ GET /assignments/{id}/content:
 *
 *   naming                     : ảnh + "Tên của vật này là gì?" + ghi âm -> nộp audio
 *   command_identification
 *     - recognition            : nút Nghe câu hỏi + lưới 4 ô (ảnh + từ), chạm chọn 1 ô
 *                                -> nộp selected_vocab_id (KHÔNG audio)
 *     - repetition             : nút Nghe câu hỏi + ảnh target + ghi âm -> nộp audio
 *   sentence_building          : câu khuyết ("Tôi muốn ăn ____") + ảnh gợi ý + nút
 *                                "Nghe câu mẫu" + ghi âm cả câu -> nộp audio.
 *                                is_final=false -> hiện "Thử lại" (retry tối đa theo backend).
 *
 * Ảnh/audio là URL tương đối từ backend -> buildAssetUrl() ghép base; null -> placeholder/ẩn nút.
 *
 * GHI ÂM THẬT (web): src/utils/audioRecorder.ts — Web Audio API thu PCM từ micro, đóng gói
 * WAV 16kHz/mono/16-bit đúng spec backend, VAD tự ngắt khi im lặng ~1.8s (sau khi đã nói),
 * giới hạn cứng 15s. "Nghe lại" phát đúng âm thanh vừa ghi.
 * TODO(mobile): Platform khác web cần expo-audio (chưa cài) — hiện báo "chưa hỗ trợ".
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getAssignmentContent,
  getAssignmentsByType,
  submitAssignmentAudio,
  submitAssignmentChoice,
} from '@/src/api/assignments';
import { buildAssetUrl } from '@/src/api/client';
import { ExerciseResult } from '@/src/components/ExerciseResult';
import { exerciseDisplayName } from '@/src/constants/exercises';
import {
  WavRecorder,
  getPlaybackUrl,
  isRecordingSupported,
} from '@/src/utils/audioRecorder';
import type {
  AssignmentContent,
  AttemptSubmitResponse,
  PlanAssignment,
} from '@/src/types/api';

const GREEN = '#2E7D32';
const RED = '#D64545';
const YELLOW = '#E8912D';
const PURPLE = '#7C4DFF';

type RecordStatus = 'idle' | 'recording' | 'recorded';

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    assignmentId?: string;
    type?: string;
    topic?: string;
    index?: string;
  }>();
  const assignmentId = params.assignmentId ?? '';
  const exerciseType = params.type ?? 'naming'; // có thể là "mixed" (luồng trộn 3 dạng)
  const topic = params.topic ?? '';             // luồng chọn bài mới truyền topic
  const index = Number(params.index ?? '0');

  const [content, setContent] = useState<AssignmentContent | null>(null);
  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Trạng thái làm bài (dùng chung cho các dạng)
  const [recordStatus, setRecordStatus] = useState<RecordStatus>('idle');
  const [selectedVocabId, setSelectedVocabId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const recorderRef = useRef<WavRecorder | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    // reset trạng thái làm bài khi đổi bài
    setRecordStatus('idle');
    setSelectedVocabId(null);
    setResult(null);
    setError(null);
    audioBlobRef.current = null;
    // Đang ghi dở mà chuyển bài -> huỷ (dừng mic, BỎ bản ghi, không gọi callback cũ).
    recorderRef.current?.cancel();
    recorderRef.current = null;

    // Danh sách bài lấy CÙNG bộ lọc với màn danh sách (type + topic; "mixed" backend
    // trộn ổn định trong ngày) -> "Bài tiếp theo" đi đúng thứ tự người dùng đang thấy.
    Promise.all([
      getAssignmentContent(assignmentId),
      getAssignmentsByType(exerciseType, topic || undefined),
    ])
      .then(([c, list]) => {
        if (!active) return;
        setContent(c);
        setAssignments(list);
      })
      .catch(() => active && setLoadError('Không tải được nội dung bài. Vui lòng thử lại.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [assignmentId, exerciseType, topic]);

  const total = assignments.length || 10;
  // "mixed": tiêu đề theo dạng bài THẬT của bài đang làm (từ content), không phải "mixed"
  const title = exerciseDisplayName(
    exerciseType === 'mixed' ? content?.exercise_type ?? 'mixed' : exerciseType,
  );

  // ── Audio helpers ──────────────────────────────────────────────────────────
  // MỌI audio đang phát đi qua ref này -> đổi bài / rời màn là dừng được ngay,
  // không để audio bài cũ kêu chồng lên bài mới (new Audio().play() fire-and-forget
  // trước đây không dừng được).
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);

  function stopPlaying() {
    playingAudioRef.current?.pause();
    playingAudioRef.current = null;
  }

  /** Phát 1 URL audio từ backend (web: HTML5 Audio). URL null -> báo nhẹ, không crash. */
  function playRemote(url: string | null) {
    const full = buildAssetUrl(url);
    if (!full) {
      setError('Audio của bài này chưa có sẵn.');
      return;
    }
    setError(null);
    if (Platform.OS === 'web') {
      stopPlaying();
      const audio = new Audio(full);
      playingAudioRef.current = audio;
      void audio.play().catch(() => setError('Không phát được audio.'));
    } else {
      // TODO(mobile): phát audio bằng expo-audio khi test trên điện thoại.
      setError('Bản demo: phát audio hiện chỉ hỗ trợ trên web.');
    }
  }

  // Rời màn giữa chừng -> huỷ ghi âm (tắt mic) + dừng audio đang phát.
  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      recorderRef.current = null;
      stopPlaying();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TỰ PHÁT audio câu hỏi 1 lần, 1 GIÂY sau khi bài tải xong — CHỈ cho "Nghe và đoán"
  // (command_identification, cả recognition lẫn repetition) vì audio đó là ĐỀ BÀI.
  // KHÔNG autoplay cho naming (vocab_audio_url = đáp án) hay sentence_building
  // (sentence_audio_url = câu mẫu, thiết kế "chỉ nghe khi sai") — phát ra là lộ đáp án.
  //
  // Autoplay có thể bị trình duyệt CHẶN khi người dùng chưa tương tác với trang
  // (chính sách autoplay của Chrome/Safari): catch nuốt lỗi im lặng, KHÔNG crash —
  // nút "🔊 Nghe câu hỏi" luôn hiển thị làm fallback để người dùng tự bấm.
  // Mobile: chưa cài expo-audio -> bỏ qua autoplay (nút nghe vẫn hiện message hướng dẫn).
  useEffect(() => {
    if (!content || content.exercise_type !== 'command_identification') {
      return;
    }
    const url = buildAssetUrl(content.command_audio_url);
    if (!url || Platform.OS !== 'web') return;
    const timer = setTimeout(() => {
      stopPlaying();
      const audio = new Audio(url);
      playingAudioRef.current = audio;
      void audio.play().catch(() => undefined); // autoplay bị chặn -> im lặng, có nút fallback
    }, 1000);
    // Đổi bài / rời màn khi CHƯA hết 1s -> huỷ hẹn; đã phát -> dừng audio.
    return () => {
      clearTimeout(timer);
      stopPlaying();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  async function onToggleRecord() {
    setError(null);

    if (recordStatus === 'recording') {
      // Dừng thủ công -> onStop (đăng ký lúc start) đóng gói WAV thật và cập nhật state.
      recorderRef.current?.stop();
      return;
    }

    if (!isRecordingSupported()) {
      // TODO(mobile): cài expo-audio + viết nhánh ghi âm native; hiện chỉ hỗ trợ web.
      setError('Ghi âm hiện chỉ hỗ trợ trên trình duyệt web. Bản mobile sẽ bổ sung sau.');
      return;
    }

    setResult(null);
    const rec = new WavRecorder();
    try {
      await rec.start((blob) => {
        // Được gọi khi: chạm dừng thủ công / VAD im lặng ~1.8s / chạm 15s (giới hạn backend).
        audioBlobRef.current = blob;
        recorderRef.current = null;
        setRecordStatus('recorded');
      });
      recorderRef.current = rec;
      setRecordStatus('recording');
    } catch {
      setError('Không truy cập được micro. Kiểm tra quyền micro của trình duyệt.');
    }
  }

  function onPlayback() {
    // Phát lại đúng đoạn VỪA GHI từ micro (object URL từ Blob thật).
    if (!audioBlobRef.current || Platform.OS !== 'web') return;
    stopPlaying();
    const url = getPlaybackUrl(audioBlobRef.current);
    const audio = new Audio(url);
    playingAudioRef.current = audio;
    audio.onended = () => URL.revokeObjectURL(url);
    void audio.play().catch(() => setError('Không phát lại được bản ghi.'));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submitAudio() {
    if (!audioBlobRef.current) return;
    setSubmitting(true);
    setError(null);
    try {
      setResult(await submitAssignmentAudio(assignmentId, audioBlobRef.current));
    } catch {
      setError('Không nộp được bài. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitChoice() {
    if (!selectedVocabId) return;
    setSubmitting(true);
    setError(null);
    try {
      setResult(await submitAssignmentChoice(assignmentId, selectedVocabId));
    } catch {
      setError('Không nộp được bài. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  function onRetry() {
    // SEN retry: giữ nguyên bài, xoá kết quả + bản ghi để làm lại (attempt_number tăng ở backend).
    setResult(null);
    setRecordStatus('idle');
    audioBlobRef.current = null;
  }

  function onNext() {
    const next = assignments[index + 1];
    if (next) {
      router.replace(
        `/(patient)/exercise-detail?assignmentId=${encodeURIComponent(
          next.assignment_id,
        )}&type=${exerciseType}&topic=${topic}&index=${index + 1}`,
      );
    } else {
      // Hết bài: quay về màn danh sách đã mở bài này (exercise-list mới hoặc
      // exercises cũ đều refetch khi focus) — back giữ đúng stack cho cả 2 luồng.
      router.back();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.muted}>Đang tải bài...</Text>
      </View>
    );
  }

  if (loadError || !content) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{loadError ?? 'Không có dữ liệu bài.'}</Text>
        <Pressable style={styles.nextBtn} onPress={() => router.back()}>
          <Text style={styles.nextBtnText}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const isRecognition =
    content.exercise_type === 'command_identification' && content.mode === 'recognition';

  // Đã nộp bài -> hiện MÀN KẾT QUẢ (đọc 100% từ response submit, không gọi stats).
  if (result) {
    return (
      <ExerciseResult
        result={result}
        canPlayRecording={audioBlobRef.current !== null && Platform.OS === 'web'}
        onPlayRecording={onPlayback}
        onRetry={onRetry}
        onNext={onNext}
        onBack={() => router.back()}
        isLast={index + 1 >= total}
        error={error}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header chung */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.counter}>
          {index + 1}/{total}
        </Text>
      </View>

      {/* ── Nội dung theo loại bài ── */}
      {content.exercise_type === 'naming' && (
        <>
          <Text style={styles.hint}>Nhìn vào hình bên dưới</Text>
          <AssetImage url={content.image_url} />
          <Text style={styles.question}>{content.prompt}</Text>
          <RecordControls
            status={recordStatus}
            submitting={submitting}
            hasResult={result !== null}
            onToggleRecord={onToggleRecord}
            onPlayback={onPlayback}
            onSubmit={submitAudio}
          />
        </>
      )}

      {isRecognition && content.exercise_type === 'command_identification' && content.mode === 'recognition' && (
        <>
          <Text style={styles.hint}>Nghe câu hỏi và chọn đáp án đúng</Text>
          {/* Câu hỏi tự phát 1 lần sau 1s (effect ở trên); nút này để nghe LẠI. */}
          <Pressable
            style={styles.listenBtn}
            onPress={() => playRemote(content.command_audio_url)}
          >
            <Text style={styles.listenBtnText}>🔊 Nghe lại câu hỏi</Text>
          </Pressable>
          {/* Caption câu hỏi — hỗ trợ đọc kèm (accessibility) */}
          <Text style={styles.caption}>{content.command_text}</Text>

          <View style={styles.choiceGrid}>
            {content.choices.map((c) => {
              const selected = selectedVocabId === c.vocab_id;
              return (
                <Pressable
                  key={c.vocab_id}
                  style={[styles.choice, selected && styles.choiceSelected]}
                  onPress={() => {
                    setSelectedVocabId(c.vocab_id);
                    setError(null);
                  }}
                  disabled={result !== null}
                >
                  <AssetImage url={c.image_url} small />
                  <Text style={[styles.choiceWord, selected && styles.choiceWordSelected]}>
                    {c.word}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[
              styles.submitBtn,
              (!selectedVocabId || submitting || result !== null) && styles.disabled,
            ]}
            onPress={submitChoice}
            disabled={!selectedVocabId || submitting || result !== null}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>➡️ Gửi bài</Text>
            )}
          </Pressable>
        </>
      )}

      {content.exercise_type === 'command_identification' && content.mode === 'repetition' && (
        <>
          <Text style={styles.hint}>Nghe câu hỏi, nhìn hình và nói to từ đó</Text>
          <Pressable
            style={styles.listenBtn}
            onPress={() => playRemote(content.command_audio_url)}
          >
            <Text style={styles.listenBtnText}>🔊 Nghe câu hỏi</Text>
          </Pressable>
          <AssetImage url={content.image_url} />
          <Text style={styles.question}>{content.prompt}</Text>
          <RecordControls
            status={recordStatus}
            submitting={submitting}
            hasResult={result !== null}
            onToggleRecord={onToggleRecord}
            onPlayback={onPlayback}
            onSubmit={submitAudio}
          />
        </>
      )}

      {content.exercise_type === 'sentence_building' && (
        <>
          <Text style={styles.hint}>Nhìn câu và hình gợi ý, nói TO cả câu hoàn chỉnh</Text>
          <View style={styles.templateBox}>
            <Text style={styles.templateText}>{content.template_display}</Text>
          </View>
          <AssetImage url={content.image_url} />
          {content.sentence_audio_url ? (
            <Pressable
              style={styles.listenBtn}
              onPress={() => playRemote(content.sentence_audio_url)}
            >
              <Text style={styles.listenBtnText}>💡 Gợi ý</Text>
            </Pressable>
          ) : null}
          <RecordControls
            status={recordStatus}
            submitting={submitting}
            hasResult={result !== null}
            onToggleRecord={onToggleRecord}
            onPlayback={onPlayback}
            onSubmit={submitAudio}
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {/* Sau khi nộp bài, màn KẾT QUẢ được render qua early-return ExerciseResult ở trên. */}
    </ScrollView>
  );
}

/** Ảnh asset từ backend; url null/lỗi tải -> placeholder emoji, KHÔNG màn trắng. */
function AssetImage({ url, small }: { url: string | null; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const full = buildAssetUrl(url);
  const boxStyle = small ? styles.imageBoxSmall : styles.imageBox;
  if (!full || failed) {
    return (
      <View style={boxStyle}>
        <Text style={small ? styles.imageEmojiSmall : styles.imageEmoji}>🖼️</Text>
      </View>
    );
  }
  return (
    <View style={boxStyle}>
      <Image
        source={{ uri: full }}
        style={styles.image}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

/** Cụm ghi âm dùng chung cho các bài speech: sóng âm + Ghi âm / Nghe lại / Gửi bài. */
function RecordControls({
  status,
  submitting,
  hasResult,
  onToggleRecord,
  onPlayback,
  onSubmit,
}: {
  status: RecordStatus;
  submitting: boolean;
  hasResult: boolean;
  onToggleRecord: () => void;
  onPlayback: () => void;
  onSubmit: () => void;
}) {
  const recorded = status === 'recorded';
  const canSubmit = recorded && !submitting && !hasResult;
  return (
    <>
      <Waveform active={status === 'recording'} />
      <Pressable
        style={[styles.recordBtn, status === 'recording' && styles.recordBtnActive]}
        onPress={onToggleRecord}
        disabled={submitting}
      >
        <Text style={styles.recordBtnText}>
          {status === 'recording'
            ? '⏺  Đang ghi... (chạm để dừng)'
            : recorded
              ? '🎤  Ghi âm lại'
              : '🎤  Bắt đầu ghi âm'}
        </Text>
      </Pressable>
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.action, { borderColor: YELLOW }, !recorded && styles.disabled]}
          onPress={onPlayback}
          disabled={!recorded}
        >
          <Text style={[styles.actionText, { color: YELLOW }]}>🔁 Nghe lại</Text>
        </Pressable>
        <Pressable
          style={[styles.action, { borderColor: GREEN }, !canSubmit && styles.disabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={GREEN} />
          ) : (
            <Text style={[styles.actionText, { color: GREEN }]}>➡️ Gửi bài</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

/** Sóng âm giả lập: các thanh dao động khi đang ghi (active). */
function Waveform({ active }: { active: boolean }) {
  const bars = useRef([...Array(14)].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((b) => b.setValue(0.3));
      return;
    }
    const anims = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 1, duration: 260 + i * 30, useNativeDriver: false }),
          Animated.timing(b, { toValue: 0.3, duration: 260 + i * 30, useNativeDriver: false }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [active, bars]);

  return (
    <View style={styles.wave}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={[styles.waveBar, { transform: [{ scaleY: b }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { fontSize: 15, color: '#666' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { fontSize: 22, color: GREEN, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold' },
  counter: { fontSize: 20, fontWeight: 'bold', color: GREEN },
  hint: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  caption: { fontSize: 15, color: '#555', textAlign: 'center', fontStyle: 'italic' },
  imageBox: {
    backgroundColor: '#E7F5E9',
    borderRadius: 20,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageBoxSmall: {
    backgroundColor: '#E7F5E9',
    borderRadius: 12,
    height: 90,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageEmoji: { fontSize: 90 },
  imageEmojiSmall: { fontSize: 40 },
  question: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  templateBox: {
    backgroundColor: '#F3EEFF',
    borderRadius: 16,
    padding: 18,
  },
  templateText: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: PURPLE },
  listenBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  listenBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  choice: {
    width: '47%',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },
  choiceSelected: { borderColor: PURPLE, backgroundColor: '#F3EEFF' },
  choiceWord: { fontSize: 16, fontWeight: '600' },
  choiceWordSelected: { color: PURPLE },
  submitBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 70,
    backgroundColor: '#F3EEFF',
    borderRadius: 16,
  },
  waveBar: { width: 6, height: 36, borderRadius: 3, backgroundColor: PURPLE },
  recordBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  recordBtnActive: { backgroundColor: RED },
  recordBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 12 },
  action: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  actionText: { fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.4 },
  error: { color: RED, fontSize: 15, textAlign: 'center' },
  nextBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
