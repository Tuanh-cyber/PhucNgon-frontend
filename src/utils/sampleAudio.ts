/**
 * Tạo 1 file WAV hợp lệ NGAY TRONG CODE để làm "audio mẫu" khi demo.
 *
 * LÝ DO tồn tại: trên trình duyệt (React Native Web), ghi âm mic thật (MediaRecorder) cho ra
 * định dạng webm/ogg, trong khi backend (app/services/audio_service.py) CHỈ nhận WAV đúng spec
 * (16kHz, mono, 16-bit PCM). Nên để demo chạy được trên web, ta sinh sẵn 1 file WAV hợp lệ.
 *
 * File sinh ra là 1 sóng sine 200Hz, biên độ 8000 (RMS ≈ -15 dBFS) — đủ to để vượt các ngưỡng
 * validate của backend (MIN_RMS_DB = -50, cần >= 0.3s tiếng nói). Cùng nguyên tắc với helper
 * _make_wav trong tests/test_audio_service.py của backend.
 *
 * TODO(mobile): thay bằng ghi âm thật (expo-audio) khi test trên điện thoại qua Expo Go.
 */

const SAMPLE_RATE = 16000; // Hz — bắt buộc theo spec backend
const DURATION_S = 1.5; // giây (nằm trong khoảng hợp lệ 0.3s–15s)
const FREQ_HZ = 200;
const AMPLITUDE = 8000;

/** Ghi 1 chuỗi ASCII vào DataView tại vị trí offset. */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i += 1) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/** Sinh mảng bytes của 1 file WAV (header 44 byte + PCM 16-bit). */
export function makeSampleWavBytes(): Uint8Array {
  const nSamples = Math.floor(DURATION_S * SAMPLE_RATE);
  const dataSize = nSamples * 2; // 16-bit = 2 byte / sample
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // ── RIFF header ──
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // ── fmt chunk ──
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  // ── data chunk ──
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < nSamples; i += 1) {
    const s = Math.round(AMPLITUDE * Math.sin((2 * Math.PI * FREQ_HZ * i) / SAMPLE_RATE));
    view.setInt16(44 + i * 2, s, true);
  }

  return new Uint8Array(buffer);
}

/** Blob WAV để phát lại ("Nghe lại") và nộp bài trên web. */
export function makeSampleWavBlob(): Blob {
  const bytes = makeSampleWavBytes();
  // .buffer là ArrayBuffer thật (tạo từ new ArrayBuffer) — cast cho khớp BlobPart.
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' });
}
