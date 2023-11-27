import { useEffect, useState } from 'react';
import InputNumber from './InputNumber';
import SwitchControl from './SwitchControl';
import InputText from './InputText';
import { STOP_TIMEOUT, STOP_UTTERING_WORDS, TERMINATOR_WORDS, TERMINATOR_WORD_TIMEOUT, WAKE_WORDS } from 'components/chat/constants';
import { updateSettings, useSettingsByUser } from 'util/db';
import { useAuth } from 'util/auth';
import { initialControlsState } from 'components/chat/reducers/controls';
import { useMutation } from 'react-query';
import { Tabs, Tab } from "@nextui-org/react";
import { isMobile } from 'react-device-detect';


export default function SettingsDropdown({ cancelRequest }) {
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

  const { mutateAsync } = useMutation(updateSettings, {
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
    cancelRequest();
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
    <>
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
    </>
  );
}


