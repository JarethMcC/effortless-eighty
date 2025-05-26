export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  map: {
    id: string;
    summary_polyline: string | null;
    resource_state: number;
  };
  average_speed: number;
  max_speed: number;
  has_heartrate?: boolean;
  average_heartrate?: number;
}

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: any;
}
