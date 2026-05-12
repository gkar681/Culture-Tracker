// useCellCultureVoice.js
import { useState, useEffect, useCallback, Platform } from 'react';
import Voice from '@react-native-voice/voice';

export const useCellCultureVoice = (onComplete) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');


  const SCRIPT = [
  { key: 'experimentName', question: "What is the name of this experiment?"},
  { key: 'description', question: "What would you like to include in the description of this experiment?"},
  { key: 'status', question: "Is the experiment planned, in progress or completed?"},
  { key: 'startdate', question: "What shall I put down as the start date?"},
  { key: 'cellType',         question: "What cell type are you using?" },
  { key: 'passageNumber',    question: "What's the passage number?" },
  { key: 'seedingDensity',   question: "What's the seeding density?" },
  { key: 'treatmentCondition', question: "Any treatment conditions? Say none if not applicable." },
  { key: 'confluencePercent', question: "What's the confluence percentage?" },
  { key: 'notes',            question: "Any additional observations?" },





  ]; 
  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      const transcript = e.value[0];
      handleAnswer(transcript);
    };
    Voice.onSpeechPartialResults = (e) => {
      setLiveTranscript(e.value[0]); // live preview while speaking
    };
    Voice.onSpeechError = () => setIsListening(false);

    // Ask the first question on mount
    addBotMessage(SCRIPT[0].question);

    return () => Voice.destroy().then(Voice.removeAllListeners);
  }, []);

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, { role: 'bot', text }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { role: 'user', text }]);
  };

  const handleAnswer = useCallback((transcript) => {
    setIsListening(false);
    setLiveTranscript('');
    addUserMessage(transcript);

    const currentKey = SCRIPT[step].key;
    const updated = { ...formData, [currentKey]: transcript };
    setFormData(updated);

    const nextStep = step + 1;

    if (nextStep < SCRIPT.length) {
      setStep(nextStep);
      // Small delay so it feels conversational, not instant
      setTimeout(() => addBotMessage(SCRIPT[nextStep].question), 400);
    } else {
      setTimeout(() => {
        addBotMessage("Got it — here's your log. Does everything look right?");
        onComplete(updated);
      }, 400);
    }
  }, [step, formData]);

  const startListening = async () => {
    if (Platform.OS === 'web' || typeof Voice.start !== 'function') {
      console.warn('Speech recognition is not available in this environment.');
      return;
    }

    setIsListening(true);

    try {
      await Voice.start('en-US');
    } catch (error) {
      console.error('Voice.start failed:', error);
      setIsListening(false);
    }
  };

  const retryStep = () => {
    // Let user re-answer the current question
    addBotMessage(`Let's try that again — ${SCRIPT[step].question}`);
  };

  return { messages, isListening, liveTranscript, startListening, retryStep, step, formData };
};