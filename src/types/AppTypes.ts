import { StravaActivity } from './strava';

export interface HeartRateZoneRange {
  min: number;
  max: number;
  name?: string;
}

export interface AthleteHeartRateZones {
  custom_zones: boolean;
  zones: HeartRateZoneRange[];
}

export enum ActivityIntensity {
  EASY = 'Easy',
  HARD = 'Hard',
  NA = 'N/A',
}

export interface StravaActivityWithIntensity extends StravaActivity {
  intensity: ActivityIntensity;
  intensitySource?: 'HR (Zones)' | 'HR (Fixed Threshold)' | 'N/A (No HR)';
}

export interface WeekStats {
  activities: StravaActivityWithIntensity[];
  easyTime: number;
  hardTime: number;
  naTime: number;
  totalTrackedTime: number;
  totalTime: number;
}

export interface GroupedActivitiesWithStats {
  [weekKey: string]: WeekStats;
}
