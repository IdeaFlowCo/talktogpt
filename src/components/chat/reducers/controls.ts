import { STOP_TIMEOUT } from "../constants";

interface GoogleSttControlsState {
  speakingRate?: number;
  autoStopTimeout?: number;
  isAutoStop?: boolean;
  isWhisperEnabled?: boolean;
  wakeKeywords?: string;
  pauseWords?: string;
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
  wakeKeywords: 'over',
  pauseWords: 'pause',
  terminatorKeywords: 'over',
  terminatorWaitTime: 1,

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