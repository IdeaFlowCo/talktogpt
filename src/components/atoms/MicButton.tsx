import MicIcon from "assets/icons/MicIcon";
import MicWaveIcon from "assets/icons/MicWaveIcon";
import { Tooltip } from "@nextui-org/react";

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

          <div className="relative">
            <Tooltip content="Tap on me to have a chat!" isOpen showArrow
              classNames={{
                content: [
                  "p-2 bg-[#96BE64] text-white rounded-lg",
                ],
              }}
            >
              <span className="absolute flex h-3 w-3 left-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#96BE64] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#96BE64]"></span>
              </span>

            </Tooltip>
            <button
              data-tooltip-target="tooltip-default"
              type="button"
              onClick={async () => {
                await onStartListening();
              }}
              className='rounded-full border bg-white p-3 text-white hover:opacity-70'
            >
              <MicIcon color='#4F46DC' />
            </button>
          </div>

        )
      }
    </div>
  )
}

export default MicButton;