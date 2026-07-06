/**
 * Màn "Kết quả bài tập" — hiển thị SAU khi nộp 1 bài.
 *
 * NGUỒN DỮ LIỆU: 100% từ RESPONSE của POST /assignments/{id}/submit
 * (prop `result: AttemptSubmitResponse`) — KHÔNG gọi /patients/me/stats (đó là số
 * TRUNG BÌNH nhiều lượt, sai cho màn này). Các field dùng:
 *   - score                                   -> điểm tổng
 *   - accuracy_score/completion_score/fluency_score -> 3 thẻ Thống kê (RIÊNG lượt này)
 *   - transcript                              -> "Bạn đã nói: ..."
 *   - feedback [{type:'ok'|'warn', text}]     -> danh sách nhận xét (tích xanh / cảnh báo đỏ)
 *   - result / is_final / leveled_up / new_level
 *
 * Mọi nhãn định tính (Tốt/Khá/Cần cải thiện) + pill trạng thái là DISPLAY-ONLY, suy từ
 * band điểm — không tính toán gì ảnh hưởng dữ liệu. Chỉ dùng primitive RN -> chạy cả
 * mobile lẫn web. Phát lại audio bệnh nhân do màn cha xử lý (onPlayRecording).
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AttemptSubmitResponse } from '@/src/types/api';

const GREEN = '#2E7D32';
const RED = '#D64545';
const ORANGE = '#E8912D';
const PURPLE = '#7C4DFF';
const MUTED = '#8a8a8a';

/** band điểm -> nhãn định tính (display-only). null = chưa có dữ liệu tiêu chí đó. */
function qualitative(v: number | null): { label: string; color: string } {
  if (v == null) return { label: '—', color: MUTED };
  if (v >= 80) return { label: 'Tốt', color: GREEN };
  if (v >= 60) return { label: 'Khá', color: ORANGE };
  return { label: 'Cần cải thiện', color: RED };
}

function pctText(v: number | null): string {
  return v == null ? '—' : `${Math.round(v)}%`;
}

/** pill trạng thái tổng, suy từ result + score (display-only). */
function statusPill(result: AttemptSubmitResponse): { text: string; bg: string; fg: string } {
  switch (result.result) {
    case 'correct':
      return { text: 'Chính xác! 🎉', bg: '#E7F5E9', fg: GREEN };
    case 'incorrect':
      return { text: 'Chưa đúng, thử lại nhé', bg: '#FDEAEA', fg: RED };
    case 'invalid':
      return { text: 'Chưa nghe rõ, nói lại nhé', bg: '#FDEAEA', fg: RED };
    default:
      break;
  }
  const s = result.score ?? 0;
  if (result.result === 'pass' || s >= 80) {
    return { text: 'Bạn làm tốt lắm! 🎉', bg: '#E7F5E9', fg: GREEN };
  }
  if (s >= 60) return { text: 'Khá tốt, cố lên!', bg: '#FFF4E5', fg: ORANGE };
  return { text: 'Cần luyện thêm nhé', bg: '#FDEAEA', fg: RED };
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number | null;
  color: string;
}) {
  const q = qualitative(value);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statPct, { color }]}>{pctText(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statQual, { color: q.color }]}>{q.label}</Text>
    </View>
  );
}

