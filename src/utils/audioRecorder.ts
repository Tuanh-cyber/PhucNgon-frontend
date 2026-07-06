/**
 * Ghi âm THẬT từ micro (web) -> WAV 16kHz / mono / 16-bit PCM đúng spec backend.
 *
 * Web Audio API: getUserMedia -> AudioContext({sampleRate:16000}) -> ScriptProcessorNode
 * thu PCM thô. (ScriptProcessorNode đã deprecated nhưng chạy ổn mọi trình duyệt và không cần
 * file worklet riêng — đủ cho phạm vi hiện tại; nâng cấp AudioWorklet sau nếu cần.)
 *
 * VAD tự ngắt — tham số đối chiếu backend (audio_input.py / audio_service.py):
 *   - SILENCE_THRESHOLD_DB = -40  (VAD_SILENCE_THRESHOLD: frame dưới ngưỡng coi là im lặng)
 *   - MAX_DURATION_S       = 15   (MAX_AUDIO_DURATION_S: backend từ chối file dài hơn)
 *   - SILENCE_HANG_S       = 1.8  (thời gian im lặng liên tục để tự dừng SAU KHI đã có giọng
 *                                  nói. KHÔNG có trong audio_input.py — file đó chỉ validate
 *                                  server-side, không có tham số auto-stop phía client.
 *                                  TODO: chốt lại con số này với team nếu 1.8s chưa hợp UX.)
 *
 * Luồng: start(onStop) -> ghi; tự dừng khi (đã nói + im lặng 1.8s) HOẶC đủ 15s HOẶC gọi stop()
 * thủ công. Khi dừng: đóng gói WAV -> gọi onStop(blob).
 *
 * TODO(mobile): Platform khác 'web' chưa hỗ trợ — cần cài expo-audio và viết nhánh riêng
 * (isRecordingSupported() trả false để UI hiện thông báo thay vì crash).
 */

import { Platform } from 'react-native';

const TARGET_SAMPLE_RATE = 16000; // Hz — backend bắt buộc (REQUIRED_SAMPLE_RATE)
const SILENCE_THRESHOLD_DB = -40; // dBFS — khớp VAD_SILENCE_THRESHOLD backend
const MAX_DURATION_S = 15; // giây — khớp MAX_AUDIO_DURATION_S backend
const SILENCE_HANG_S = 1.8; // giây im lặng liên tục -> tự dừng (xem ghi chú đầu file)
const PROCESSOR_BUFFER = 2048; // mẫu / lần callback (~128ms @16kHz) — đủ mịn cho VAD

/** Web + có micro API thì mới ghi âm được. */
export function isRecordingSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** RMS (dBFS) của 1 buffer Float32 [-1..1]. Buffer im hoàn toàn -> -Infinity. */
function rmsDb(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
  const rms = Math.sqrt(sum / buf.length);
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/** Resample tuyến tính về 16kHz (phòng trình duyệt không tôn trọng sampleRate yêu cầu). */
function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const outLen = Math.round((input.length * toRate) / fromRate);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const pos = (i * fromRate) / toRate;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    out[i] = input[i0] + (input[i1] - input[i0]) * (pos - i0);
  }
  return out;
}

/** Đóng gói PCM Float32 -> Blob WAV 16-bit mono. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples.length; i += 1) {
    // clamp [-1,1] rồi scale về Int16
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export type StopReason = 'manual' | 'vad_silence' | 'max_duration';

/**
 * Bộ ghi âm 1 lượt. Dùng: tạo mới cho mỗi lần ghi, start() rồi chờ onStop.
 *   const rec = new WavRecorder();
 *   await rec.start((blob, reason) => { ... });   // tự dừng -> callback
 *   rec.stop();                                    // hoặc dừng thủ công -> cùng callback
 */
export class WavRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private chunks: Float32Array[] = [];
  private onStopCb: ((blob: Blob, reason: StopReason) => void) | null = null;
  private stopped = false;

  private speechDetected = false;
  private silenceSince: number | null = null; // ms epoch bắt đầu chuỗi im lặng hiện tại
  private startedAt = 0;

  get isRecording(): boolean {
    return this.ctx !== null && !this.stopped;
  }

  /** Xin quyền micro và bắt đầu ghi. Ném lỗi nếu bị từ chối quyền / không hỗ trợ. */
  async start(onStop: (blob: Blob, reason: StopReason) => void): Promise<void> {
    if (!isRecordingSupported()) {
      throw new Error('Ghi âm chưa hỗ trợ trên nền tảng này (chỉ web).');
    }
    this.onStopCb = onStop;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    // Yêu cầu 16kHz để trình duyệt tự resample; nếu không tôn trọng, ta resample lúc encode.
    const Ctx: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    try {
      this.ctx = new Ctx({ sampleRate: TARGET_SAMPLE_RATE });
    } catch {
      this.ctx = new Ctx(); // Safari cũ không cho chọn sampleRate
    }

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(PROCESSOR_BUFFER, 1, 1);
    this.startedAt = Date.now();

    this.processor.onaudioprocess = (e) => {
      if (this.stopped) return;
      const buf = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(buf)); // copy — buffer bị tái sử dụng

      const now = Date.now();
      // Giới hạn cứng 15s (backend từ chối dài hơn)
      if ((now - this.startedAt) / 1000 >= MAX_DURATION_S) {
        this.finish('max_duration');
        return;
      }
      // VAD: chỉ auto-stop SAU KHI đã phát hiện giọng nói ít nhất 1 lần
      const db = rmsDb(buf);
      if (db > SILENCE_THRESHOLD_DB) {
        this.speechDetected = true;
        this.silenceSince = null;
      } else if (this.speechDetected) {
        if (this.silenceSince === null) this.silenceSince = now;
        else if ((now - this.silenceSince) / 1000 >= SILENCE_HANG_S) {
          this.finish('vad_silence');
        }
      }
    };

    this.source.connect(this.processor);
    // ScriptProcessor cần nối tới destination mới chạy callback; gain 0 để không nghe echo.
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.processor.connect(mute);
    mute.connect(this.ctx.destination);
  }

  /** Dừng thủ công — cũng đi qua finish() để đóng gói WAV + gọi onStop. */
  stop(): void {
    this.finish('manual');
  }

  /** Huỷ ghi: dừng mic + BỎ bản ghi, KHÔNG gọi onStop (dùng khi rời màn/đổi bài giữa chừng). */
  cancel(): void {
    this.onStopCb = null;
    this.finish('manual');
  }

  private finish(reason: StopReason): void {
    if (this.stopped) return;
    this.stopped = true;

    const ctxRate = this.ctx?.sampleRate ?? TARGET_SAMPLE_RATE;

    // Dọn tài nguyên (dừng mic, đóng context)
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => undefined);

    // Ghép chunks -> 1 Float32Array
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    this.chunks = [];

    const at16k = resampleLinear(merged, ctxRate, TARGET_SAMPLE_RATE);
    const blob = encodeWav(at16k, TARGET_SAMPLE_RATE);
    this.onStopCb?.(blob, reason);
  }
}

/** Tạo object URL từ Blob đã ghi để nút "Nghe lại" phát âm thanh THẬT. Nhớ revoke sau khi phát. */
export function getPlaybackUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
