import { useWhisper } from '@chengsokdara/use-whisper';
import { useChat, type CreateMessage, type Message } from 'ai/react';
import Alert from 'components/atoms/Alert';
import GoogleSTTInput from 'components/atoms/GoogleSTTInput';
import InterimHistory from 'components/atoms/InterimHistory';
import type { Harker } from 'hark';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import io, { type Socket } from 'socket.io-client';
import { type VoiceCommand } from 'types/useWhisperTypes';
import { useAuth } from 'util/auth';
import {
  blobToBase64,
  checkIsVoiceCommand,
  detectEndKeyword,
  extractStartKeyword,
  getVoiceCommandAction,
  removeInitialKeyword,
  removeTerminatorKeyword,
  sanitizeText,
  splitTextsBySeparator,
  whisperTranscript,
} from './methods';
import {
  BE_CONCISE,
  TERMINATOR_WORDS,
  STOP_TIMEOUT,
  TALKTOGPT_SOCKET_ENDPOINT,
  WAKE_WORDS,
  STOP_UTTERING_WORDS,
  TERMINATOR_WORD_TIMEOUT,
} from './constants';
import { isAndroid } from 'react-device-detect';
import { initialFlagsState, FlagsActions, flagsReducer } from './reducers/flags';
import { updateSettings, useSettingsByUser } from 'util/db';
import ChatMessage from 'components/atoms/ChatMessage';
import GoogleSTTPill from 'components/atoms/GoogleSTTPill';
import { GoogleSttControlsState } from 'types/googleChat';
import { useMutation } from 'react-query';

const TEXT_SEPARATORS = {
  PARAGRAPH_BREAK: '\n\n',
  LINE_BREAK: '\n',
};

interface WordRecognized {
  isFinal: boolean;
  text: string;
}

const initialControlsState: GoogleSttControlsState = {
  speakingRate: 1,
  autoStopTimeout: STOP_TIMEOUT,
  isAutoStop: true,
  isWhisperEnabled: true,
  wakeKeywords: WAKE_WORDS,
  stopUtteringWords: STOP_UTTERING_WORDS,
  terminatorKeywords: TERMINATOR_WORDS,
  terminatorWaitTime: TERMINATOR_WORD_TIMEOUT,
  beConcise: true,
};