export function ExerciseResult({
  result,
  canPlayRecording,
  onPlayRecording,
  onRetry,
  onNext,
  onBack,
  isLast,
  error,
}: {
  result: AttemptSubmitResponse;
  canPlayRecording: boolean;
  onPlayRecording: () => void;
  onRetry: () => void;
  onNext: () => void;
  onBack: () => void;
  isLast: boolean;
  error?: string | null;
}) {
  const pill = statusPill(result);
  const hasNumericScore = result.score != null;

  return (
    <View style={styles.screen}>
      {/* Header: back + tiêu đề */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Kết quả bài tập</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Lên level (rule.md) */}
        {result.leveled_up && result.new_level != null ? (
          <View style={styles.levelUpBox}>
            <Text style={styles.levelUpText}>
              🎉 Chúc mừng! Bạn đã lên Level {result.new_level}
            </Text>
            <Text style={styles.levelUpSub}>
              Bài tập mới khó hơn đã được thêm vào danh sách của bạn.
            </Text>
          </View>
        ) : null}

        {/* Điểm tổng */}
        {hasNumericScore ? (
          <View style={styles.heroWrap}>
            <Text style={styles.heroScore}>
              {Math.round(result.score as number)}
              <Text style={styles.heroMax}>/100</Text>
            </Text>
            <Text style={styles.heroUnit}>Điểm</Text>
          </View>
        ) : (
          <Text style={[styles.heroText, { color: pill.fg }]}>
            {result.result === 'correct'
              ? '✔ Chính xác!'
              : result.result === 'incorrect'
                ? '✘ Chưa đúng'
                : 'Chưa nghe rõ'}
          </Text>
        )}

        {/* Pill trạng thái */}
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillText, { color: pill.fg }]}>{pill.text}</Text>
        </View>

        {/* Thống kê — 3 thẻ ngang hàng */}
        <Text style={styles.section}>Thống kê</Text>
        <View style={styles.statsRow}>
          <StatCard icon="🎯" label="Độ chính xác" value={result.accuracy_score} color={GREEN} />
          <StatCard icon="✅" label="Độ hoàn thành" value={result.completion_score} color={PURPLE} />
          <StatCard icon="💬" label="Độ trôi chảy" value={result.fluency_score} color={ORANGE} />
        </View>

        {/* Nhận xét */}
        <Text style={styles.section}>Nhận xét</Text>
        {result.transcript ? (
          <View style={styles.transcriptRow}>
            <Text style={styles.transcriptText}>
              Bạn đã nói: “{result.transcript}”
            </Text>
            {canPlayRecording ? (
              <Pressable onPress={onPlayRecording} style={styles.playBtn} hitSlop={8}>
                <Text style={styles.playBtnText}>🔊</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {result.feedback.length > 0 ? (
          result.feedback.map((f, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletIcon}>{f.type === 'ok' ? '✅' : '⚠️'}</Text>
              <Text style={[styles.bulletText, { color: f.type === 'ok' ? GREEN : RED }]}>
                {f.text}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>Chưa có nhận xét cho lượt này.</Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* SEN chưa đạt -> cho thử lại */}
        {!result.is_final ? (
          <Pressable style={[styles.actionBtn, styles.retryBtn]} onPress={onRetry}>
            <Text style={styles.actionBtnText}>
              🔁 Thử lại (lần {result.attempt_number + 1})
            </Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.actionBtn} onPress={onNext}>
          <Text style={styles.actionBtnText}>{isLast ? 'Hoàn thành' : 'Bài tiếp theo →'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  back: { fontSize: 34, color: GREEN, lineHeight: 34, fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  headerSpacer: { width: 30 },
  body: { padding: 20, gap: 14, paddingBottom: 32 },

  levelUpBox: {
    backgroundColor: '#FFF7E0',
    borderWidth: 1,
    borderColor: '#F0D48A',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  levelUpText: { fontSize: 17, fontWeight: 'bold', color: '#B8860B', textAlign: 'center' },
  levelUpSub: { fontSize: 14, color: '#8a6d1a', textAlign: 'center' },

  heroWrap: { alignItems: 'center', marginTop: 6 },
  heroScore: { fontSize: 64, fontWeight: 'bold', color: '#222', lineHeight: 70 },
  heroMax: { fontSize: 30, fontWeight: 'bold', color: MUTED },
  heroUnit: { fontSize: 18, color: '#555', marginTop: -4 },
  heroText: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginTop: 6 },

  pill: { alignSelf: 'center', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  pillText: { fontSize: 17, fontWeight: '600' },

  section: { fontSize: 20, fontWeight: 'bold', color: '#222', marginTop: 8 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#faf9fd',
    borderWidth: 1,
    borderColor: '#eceaf4',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 24 },
  statPct: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 13, color: '#444', textAlign: 'center' },
  statQual: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  transcriptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
    padding: 14,
  },
  transcriptText: { fontSize: 17, color: '#333', flexShrink: 1, fontStyle: 'italic' },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: { fontSize: 20, color: '#fff' },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletIcon: { fontSize: 16, marginTop: 1 },
  bulletText: { fontSize: 16, flexShrink: 1, lineHeight: 22 },

  muted: { fontSize: 15, color: MUTED },
  error: { fontSize: 15, color: RED, marginTop: 4 },

  actionBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    borderBottomWidth: 5,
    borderBottomColor: '#1B5E3A',
  },
  retryBtn: { backgroundColor: ORANGE, borderBottomColor: '#B86E12' },
  actionBtnText: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
});
