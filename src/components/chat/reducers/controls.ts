import { STOP_TIMEOUT, STOP_UTTERING_WORDS, TERMINATOR_WORDS, TERMINATOR_WORD_TIMEOUT, WAKE_WORDS } from "../constants";

interface GoogleSttControlsState {
  speakingRate?: number;
  autoStopTimeout?: number;
  isAutoStop?: boolean;
  isWhisperEnabled?: boolean;
  wakeKeywords?: string;
  stopUtteringWords?: string;
  terminatorKeywords?: string;
  terminatorWaitTime?: number;
}

export enum ControlsActions {
  UPDATE_SETTINGS = 'update_settings',
}

interface GoogleSttControlsAction {
  type: ControlsActions;
  values?: GoogleSttControlsState;
}

export const initialControlsState: GoogleSttControlsState = {
  speakingRate: 1,
  autoStopTimeout: STOP_TIMEOUT,
  isAutoStop: true,
  isWhisperEnabled: true,
  wakeKeywords: WAKE_WORDS,
  stopUtteringWords: STOP_UTTERING_WORDS,
  terminatorKeywords: TERMINATOR_WORDS,
  terminatorWaitTime: TERMINATOR_WORD_TIMEOUT,
};

export function controlsReducer(state: GoogleSttControlsState, action: GoogleSttControlsAction) {
  if (action.type === ControlsActions.UPDATE_SETTINGS) {
    return {
      ...state,
      ...action.values,
    };
  }
  throw Error('Unknown action.');
}