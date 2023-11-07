import { STOP_TIMEOUT } from "../constants";

interface GoogleSttControlsState {
  speakingRate?: number;
  autoStopTimeout?: number;
  isAutoStop?: boolean;
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