import { VoiceCommand } from '../../../types/useWhisperTypes';
import wordsToNumbers from 'words-to-numbers';
import { TERMINATOR_WORDS, WAKE_WORDS, VOICE_COMMANDS } from '../constants';
import { Message } from 'ai';

const ERROR_CODE_EXCEED_MAX_BODY_LIMIT = 413;

type VoiceCommandAction =
  | { type: 'SET_IS_AUTO_STOP'; value: boolean }
  | { type: 'SET_AUTO_STOP_TIMEOUT'; value: number | string }
  | { type: 'SET_MICROPHONE_OFF'; value: boolean }
  | { type: 'SHOW_MESSAGE'; messageType: 'error' | 'success'; message: string }
  | null;

export const getVoiceCommandAction = (voiceCommand: VoiceCommand): VoiceCommandAction => {
  switch (voiceCommand.command) {
    case VOICE_COMMANDS.OFF_AUTO_STOP.command:
      return { type: 'SET_IS_AUTO_STOP', value: false };

    case VOICE_COMMANDS.ON_AUTO_STOP.command:
      return { type: 'SET_IS_AUTO_STOP', value: true };

    case VOICE_COMMANDS.TURN_OFF_MIC.command:
      return { type: 'SET_MICROPHONE_OFF', value: false };

    case VOICE_COMMANDS.CHANGE_AUTO_STOP.command:
      if (voiceCommand.args && typeof voiceCommand.args === 'number') {
        return { type: 'SET_AUTO_STOP_TIMEOUT', value: voiceCommand.args };
      } else {
        return {
          type: 'SHOW_MESSAGE',
          messageType: 'error',
          message: 'Incorrect voice command. The value must be a number.',
        };
      }

    case VOICE_COMMANDS.MAKE_AUTO_STOP.command:
      return { type: 'SET_AUTO_STOP_TIMEOUT', value: voiceCommand.args };

    default:
      return null;
  }
};

export const checkIsVoiceCommand = (text: string): VoiceCommand | undefined => {
  const voiceCommands = Object.values(VOICE_COMMANDS);
  if (text) {
    for (const voiceCommand of voiceCommands) {
      if (text.match(voiceCommand.matcher)) {
        if (voiceCommand.command === VOICE_COMMANDS.CHANGE_AUTO_STOP.command) {
          let args = wordsToNumbers(text);
          if (typeof args === 'string') {
            const match = /\d+/.exec(args);
            args = match ? parseInt(match[0], 10) : 0;
          }
          return { ...voiceCommand, args };
        } else if (voiceCommand.command === VOICE_COMMANDS.MAKE_AUTO_STOP.command) {
          const commands = [
            { command: 'faster', index: text.toLocaleLowerCase().indexOf('faster') },
            { command: 'slower', index: text.toLocaleLowerCase().indexOf('slower') },
          ]
            .sort((a, b) => a.index - b.index)
            .filter((c) => c.index !== -1);

          return { ...voiceCommand, args: commands.length > 0 ? commands[0].command : '' };
        } else {
          return voiceCommand;
        }
      }
    }
  }

  return undefined;
};

export const extractStartKeyword = (interimText: string, wakeWords: string): string | null => {
  const wake_words = wakeWords?.split(',') || WAKE_WORDS.split(',');
  for (const keyword of wake_words) {
    const lastInterimText = interimText.split(' ').reverse()[0];
    if (sanitizeText(lastInterimText) === sanitizeText(keyword)) {
      return keyword;
    }
  }
  return null;
};

export const trimText = (text: string): string => {
  const textStripCommas = text
    .trim()
    .replace(/(^,|,$|^\.)/, '')
    .trim();
  return `${textStripCommas.charAt(0).toLocaleUpperCase()}${textStripCommas.substring(1)}`;
};

