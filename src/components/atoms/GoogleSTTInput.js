import { useEffect, useRef } from 'react';
import useSound from 'use-sound';
import MicButton from './MicButton';
import Loading from 'assets/icons/Loading';

export default function GoogleSTTInput({
  isListening, // listening to wakeword
  isLoading, // when end keyword is detected
  isSpeaking, // when microphone detect sound
  isRecording, // useWhisper start recording
  isWhisperPrepared,
  query,
  onChangeQuery,
  onForceStopRecording,
  onStartListening,
  onStopListening,
  onStopUttering,
  onSubmitQuery,
}) {
  const waveRef = useRef();
  const [playBubble] = useSound('/sounds/bubble.mp3', { volume: 1, interrupt: true });
  const [playSonar] = useSound('/sounds/sonar.mp3', { volume: 0.3, interrupt: true });

  useEffect(() => {
    if (!isRecording && isWhisperPrepared && !isSpeaking && isListening && isLoading) {
      setTimeout(() => {
        playSonar();
      }, 0);
    }
  }, [isListening, isLoading, isRecording, isSpeaking, isWhisperPrepared, playSonar])

  useEffect(() => {
    const initWaveform = async () => {
      const SiriWave = (await import('siriwave')).default;
      waveRef.current = new SiriWave({
        container: document.getElementById('siri-wave'),
        width: 80,
        height: 64,
        style: 'ios9',
        amplitude: 4,
        autostart: true,
      });
    };
    if (isRecording && !waveRef.current) {
      setTimeout(() => {
        playBubble();
      }, 0);
      initWaveform();
    }
    return () => {
      waveRef.current = null;
      const siriWave = document.getElementById('siri-wave');
      if (siriWave) {
        siriWave.innerHTML = '';
      }
    };
  }, [isRecording, playBubble]);

  useEffect(() => {
    if (waveRef.current) {
      if (isSpeaking) {
        waveRef.current.setAmplitude(4);
      } else {
        waveRef.current.setAmplitude(1);
      }
    }
  }, [isSpeaking]);

  return (
    <div className='flex w-screen justify-center py-4'>
      <div className='flex min-w-[90%] items-center justify-center px-2'>
        <div className='relative flex min-w-[200px] flex-grow flex-row items-center rounded-full bg-[#f4f7fb] shadow-sm sm:min-w-[300px]'>
          <label htmlFor='chat' className='sr-only'>
            Chat
          </label>

          <input
            name='chat'
            id='chat'
            className='flex h-16 w-full rounded-md border-0 bg-transparent px-2 text-gray-900 placeholder:text-gray-400 focus:outline-0 sm:px-4 sm:py-1.5 sm:text-sm sm:leading-6'
            placeholder='Type your response...'
            value={query}
            autoComplete='off'
            onChange={onChangeQuery}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query) {
                onSubmitQuery?.(query);
              }
            }}
          />

          <div className='mr-2 text-sm sm:mr-4'>⏎</div>
        </div>

        <div className='relative min-h-[64px] min-w-[80px]'>
          <div
            id='siri-wave'
            style={{ display: isRecording ? 'unset' : 'none' }}
          ></div>

          {isLoading ? (
            <Loading />
          ) : null}
        </div>

        <MicButton
          isListening={isListening}
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          isWhisperPrepared={isWhisperPrepared}
          isLoading={isLoading}
          onStartListening={onStartListening}
          onStopListening={onStopListening}
          onStopUttering={onStopUttering}
          onForceStopRecording={onForceStopRecording}
        />
      </div>
    </div>
  );
}
