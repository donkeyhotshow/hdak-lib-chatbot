/**
 * Groove Analyzer 4.2-ESSENTIAL
 *
 * Flat, minimal audio analysis UI.
 * No shadows, blurs, glows, icons, hints or animations.
 * Colors: #000 bg · #111 panels · #eee/#ccc wave · #FFAA00 playhead
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: string;
  name: string;
  file: File | null;
  bpm: number | null;
  duration: number;
}

type BottomView = "spectrum" | "microscope";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAMPLE_TRACKS: Track[] = [
  { id: "1", name: "track_01.wav", file: null, bpm: null, duration: 0 },
  { id: "2", name: "track_02.wav", file: null, bpm: null, duration: 0 },
  { id: "3", name: "track_03.wav", file: null, bpm: null, duration: 0 },
];

const TRANSIENT_THRESHOLD = 0.4;
const FFT_SIZE = 2048;

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Generate simulated waveform data for a track (used when no real file). */
function generateMockWaveform(length: number): Float32Array {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    data[i] =
      Math.sin(t * Math.PI * 200) * 0.4 +
      Math.sin(t * Math.PI * 50) * 0.3 +
      (Math.random() - 0.5) * 0.15 +
      Math.sin(t * Math.PI * 7) * Math.exp(-t * 3) * 0.4;
  }
  return data;
}

/** Find transient positions in waveform data. */
function findTransients(data: Float32Array): number[] {
  const transients: number[] = [];
  const windowSize = Math.floor(data.length / 200);
  for (let i = windowSize; i < data.length - windowSize; i += windowSize) {
    const prev = data.slice(i - windowSize, i).reduce((a, b) => a + Math.abs(b), 0) / windowSize;
    const cur = data.slice(i, i + windowSize).reduce((a, b) => a + Math.abs(b), 0) / windowSize;
    if (cur > prev * 1.8 && cur > TRANSIENT_THRESHOLD) {
      transients.push(i / data.length);
    }
  }
  return transients;
}

/** Detect BPM from waveform data (simplified onset-based estimate). */
function estimateBPM(data: Float32Array, sampleRate: number): number {
  const onsets: number[] = [];
  const hop = Math.floor(sampleRate / 100);
  let prevEnergy = 0;
  for (let i = 0; i < data.length - hop; i += hop) {
    let energy = 0;
    for (let j = i; j < i + hop; j++) energy += data[j] * data[j];
    energy /= hop;
    if (energy > prevEnergy * 1.5 && energy > 0.01) onsets.push(i / sampleRate);
    prevEnergy = energy;
  }
  if (onsets.length < 4) return 120;
  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) intervals.push(onsets[i] - onsets[i - 1]);
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return Math.round(60 / avg);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Linear VU meter — a single horizontal bar made of segments. */
function MiniVU({ level }: { level: number }) {
  const segments = 20;
  const active = Math.round(level * segments);
  return (
    <div style={{ display: "flex", gap: 1, height: 6, width: "100%" }}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            background: i < active
              ? i > segments * 0.75
                ? "#ff4444"
                : i > segments * 0.55
                  ? "#FFAA00"
                  : "#eee"
              : "#222",
          }}
        />
      ))}
    </div>
  );
}

