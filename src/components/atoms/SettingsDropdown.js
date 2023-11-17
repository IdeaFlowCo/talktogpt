import { Popover, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { usePopper } from 'react-popper';
import InputNumber from './InputNumber';
import SwitchControl from './SwitchControl';
import { SettingIcon } from 'assets/icons/SettingIcon';
import InputText from './InputText';
import { STOP_UTTERING_WORDS, TERMINATOR_WORDS, WAKE_WORDS } from 'components/chat/constants';
import { set } from 'lodash';

export default function SettingsDropdown({
  disabled,
  autoStopTimeout,
  isAutoStop,
  isWhisperEnabled,
  terminatorWaitTime,
  wakeKeywords,
  stopUtteringWords,
  terminatorKeywords,
  beConcise,
  onChangeAutoStopTimeout,
  onChangeIsAutoStop,
  onChangeIsWhisperEnabled,
  onChangeTerminatorWaitTime,
  onChangeWakeWord,
  onChangeStopUtteringWord,
  onChangeTerminatorWord,
  onChangeBeConcise,
}) {
  let [referenceElement, setReferenceElement] = useState();
  let [popperElement, setPopperElement] = useState();
  let { styles, attributes } = usePopper(referenceElement, popperElement, { placement: 'top' });


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
              <SwitchControl label='Enable audio post-process' value={isWhisperEnabled} onChange={onChangeIsWhisperEnabled} />
              <SwitchControl label='Get shorter answers' value={beConcise} onChange={onChangeBeConcise} />
              <hr className='my-4' />
              <InputNumber label='Terminator timeout' value={terminatorWaitTime} onChange={onChangeTerminatorWaitTime} />
              <hr className='my-4' />
              <InputText label='Wake word' value={wakeKeywords} placeholder={`Default value: ${WAKE_WORDS}`} onChange={onChangeWakeWord} />
              <InputText label='Stop uttering word' value={stopUtteringWords} placeholder={`Default value: ${STOP_UTTERING_WORDS}`} onChange={onChangeStopUtteringWord} />
              <InputText label='Terminator word' value={terminatorKeywords} placeholder={`Default value: ${TERMINATOR_WORDS}`} onChange={onChangeTerminatorWord} />
              <hr className='my-4' />
              <SwitchControl label='Automatic respond' value={isAutoStop} onChange={onChangeIsAutoStop} />
              <InputNumber label='Auto-stop timeout' value={autoStopTimeout} onChange={onChangeAutoStopTimeout} />
            </div>
          </div>
        </Popover.Panel>
      </Transition>
      <Popover.Button
        ref={setReferenceElement}
        disabled={disabled}
        className={`${disabled ? 'opacity-20' : ''} inline-flex w-full justify-center rounded-md bg-opacity-20 px-4 py-2 text-sm font-medium text-black hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 outline-none`}
      >
        <SettingIcon />
      </Popover.Button>
    </Popover>
  );
}


