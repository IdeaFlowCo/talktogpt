export interface GoogleSttControlsState {
  speakingRate?: number;
  autoStopTimeout?: number;
  isAutoStop?: boolean;
  isWhisperEnabled?: boolean;
  wakeKeywords?: string;
  stopUtteringWords?: string;
  terminatorKeywords?: string;
  terminatorWaitTime?: number;
  beConcise?: boolean;
}

interface GoogleSttControlsAction {
  type: ControlsActions;
  values?: GoogleSttControlsState;
}