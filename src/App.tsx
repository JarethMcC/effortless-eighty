// src/App.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import { StravaActivity, StravaTokenResponse } from './types/strava';
import OverallStatsCharts from './components/OverallStatsCharts';
import PatchNotes from './components/PatchNotes';
import './App.css';
import stravaConnectBtn from './assets/btn_strava_connect_with_orange.svg';
import stravaPoweredByLogo from './assets/api_logo_pwrdBy_strava_horiz_orange.svg';

import {
  API_ACTIVITIES, API_ATHLETE_ZONES,
  API_AUTH_URL, API_EXCHANGE_TOKEN, API_REFRESH_TOKEN,
  STRAVA_REDIRECT_URI,
  STRAVA_SCOPES,
} from './config';

// --- Types (Inline, consider moving to src/types/appTypes.ts) ---
interface HeartRateZoneRange { min: number; max: number; name?: string; }
interface AthleteHeartRateZones { custom_zones: boolean; zones: HeartRateZoneRange[]; }

export enum ActivityIntensity { EASY = 'Easy', HARD = 'Hard', NA = 'N/A' }
export interface StravaActivityWithIntensity extends StravaActivity {
  intensity: ActivityIntensity;
  intensitySource?: 'HR (Zones)' | 'HR (Fixed Threshold)' | 'N/A (No HR)';
}
export interface WeekStats {
  activities: StravaActivityWithIntensity[];
  easyTime: number; hardTime: number; naTime: number;
  totalTrackedTime: number; totalTime: number;
}
export interface GroupedActivitiesWithStats { [weekKey: string]: WeekStats; }
// --- End Types ---

// --- Helper Functions ---
const getWeekStartDate = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust if Sunday (0) to get Monday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0); // Normalize to the beginning of the day
  return monday;
};

const formatWeekRange = (weekStartDate: Date): string => {
  const endDate = new Date(weekStartDate);
  endDate.setDate(weekStartDate.getDate() + 6); // Sunday of that week
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const currentYear = new Date().getFullYear();
  const startStr = weekStartDate.toLocaleDateString(undefined, options);
  const endStr = endDate.toLocaleDateString(undefined, options);
  const weekYear = weekStartDate.getFullYear();
  return `${startStr} - ${endStr}${weekYear !== currentYear ? `, ${weekYear}` : ''}`;
};

const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h > 0 ? h.toString().padStart(2, '0') : null,
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].filter(Boolean).join(':');
};

const formatDistance = (meters: number): string => {
  const kilometers = meters / 1000;
  return `${kilometers.toFixed(2)} km`;
};

const categorizeActivity = (activity: StravaActivity, athleteHRZones: AthleteHeartRateZones | null): StravaActivityWithIntensity => {
  let intensity: ActivityIntensity = ActivityIntensity.NA;
  let intensitySource: StravaActivityWithIntensity['intensitySource'] = 'N/A (No HR)';

  if (activity.has_heartrate && typeof activity.average_heartrate === 'number' && activity.average_heartrate > 0) {
    const avgHR = activity.average_heartrate;
    if (athleteHRZones && athleteHRZones.zones && athleteHRZones.zones.length > 0) {
      let determinedZoneIndex = -1;
      for (let i = 0; i < athleteHRZones.zones.length; i++) {
        const zone = athleteHRZones.zones[i];
        const max_hr_for_zone = (zone.max === -1 || zone.max === null) ? Infinity : zone.max;
        if (avgHR >= zone.min && avgHR <= max_hr_for_zone) {
          determinedZoneIndex = i;
          break;
        }
      }
      if (determinedZoneIndex !== -1) {
        intensity = determinedZoneIndex <= 1 ? ActivityIntensity.EASY : ActivityIntensity.HARD; // Zone 1 (idx 0) & 2 (idx 1) are Easy
        intensitySource = 'HR (Zones)';
      } else {
        // HR present, but didn't fall into any defined athlete zone
        intensity = avgHR <= 145 ? ActivityIntensity.EASY : ActivityIntensity.HARD;
        intensitySource = 'HR (Fixed Threshold)';
      }
    } else {
      // Athlete zones not available/fetched, use fixed HR threshold
      intensity = avgHR <= 145 ? ActivityIntensity.EASY : ActivityIntensity.HARD;
      intensitySource = 'HR (Fixed Threshold)';
    }
  }
  // If no HR data, it remains NA with source 'N/A (No HR)' as set initially
  return { ...activity, intensity, intensitySource };
};

