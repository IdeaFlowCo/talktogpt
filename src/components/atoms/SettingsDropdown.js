import { Popover, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';
import { usePopper } from 'react-popper';
import InputNumber from './InputNumber';
import SwitchControl from './SwitchControl';
import { SettingIcon } from 'assets/icons/SettingIcon';
import InputText from './InputText';
import { STOP_TIMEOUT, STOP_UTTERING_WORDS, TERMINATOR_WORDS, TERMINATOR_WORD_TIMEOUT, WAKE_WORDS } from 'components/chat/constants';
import { updateSettings, useSettingsByUser } from 'util/db';
import { useAuth } from 'util/auth';
import { initialControlsState } from 'components/chat/reducers/controls';
import { useMutation } from 'react-query';
import { Tabs, Tab } from "@nextui-org/react";
import { isMobile } from 'react-device-detect';


export default function SettingsDropdown() {
  let [referenceElement, setReferenceElement] = useState();
  let [popperElement, setPopperElement] = useState();
  let { styles, attributes } = usePopper(referenceElement, popperElement, { placement: 'top' });
  const [valueBeConcise, setValueBeConcise] = useState(true);
  const [valueAutoStop, setValueAutoStop] = useState(true);
  const [valueIsWhisperEnabled, setValueIsWhisperEnabled] = useState(true);

  const auth = useAuth();
  const { data: userSettings, refetch } = useSettingsByUser(auth.user?.id);

  const {
    autoStopTimeout = STOP_TIMEOUT,
    isAutoStop = true,
    isWhisperEnabled = true,
    terminatorWaitTime = TERMINATOR_WORD_TIMEOUT,
    wakeKeywords = WAKE_WORDS,
    stopUtteringWords = STOP_UTTERING_WORDS,
    terminatorKeywords = TERMINATOR_WORDS,
    beConcise = true
  } = userSettings?.settings ? userSettings.settings : initialControlsState

  const { mutateAsync, isLoading } = useMutation(updateSettings, {
    onSuccess: () => {
      refetch();
    },
  });

  useEffect(() => {
    setValueBeConcise(beConcise);
  }, [beConcise]);

  useEffect(() => {
    setValueAutoStop(isAutoStop);
  }, [isAutoStop]);

  useEffect(() => {
    setValueIsWhisperEnabled(isWhisperEnabled);
  }, [isWhisperEnabled]);


  const onChangeAutoStopTimeout = async (value) => {
    const newSettings = {
      ...userSettings,
      user_id: auth.user?.id,
      settings: {
        autoStopTimeout: value
      }
    }
    await mutateAsync(newSettings);
  }

  const onChangeIsAutoStop = async (value) => {
    setValueAutoStop(value);
    const newSettings = {
      ...userSettings,
      user_id: auth.user?.id,
      settings: {
        isAutoStop: value
      }
    }
    await mutateAsync(newSettings);
  }

  const onChangeIsWhisperEnabled = async (value) => {
    setValueIsWhisperEnabled(value);
    const newSettings = {
      ...userSettings,
      user_id: auth.user?.id,
      settings: {
        isWhisperEnabled: value
      }
    }
    await mutateAsync(newSettings);
  }

  const onChangeTerminatorWaitTime = async (value) => {
    const newSettings = {
      ...userSettings,
      user_id: auth.user?.id,
      settings: {
        terminatorWaitTime: value
      }
    }
    await mutateAsync(newSettings);
  }

  const onChangeWakeWord = async (value) => {
    const newSettings = {
      ...userSettings,
      user_id: auth.user?.id,
      settings: {
        wakeKeywords: value
      }
    }
    await mutateAsync(newSettings);
  }

  const onChangeStopUtteringWord = async (value) => {
    const newSettings = {
      ...userSettings,
      user_id: auth.user?.id,
      settings: {
        stopUtteringWords: value
      }
    }
    await mutateAsync(newSettings);
  }

  const onChangeTerminatorWord = async (value) => {
    const newSettings = {
      ...userSettings,
      user_id: auth.user?.id,
      settings: {
        terminatorKeywords: value
      }
    }
    await mutateAsync(newSettings);
  }

  const onChangeBeConcise = async (value) => {
    setValueBeConcise(value);
    const newSettings = {
      ...userSettings,
      user_id: auth.user?.id,
      settings: {
        beConcise: value
      }
    }
    await mutateAsync(newSettings);
  }


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
            {isMobile ? (
              <div className='flex flex-col p-4 min-h-[320px]'>
                <Tabs aria-label="Settings">
                  <Tab key="settings" title="Settings">
                    <SwitchControl label='Enable audio post-process' value={valueIsWhisperEnabled} onChange={onChangeIsWhisperEnabled} />
                    <SwitchControl label='Get shorter answers' value={valueBeConcise} onChange={onChangeBeConcise} />
                    <SwitchControl label='Automatic respond' value={valueAutoStop} onChange={onChangeIsAutoStop} />
                    <InputNumber label='Auto-stop timeout' value={autoStopTimeout} onChange={onChangeAutoStopTimeout} />
                  </Tab>
                  <Tab key="keywords" title="Keywords">
                    <InputText label='Wake word' value={wakeKeywords} placeholder={`Default value: ${WAKE_WORDS}`} onChange={onChangeWakeWord} />
                    <InputText label='Stop uttering word' value={stopUtteringWords} placeholder={`Default value: ${STOP_UTTERING_WORDS}`} onChange={onChangeStopUtteringWord} />
                    <InputText label='Terminator word' value={terminatorKeywords} placeholder={`Default value: ${TERMINATOR_WORDS}`} onChange={onChangeTerminatorWord} />
                    <InputNumber label='Terminator timeout' value={terminatorWaitTime} onChange={onChangeTerminatorWaitTime} />
                  </Tab>
                </Tabs>
              </div>
            ) : (
              <div className='flex flex-col p-4'>
                <SwitchControl label='Enable audio post-process' value={valueIsWhisperEnabled} onChange={onChangeIsWhisperEnabled} />
                <SwitchControl label='Get shorter answers' value={valueBeConcise} onChange={onChangeBeConcise} />
                <hr className='my-4' />
                <InputNumber label='Terminator timeout' value={terminatorWaitTime} onChange={onChangeTerminatorWaitTime} />
                <hr className='my-4' />
                <InputText label='Wake word' value={wakeKeywords} placeholder={`Default value: ${WAKE_WORDS}`} onChange={onChangeWakeWord} />
                <InputText label='Stop uttering word' value={stopUtteringWords} placeholder={`Default value: ${STOP_UTTERING_WORDS}`} onChange={onChangeStopUtteringWord} />
                <InputText label='Terminator word' value={terminatorKeywords} placeholder={`Default value: ${TERMINATOR_WORDS}`} onChange={onChangeTerminatorWord} />
                <hr className='my-4' />
                <SwitchControl label='Automatic respond' value={valueAutoStop} onChange={onChangeIsAutoStop} />
                <InputNumber label='Auto-stop timeout' value={autoStopTimeout} onChange={onChangeAutoStopTimeout} />
              </div>
            )}
          </div>
        </Popover.Panel>
      </Transition>
      <Popover.Button
        ref={setReferenceElement}
        className={`inline-flex w-full justify-center rounded-md bg-opacity-20 px-4 py-2 text-sm font-medium text-black hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 outline-none`}
      >
        <SettingIcon />
      </Popover.Button>
    </Popover>
  );
}