export const GoogleSttChat = () => {
  const auth = useAuth();
  const { data: userSettings, refetch } = useSettingsByUser(auth.user?.id);
  const audioContextRef = useRef<AudioContext>();
  const audioInputRef = useRef<MediaStreamAudioSourceNode>();
  const autoStopRef = useRef<NodeJS.Timeout>();
  const chatRef = useRef<HTMLDivElement>();
  const harkRef = useRef<Harker>();
  const interimRef = useRef<string>('');
  const interimsRef = useRef<string[]>([]);
  const processorRef = useRef<AudioWorkletNode>();
  const socketRef = useRef<Socket>();
  const speechRef = useRef<SpeechSynthesisUtterance>();
  const startKeywordDetectedRef = useRef<boolean>(false);
  const endKeywordDetectedRef = useRef<boolean>(false);
  const streamRef = useRef<MediaStream>();
  const storedMessagesRef = useRef<string[]>(null);
  const lastSpeechIndexRef = useRef<number>(0);
  const isReadyToSpeech = useRef<boolean>(true);
  const isUtteringRef = useRef<boolean>(false);
  const wakewordsRef = useRef<string>(WAKE_WORDS);
  const terminatorwordsRef = useRef<string>(TERMINATOR_WORDS);
  const stopUtteringWordsRef = useRef<string>(STOP_UTTERING_WORDS);
  const speakingRateRef = useRef<number>(1);

  const [firstMessage, setFirstMessage] = useState<string | null>(null);
  const [interim, setInterim] = useState<string>('');
  const [openaiRequest, setOpenaiRequest] = useState<string>('');
  const [showBlueBubbleChat, setShowBlueBubbleChat] = useState<boolean>(false);

  const [noti, setNoti] = useState<{
    type: 'error' | 'success';
    message: string;
  }>();

  const [{
    isFinalData,
    isListening,
    isLoading,
    isRecording,
    isSending,
    isSpeaking,
    isTranscriptionDone,
    isUttering,
    isWhisperPrepared
  }, flagsDispatch] = useReducer(flagsReducer, initialFlagsState);

  const {
    autoStopTimeout = STOP_TIMEOUT,
    speakingRate = 1,
    isAutoStop = true,
    isWhisperEnabled = true,
    terminatorWaitTime = TERMINATOR_WORD_TIMEOUT,
    wakeKeywords = WAKE_WORDS,
    stopUtteringWords = STOP_UTTERING_WORDS,
    terminatorKeywords = TERMINATOR_WORDS,
    beConcise = true,
  } = userSettings?.settings ? userSettings.settings : initialControlsState

  useEffect(() => {
    if (typeof wakeKeywords !== "undefined" && wakeKeywords !== null) {
      wakewordsRef.current = wakeKeywords;
    }
    if (typeof terminatorKeywords !== "undefined" && terminatorKeywords !== null) {
      terminatorwordsRef.current = terminatorKeywords;
    }
    if (typeof stopUtteringWords !== "undefined" && stopUtteringWords !== null) {
      stopUtteringWordsRef.current = stopUtteringWords;
    }
  }, [wakeKeywords, terminatorKeywords, stopUtteringWords])


  const { recording, transcript, startRecording, stopRecording } = useWhisper({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    autoTranscribe: false,
    whisperConfig: {
      language: 'en',
    },
  });

  const updateSettingsMutation = useMutation(updateSettings, {
    onSuccess: () => {
      refetch();
    },
  });

  const prepareUseWhisper = async () => {
    if (!isWhisperPrepared) {
      /**
       * fake start and stop useWhisper so that recorder is prepared
       * once start keyword detected, useWhisper can start record instantly
       */
      await startRecording();
      await stopRecording();
      flagsDispatch({ type: FlagsActions.PREPARE_WHISPER });
    }
  };

  // Uttering functions
  const onStartUttering = () => {
    flagsDispatch({ type: FlagsActions.START_UTTERING });
    isUtteringRef.current = true;
  };

  const onStopUttering = () => {
    lastSpeechIndexRef.current += 1;
    setInterim('');
    if (storedMessagesRef.current.length > lastSpeechIndexRef.current) {
      startUttering(storedMessagesRef.current[lastSpeechIndexRef.current]);
    } else {
      flagsDispatch({ type: FlagsActions.STOP_UTTERING });
      isUtteringRef.current = false;
    }
  };

  const startUttering = useCallback((text: string) => {
    if (!text) {
      return;
    }
    flagsDispatch({ type: FlagsActions.START_UTTERING });
    isUtteringRef.current = true;
    if (!isAndroid || (isAndroid && !globalThis.ReactNativeWebView)) {
      prepareSpeechUttering();
      speechRef.current.lang = 'en-US';
      speechRef.current.text = text;
      speechRef.current.rate = speakingRateRef.current;
      globalThis.speechSynthesis.speak(speechRef.current);
    } else {
      globalThis.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'speaking-start',
          data: text,
        })
      );
    }
  }, []);

  const { messages, append, input, setInput, handleInputChange } = useChat({
    api: '/api/openai/stream',
    onError: (sendDetectedTranscriptError) => {
      console.error({ sendDetectedTranscriptError });
      flagsDispatch({ type: FlagsActions.STOP_SENDING_CHAT });
      showErrorMessage(NOTI_MESSAGES.gpt.error);
    },
    onFinish: (message) => {
      transcript.blob = undefined;
      setFirstMessage(message.content);
      flagsDispatch({ type: FlagsActions.STOP_SENDING_CHAT });
    },
    onResponse: () => {
      lastSpeechIndexRef.current = 0;
      storedMessagesRef.current = [];
    },

  });

  const messagesSplitByParagraph = splitTextsBySeparator(
    messages,
    TEXT_SEPARATORS.PARAGRAPH_BREAK
  );
  const messagesSplitByLine = splitTextsBySeparator(
    messagesSplitByParagraph,
    TEXT_SEPARATORS.LINE_BREAK
  );

  useEffect(() => {
    setShowBlueBubbleChat(false);
  }, [messages.length])

  const lastIndexUser = messagesSplitByLine.findLastIndex(
    (message) => message.role === 'user'
  );
  storedMessagesRef.current =
    lastIndexUser >= 0
      ? messagesSplitByLine
        .slice(lastIndexUser + 1)
        .map((message) => message.content)
      : [];
  if (
    storedMessagesRef.current.length > 1 &&
    lastSpeechIndexRef.current === 0 &&
    isReadyToSpeech.current
  ) {
    isReadyToSpeech.current = false;
    startUttering(storedMessagesRef.current[lastSpeechIndexRef.current]);
  }


  const forceStopRecording = async () => {
    flagsDispatch({ type: FlagsActions.START_LOADING });
    flagsDispatch({ type: FlagsActions.FORCE_STOP_RECORDING });
    flagsDispatch({ type: FlagsActions.STOP_RECORDING });
    if (isWhisperEnabled) {
      await stopRecording();
    }
    // const requestWithoutInitialKeywords = removeInitialKeyword(sanitizeText(interimsRef.current.join(' ')), wakewordsRef.current)
    const requestWithoutKeywords = removeTerminatorKeyword(interimsRef.current.join(' '), terminatorwordsRef.current)
    setOpenaiRequest(requestWithoutKeywords)
    startKeywordDetectedRef.current = false;
    endKeywordDetectedRef.current = false;
    stopUttering();
  };

  const onAutoStop = () => {
    endKeywordDetectedRef.current = undefined;
    stopAutoStopTimeout();
    forceStopRecording()
  };

  const processStartKeyword = () => {
    if (isUtteringRef.current) {
      return
    }
    setShowBlueBubbleChat(true);
    setInterim('');
    setNoti(undefined);
    interimsRef.current = [];
    if (isWhisperEnabled) {
      startRecording().then(() => {
        console.log("WHISPER START RECORDING")
      })
    }
    setOpenaiRequest('');
    flagsDispatch({ type: FlagsActions.WAKEWORD_RECOGNISED });
    stopUttering();
    startKeywordDetectedRef.current = true;
  };

  const isStillSpeakingAfterTerminator = (lastWord: string, terminatorKeywords: string) => {
    if (lastWord.length === 0) return false;
    const endWords = terminatorKeywords ?? TERMINATOR_WORDS;
    const matchWord = endWords.split(',').find((word) => {
      return lastWord.toLocaleLowerCase().includes(word.toLocaleLowerCase());
    });
    return typeof matchWord === 'undefined';
  }

  const stopByDetectEndKeyword = () => {
    if (isWhisperEnabled) {
      stopRecording().then(() => {
        console.log("WHISPER STOP RECORDING")
        flagsDispatch({ type: FlagsActions.STOP_RECORDING });
      })
    }
    setOpenaiRequest(prev => {
      // const requestWithoutInitialKeywords = removeInitialKeyword(sanitizeText(`${prev} ${interim}`), wakewordsRef.current)
      const requestWithoutKeywords = removeTerminatorKeyword(`${prev} ${interim}`, terminatorwordsRef.current)
      return requestWithoutKeywords
    })
    endKeywordDetectedRef.current = false;
    stopAutoStopTimeout();
    startKeywordDetectedRef.current = false;
    flagsDispatch({ type: FlagsActions.FORCE_STOP_RECORDING });
    stopUttering();
  }

  const detectStartingKeyword = (text: string, wakeKeywords: string) => {
    if (
      typeof startKeywordDetectedRef.current !== 'undefined' &&
      !startKeywordDetectedRef.current &&
      !isUttering
    ) {
      const keyword = extractStartKeyword(text, wakeKeywords);
      if (keyword !== null) {
        processStartKeyword();
      }
    }
  }

  const stopEmptyRequest = async () => {
    setShowBlueBubbleChat(false);
    setInterim('');
    startKeywordDetectedRef.current = false;
    if (isWhisperEnabled) {
      await stopRecording();
    }
    flagsDispatch({ type: FlagsActions.STOP_RECORDING });
  }

  const sendRequestIfTerminatorKeywordDetected = () => {

    if (
      detectEndKeyword(interimRef.current, terminatorwordsRef.current) &&
      !endKeywordDetectedRef.current &&
      interimsRef.current.length > 0
    ) {
      const timeoutId = setTimeout(() => {
        const lastWord = sanitizeText(interimRef.current).split(' ');
        if (isStillSpeakingAfterTerminator(lastWord[lastWord.length - 1], terminatorwordsRef.current)) {
          clearTimeout(timeoutId);
        } else {
          // Hay contenido en OpenaiRequest??
          const finalRequest = removeTerminatorKeyword(removeInitialKeyword(sanitizeText(interimsRef.current.join(' ')), wakewordsRef.current), terminatorwordsRef.current)
          if (finalRequest.length === 0) {
            stopEmptyRequest();
          } else {
            endKeywordDetectedRef.current = true;
            if (typeof startKeywordDetectedRef.current !== 'undefined' &&
              !startKeywordDetectedRef.current) {
              stopUttering();
            } else {
              stopByDetectEndKeyword();
            }
          }
        }
      }, (terminatorWaitTime || TERMINATOR_WORD_TIMEOUT) * 1000);
    }
  }

  const stopUtteringIfKeywordDetected = (text: string, stopUtteringKeywords: string) => {
    if (!startKeywordDetectedRef.current && typeof endKeywordDetectedRef.current === 'undefined') {
      const wake_words = stopUtteringKeywords?.split(',') || WAKE_WORDS.split(',');
      for (const keyword of wake_words) {
        if (sanitizeText(text).includes(sanitizeText(keyword))) {
          stopUttering();
        }
      }
      return false;
    }
  }

  const detectVoiceCommand = (text: string) => {
    if ((typeof startKeywordDetectedRef.current == 'undefined' || !startKeywordDetectedRef.current) &&
      (typeof endKeywordDetectedRef.current == 'undefined' || !endKeywordDetectedRef.current)) {
      const voiceCommand = checkIsVoiceCommand(text);

      if (typeof voiceCommand !== "undefined" && voiceCommand) {
        runVoiceCommand(voiceCommand);
        return;
      }
    }
  }

  const onSpeechRecognized = async (data: WordRecognized) => {
    try {
      interimRef.current += ` ${data.text}`;
      setInterim(data.text);

      if (data.isFinal && !isUttering) {
        interimsRef.current.push(data.text);
        // interimRef.current = '';
        setOpenaiRequest((prev) => {
          return `${prev} ${data.text}`;
        });
        flagsDispatch({ type: FlagsActions.FINAL_DATA_RECEIVED });
      } else {
        flagsDispatch({ type: FlagsActions.NOT_FINAL_DATA_RECEIVED });
      }

      // Detect starting keyword
      if (!isUtteringRef.current) {
        detectStartingKeyword(interimRef.current, wakewordsRef.current)
      }
      // Stop the uttering if the user says the keyword to stop
      stopUtteringIfKeywordDetected(interimRef.current, stopUtteringWordsRef.current)

      // Detect end keyword and stop recording if detected in case that was the last word
      if (startKeywordDetectedRef.current && data.isFinal) {
        sendRequestIfTerminatorKeywordDetected()
      }

      const reversedInterims = interimsRef.current[interimsRef.current.length - 1] ?? '';
      detectVoiceCommand(reversedInterims);

    } catch (error) {
      console.error('An error occurred in onSpeechRecognized:', error);
    }
  };

  const handleTranscriptionResults = (transcribed: {
    status: string;
    message: string;
  }): string | null => {
    if (transcribed.status === 'error') {
      console.warn('24MB file size limit reached!');
      showErrorMessage(transcribed.message);
      flagsDispatch({ type: FlagsActions.STOP_SENDING_CHAT });
      setInterim('');
      setShowBlueBubbleChat(false);
      startKeywordDetectedRef.current = false;
      transcript.blob = undefined;
      flagsDispatch({ type: FlagsActions.STOP_UTTERING });
      return null;
    }
    if (transcribed.status === 'success' && transcribed.message === '') {
      showErrorMessage('Voice command not detected. Please speak again.');
      flagsDispatch({ type: FlagsActions.STOP_SENDING_CHAT });
      setInterim('');
      setShowBlueBubbleChat(false);
      startKeywordDetectedRef.current = false;
      transcript.blob = undefined;
      flagsDispatch({ type: FlagsActions.STOP_UTTERING });
      return null;
    }
    return transcribed.message;
  };

  const transcribeAudio = async (
    blob: Blob
  ): Promise<{
    status: string;
    message: string;
  }> => {
    const base64 = await blobToBase64(blob);
    if (!base64) {
      return { status: 'error', message: 'Failed to read blob data.' };
    }

    // Transcribe the audio
    const response = await whisperTranscript(base64);
    return response;
  };

  const onTranscribe = async () => {
    let text = ''
    if (isWhisperEnabled) {
      const transcribed = await transcribeAudio(transcript.blob);
      const transcriptionText = handleTranscriptionResults(transcribed);
      if (!transcriptionText) return;
      text = removeTerminatorKeyword(transcriptionText, terminatorwordsRef.current);
    } else {
      if (!openaiRequest) return;
      text = removeTerminatorKeyword(openaiRequest, terminatorwordsRef.current);
    }

    await submitTranscript(text);
    setOpenaiRequest('');
    flagsDispatch({ type: FlagsActions.STOP_SENDING_CHAT });
  };

  const prepareHark = async () => {
    if (!harkRef.current && streamRef.current) {
      const { default: harkjs } = await import('hark');
      harkRef.current = harkjs(streamRef.current, {
        interval: 100,
        threshold: -60,
        play: false,
      });
      harkRef.current.on('speaking', onStartSpeaking);
      harkRef.current.on('stopped_speaking', onStopSpeaking);
    }
  };

  const prepareSpeechUttering = () => {
    if (!speechRef.current) {
      speechRef.current = new SpeechSynthesisUtterance();
      speechRef.current.addEventListener('start', onStartUttering);
      speechRef.current.addEventListener('end', onStopUttering);
      globalThis.speechSynthesis.speak(speechRef.current);
    }
  }

  const prepareSocket = async () => {
    socketRef.current = io(TALKTOGPT_SOCKET_ENDPOINT);

    socketRef.current.on('connect', () => { });

    socketRef.current.on('receive_audio_text', (data) => {
      onSpeechRecognized(data);
    });

    socketRef.current.on('disconnect', () => { });

    socketRef.current.on('googleCloudStreamError', (error) => {
      showErrorMessage(error);
    });
  };


  const releaseHark = () => {
    // remove hark event listeners
    if (harkRef.current) {
      // @ts-ignore
      harkRef.current.off('speaking', onStartSpeaking);
      // @ts-ignore
      harkRef.current.off('stopped_speaking', onStopSpeaking);
      harkRef.current = undefined;
    }
  };

  const releaseSocket = async () => {
    if (socketRef.current) {
      socketRef.current?.emit('endGoogleCloudStream');
      socketRef.current?.disconnect();
    }
    processorRef.current?.disconnect();
    audioInputRef.current?.disconnect();
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
  };

  const turnOffMicrophone = () => {
    stopListening().then(() => {
      stopUttering();
      flagsDispatch({ type: FlagsActions.STOP_SPEAKING });
    });
  }

  const toggleIsAutoStop = async (value: boolean) => {
    const newSettings = { ...userSettings, user_id: auth.user?.id, settings: { ...userSettings.settings, isAutoStop: value } }
    await updateSettingsMutation.mutateAsync(newSettings);
  }

  const makeAutoStopTimeoutFaster = async () => {
    const autoStopTimeoutValue = autoStopTimeout - 1 <= 0 ? 1 : autoStopTimeout - 1
    const newSettings = { ...userSettings, user_id: auth.user?.id, settings: { ...userSettings.settings, autoStopTimeout: autoStopTimeoutValue } }
    await updateSettingsMutation.mutateAsync(newSettings);
  }

  const makeAutoStopTimeoutSlower = async () => {
    const newSettings = { ...userSettings, user_id: auth.user?.id, settings: { ...userSettings.settings, autoStopTimeout: autoStopTimeout + 1 } }
    await updateSettingsMutation.mutateAsync(newSettings);
  }

  const runVoiceCommand = async (voiceCommand: VoiceCommand) => {
    const action = getVoiceCommandAction(voiceCommand);
    switch (action?.type) {
      case 'SET_IS_AUTO_STOP':
        toggleIsAutoStop(action.value);
        showSuccessMessage(`${voiceCommand.successMessage} ${voiceCommand.args ?? ''}`)
        break;

      case 'SET_MICROPHONE_OFF':
        turnOffMicrophone();
        showSuccessMessage(voiceCommand.successMessage)
        break;

      case 'SET_AUTO_STOP_TIMEOUT':
        if (typeof action.value === 'number') {
          const newSettings = { ...userSettings, user_id: auth.user?.id, settings: { ...userSettings.settings, autoStopTimeout: action.value } }
          await updateSettingsMutation.mutateAsync(newSettings);
        }

        if (typeof action.value === 'string' && action.value === 'faster') {
          makeAutoStopTimeoutFaster()
        }

        if (typeof action.value === 'string' && action.value === 'slower') {
          makeAutoStopTimeoutSlower()
        }
        showSuccessMessage(`${voiceCommand.successMessage} ${voiceCommand.args ?? ''}`)

        break;
      case 'SHOW_MESSAGE':
        if (action.messageType === 'error') {
          showErrorMessage(action.message);
        } else {
          showSuccessMessage(action.message);
        }
        break;
      default:
        flagsDispatch({ type: FlagsActions.STOP_LOADING });
        showErrorMessage('Unknown command.');
        break;
    }

    interimsRef.current.pop();
  };

  const showErrorMessage = (message: string) => {
    setNoti({ type: 'error', message });
    startUttering(message);
  };

  const showSuccessMessage = (message: string) => {
    setNoti({ type: 'success', message });
  };

  const startAutoStopTimeout = () => {
    autoStopRef.current = setTimeout(onAutoStop, autoStopTimeout * 1000);
  };

  const startListening = async () => {
    if (!isAndroid || (isAndroid && !globalThis.ReactNativeWebView)) {
      prepareSpeechUttering();
      speechRef.current.text = '';
    }
    flagsDispatch({ type: FlagsActions.START_LISTENING });
    if (isWhisperEnabled) {
      await prepareUseWhisper();
    }
    await prepareSocket();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: 'default',
        sampleRate: 16000,
        sampleSize: 16,
        channelCount: 1,
        noiseSuppression: true,
        echoCancellation: true,
      },
      video: false,
    });

    await prepareHark();

    audioContextRef.current = new globalThis.AudioContext();
    await audioContextRef.current.audioWorklet.addModule(
      '/worklets/recorderWorkletProcessor.js'
    );
    audioInputRef.current = audioContextRef.current.createMediaStreamSource(
      streamRef.current
    );
    processorRef.current = new AudioWorkletNode(
      audioContextRef.current,
      'recorder.worklet'
    );

    processorRef.current.connect(audioContextRef.current.destination);
    audioContextRef.current.resume();
    audioInputRef.current.connect(processorRef.current);

    socketRef.current?.emit('startGoogleCloudStream');

    processorRef.current.port.onmessage = ({ data: audio }) => {
      socketRef.current?.emit('send_audio_data', { audio });
    };
    // if (isWhisperEnabled) {
    //   await stopRecording();
    //   await startRecording();
    // }
  };

  const stopAutoStopTimeout = () => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = undefined;
    }
  };

  const stopListening = async () => {
    // release audio stream and remove event listeners
    releaseHark();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = undefined;
    }
    processorRef.current?.disconnect();
    audioInputRef.current?.disconnect();
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    interimsRef.current = [];
    setInterim('');
    flagsDispatch({ type: FlagsActions.STOP_LISTENING });
    socketRef.current?.emit('endGoogleCloudStream');
  };

  const stopUttering = () => {
    if (!isAndroid || (isAndroid && !globalThis.ReactNativeWebView)) {
      if (globalThis.speechSynthesis.speaking) {
        globalThis.speechSynthesis.cancel();
      }
    } else {
      globalThis.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'speaking-stop',
        })
      );
    }
    setInterim('');
    endKeywordDetectedRef.current = undefined;
    flagsDispatch({ type: FlagsActions.STOP_UTTERING });
    isUtteringRef.current = false;
  };

  const submitTranscript = async (text?: string) => {
    isReadyToSpeech.current = true;
    if (!text) {
      return;
    }
    // TODO: uncomment when supabase work again
    if (!auth.user) {
      return;
    }
    flagsDispatch({ type: FlagsActions.START_SENDING_CHAT });
    setNoti(undefined);
    setInput('');

    try {
      const data: CreateMessage = {
        content: `${text} ${beConcise ? BE_CONCISE : ''}`,
        role: 'user',
      };

      await append(data, {
        options: {
          body: auth.user?.id ? { userId: auth.user.id } : undefined,
        },
      });
      return;
    } catch (sendDetectedTranscriptError) {
      flagsDispatch({ type: FlagsActions.STOP_SENDING_CHAT });
      showErrorMessage(NOTI_MESSAGES.gpt.error);
      return;
    }
  };

  const toggleUttering = () => {
    const lastMessage = messages
      .slice()
      .reverse()
      .find((message) => message.role === 'assistant')?.content;

    if (!isAndroid || (isAndroid && !globalThis.ReactNativeWebView)) {
      if (isUttering) {
        stopUttering();
      } else if (lastMessage) {
        startUttering(lastMessage);
      }
    } else {
      globalThis.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'speaking-toggle', data: lastMessage
        })
      );
    }
  };

  const onStartSpeaking = () => {
    flagsDispatch({ type: FlagsActions.START_SPEAKING });
    stopAutoStopTimeout();
  };

  const onStopSpeaking = () => {
    flagsDispatch({ type: FlagsActions.STOP_SPEAKING });
  };

  const cleanUpResources = () => {
    releaseSocket();
    releaseHark();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = undefined;
    }
    // clear auto stop timeout instance
    stopAutoStopTimeout();
    if (speechRef.current) {
      stopUttering();
      speechRef.current.removeEventListener('start', onStartUttering);
      speechRef.current.removeEventListener('end', onStopUttering);
    }
  };

  // useEffect(() => {
  //   console.log({ userSettings, isLoadingSettings, isSuccess })
  //   const updateUserSettings = async () => {
  //     if (auth.user?.id && (!userSettings || typeof userSettings === "undefined") && !isLoadingSettings) {
  //       await createSettingsMutation.mutateAsync({
  //         user_id: auth.user.id,
  //         settings: {
  //           autoStopTimeout: STOP_TIMEOUT,
  //           speakingRate: 1,
  //           isAutoStop: true,
  //           isWhisperEnabled: true,
  //           terminatorWaitTime: 1,
  //           wakeKeywords: WAKE_WORDS,
  //           stopUtteringWords: STOP_UTTERING_WORDS,
  //           terminatorKeywords: TERMINATOR_WORDS
  //         },
  //       })
  //     }
  //   };
  //   updateUserSettings();
  // }, [auth.user.id, createSettingsMutation, userSettings, isLoadingSettings])

  useEffect(() => {
    if (firstMessage && storedMessagesRef.current.length === 1)
      startUttering(firstMessage);
  }, [firstMessage, startUttering]);

  useEffect(() => {
    if (noti && noti.type === 'success') {
      setTimeout(() => {
        setNoti(undefined);
      }, 2000)
    }
  }, [noti]);

  useEffect(() => {
    function handleStopUttering(message: {
      data: { type: string; data: boolean };
    }) {
      const { data, type } = message.data;
      if (type === 'speaking' && data === false) {
        onStopUttering();
      }
      if (type === 'speaking-force-stop' && data === true) {
        stopUttering();
      }
      if (type === 'speaking-force-start' && data === true) {
        flagsDispatch({ type: FlagsActions.START_UTTERING });
        isUtteringRef.current = true;
      }
    }

    // window.addEventListener('focus', () => {
    // if (isWhisperEnabled) {
    //   async function startWhisper() {
    //     await prepareUseWhisper();
    //     await startListening();
    //   }
    //   startWhisper();
    // } else {
    //   async function startWithoutWhisper() {
    //     await startListening();
    //   }
    //   startWithoutWhisper();
    // }
    // })

    window.addEventListener('message', handleStopUttering);

    return () => {
      window.removeEventListener('message', handleStopUttering);
      // release resource on component unmount
      cleanUpResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRequestReadyForTranscription = useCallback(() => {
    return !isSending &&
      !isTranscriptionDone &&
      ((isWhisperEnabled && !recording && transcript.blob?.size > 44)
        || (!isWhisperEnabled && !isRecording && openaiRequest.length > 0))
  }, [isRecording, isSending, isTranscriptionDone, isWhisperEnabled, openaiRequest, recording, transcript.blob?.size])

  /**
   * check before sending audio blob to Whisper for transcription
   */
  useEffect(() => {
    if (isRequestReadyForTranscription()) {
      interimRef.current = '';
      flagsDispatch({ type: FlagsActions.STOP_TRANSCRIPTION });
      const handleOnTranscribe = async () => {
        await onTranscribe();
      };
      handleOnTranscribe();
    }
  }, [isRequestReadyForTranscription]);

  useEffect(() => {
    if (
      isAutoStop &&
      ((!isWhisperEnabled && isRecording) || (isWhisperEnabled && recording)) &&
      isFinalData &&
      startKeywordDetectedRef.current
    ) {
      startAutoStopTimeout();
    }
    if (
      (isAutoStop && ((!isWhisperEnabled && !isRecording) || (isWhisperEnabled && !recording))) ||
      !isFinalData ||
      !startKeywordDetectedRef.current
    ) {
      stopAutoStopTimeout();
    }
  }, [isAutoStop, isRecording, recording, isFinalData]);

  useEffect(() => {
    if (speakingRate) {
      speakingRateRef.current = speakingRate;
    }
  }, [speakingRate]);

  useEffect(() => {
    if (chatRef.current) {
      // auto scroll when there is new message
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, interim]);

  useEffect(() => {
    if (!showBlueBubbleChat) {
      setOpenaiRequest('');
    }
  }, [showBlueBubbleChat])


  const defaultMessage: Message = {
    content: `Welcome to Flow, your voice assistant. To activate flow, turn on the microphone. Then when you want to ask Flow a question and say “${wakewordsRef.current.split(',')[0]}, write a poem about Doug Engelbart” or anything else you would like to ask. You can switch to always on mode which allows you to speak, slowly, and end an utterance by saying “${terminatorwordsRef.current.split(',')[0]}”.`,
    role: 'assistant',
    id: 'initial-message',
  };

  return (
    <div className='flex h-full w-screen flex-col'>
      <div
        ref={chatRef}
        id='chat'
        className='flex w-full flex-1 items-start justify-center overflow-auto p-4 sm:pt-10'
      >
        <div className='container flex max-w-3xl flex-col gap-3'>
          <ChatMessage
            message={defaultMessage.content}
            sender={defaultMessage.role}
          />
          {messagesSplitByLine.map((message, index) => (
            <ChatMessage
              key={`${message.id}_${index}`}
              message={message.content}
              sender={message.role}
            />
          ))}

          {showBlueBubbleChat ? (
            <ChatMessage
              message={interim}
              sender='user'
              loading={true}
              finalMessage={openaiRequest}
              wakeKeywords={wakewordsRef.current}
            />
          ) : null}
        </div>
      </div>
      <GoogleSTTPill
        isUttering={isUttering}
        onToggleUttering={toggleUttering}
      />
      {noti ? (
        <Alert
          message={noti.message}
          type={noti.type}
          onClose={() => setNoti(undefined)}
        />
      ) : null}
      {interim ? (
        <InterimHistory interims={interimsRef.current} interim={interim} />
      ) : null}
      <GoogleSTTInput
        isListening={isListening}
        isLoading={isLoading}
        isSpeaking={isSpeaking}
        isRecording={isRecording && startKeywordDetectedRef.current}
        isWhisperPrepared={true}
        query={input}
        onChangeQuery={handleInputChange}
        onForceStopRecording={forceStopRecording}
        onStartListening={startListening}
        onStopListening={stopListening}
        onStopUttering={stopUttering}
        onSubmitQuery={submitTranscript}
      />
    </div>
  );
};

const NOTI_MESSAGES = {
  gpt: {
    loading: 'hang on, still working',
    error: 'Call to GPT Failed',
  },
};