import { Switch, Popover, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { usePopper } from 'react-popper';
import InputNumber from './InputNumber';
import SwitchControl from './SwitchControl';
import { SettingIcon } from 'assets/icons/SettingIcon';

export default function SettingsDropdown({
  autoStopTimeout,
  isAutoStop,
  isWhisperEnabled,
  terminatorWaitTime,
  onChangeAutoStopTimeout,
  onChangeIsAutoStop,
  onChangeIsWhisperEnabled,
  onChangeTerminatorWaitTime
}) {
  let [referenceElement, setReferenceElement] = useState();
  let [popperElement, setPopperElement] = useState();
  let { styles, attributes } = usePopper(referenceElement, popperElement);



  return (
    <Popover className='relative'>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-200'
        enterFrom='opacity-0 translate-y-1'
        enterTo='opacity-100 translate-y-0'
        leave='transition ease-in duration-150'
        leaveFrom='opacity-100 translate-y-0'
        leaveTo='opacity-0 translate-y-1'
      >
        <Popover.Panel
          ref={setPopperElement}
          className='absolute z-10 my-4 w-screen max-w-sm px-4 sm:px-0'
          style={styles.popper}
          {...attributes.popper}
        >
          <div className='overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5'>
            {/* {onChangePorcupineAccessKey ? (
              <div className='border-b border-gray-200 p-2'>
                <button
                  onClick={onChangePorcupineAccessKey}
                  className='flex w-full flex-col items-center rounded-md px-2 py-3 text-sm hover:bg-[#96BE64] hover:text-white'
                >
                  Change Porcupine Access Key
                </button>
              </div>
            ) : null} */}
            <div className='flex flex-col p-4'>
              <SwitchControl label='Enable Whisper' value={isWhisperEnabled} onChange={onChangeIsWhisperEnabled} />
              <hr className='my-4' />
              <InputNumber label='Terminator timeout' value={terminatorWaitTime} onChange={onChangeTerminatorWaitTime} />
              <hr className='my-4' />
              <SwitchControl label='Automatic respond' value={isAutoStop} onChange={onChangeIsAutoStop} />
              <InputNumber label='Auto-stop timeout' value={autoStopTimeout} onChange={onChangeAutoStopTimeout} />
            </div>
          </div>
        </Popover.Panel>
      </Transition>
      <Popover.Button
        ref={setReferenceElement}
        className='inline-flex w-full justify-center rounded-md bg-opacity-20 px-4 py-2 text-sm font-medium text-black hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75'
      >
        <SettingIcon />
      </Popover.Button>
    </Popover>
  );
}


