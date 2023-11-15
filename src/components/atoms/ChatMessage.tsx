import React from 'react';
import AppearAnimation from './BasicAppearAnimation';
import { BE_CONCISE } from 'components/chat/constants';
import { ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/20/solid';

interface ChatMessageProps {
  message: string;
  sender: string;
  loading?: boolean;
}

function ChatMessage({ message, sender, loading }: Readonly<ChatMessageProps>) {
  const indexOfBeConcise = message.indexOf(BE_CONCISE);
  let filteredMessage = message;
  if (indexOfBeConcise !== -1 && sender === 'user') {
    filteredMessage = message.substring(0, indexOfBeConcise);
  }
  // END: ed8c6549bwf9

  return (
    <AppearAnimation
      className={`border-black/1 w-fit break-words rounded-2xl border-[0.5px] px-5 py-3 
        ${sender !== 'assistant'
          ? ' self-end bg-indigo-600 text-white'
          : ' bg-[#f4f7fb] text-gray-900'
        } 
        ${loading ? 'animate-pulse' : ''}`}
    >
      <div className='flex text-md max-w-md gap-2'>
        {loading ? <span className='w-6'><ChatBubbleOvalLeftEllipsisIcon className='h-6 w-6' /></span> : ''}
        <p>{filteredMessage} {loading ? '...' : ''}</p>
      </div>
    </AppearAnimation>
  );
}


export default ChatMessage;
