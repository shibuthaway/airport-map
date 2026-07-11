/**
 * useVoiceGuidance — FREE voice navigation using Web Speech API (SpeechSynthesis)
 * No API key required. Works on Chrome/Safari/Firefox mobile.
 */
import { useState, useCallback, useRef } from 'react';

const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function useVoiceGuidance() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voiceEnabledRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenRef = useRef('');

  const speak = useCallback((text, { priority = false, lang = 'en-US' } = {}) => {
    if (!isSupported || !voiceEnabledRef.current) return;
    
    // Avoid repeating the exact same phrase unless priority
    if (!priority && lastSpokenRef.current === text) return;

    // Safari/Chrome bug: calling cancel() blindly can freeze speech synthesis.
    // Only cancel if it's currently speaking something else.
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    lastSpokenRef.current = text;

    // Small delay ensures cancel() resolves before new speak (fixes stuck queues)
    setTimeout(() => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      
      // Removed rate/pitch tweaks as they break some Android TTS engines
      
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred = voices.find(v => v.lang.startsWith('en') && v.localService) 
                       || voices.find(v => v.lang.startsWith('en'));
        if (preferred) utt.voice = preferred;
      }

      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => setIsSpeaking(false);
      utt.onerror = (e) => {
        console.warn('Speech synthesis error or interrupted:', e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utt);
    }, 50);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    lastSpokenRef.current = '';
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      const nextState = !prev;
      voiceEnabledRef.current = nextState;
      if (!nextState) {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
      } else {
        // If enabling, just do a silent ping to wake up TTS engine (must be synchronous)
        const wake = new SpeechSynthesisUtterance('');
        wake.volume = 0;
        window.speechSynthesis.speak(wake);
      }
      return nextState;
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
