/**
 * useElevenLabsTTS.js
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook for streaming Text-to-Speech via the ElevenLabs API.
 *
 * Features:
 *   – Streams audio from ElevenLabs `/v1/text-to-speech/{voice_id}/stream`
 *   – Decodes the response as an audio blob and sets it on an <audio> element
 *   – Works seamlessly with useAudioReactivity — just pass the <audio> ref
 *   – Handles loading, error, and speaking states
 *
 * Configuration (set via environment variables in .env):
 *   VITE_ELEVENLABS_API_KEY   – your ElevenLabs API key
 *   VITE_ELEVENLABS_VOICE_ID  – voice ID (default: Rachel = "21m00Tcm4TlvDq8ikWAM")
 *
 * Usage:
 *   const { speak, isSpeaking, isLoading, audioRef, error } = useElevenLabsTTS();
 *
 *   // In JSX — attach the hidden audio element:
 *   <audio ref={audioRef} />
 *
 *   // Speak wherever you need:
 *   speak("Your health score is 85. You are in excellent condition.");
 *
 *   // Connect to audio analyser (after the audio element mounts):
 *   useEffect(() => {
 *     if (audioRef.current) connectAudioElement(audioRef.current);
 *   }, [audioRef.current]);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState, useCallback, useEffect } from 'react';

// ─── ElevenLabs Config ────────────────────────────────────────────────────────

const ELEVENLABS_API_KEY  = import.meta.env.VITE_ELEVENLABS_API_KEY  || '';
const DEFAULT_VOICE_ID    = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

const ELEVENLABS_ENDPOINT = (voiceId) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

// Voice settings – adjust for MediTwin's AI persona feel
const VOICE_SETTINGS = {
  stability:        0.55, // lower = more expressive
  similarity_boost: 0.75, // how close to reference voice
  style:            0.35, // stylistic emphasis
  use_speaker_boost: true,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {{ voiceId?: string }} options
 */
export function useElevenLabsTTS({ voiceId = DEFAULT_VOICE_ID } = {}) {
  const audioRef      = useRef(null);   // <audio> element ref
  const abortRef      = useRef(null);   // AbortController for cancellation

  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState(null);

  // ── Core speak function ────────────────────────────────────────────────────
  /**
   * Streams TTS audio for the given text and plays it.
   * Cancels any previous request automatically.
   *
   * @param {string} text  – The text to synthesise
   * @param {string} [overrideVoiceId]  – Optional voice override
   */
  const speak = useCallback(async (text, overrideVoiceId) => {
    if (!text?.trim()) return;

    // Cancel any ongoing stream
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setIsLoading(true);
    setIsSpeaking(false);

    try {
      if (!ELEVENLABS_API_KEY) {
        throw new Error('Missing VITE_ELEVENLABS_API_KEY in environment variables');
      }

      const response = await fetch(ELEVENLABS_ENDPOINT(overrideVoiceId || voiceId), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'xi-api-key':   ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept':       'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id:       'eleven_turbo_v2',   // fastest latency model
          voice_settings: VOICE_SETTINGS,
          output_format:  'mp3_44100_128',
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`ElevenLabs API error ${response.status}: ${errBody}`);
      }

      // ── Stream the audio response as a blob ────────────────────────────
      // For maximum compatibility, collect all chunks then create an object URL.
      // Alternative: use MediaSource API for true streaming (more complex setup).
      const audioBlob = await response.blob();
      const audioUrl  = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        // Revoke the previous URL to avoid memory leaks
        const prevSrc = audioRef.current.src;
        if (prevSrc && prevSrc.startsWith('blob:')) URL.revokeObjectURL(prevSrc);

        audioRef.current.src = audioUrl;
        audioRef.current.volume = 1.0;

        // Play and track state
        await audioRef.current.play();
        setIsSpeaking(true);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Intentional cancellation – not an error
        return;
      }
      console.error('[useElevenLabsTTS] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [voiceId]);

  // ── Stop function ─────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  // ── Sync speaking state with audio element events ─────────────────────────
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay  = () => setIsSpeaking(true);
    const onPause = () => setIsSpeaking(false);
    const onEnded = () => setIsSpeaking(false);

    el.addEventListener('play',  onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('play',  onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
    };
  });

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (audioRef.current?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
    error,
    audioRef,
  };
}

export default useElevenLabsTTS;
