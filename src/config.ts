// Backend API base URL
export const API_BASE_URL: string = 'https://jarethm.com/api';

// Strava redirect URI - make sure this matches EXACTLY what's registered with Strava
export const STRAVA_REDIRECT_URI: string = 'https://effortlesseighty.com/exchange_token';

// Backend API endpoints
export const API_AUTH_URL: string = `${API_BASE_URL}/auth-url`;
export const API_EXCHANGE_TOKEN: string = `${API_BASE_URL}/exchange-token`;
export const API_ACTIVITIES: string = `${API_BASE_URL}/activities`;
export const API_ATHLETE_ZONES: string = `${API_BASE_URL}/athlete/zones`;
export const API_REFRESH_TOKEN: string = `${API_BASE_URL}/refresh-token`;
export const API_DEBUG_INFO: string = `${API_BASE_URL}/debug-info`;

// Strava scopes (used when requesting authorization URL)
export const STRAVA_SCOPES: string = 'read,activity:read_all,profile:read_all';
