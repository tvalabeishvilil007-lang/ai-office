import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useVoiceInput — Web Speech API wrapper for voice-to-text
//
// • Works in Chrome, Edge, Safari (webkit prefix).
// • isSupported: false in Firefox — mic button hidden automatically.
// • Streams interim results in real-time via `interim` string.
// • On final result calls `onFinal(transcript)` so the parent can
//   append/replace the textarea value.
// • Auto-stops after ~2 s of silence (browser default).
// ─────────────────────────────────────────────────────────────────────────────

// ── Minimal Web Speech API interfaces (not always in tsconfig DOM lib) ────────

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  readonly resultIndex: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang:             string;
  interimResults:   boolean;
  maxAlternatives:  number;
  continuous:       boolean;
  onstart:          (() => void) | null;
  onresult:         ((e: SpeechRecognitionEvent) => void) | null;
  onerror:          ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend:            (() => void) | null;
  start():  void;
  stop():   void;
  abort():  void;
}
interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

// ── Detect browser support ────────────────────────────────────────────────────

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w['SpeechRecognition'] ?? w['webkitSpeechRecognition'] ?? null) as SpeechRecognitionConstructor | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UseVoiceInputOptions {
  lang?: string;       // default 'ru-RU'
  onFinal: (transcript: string) => void;
}

export interface UseVoiceInputReturn {
  isSupported: boolean;
  isListening: boolean;
  interim:     string;    // live partial text while recording
  toggle:      () => void;
  stop:        () => void;
}

export function useVoiceInput({
  lang = 'ru-RU',
  onFinal,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const Ctor        = getSpeechRecognition();
  const isSupported = Ctor !== null;

  const [isListening, setIsListening] = useState(false);
  const [interim,     setInterim]     = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalRef     = useRef(onFinal);

  // Keep callback ref fresh so closures never go stale
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!Ctor || isListening) return;

    const recognition = new Ctor();
    recognition.lang           = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous     = false;

    recognition.onstart = () => {
      setIsListening(true);
      setInterim('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      setInterim(interimText);

      if (finalText) {
        setInterim('');
        onFinalRef.current(finalText.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'aborted' fires on manual stop — not a real error
      if (event.error !== 'aborted') {
        console.warn('[useVoiceInput] error:', event.error);
      }
      setIsListening(false);
      setInterim('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [Ctor, lang, isListening]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  return { isSupported, isListening, interim, toggle, stop };
}
