import { useState } from 'react';
import SettingsDropdown from './SettingsDropdown';
import SpeakingRateDropdown from './SpeakingRateDropdown';
import { Modal, ModalBody, ModalContent } from '@nextui-org/react';
import { SettingIcon } from 'assets/icons/SettingIcon';

export default function GoogleSTTPill({
  isUttering,
  onToggleUttering,
  cancelRequest
}) {

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const onToggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  }

  return (
    <>
      <div className='flex h-10 min-w-[50%] flex-row items-center justify-center gap-4 self-center rounded-full bg-gray-300 sm:min-w-[25%]'>
        <SpeakingRateDropdown />
        <button onClick={onToggleUttering}>
          {isUttering ? (
            <StopIcon className='h-6 w-6' />
          ) : (
            <PlayIcon className='h-6 w-6' />
          )}
        </button>
        <div className='min-w-[64px]'>
          <button onClick={onToggleSettings} className='inline-flex w-full justify-center rounded-md bg-opacity-20 px-4 py-2 text-sm font-medium text-black hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75'>
            <SettingIcon />
          </button>
        </div>
      </div>
      <Modal isOpen={isSettingsOpen} onClose={onToggleSettings} placement='center'>
        <ModalContent>
          <ModalBody>
            <SettingsDropdown cancelRequest={cancelRequest} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

const PlayIcon = (props) => {
  return (
    <svg
      {...props}
      fill={props.color ?? '#000000'}
      viewBox='0 0 512 512'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g id='SVGRepo_bgCarrier' strokeWidth='0'></g>
      <g
        id='SVGRepo_tracerCarrier'
        strokeLinecap='round'
        strokeLinejoin='round'
      ></g>
      <g id='SVGRepo_iconCarrier'>
        <path d='M371.7 238l-176-107c-15.8-8.8-35.7 2.5-35.7 21v208c0 18.4 19.8 29.8 35.7 21l176-101c16.4-9.1 16.4-32.8 0-42zM504 256C504 119 393 8 256 8S8 119 8 256s111 248 248 248 248-111 248-248zm-448 0c0-110.5 89.5-200 200-200s200 89.5 200 200-89.5 200-200 200S56 366.5 56 256z'></path>
      </g>
    </svg>
  );
};

const StopIcon = (props) => {
  return (
    <svg
      {...props}
      fill={props.color ?? '#000000'}
      viewBox='0 0 512 512'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g id='SVGRepo_bgCarrier' strokeWidth='0'></g>
      <g
        id='SVGRepo_tracerCarrier'
        strokeLinecap='round'
        strokeLinejoin='round'
      ></g>
      <g id='SVGRepo_iconCarrier'>
        <path d='M504 256C504 119 393 8 256 8S8 119 8 256s111 248 248 248 248-111 248-248zm-448 0c0-110.5 89.5-200 200-200s200 89.5 200 200-89.5 200-200 200S56 366.5 56 256zm296-80v160c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V176c0-8.8 7.2-16 16-16h160c8.8 0 16 7.2 16 16z'></path>
      </g>
    </svg>
  );
};