// --- Reusable function to process and group a list of activities ---
const processAndGroupActivities = (
  activitiesToProcess: StravaActivity[],
  athleteHRZones: AthleteHeartRateZones | null
): GroupedActivitiesWithStats | null => {
  if (!activitiesToProcess || activitiesToProcess.length === 0) return null;

  return activitiesToProcess.reduce((acc: GroupedActivitiesWithStats, activity) => {
    const activityDate = new Date(activity.start_date_local);
    const weekStart = getWeekStartDate(activityDate);
    const weekKey = weekStart.toISOString().split('T')[0];
    const activityWithDetails = categorizeActivity(activity, athleteHRZones);

    if (!acc[weekKey]) {
      acc[weekKey] = { activities: [], easyTime: 0, hardTime: 0, naTime: 0, totalTrackedTime: 0, totalTime: 0 };
    }
    acc[weekKey].activities.push(activityWithDetails);
    acc[weekKey].totalTime += activity.moving_time;
    if (activityWithDetails.intensity === ActivityIntensity.HARD) {
      acc[weekKey].hardTime += activity.moving_time;
      acc[weekKey].totalTrackedTime += activity.moving_time;
    } else if (activityWithDetails.intensity === ActivityIntensity.EASY) {
      acc[weekKey].easyTime += activity.moving_time;
      acc[weekKey].totalTrackedTime += activity.moving_time;
    } else { // N/A
      acc[weekKey].naTime += activity.moving_time;
    }
    return acc;
  }, {});
};


