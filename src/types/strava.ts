export interface StravaActivity {
  id: number;
  name: string;
  distance: number; // in meters
  moving_time: number; // in seconds
  elapsed_time: number; // in seconds
  type: string;
  start_date: string; // ISO 8601 date string
  start_date_local: string; // ISO 8601 date string
  timezone: string;
  map: {
    id: string;
    summary_polyline: string | null;
    resource_state: number;
  };
  average_speed: number; // meters per second
  max_speed: number; // meters per second
  has_heartrate?: boolean;      // Added: Indicates if the activity has heart rate data
  average_heartrate?: number; // Added: Average heart rate in beats per minute
  // Add other properties you might need
}

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: any; // You can define a more specific Athlete interface if needed
}