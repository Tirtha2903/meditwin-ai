/**
 * useAudioReactivity.js
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that powers the audio-reactive layer of the MediTwin AI particle system.
 *
 * Responsibilities:
 *   1. Creates a Web Audio API AudioContext + AnalyserNode
 *   2. Connects any <audio> element (or AudioNode) to the analyser
 *   3. Exposes a normalised Float32Array (length = 256) of FFT frequency bins
 *      that the render loop can upload to the GPU as uAudioData[]
 *   4. Provides helpers for ElevenLabs TTS streaming:
 *      – queueAudioChunk(arrayBuffer) – decodes and queues a PCM chunk
 *      – stopAudio()                  – stops playback
 *
 * Returns:
 *   {
 *     audioRef           : React.RefObject<HTMLAudioElement | null>,
 *     frequencyDataRef   : React.RefObject<Float32Array>,   // 256 bins, 0-1 normalised
 *     isSpeakingRef      : React.RefObject<boolean>,
 *     connectAudioElement: (htmlAudioElement) => void,
 *     stopAudio          : () => void,
 *     getFrequencyData   : () => Float32Array,  // call every animation frame
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useCallback } from 'react';

// Number of FFT bins. Must match the size declared in the vertex shader array.
const FFT_SIZE = 512; // → 256 frequency bins (fftSize / 2)

export function useAudioReactivity() {
  // ── Refs – stable across renders, safe to read in rAF loops ─────────────
  const audioContextRef   = useRef(null);
  const analyserRef       = useRef(null);
  const sourceNodeRef     = useRef(null);        // MediaElementSourceNode
  const frequencyDataRef  = useRef(new Float32Array(FFT_SIZE / 2)); // 256 bins
  const isSpeakingRef     = useRef(false);
  const audioRef          = useRef(null);         // <audio> element ref

  // ── 1. Initialise AudioContext lazily (must be triggered by user gesture) ─
  const ensureContextReady = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();

    // FFT size: larger = more frequency resolution, higher GPU upload cost.
    // 512 gives 256 meaningful bins – a good balance for body-region mapping.
    analyser.fftSize                = FFT_SIZE;
    analyser.smoothingTimeConstant  = 0.80; // temporal smoothing 0–1
    analyser.minDecibels            = -90;
    analyser.maxDecibels            = -10;

    // Route: sourceNode → analyser → destination (speakers)
    analyser.connect(ctx.destination);

    audioContextRef.current  = ctx;
    analyserRef.current      = analyser;
    return ctx;
  }, []);

  // ── 2. Connect an <audio> element to the analyser ────────────────────────
  /**
   * Call this once with the HTMLAudioElement you want to analyse.
   * Subsequent calls with the same element are no-ops.
   *
   * @param {HTMLAudioElement} el
   */
  const connectAudioElement = useCallback((el) => {
    if (!el || sourceNodeRef.current) return;

    const ctx = ensureContextReady();
    if (ctx.state === 'suspended') ctx.resume();

    // Create a source node only once per element
    const source = ctx.createMediaElementSource(el);
    source.connect(analyserRef.current);

    sourceNodeRef.current = source;
    audioRef.current = el;

    // Track speaking state automatically
    el.addEventListener('play',  () => { isSpeakingRef.current = true;  });
    el.addEventListener('pause', () => { isSpeakingRef.current = false; });
    el.addEventListener('ended', () => { isSpeakingRef.current = false; });
  }, [ensureContextReady]);

  // ── 3. Stop audio ─────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    isSpeakingRef.current = false;
  }, []);

  // ── 4. getFrequencyData – call this every requestAnimationFrame ──────────
  /**
   * Reads the current FFT data from the AnalyserNode, normalises it to 0–1,
   * and writes into frequencyDataRef.current.
   *
   * Returns the same Float32Array (no allocation) for performance.
   */
  const getFrequencyData = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return frequencyDataRef.current;

    // getByteFrequencyData fills a Uint8Array with values 0–255
    const raw = new Uint8Array(analyser.frequencyBinCount); // 256 bins
    analyser.getByteFrequencyData(raw);

    // Normalise to 0–1 and write to the stable ref array
    for (let i = 0; i < raw.length; i++) {
      frequencyDataRef.current[i] = raw[i] / 255;
    }

    return frequencyDataRef.current;
  }, []);

  // ── 5. Resume context on visibility change (browsers suspend on blur) ─────
  useEffect(() => {
    const handleVisibility = () => {
      const ctx = audioContextRef.current;
      if (ctx && document.visibilityState === 'visible' && ctx.state === 'suspended') {
        ctx.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ── 6. Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      const ctx = audioContextRef.current;
      if (ctx) ctx.close();
    };
  }, []);

  return {
    audioRef,
    frequencyDataRef,
    isSpeakingRef,
    connectAudioElement,
    stopAudio,
    getFrequencyData,
  };
}

export default useAudioReactivity;