export const removeInitialKeyword = (text: string, wakeWords: string): string => {
  let textToReturn = text;
  const lowerCaseText = sanitizeText(text);
  const wake_words = wakeWords?.split(',') || WAKE_WORDS?.split(',');
  wake_words.forEach((keyword) => {
    const last_keyword_chunk = keyword.split(' ').reverse()[0];
    const keywordIndex = lowerCaseText.indexOf(sanitizeText(last_keyword_chunk));
    if (keywordIndex !== -1) {
      textToReturn = lowerCaseText.substring(keywordIndex + last_keyword_chunk.length);
    }
  });
  return lowerCaseText;
}

export const removeTerminatorKeyword = (text: string, terminatorWords: string): string => {
  const end_words = terminatorWords?.split(',') || TERMINATOR_WORDS.split(',');
  end_words.forEach((keyword) => {
    const lastChunk = text.split(' ').reverse()[0].toLocaleLowerCase();
    if (lastChunk.includes(keyword.toLocaleLowerCase())) {
      text = text.toLocaleLowerCase().split(' ').slice(0, -1).join(' ');
    }
  });

  return trimText(text);
};

export const blobToBase64 = (blob: Blob): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result?.toString().split(',')[1] || null;
      resolve(base64data);
    };
    reader.readAsDataURL(blob);
  });
};

export const whisperTranscript = async (base64: string): Promise<{status: string, message: string, errorCode?: number}> => {
  console.log('WHISPER');
  let file = Buffer.from(base64, 'base64');
    console.log({ filesize: file.byteLength });
  try {
    const body = {
      file: base64,
    };
    const headers = {
      'Content-Type': 'application/json',
    };
    const { default: axios } = await import('axios');
    const response = await axios.post('/api/openai/whisper', JSON.stringify(body), {
      headers,
      maxBodyLength: 25 * 1024 * 1024,
    });
    return {
      status: 'success',
      message: response?.data?.text || '',
    }
  } catch (error) {
    console.warn('whisperTranscript', { error });
    console.log(`Error Code: ${error?.response?.status}`)
    console.log(`Error Message: ${error?.message}`)
    console.log(`Error Response: ${error?.response?.data}`)
    const errorCode = error?.response?.status;
    return {
      errorCode: error?.response?.status,
      status: 'error',
      message: errorCode === ERROR_CODE_EXCEED_MAX_BODY_LIMIT ? 
        'The audio file has exceeded the maximum size limit (24mb). Please, speak again in shorter periods of time.' : 
        `${error?.message || 'Error'}: ${error?.response?.data || 'Whisper API is not available.'}`,
    }
  }
};

export const detectEndKeyword = (interimText: string, terminatorKeywords: string): boolean => {
    let isKeywordDetected = false;
  const end_words = terminatorKeywords.split(',') || TERMINATOR_WORDS.split(',');
  for (const keyword of end_words) {
    isKeywordDetected ||= sanitizeText(interimText).includes(sanitizeText(keyword));
  }
  return isKeywordDetected;
};

export const splitTextsBySeparator = (texts: Message[], separator: string): Message[] => {
  const finalMessages = [];
  texts.forEach((text) => {
    const exploded = text.content.split(separator);
    if (exploded.length === 1) {
      finalMessages.push(text);
    } else {
      exploded.forEach((explodedMsg) => {
        finalMessages.push({
          ...text,
          content: explodedMsg,
        });
      });
    }
  });

  return finalMessages;
};

export const sanitizeText = (keyword: string): string => {
  return keyword
    .replaceAll(/[,|.]/g, '')
    .replaceAll(/\n\n|\n/g, '')
    .trim()
    .toLocaleLowerCase();
};

// export const getIndexLastKeyword = (interims: string[]): number => {
//   const wake_words = process.env.NEXT_PUBLIC_WAKEWORKDS?.split(',') || WAKE_WORDS;
//   const wake_words_index = wake_words.map((keyword) => {
//     const index = interims.findLastIndex((interim) => sanitizeText(interim).includes(sanitizeText(keyword)));
//     return { keyword, index };
//   });

//   return wake_words_index.toSorted((a, b) => a.index - b.index)[0].index;
// };
