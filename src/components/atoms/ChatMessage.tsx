import React, { useMemo } from 'react';
import AppearAnimation from './BasicAppearAnimation';
import { BE_CONCISE_PROMPT, WAKE_WORDS } from 'components/chat/constants';
import { ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/20/solid';
import { removeInitialKeyword, sanitizeText } from 'components/chat/methods';
import intersection from 'lodash/intersection'

interface ChatMessageProps {
  message: string;
  sender: string;
  loading?: boolean;
  finalMessage?: string;
  wakeKeywords?: string;
}

function ChatMessage({ message, sender, loading, finalMessage = '', wakeKeywords = '' }: Readonly<ChatMessageProps>) {
  const filteredMessage = useMemo(() => {
    const indexOfBeConcise = message.indexOf(BE_CONCISE_PROMPT);
    let filteredMessage = message;
    if (indexOfBeConcise !== -1 && sender === 'user') {
      filteredMessage = message.substring(0, indexOfBeConcise);
    }
    return filteredMessage;
  }, [message, sender]);

  const finalMessageWithoutWakeWords = useMemo(() => {
    return removeInitialKeyword(finalMessage, wakeKeywords ?? WAKE_WORDS)
  }, [finalMessage, wakeKeywords]);

  const hideInterimText = useMemo(() => {
    if (finalMessageWithoutWakeWords.length > 0) {
      const intersectionLength = intersection(sanitizeText(finalMessageWithoutWakeWords).split(' '), sanitizeText(filteredMessage).split(' ')).length;
      return intersectionLength / filteredMessage.split(' ').length > 0.7;
    }
    return false;
  }, [filteredMessage, finalMessageWithoutWakeWords]);

  return (
    <AppearAnimation
      className={`border-black/1 w-fit break-words rounded-2xl border-[0.5px] px-5 py-3 
        ${sender !== 'assistant'
          ? ' self-end bg-indigo-600 text-white'
          : ' bg-[#f4f7fb] text-gray-900'
        } 
        ${loading ? 'softpulse' : ''}`}
    >
      {!loading ? (
        <div className='flex text-md max-w-md gap-2'>
          <p>{filteredMessage}</p>
        </div>
      ) : (
        <div className='flex text-md max-w-md gap-2'>
          <span className='w-6'><ChatBubbleOvalLeftEllipsisIcon className='h-6 w-6' /></span>
          <p>{finalMessageWithoutWakeWords} {hideInterimText ? '' : filteredMessage} {loading ? '...' : ''}</p>
        </div>
      )}

    </AppearAnimation>
  );
}


export default ChatMessage;
