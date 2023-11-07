// TYPES THAT MATCH types for rows in Deepform's Supabase Database

// feedback
export interface FeedbackType {
  title: string;
  description: string;
  portal_id: number;
  creator: number;
  // Auto generated
  id?: number;
  created_at?: string;

  //Optional
  status?: string;
  topics?: string[];
}

// followupSubmissions
export interface FollowupSubmissionType {
  summary: string;
  feedback: number;
  user: number;
}

// followupMessages
export interface FollowupMessageType {
  followupSubmission: number;
  message: string;
  sender: 'AI' | 'human';

  // Auto generated
  id?: number;
  created_at?: string;
}

export interface UserSettingsType {
  id: number;
  created_at?: string;
  user_id: number;
  settings: string;
}

export interface SettingsType {
  autoStopTimeout: number;
  speakingRate: number;
  isAutoStopEnabled: boolean;
}
