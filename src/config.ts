// Backend API base URL
export const API_BASE_URL: string = 'https://effortlesseighty.com/api';

// Strava redirect URI _ make sure this matches EXACTLY what's registered with Strava
export const STRAVA_REDIRECT_URI: string = 'https://effortless-eighty-frontend.onrender.com/exchange_token';

// API endpoints
export const API_AUTH_URL: string = `${API_BASE_URL}/auth-url`;
export const API_EXCHANGE_TOKEN: string = `${API_BASE_URL}/exchange-token`;
export const API_REFRESH_TOKEN: string = `${API_BASE_URL}/refresh-token`;
export const API_ACTIVITIES: string = `${API_BASE_URL}/activities`;
export const API_ATHLETE_ZONES: string = `${API_BASE_URL}/athlete/zones`;

// Strava API scopes
export const STRAVA_SCOPES: string = 'read,activity:read_all,profile:read_all';