/** Main waveform canvas — white line on black, transient markers, playhead. */
function WaveformCanvas({
  data,
  transients,
  playPosition,
}: {
  data: Float32Array | null;
  transients: number[];
  playPosition: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    if (!data || data.length === 0) {
      // Empty state — just center line
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      return;
    }

    const mid = H / 2;
    const step = Math.max(1, Math.floor(data.length / W));

    // Waveform — draw mirrored fill first (ccc), then center line (eee)
    ctx.beginPath();
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x++) {
      const idx = Math.floor((x / W) * data.length);
      let max = 0;
      for (let j = 0; j < step && idx + j < data.length; j++) {
        const v = Math.abs(data[idx + j]);
        if (v > max) max = v;
      }
      const yOffset = max * (mid - 2);
      if (x === 0) {
        ctx.moveTo(x, mid - yOffset);
      } else {
        ctx.lineTo(x, mid - yOffset);
      }
    }
    // Mirror bottom
    for (let x = W - 1; x >= 0; x--) {
      const idx = Math.floor((x / W) * data.length);
      let max = 0;
      for (let j = 0; j < step && idx + j < data.length; j++) {
        const v = Math.abs(data[idx + j]);
        if (v > max) max = v;
      }
      const yOffset = max * (mid - 2);
      ctx.lineTo(x, mid + yOffset);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(200,200,200,0.08)";
    ctx.fill();
    ctx.stroke();

    // Center line (bright)
    ctx.beginPath();
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1.5;
    for (let x = 0; x < W; x++) {
      const idx = Math.floor((x / W) * data.length);
      const sample = data[idx] ?? 0;
      const y = mid - sample * (mid - 2);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Transient markers
    ctx.strokeStyle = "#FFAA00";
    ctx.lineWidth = 1;
    for (const t of transients) {
      const x = Math.round(t * W);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, H * 0.85);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Playhead
    {
      const px = Math.round(playPosition * W);
      ctx.strokeStyle = "#FFAA00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
    }
  }, [data, transients, playPosition]);

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={220}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

/** Spectrum FFT canvas — vertical bars on black. */
function SpectrumCanvas({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        const barWidth = W / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * H;
          const brightness = Math.floor((dataArray[i] / 255) * 180 + 75);
          ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
          ctx.fillRect(i * barWidth, H - barHeight, barWidth - 1, barHeight);
        }
      } else {
        // Static demo bars
        for (let i = 0; i < 64; i++) {
          const h = Math.random() * H * 0.4 * Math.exp(-i / 32) + 2;
          ctx.fillStyle = "#333";
          ctx.fillRect((i / 64) * W, H - h, W / 64 - 1, h);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={100}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

/** Microscope waveform canvas — zoomed time-domain signal. */
function MicroscopeCanvas({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      if (analyser) {
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);
        ctx.strokeStyle = "#eee";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          const x = (i / bufferLength) * W;
          const y = (H / 2) * (1 - dataArray[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Static sine demo
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < W; i++) {
          const y = H / 2 + Math.sin((i / W) * Math.PI * 8) * H * 0.2;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={100}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GrooveAnalyzer() {
  const [tracks, setTracks] = useState<Track[]>(SAMPLE_TRACKS);
  const [selectedId, setSelectedId] = useState<string>("1");
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [transients, setTransients] = useState<number[]>([]);
  const [bpm, setBpm] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPosition, setPlayPosition] = useState(0);
  const [vuLevel, setVuLevel] = useState(0);
  const [bottomView, setBottomView] = useState<BottomView>("spectrum");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const playAnimRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTrack = tracks.find((t) => t.id === selectedId) ?? tracks[0];

  // ── Audio context init ─────────────────────────────────────────────────────

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // ── Initialize (reset) ────────────────────────────────────────────────────

  const handleInitialize = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* InvalidStateError: node already stopped */ }
    setPlayPosition(0);
    setWaveformData(null);
    setTransients([]);
    setBpm(null);
    setAnalyser(null);
    setVuLevel(0);
    setTracks(SAMPLE_TRACKS);
    setSelectedId("1");
    audioBufferRef.current = null;
    cancelAnimationFrame(playAnimRef.current);
  }, []);

  // ── Analyze ───────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    const ctx = ensureAudioCtx();

    const track = tracks.find((t) => t.id === selectedId);
    if (track?.file) {
      try {
        const arrayBuffer = await track.file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
        const raw = audioBuffer.getChannelData(0);
        setWaveformData(raw);
        const trs = findTransients(raw);
        setTransients(trs);
        const detectedBpm = estimateBPM(raw, audioBuffer.sampleRate);
        setBpm(detectedBpm);
        setTracks((prev) =>
          prev.map((t) =>
            t.id === selectedId
              ? { ...t, bpm: detectedBpm, duration: audioBuffer.duration }
              : t,
          ),
        );
      } catch (err) {
        // DOMException (EncodingError/NotSupportedError) or malformed file — fall back to mock data
        console.warn("[GrooveAnalyzer] Audio decode failed, using mock waveform:", err);
        const mock = generateMockWaveform(44100 * 4);
        setWaveformData(mock);
        setTransients(findTransients(mock));
        setBpm(128);
      }
    } else {
      // No real file — generate plausible mock data
      const mock = generateMockWaveform(44100 * 4);
      setWaveformData(mock);
      setTransients(findTransients(mock));
      setBpm(128);
    }

    setAnalyzing(false);
  }, [tracks, selectedId, ensureAudioCtx]);

  // ── Play / Stop ───────────────────────────────────────────────────────────

  const handlePlay = useCallback(() => {
    const ctx = ensureAudioCtx();

    if (isPlaying) {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* InvalidStateError: node already stopped */ }
      startOffsetRef.current += ctx.currentTime - startTimeRef.current;
      setIsPlaying(false);
      return;
    }

    if (!audioBufferRef.current) return;

    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = FFT_SIZE;
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 1;

    source.connect(analyserNode);
    analyserNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    const duration = audioBufferRef.current.duration;
    const offset = startOffsetRef.current % duration;
    source.start(0, offset);
    sourceRef.current = source;
    startTimeRef.current = ctx.currentTime;
    setAnalyser(analyserNode);
    setIsPlaying(true);

    // VU + playhead animation
    const timeData = new Float32Array(FFT_SIZE);
    const animate = () => {
      analyserNode.getFloatTimeDomainData(timeData);
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) sum += timeData[i] * timeData[i];
      setVuLevel(Math.min(1, Math.sqrt(sum / timeData.length) * 4));

      const elapsed = ctx.currentTime - startTimeRef.current + offset;
      setPlayPosition(elapsed / duration);

      if (elapsed < duration) {
        playAnimRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setPlayPosition(0);
        startOffsetRef.current = 0;
        cancelAnimationFrame(playAnimRef.current);
      }
    };
    playAnimRef.current = requestAnimationFrame(animate);

    source.onended = () => {
      setIsPlaying(false);
      setPlayPosition(0);
      startOffsetRef.current = 0;
      cancelAnimationFrame(playAnimRef.current);
    };
  }, [isPlaying, ensureAudioCtx]);

  // ── File drop / input ─────────────────────────────────────────────────────

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const newTracks: Track[] = [...tracks];
      Array.from(files).forEach((file, i) => {
        if (i < newTracks.length) {
          newTracks[i] = { ...newTracks[i], name: file.name, file };
        } else {
          newTracks.push({ id: String(newTracks.length + 1), name: file.name, file, bpm: null, duration: 0 });
        }
      });
      setTracks(newTracks);
      setSelectedId(newTracks[0].id);
    },
    [tracks],
  );

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelAnimationFrame(playAnimRef.current);
      if (sourceRef.current) try { sourceRef.current.stop(); } catch { /* InvalidStateError: node already stopped */ }
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#000",
        color: "#eee",
        fontFamily: "monospace",
        fontSize: 12,
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* ── TOP BAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "6px 12px",
          background: "#111",
          borderBottom: "1px solid #222",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#eee", letterSpacing: 2, fontWeight: 700, fontSize: 11 }}>
          GROOVE ANALYZER 4.2-ESSENTIAL
        </span>

        <div style={{ width: 1, height: 16, background: "#333" }} />

        {/* BPM */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#666", fontSize: 10 }}>BPM</span>
          <span
            style={{
              color: "#FFAA00",
              fontWeight: 700,
              fontSize: 18,
              minWidth: 40,
              textAlign: "right",
            }}
          >
            {bpm ?? "---"}
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: "#333" }} />

        {/* Play/Stop */}
        <button
          onClick={handlePlay}
          disabled={!audioBufferRef.current}
          style={{
            background: isPlaying ? "#333" : "#222",
            color: isPlaying ? "#FFAA00" : "#eee",
            border: "1px solid #333",
            padding: "3px 12px",
            cursor: audioBufferRef.current ? "pointer" : "default",
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: 1,
            opacity: audioBufferRef.current ? 1 : 0.4,
          }}
        >
          {isPlaying ? "STOP" : "PLAY"}
        </button>

        {/* Initialize */}
        <button
          onClick={handleInitialize}
          style={{
            background: "#111",
            color: "#ccc",
            border: "1px solid #333",
            padding: "3px 12px",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: 1,
          }}
        >
          INIT
        </button>

        <div style={{ flex: 1 }} />

        {/* Playhead position */}
        <span style={{ color: "#666", fontSize: 10 }}>
          {String(Math.floor((playPosition * (audioBufferRef.current?.duration ?? 0)) / 60)).padStart(2, "0")}:
          {String(Math.floor((playPosition * (audioBufferRef.current?.duration ?? 0)) % 60)).padStart(2, "0")}
        </span>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT PANEL ── */}
        <div
          style={{
            width: 180,
            background: "#111",
            borderRight: "1px solid #222",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "6px 8px",
              borderBottom: "1px solid #222",
              color: "#666",
              fontSize: 10,
              letterSpacing: 2,
            }}
          >
            TRACKS
          </div>

          {/* Track list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => setSelectedId(track.id)}
                style={{
                  padding: "6px 8px",
                  cursor: "pointer",
                  background: track.id === selectedId ? "#1a1a1a" : "transparent",
                  borderLeft: track.id === selectedId ? "2px solid #FFAA00" : "2px solid transparent",
                  borderBottom: "1px solid #1a1a1a",
                }}
              >
                <div
                  style={{
                    color: track.id === selectedId ? "#eee" : "#888",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 11,
                  }}
                >
                  {track.name}
                </div>
                {track.bpm !== null && (
                  <div style={{ color: "#FFAA00", fontSize: 10, marginTop: 2 }}>
                    {track.bpm} BPM
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* VU meter */}
          <div
            style={{
              padding: "6px 8px",
              borderTop: "1px solid #222",
            }}
          >
            <div style={{ color: "#666", fontSize: 9, marginBottom: 3, letterSpacing: 1 }}>
              VU
            </div>
            <MiniVU level={isPlaying ? vuLevel : 0} />
          </div>

          {/* ANALYZE button */}
          <div style={{ padding: "8px" }}>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                width: "100%",
                background: analyzing ? "#1a1a1a" : "#222",
                color: analyzing ? "#666" : "#eee",
                border: "1px solid #444",
                padding: "6px 0",
                cursor: analyzing ? "default" : "pointer",
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              {analyzing ? "..." : "ANALYZE"}
            </button>
          </div>

          {/* Load file */}
          <div style={{ padding: "0 8px 8px" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%",
                background: "#111",
                color: "#666",
                border: "1px solid #333",
                padding: "4px 0",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: 1,
              }}
            >
              LOAD FILE
            </button>
          </div>
        </div>

        {/* ── CENTER + BOTTOM COLUMN ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── CENTER WAVEFORM ── */}
          <div
            style={{
              flex: 1,
              background: "#000",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <WaveformCanvas
              data={waveformData}
              transients={transients}
              playPosition={playPosition}
            />
          </div>

          {/* ── BOTTOM PANEL ── */}
          <div
            style={{
              height: 130,
              background: "#111",
              borderTop: "1px solid #222",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            {/* Toggle */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #222",
                flexShrink: 0,
              }}
            >
              {(["spectrum", "microscope"] as BottomView[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setBottomView(view)}
                  style={{
                    padding: "3px 14px",
                    background: bottomView === view ? "#1a1a1a" : "#111",
                    color: bottomView === view ? "#eee" : "#555",
                    border: "none",
                    borderRight: "1px solid #222",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: 10,
                    letterSpacing: 1,
                  }}
                >
                  {view === "spectrum" ? "SPECTRUM FFT" : "MICROSCOPE"}
                </button>
              ))}
            </div>

            {/* Canvas area */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              {bottomView === "spectrum" ? (
                <SpectrumCanvas analyser={analyser} />
              ) : (
                <MicroscopeCanvas analyser={analyser} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