// Welcome intro component that displays for non-authenticated users
const WelcomeIntro: React.FC<{ handleLogin: () => void }> = ({ handleLogin }) => {
  return (
    <div className="intro-section">
      <h2>Welcome to Effortless Eighty</h2>
      <div className="intro-content">
        <p>Effortless Eighty helps you track and analyze your Strava activities using the proven 80/20 running principle.</p>
        
        <h3>What is 80/20 Running?</h3>
        <p>The 80/20 principle suggests that approximately 80% of your training should be done at a low intensity (easy), while only 20% should be at moderate to high intensity (hard). This approach has been proven effective by elite athletes and research studies.</p>
        
        <h3>Benefits of 80/20 Training:</h3>
        <ul>
          <li>Reduced injury risk by minimizing high-stress workouts</li>
          <li>Improved endurance and aerobic development</li>
          <li>Better recovery between hard workouts</li>
          <li>Sustainable long-term progression</li>
          <li>More enjoyable training experience</li>
        </ul>
        
        <h3>How Effortless Eighty Helps:</h3>
        <p>Connect your Strava account to automatically analyze your running activities. We'll categorize your workouts based on heart rate zones and show you whether you're hitting the optimal 80/20 balance.</p>
        
        <div className="login-prompt">
          <p>Ready to optimize your training?</p>
          <div className="strava-connect-btn-container">
            <img 
              src={stravaConnectBtn} 
              alt="Connect with Strava" 
              onClick={handleLogin} 
              className="strava-connect-btn"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- App Component ---
const App: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('strava_access_token'));
  const [rawActivities, setRawActivities] = useState<StravaActivity[]>([]); // For 12 weeks
  const [athleteHRZones, setAthleteHRZones] = useState<AthleteHeartRateZones | null>(null);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(false);
  const [loadingZones, setLoadingZones] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      // Get authorization URL from backend
      const response = await axios.get(API_AUTH_URL, {
        params: {
          redirect_uri: STRAVA_REDIRECT_URI,
          scopes: STRAVA_SCOPES
        }
      });
      window.location.href = response.data.url;
    } catch (err: any) {
      console.error('Error getting authorization URL:', err);
      setError(`Failed to start login process: ${err.message || 'Unknown error'}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('strava_access_token');
    localStorage.removeItem('strava_refresh_token');
    localStorage.removeItem('strava_token_expires_at');
    localStorage.removeItem('strava_athlete_hr_zones');
    setAccessToken(null);
    setRawActivities([]);
    setAthleteHRZones(null);
    setError(null);
  };
  
  useEffect(() => {
    const fetchActivities = async () => {
      if (!accessToken) return;
      const tokenExpiresAt = localStorage.getItem('strava_token_expires_at');
      if (tokenExpiresAt && Date.now() / 1000 > parseInt(tokenExpiresAt, 10)) {
        console.warn('Access token expired. Refreshing...');
        const refreshToken = localStorage.getItem('strava_refresh_token');
        if (!refreshToken) {
          console.warn('No refresh token available. Logging out.');
          handleLogout();
          return;
        }
        
        try {
          const refreshResponse = await axios.post(API_REFRESH_TOKEN, { refresh_token: refreshToken });
          const { access_token, refresh_token, expires_at } = refreshResponse.data;
          localStorage.setItem('strava_access_token', access_token);
          localStorage.setItem('strava_refresh_token', refresh_token);
          localStorage.setItem('strava_token_expires_at', expires_at.toString());
          setAccessToken(access_token);
        } catch (err) {
          console.error('Failed to refresh token:', err);
          handleLogout();
          return;
        }
      }
      
      setLoadingActivities(true);
      setError(null);
      try {
        const response = await axios.get<StravaActivity[]>(API_ACTIVITIES, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { per_page: 200 }, 
        });
        
        const today = new Date();
        const currentDayOfWeek = today.getDay();
        const mondayOfCurrentWeek = new Date(today);
        mondayOfCurrentWeek.setDate(today.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1));
        mondayOfCurrentWeek.setHours(0, 0, 0, 0);
        
        const filterStartDateFor12Weeks = new Date(mondayOfCurrentWeek);
        filterStartDateFor12Weeks.setDate(mondayOfCurrentWeek.getDate() - (11 * 7)); // 12-week window

        const filteredFor12Weeks = response.data.filter(activity => {
            if (!activity.start_date_local) return false;
            try {
                const activityDate = new Date(activity.start_date_local);
                return !isNaN(activityDate.getTime()) && activityDate >= filterStartDateFor12Weeks;
            } catch (e) { 
                console.warn(`Error parsing date for activity ID ${activity.id}: ${activity.start_date_local}`, e);
                return false; 
            }
        });
        setRawActivities(filteredFor12Weeks.sort((a: StravaActivity, b: StravaActivity) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()));
      } catch (err: any) { 
        console.error('Error fetching activities:', err);
        setError(`Failed to fetch activities: ${err.message || 'Unknown error'}`);
        if (err.response?.status === 401) handleLogout();
      }
      finally { setLoadingActivities(false); }
    };
    if (accessToken) fetchActivities();
  }, [accessToken]);

  useEffect(() => {
    const fetchAthleteZones = async () => {
      if (!accessToken) return;
      const storedZones = localStorage.getItem('strava_athlete_hr_zones');
      if (storedZones) {
        try {
          const parsedZones = JSON.parse(storedZones);
          if (parsedZones && parsedZones.zones && Array.isArray(parsedZones.zones)) {
            setAthleteHRZones(parsedZones);
            return; 
          } else { localStorage.removeItem('strava_athlete_hr_zones'); }
        } catch (e) {
            console.error("Failed to parse stored HR zones", e);
            localStorage.removeItem('strava_athlete_hr_zones'); 
        }
      }
      setLoadingZones(true);
      try {
        const response = await axios.get<{ heart_rate: AthleteHeartRateZones }>(
          API_ATHLETE_ZONES, { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (response.data && response.data.heart_rate && response.data.heart_rate.zones && response.data.heart_rate.zones.length > 0) {
          setAthleteHRZones(response.data.heart_rate);
          localStorage.setItem('strava_athlete_hr_zones', JSON.stringify(response.data.heart_rate));
        } else {
          console.warn('Athlete HR zones not found or in unexpected format from API.');
          setAthleteHRZones(null); 
        }
      } catch (err: any) {
        console.error('Error fetching athlete HR zones:', err);
        let newError = `Failed to fetch athlete HR zones: ${err.message || 'Unknown error'}.`;
        if (err.response?.status === 403) {
            newError += " Ensure 'profile:read_all' scope is granted.";
        }
        setError(prevError => prevError ? `${prevError} ${newError}` : newError);
        setAthleteHRZones(null); 
      } finally { setLoadingZones(false); }
    };
    if (accessToken) fetchAthleteZones();
  }, [accessToken]);

  // Memoized for ActivityList (processes all rawActivities, which are 12 weeks)
  const processedAndGroupedActivitiesForList = useMemo<GroupedActivitiesWithStats | null>(() => {
    return processAndGroupActivities(rawActivities, athleteHRZones);
  }, [rawActivities, athleteHRZones]);

  // Memoized for Charts (filters rawActivities to 8 weeks instead of 4, then processes)
  const processedAndGroupedActivitiesForCharts = useMemo<GroupedActivitiesWithStats | null>(() => {
    if (!rawActivities || rawActivities.length === 0) return null;

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayOfCurrentWeek = new Date(today);
    mondayOfCurrentWeek.setDate(today.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1));
    mondayOfCurrentWeek.setHours(0, 0, 0, 0);

    const filterStartDateFor8Weeks = new Date(mondayOfCurrentWeek);
    filterStartDateFor8Weeks.setDate(mondayOfCurrentWeek.getDate() - (7 * 7)); // 8-week window

    const eightWeekActivities = rawActivities.filter(activity => {
      if (!activity.start_date_local) return false;
      try {
        const activityDate = new Date(activity.start_date_local);
        return !isNaN(activityDate.getTime()) && activityDate >= filterStartDateFor8Weeks;
      } catch (e) { 
          console.warn(`Error parsing date for chart filtering (activity ID ${activity.id}): ${activity.start_date_local}`, e);
          return false; 
      }
    });
    
    return processAndGroupActivities(eightWeekActivities, athleteHRZones);
  }, [rawActivities, athleteHRZones]);

  const isLoading = loadingActivities || loadingZones;

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Effortless Eighty</h1>
          {!accessToken ? (
            <div className="strava-connect-btn-container">
              <img 
                src={stravaConnectBtn} 
                alt="Connect with Strava" 
                onClick={handleLogin} 
                className="strava-connect-btn"
              />
            </div>
          ) : (
            <button onClick={handleLogout} className="logout-button">Logout</button>
          )}
        </header>
        <Routes>
          <Route path="/exchange_token" element={<OAuthCallback setAccessToken={setAccessToken} setError={setError} />} />
          <Route path="/patch-notes" element={<PatchNotes />} />
          <Route
            path="/"
            element={
              accessToken ? (
                <>
                  {isLoading && <div className="loading-text">Loading data...</div>}
                  {error && <div className="error-text">Error: {error}</div>}
                  {!isLoading && !error && (
                    <div className="main-content-container">
                      <OverallStatsCharts groupedData={processedAndGroupedActivitiesForCharts} />
                      <ActivityList groupedData={processedAndGroupedActivitiesForList} />
                    </div>
                  )}
                </>
              ) : ( <WelcomeIntro handleLogin={handleLogin} /> )
            }
          />
        </Routes>
        <footer className="App-footer">
          <div className="footer-content">
            <div className="footer-row">
              <div className="creator-credit">
                © 2025 <a href="https://github.com/jarethmcc" target="_blank" rel="noopener noreferrer">Jareth McCardell</a>
              </div>
              <div className="footer-links">
                <Link to="/patch-notes" className="footer-link">Patch Notes</Link>
              </div>
              <div className="strava-powered-by-container">
                <img 
                  src={stravaPoweredByLogo} 
                  alt="Powered by Strava" 
                  className="strava-powered-by"
                />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

// --- OAuthCallback Component Definition ---
interface OAuthCallbackProps { 
  setAccessToken: (token: string) => void; 
  setError: (error: string | null) => void; 
}
const OAuthCallback: React.FC<OAuthCallbackProps> = ({ setAccessToken, setError }) => {
  const [processed, setProcessed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  useEffect(() => {
    if (processed || retryCount > MAX_RETRIES) return;

    const exchangeToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const errorParam = urlParams.get('error');
      
      if (errorParam) {
        console.error('OAuth Error:', errorParam);
        setError(`OAuth failed: ${errorParam}. Please try logging in again.`);
        setProcessed(true); 
        return;
      }
      
      if (!code) {
        setError('No authorization code found. Please try logging in again.');
        setProcessed(true);
        return;
      }
      
      try {
        console.log(`Attempting to exchange code for token (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        setIsRetrying(retryCount > 0);
        
        const response = await axios.post<StravaTokenResponse>(
          API_EXCHANGE_TOKEN,
          { code },
          { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000 // 10 second timeout
          }
        );
        
        const { access_token, refresh_token, expires_at } = response.data;
        localStorage.setItem('strava_access_token', access_token);
        localStorage.setItem('strava_refresh_token', refresh_token);
        localStorage.setItem('strava_token_expires_at', expires_at.toString());
        setAccessToken(access_token);
        setError(null);
        setProcessed(true);
      } catch (err: any) {
        console.error('Error exchanging token:', err);
        
        // Check if we should retry
        if (retryCount < MAX_RETRIES) {
          console.log(`Will retry in 2 seconds... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => setRetryCount(prev => prev + 1), 2000);
          return;
        }
        
        // Format detailed error message
        let errorMessage = 'Failed to exchange authorization code for token.';
        if (err.response?.data?.error) {
          errorMessage += ` ${err.response.data.error}`;
        } else if (err.message) {
          errorMessage += ` ${err.message}`;
        }
        
        // Log additional error details for debugging
        if (err.response) {
          console.error('Token exchange error details:', {
            status: err.response.status,
            data: err.response.data,
          });
        }
        
        setError(errorMessage + ' Please try logging in again.');
        setProcessed(true);
      }
    };
    
    exchangeToken();
  }, [setAccessToken, setError, processed, retryCount]);

  if (!processed) {
    return (
      <div className="loading-text">
        {isRetrying ? 
          `Retrying authentication (attempt ${retryCount}/${MAX_RETRIES})...` : 
          'Processing authentication...'}
      </div>
    );
  }
  
  return <Navigate to="/" />;
};

// --- ActivityList Component ---
interface ActivityListProps { 
  groupedData: GroupedActivitiesWithStats | null; 
}
const ActivityList: React.FC<ActivityListProps> = ({ groupedData }) => {
  if (!groupedData) {
    // This case indicates data is still being processed by App or initial load
    // Parent <App> component handles global loading/error messages
    return <div className="info-text">Preparing activity data...</div>; 
  }
  
  const sortedWeekKeys = Object.keys(groupedData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (sortedWeekKeys.length === 0) {
    return <div className="info-text">No activities found in the last 12 weeks.</div>;
  }

  return (
    <div className="activities-container">
      <h2>Activity Details (Last 12 Weeks)</h2>
      <p className="info-text" style={{fontSize: "0.85em", textAlign: "left", margin: "-10px 0 20px 0"}}>
        Intensity for all activities is based on your Strava HR zones (Easy = Z1/Z2, Hard = Z3+) if HR data and your zones are available.
        If your zones aren't found, a fixed HR threshold (Easy ≤145bpm &lt; Hard) is used for activities with HR.
        Activities without HR data are marked N/A. This approximates the 80/20 rule.
      </p>
      {sortedWeekKeys.map((weekKey) => {
          const weekStartDate = new Date(weekKey);
          const weekData = groupedData[weekKey];
          const { easyTime, hardTime, naTime, totalTrackedTime, totalTime } = weekData;
          let easyPercentage = 0; let hardPercentage = 0;
          if (totalTrackedTime > 0) {
            easyPercentage = Math.round((easyTime / totalTrackedTime) * 100);
            hardPercentage = Math.round((hardTime / totalTrackedTime) * 100);
          }
          return (
            <div key={weekKey} className="week-group">
              <h3 className="week-header">{formatWeekRange(weekStartDate)}</h3>
              <div className="week-summary">
                <div><strong>Easy:</strong> {easyPercentage}% ({formatDuration(easyTime)})</div>
                <div><strong>Hard:</strong> {hardPercentage}% ({formatDuration(hardTime)})</div>
                {naTime > 0 && <div><strong>N/A:</strong> ({formatDuration(naTime)})</div>}
                <div><strong>Total:</strong> ({formatDuration(totalTime)})</div>
              </div>
              <ul className="activity-list">
                {weekData.activities.map((activity) => (
                  <li key={activity.id} className="activity-item">
                    <h4>
                      {activity.name}
                      {activity.intensitySource && <span className="intensity-source-chip">({activity.intensitySource})</span>}
                    </h4>
                    <p><strong>Type:</strong> {activity.type}</p>
                    <p><strong>Date:</strong> {new Date(activity.start_date_local).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <p><strong>Distance:</strong> {formatDistance(activity.distance)}</p>
                    <p><strong>Moving Time:</strong> {formatDuration(activity.moving_time)}</p>
                    {activity.average_speed && <p><strong>Average Speed:</strong> {(activity.average_speed * 3.6).toFixed(2)} km/h</p>}
                    {activity.has_heartrate && typeof activity.average_heartrate === 'number' && activity.average_heartrate > 0 && (
                      <p><strong>Avg HR:</strong> {Math.round(activity.average_heartrate)} bpm</p>
                    )}
                    <p>
                      <strong>Intensity:</strong>{' '}
                      <span className={`intensity-tag ${activity.intensity.toLowerCase()}`}>
                        {activity.intensity}
                      </span>
                      <a 
                        href={`https://www.strava.com/activities/${activity.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="view-on-strava-link"
                      >
                        View on Strava
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
      })}
    </div>
  );
};

export default App;
