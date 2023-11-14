import MicIcon from "assets/icons/MicIcon";
import MicWaveIcon from "assets/icons/MicWaveIcon";

const MicButton = ({
  isRecording,
  isWhisperPrepared,
  isLoading,
  isSpeaking,
  isListening,
  onForceStopRecording,
  onStopListening,
  onStopUttering,
  onStartListening }) => {
  return (
    <div className='w-[3.125rem]'>
      {isRecording && isWhisperPrepared && !isLoading && (
        <button
          onClick={async () => {
            await onForceStopRecording();
          }}
          className='rounded-full border bg-[#96BE64] p-3'
        >
          {isSpeaking ? <MicWaveIcon /> : <MicIcon />}
        </button>
      )}

      {!(isRecording && isWhisperPrepared) && isSpeaking && (
        <button
          onClick={async () => {
            onStopUttering?.();
            onStopListening?.();
          }}
          disabled={isLoading}
          className={`rounded-full border ${isListening ? 'bg-[#F2C80F]' : 'bg-[#96BE64]'
            } p-3`}
        >
          <MicWaveIcon />
        </button>
      )}

      {!(isRecording && isWhisperPrepared) &&
        !isSpeaking &&
        isListening && (
          <button
            onClick={() => {
              onStopUttering?.();
              onStopListening?.();
            }}
            disabled={isLoading}
            className='rounded-full border bg-[#F2C80F] p-3'
          >
            <MicIcon />
          </button>
        )}

      {!(isRecording && isWhisperPrepared) &&
        !isSpeaking &&
        !isListening && (
          <button
            onClick={async () => {
              await onStartListening();
            }}
            className='rounded-full border bg-white p-3 text-white hover:opacity-70 '
          >
            <MicIcon color='#4F46DC' />
          </button>
        )}
    </div>
  )
}

export default MicButton;