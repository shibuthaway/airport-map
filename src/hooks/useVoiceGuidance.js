/**
 * useVoiceGuidance — FREE voice navigation using Web Speech API (SpeechSynthesis)
 * No API key required. Works on Chrome/Safari/Firefox mobile.
 */
import { useState, useCallback, useRef } from 'react';

const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function useVoiceGuidance() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenRef = useRef('');

  const speak = useCallback((text, { priority = false, lang = 'en-IN' } = {}) => {
    if (!isSupported || !voiceEnabled) return;
    // Avoid repeating the exact same phrase
    if (!priority && lastSpokenRef.current === text) return;

    window.speechSynthesis.cancel();          // cut any current speech
    lastSpokenRef.current = text;

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.92;
    utt.pitch = 1.05;
    utt.volume = 1;

    // Pick best voice available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && v.localService
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utt.voice = preferred;

    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utt);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    lastSpokenRef.current = '';
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      if (prev) {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, []);

  // Announce a full route summary
  const announceRoute = useCallback((start, end, distanceM, steps) => {
    if (!start || !end) return;
    const mins = Math.max(1, Math.round(distanceM / 80));
    const stepCount = steps?.length ? steps.length - 2 : 0; // exclude start/end
    const firstTurn = steps?.find(s => ['left','right','uturn','elevator'].includes(s.type));

    let text = `Route found. From ${start.name} to ${end.name}. `;
    text += `Distance approximately ${distanceM} meters, about ${mins} minute${mins > 1 ? 's' : ''} walk. `;
    if (firstTurn) {
      if (firstTurn.type === 'elevator') {
        text += `First, ${firstTurn.text}. `;
      } else {
        text += `Then, ${firstTurn.text}. `;
      }
    }
    text += stepCount > 0 ? `${stepCount} step${stepCount > 1 ? 's' : ''} total.` : '';

    speak(text, { priority: true });
  }, [speak]);

  // Announce a single direction step
  const announceStep = useCallback((step) => {
    if (!step?.text) return;
    speak(step.text, { priority: true });
  }, [speak]);

  // Destination reached
  const announceArrival = useCallback((destinationName) => {
    speak(`You have arrived at ${destinationName}. Enjoy your time!`, { priority: true });
  }, [speak]);

  // Off route warning
  const announceOffRoute = useCallback(() => {
    speak('You are off route. Please return to the highlighted path.', { priority: true });
  }, [speak]);

  return {
    voiceEnabled,
    isSpeaking,
    isSupported,
    toggleVoice,
    speak,
    stopSpeaking,
    announceRoute,
    announceStep,
    announceArrival,
    announceOffRoute,
  };
}
