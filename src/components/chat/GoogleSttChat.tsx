import { useWhisper } from '@chengsokdara/use-whisper';
import { useChat, type CreateMessage, type Message } from 'ai/react';
import Alert from 'components/atoms/Alert';
import GoogleSTTInput from 'components/atoms/GoogleSTTInput';
import InterimHistory from 'components/atoms/InterimHistory';
import type { Harker } from 'hark';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
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
import { ControlsActions, controlsReducer, initialControlsState } from './reducers/controls';
import { createSettings, updateSettings, useSettingsByUser } from 'util/db';
import ChatMessage from 'components/atoms/ChatMessage';
import GoogleSTTPill from 'components/atoms/GoogleSTTPill';

const TEXT_SEPARATORS = {
  PARAGRAPH_BREAK: '\n\n',
  LINE_BREAK: '\n',
};

interface WordRecognized {
  isFinal: boolean;
  text: string;
}

export const GoogleSttChat = () => {
  const auth = useAuth();
  const userSettings = useSettingsByUser();
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

  const [firstMessage, setFirstMessage] = useState<string | null>(null);
  const [interim, setInterim] = useState<string>('');
  const [openaiRequest, setOpenaiRequest] = useState<string>('');

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

  const [{
    autoStopTimeout,
    speakingRate,
    isAutoStop,
    isWhisperEnabled,
    terminatorWaitTime,
    wakeKeywords,
    stopUtteringWords,
    terminatorKeywords
  }, controlsDispatch] = useReducer(controlsReducer, initialControlsState);

  const { recording, transcript, startRecording, stopRecording } = useWhisper({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    autoTranscribe: false,
    whisperConfig: {
      language: 'en',
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
  };

  const onStopUttering = () => {
    lastSpeechIndexRef.current += 1;
    if (storedMessagesRef.current.length > lastSpeechIndexRef.current) {
      startUttering(storedMessagesRef.current[lastSpeechIndexRef.current]);
    } else {
      flagsDispatch({ type: FlagsActions.STOP_UTTERING });
    }
  };

  const startUttering = useCallback((text: string) => {
    if (!text) {
      return;
    }
    flagsDispatch({ type: FlagsActions.START_UTTERING });
    if (!isAndroid || (isAndroid && !globalThis.ReactNativeWebView)) {
      if (!speechRef.current) {
        speechRef.current = new SpeechSynthesisUtterance();
        speechRef.current.addEventListener('start', onStartUttering);
        speechRef.current.addEventListener('end', onStopUttering);
      }
      speechRef.current.lang = 'en-US';
      speechRef.current.text = text;
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
    if (isWhisperEnabled) {
      await stopRecording();
    }
    const requestWithoutInitialKeywords = removeInitialKeyword(sanitizeText(interimsRef.current.join(' ')), wakeKeywords)
    const requestWithoutKeywords = removeTerminatorKeyword(requestWithoutInitialKeywords, terminatorKeywords)
    setOpenaiRequest(requestWithoutKeywords)

    startKeywordDetectedRef.current = false;
    endKeywordDetectedRef.current = false;
    flagsDispatch({ type: FlagsActions.FORCE_STOP_RECORDING });
    stopUttering();
  };

  const onAutoStop = () => {
    endKeywordDetectedRef.current = undefined;
    stopAutoStopTimeout();
    forceStopRecording().then(() => {
      console.log("TalkToGPT stop recording")
    }).catch((error) => {
      console.error(error)
    });
  };

  const processStartKeyword = () => {
    if (isUttering) {
      return
    }
    setInterim('');
    interimsRef.current = [];
    if (isWhisperEnabled) {
      startRecording().then(() => {
        console.log("Whisper start recording")
      })
    }
    setOpenaiRequest('');
    flagsDispatch({ type: FlagsActions.WAKEWORD_RECOGNISED });
    stopUttering();
    startKeywordDetectedRef.current = true;
  };

  const isStillSpeakingAfterTerminator = (lastWord: string, terminatorKeywords: string) => {
    const endWords = terminatorKeywords ?? TERMINATOR_WORDS;
    const matchWord = endWords.split(',').find((word) => {
      return lastWord.toLocaleLowerCase().includes(word.toLocaleLowerCase());
    });

    return typeof matchWord === 'undefined';
  }

  const stopByDetectEndKeyword = () => {
    if (isWhisperEnabled) {
      stopRecording().then(() => {
        console.log("Whisper stop recording")
      })
    }
    setOpenaiRequest(prev => {
      const requestWithoutInitialKeywords = removeInitialKeyword(sanitizeText(`${prev} ${interim}`), wakeKeywords)
      const requestWithoutKeywords = removeTerminatorKeyword(requestWithoutInitialKeywords, terminatorKeywords)
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

  const sendRequestIfTerminatorKeywordDetected = (speech: string, speechHistory: string[], terminatorKeywords: string) => {
    if (
      detectEndKeyword(speech, terminatorKeywords) &&
      !endKeywordDetectedRef.current
    ) {
      const timeoutId = setTimeout(() => {
        const lastWord = speechHistory[speechHistory.length - 1].split(' ');
        if (!isStillSpeakingAfterTerminator(lastWord[lastWord.length - 1], terminatorKeywords)) {
          endKeywordDetectedRef.current = true;
          if (typeof startKeywordDetectedRef.current !== 'undefined' &&
            !startKeywordDetectedRef.current) {
            stopUttering();
          } else {
            stopByDetectEndKeyword();
          }
        } else {
          clearTimeout(timeoutId);
        }
      }, terminatorWaitTime * 1000);
    }
  }

  const stopUtteringIfKeywordDetected = (text: string, stopUtteringKeywords: string) => {
    if (!startKeywordDetectedRef.current && typeof endKeywordDetectedRef.current === 'undefined') {
      const stopKeyword = extractStartKeyword(text, stopUtteringKeywords)
      if (stopKeyword !== null) {
        stopUttering();
      }
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
      const { data: settings } = await userSettings.refetch();
      interimRef.current += ` ${data.text}`;
      setInterim(data.text);

      if (data.isFinal) {
        interimsRef.current.push(data.text);
        interimRef.current = '';
        setOpenaiRequest((prev) => `${prev} ${data.text}`);
        flagsDispatch({ type: FlagsActions.FINAL_DATA_RECEIVED });
      } else {
        flagsDispatch({ type: FlagsActions.NOT_FINAL_DATA_RECEIVED });
      }

      // Detect starting keyword
      detectStartingKeyword(interimRef.current, settings[0].settings.wakeKeywords ?? wakeKeywords)

      // Stop the uttering if the user says the keyword to stop
      stopUtteringIfKeywordDetected(interimRef.current, settings[0].settings.stopUtteringWords ?? stopUtteringWords)

      // Detect end keyword and stop recording if detected in case that was the last word
      sendRequestIfTerminatorKeywordDetected(interimRef.current, interimsRef.current, settings[0].settings.terminatorKeywords ?? terminatorKeywords)

      const reversedInterims = interimsRef.current[interimsRef.current.length - 1] ?? '';
      detectVoiceCommand(reversedInterims);

    } catch (error) {
      console.error('An error occurred in onSpeechRecognized:', error);
    }
  };

  const handleTranscriptionResults = (transcribed: {
    error?: Error;
    text: string;
  }): string | null => {
    if (transcribed.error) {
      console.warn('24MB file size limit reached!');
      showErrorMessage('24MB limit reached!');
      return null;
    }
    if (!transcribed.text) {
      showErrorMessage('Voice command not detected. Please speak again.');
      flagsDispatch({ type: FlagsActions.STOP_SENDING_CHAT });
      return null;
    }
    return transcribed.text;
  };

  const transcribeAudio = async (
    blob: Blob
  ): Promise<{
    error?: Error;
    text: string;
  }> => {
    const base64 = await blobToBase64(blob);
    if (!base64) {
      return { error: new Error('Failed to read blob data.'), text: '' };
    }

    // Transcribe the audio
    const text = await whisperTranscript(base64);
    return { text };
  };

  const onTranscribe = async () => {
    let text = ''
    if (isWhisperEnabled) {
      const transcribed = await transcribeAudio(transcript.blob);
      const transcriptionText = handleTranscriptionResults(transcribed);
      if (!transcriptionText) return;
      text = removeTerminatorKeyword(transcriptionText, terminatorKeywords);
    } else {
      if (!openaiRequest) return;
      text = removeTerminatorKeyword(openaiRequest, terminatorKeywords);
    }

    await submitTranscript(text);
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

  const prepareSocket = async () => {
    socketRef.current = io(TALKTOGPT_SOCKET_ENDPOINT);

    socketRef.current.on('connect', () => { });

    socketRef.current.on('receive_audio_text', (data) => {
      onSpeechRecognized(data);
    });

    socketRef.current.on('disconnect', () => { });
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

  const toggleIsAutoStop = (value: boolean) => {
    controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...userSettings.data[0].settings, isAutoStop: value } });
    updateSettings({ ...userSettings.data[0], settings: { ...userSettings.data[0].settings, isAutoStop: value } })
  }

  const makeAutoStopTimeoutFaster = () => {
    const autoStopTimeoutValue = autoStopTimeout - 1 <= 0 ? 1 : autoStopTimeout - 1
    controlsDispatch({
      type: ControlsActions.UPDATE_SETTINGS,
      values: { ...userSettings.data[0].settings, autoStopTimeout: autoStopTimeoutValue }
    })
    updateSettings({ ...userSettings.data[0], settings: { ...userSettings.data[0].settings, autoStopTimeout: autoStopTimeoutValue } })
  }

  const makeAutoStopTimeoutSlower = () => {
    controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...userSettings.data[0].settings, autoStopTimeout: autoStopTimeout + 1 } })
    updateSettings({ ...userSettings.data[0], settings: { ...userSettings.data[0].settings, autoStopTimeout: autoStopTimeout + 1 } })
  }

  const runVoiceCommand = (voiceCommand: VoiceCommand) => {
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
          controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...userSettings.data[0].settings, autoStopTimeout: action.value } })
          updateSettings({ ...userSettings.data[0], settings: { ...userSettings.data[0].settings, autoStopTimeout: action.value } })
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
    flagsDispatch({ type: FlagsActions.START_LISTENING });
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
    if (isWhisperEnabled) {
      await stopRecording();
      await startRecording();
    }
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
    endKeywordDetectedRef.current = undefined;
    flagsDispatch({ type: FlagsActions.STOP_LOADING });
    flagsDispatch({ type: FlagsActions.STOP_UTTERING });
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
        content: `${text} ${BE_CONCISE}`,
        role: 'user',
      };

      await append(data, {
        options: {
          body: auth.user?.id ? { userId: auth.user.id } : undefined,
        },
      });
      return;
    } catch (sendDetectedTranscriptError) {
      console.error({ sendDetectedTranscriptError });
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

  const createOrUpdateUserSettings = useCallback(() => {
    if (auth.user?.id && userSettings?.data?.length <= 0) {
      createSettings({
        settings: {
          autoStopTimeout: STOP_TIMEOUT,
          speakingRate: 1,
          isAutoStop: true,
          isWhisperEnabled: true,
          terminatorWaitTime: 1,
          wakeKeywords: WAKE_WORDS,
          stopUtteringWords: STOP_UTTERING_WORDS,
          terminatorKeywords: TERMINATOR_WORDS
        }, user_id: auth.user?.id
      })
    }

    if (auth.user?.id && userSettings?.data?.length > 0) {
      controlsDispatch({
        type: ControlsActions.UPDATE_SETTINGS, values: {
          autoStopTimeout: userSettings.data[0].settings.autoStopTimeout ?? STOP_TIMEOUT,
          speakingRate: userSettings.data[0].settings.speakingRate ?? 1,
          isAutoStop: userSettings.data[0].settings.isAutoStop ?? true,
          isWhisperEnabled: userSettings.data[0].settings.isWhisperEnabled ?? true,
          terminatorWaitTime: userSettings.data[0].settings.terminatorWaitTime ?? TERMINATOR_WORD_TIMEOUT,
          wakeKeywords: userSettings.data[0].settings.wakeKeywords ?? WAKE_WORDS,
          stopUtteringWords: userSettings.data[0].settings.stopUtteringWords ?? STOP_UTTERING_WORDS,
          terminatorKeywords: userSettings.data[0].settings.terminatorKeywords ?? TERMINATOR_WORDS
        }
      })
    }
  }, [auth.user?.id, userSettings.data])

  useEffect(() => {
    createOrUpdateUserSettings();
  }, [createOrUpdateUserSettings])

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
      }
    }

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
      openaiRequest &&
      ((isWhisperEnabled && !recording && transcript.blob?.size > 44)
        || (!isWhisperEnabled && !isRecording))
  }, [isRecording, isSending, isTranscriptionDone, isWhisperEnabled, openaiRequest, recording, transcript.blob?.size])

  /**
   * check before sending audio blob to Whisper for transcription
   */
  useEffect(() => {
    if (isRequestReadyForTranscription()) {
      onTranscribe().then(() => {
        flagsDispatch({ type: FlagsActions.STOP_TRANSCRIPTION });
      });
    }
  }, [isRequestReadyForTranscription]);

  useEffect(() => {
    if (
      isAutoStop &&
      (isRecording || recording) &&
      isFinalData &&
      startKeywordDetectedRef.current
    ) {
      startAutoStopTimeout();
    }
    if (
      (isAutoStop && (!isRecording || !recording)) ||
      !isFinalData ||
      !startKeywordDetectedRef.current
    ) {
      stopAutoStopTimeout();
    }
  }, [isAutoStop, isRecording, recording, isFinalData]);

  useEffect(() => {
    if (speechRef.current) {
      // change utterance speaking rate
      speechRef.current.rate = speakingRate;
    }
  }, [speakingRate]);

  useEffect(() => {
    if (chatRef.current) {
      // auto scroll when there is new message
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, interim]);

  const onChangeAutoStopTimeout = (value: number) => {
    userSettings.refetch().then(({ data }) => {
      controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...data[0].settings, autoStopTimeout: value } })
      updateSettings({ ...data[0], settings: { ...data[0].settings, autoStopTimeout: value } })
    }).catch((error) => {
      console.error(error)
    })
  }

  const onChangeIsAutoStop = (value: boolean) => {
    userSettings.refetch().then(({ data }) => {
      controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...data[0].settings, isAutoStop: value } })
      updateSettings({ ...data[0], settings: { ...data[0].settings, isAutoStop: value } })
    }).catch((error) => {
      console.error(error)
    })
  }

  const onChangeIsWhisperEnabled = (value: boolean) => {
    userSettings.refetch().then(({ data }) => {
      controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...data[0].settings, isWhisperEnabled: value } })
      updateSettings({ ...data[0], settings: { ...data[0].settings, isWhisperEnabled: value } })
    }).catch((error) => {
      console.error(error)
    })
  }

  const onChangeSpeakingRate = (value: number) => {
    userSettings.refetch().then(({ data }) => {
      controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...data[0].settings, speakingRate: value } })
      updateSettings({ ...data[0], settings: { ...data[0].settings, speakingRate: value } })
      if (isAndroid && globalThis.ReactNativeWebView) {
        globalThis.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'speaking-rate',
            data: value,
          })
        );
      }
    }).catch((error) => {
      console.error(error)
    })
  }

  const onChangeTerminatorWaitTime = (value: number) => {
    userSettings.refetch().then(({ data }) => {
      controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...data[0].settings, terminatorWaitTime: value } })
      updateSettings({ ...data[0], settings: { ...data[0].settings, terminatorWaitTime: value } })
    }).catch((error) => {
      console.error(error)
    })
  }

  const onChangeWakeWord = (value: string) => {
    userSettings.refetch().then(({ data }) => {
      controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...data[0].settings, wakeKeywords: value } })
      updateSettings({ ...data[0], settings: { ...data[0].settings, wakeKeywords: value } })
    }).catch((error) => {
      console.error(error)
    })
  }

  const onChangeStopUtteringWord = (value: string) => {
    userSettings.refetch().then(({ data }) => {
      controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...data[0].settings, stopUtteringWords: value } })
      updateSettings({ ...data[0], settings: { ...data[0].settings, stopUtteringWords: value } })
    }).catch((error) => {
      console.error(error)
    })
  }

  const onChangeTerminatorWord = (value: string) => {
    userSettings.refetch().then(({ data }) => {
      controlsDispatch({ type: ControlsActions.UPDATE_SETTINGS, values: { ...data[0].settings, terminatorKeywords: value } })
      updateSettings({ ...data[0], settings: { ...data[0].settings, terminatorKeywords: value } })
    }).catch((error) => {
      console.error(error)
    })
  }

  const defaultMessage: Message = {
    content: `Welcome to Flow, your voice assistant. To activate flow, turn on the microphone. Then when you want to ask Flow a question and say “${wakeKeywords.split(',')[0]}, write a poem about Doug Engelbart” or anything else you would like to ask. You can switch to always on mode which allows you to speak, slowly, and end an utterance by saying “${terminatorKeywords.split(',')[0]}”.`,
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
              key={index}
              message={message.content}
              sender={message.role}
            />
          ))}
          {((interim && !isLoading && isRecording) || isRequestReadyForTranscription()) ? (
            <ChatMessage
              message={interimsRef.current.length > 1 ? `${interimsRef.current.slice(1, interimsRef.current.length - 1).join(' ')} ${interim}` : interim}
              sender='user'
              loading={true}
            />
          ) : null}
        </div>
      </div>
      <GoogleSTTPill
        autoStopTimeout={autoStopTimeout}
        isAutoStop={isAutoStop}
        isUttering={isUttering}
        speakingRate={speakingRate}
        isWhisperEnabled={isWhisperEnabled}
        terminatorWaitTime={terminatorWaitTime}
        wakeKeywords={wakeKeywords}
        stopUtteringWords={stopUtteringWords}
        terminatorKeywords={terminatorKeywords}
        onChangeAutoStopTimeout={onChangeAutoStopTimeout}
        onChangeIsAutoStop={onChangeIsAutoStop}
        onChangeSpeakingRate={onChangeSpeakingRate}
        onToggleUttering={toggleUttering}
        onChangeIsWhisperEnabled={onChangeIsWhisperEnabled}
        onChangeTerminatorWaitTime={onChangeTerminatorWaitTime}
        onChangeWakeWord={onChangeWakeWord}
        onChangeStopUtteringWord={onChangeStopUtteringWord}
        onChangeTerminatorWord={onChangeTerminatorWord}
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
        isRecording={(isRecording || recording) && startKeywordDetectedRef.current}
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