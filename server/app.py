from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import json
import logging
import time
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
CORS(app)

STRAVA_CLIENT_ID = os.getenv('STRAVA_CLIENT_ID')
STRAVA_CLIENT_SECRET = os.getenv('STRAVA_CLIENT_SECRET')
STRAVA_AUTHORIZATION_URL = 'https://www.strava.com/oauth/authorize'
STRAVA_TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token'
STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities'
STRAVA_ATHLETE_ZONES_URL = 'https://www.strava.com/api/v3/athlete/zones'

if not STRAVA_CLIENT_ID or not STRAVA_CLIENT_SECRET:
    logger.error("Strava API credentials are missing! Check your .env file.")

EXPECTED_REDIRECT_URI = 'https://effortlesseighty.com/exchange_token'
logger.info(f"Expected redirect URI: {EXPECTED_REDIRECT_URI}")

@app.route('/api/auth-url', methods=['GET'])
def get_auth_url():
    """Generate and return the Strava authorization URL"""
    redirect_uri = request.args.get('redirect_uri')
    scopes = request.args.get('scopes', 'read,activity:read_all,profile:read_all')

    logger.info(f"Generating auth URL with redirect_uri: {redirect_uri}")

    auth_url = f"{STRAVA_AUTHORIZATION_URL}?client_id={STRAVA_CLIENT_ID}&redirect_uri={redirect_uri}&response_type=code&scope={scopes}"
    return jsonify({"url": auth_url})

def make_token_request_with_retry(payload, max_retries=3):
    """Make token request with retry logic"""
    retries = 0
    backoff_factor = 1  # Start with 1 second, then 2, then 4 seconds between retries
    
    while retries < max_retries:
        try:
            logger.info(f"Attempting token exchange (attempt {retries+1}/{max_retries})")
            response = requests.post(STRAVA_TOKEN_URL, data=payload, timeout=10)
            
            # Check if response is a 5xx server error we should retry
            if 500 <= response.status_code < 600:
                logger.warning(f"Received {response.status_code} status from Strava API. Retrying...")
                retries += 1
                if retries < max_retries:
                    wait_time = backoff_factor * (2 ** (retries - 1))  # Exponential backoff
                    logger.info(f"Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"Failed after {max_retries} attempts: received {response.status_code} from API")
                    return response
            
            # Not a 5xx error, return the response
            return response
            
        except (requests.ConnectionError, requests.Timeout) as e:
            retries += 1
            if retries < max_retries:
                wait_time = backoff_factor * (2 ** (retries - 1))
                logger.warning(f"Network error during token exchange: {str(e)}. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                logger.error(f"Failed to exchange token after {max_retries} attempts: {str(e)}")
                raise
        except Exception as e:
            logger.error(f"Unexpected error during token exchange: {str(e)}")
            raise

@app.route('/api/exchange-token', methods=['POST'])
def exchange_token():
    """Exchange authorization code for access token"""
    try:
        request_data = request.json
        logger.info(f"Token exchange request received: {json.dumps(request_data)}")

        code = request_data.get('code')
        if not code:
            logger.warning("No authorization code provided in request")
            return jsonify({"error": "No authorization code provided"}), 400

        payload = {
            'client_id': STRAVA_CLIENT_ID,
            'client_secret': STRAVA_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code'
        }

        logger.info(f"Exchanging code for token with payload: {json.dumps({**payload, 'client_secret': '[REDACTED]'})}")
        
        response = make_token_request_with_retry(payload)
        status_code = response.status_code
        logger.info(f"Token exchange response status: {status_code}")
        
        if status_code != 200:
            error_msg = f"Strava API error: {status_code}"
            try:
                error_data = response.json()
                logger.error(f"Token exchange error response: {json.dumps(error_data)}")
                if 'message' in error_data:
                    error_msg += f" - {error_data['message']}"
                elif 'error' in error_data:
                    error_msg += f" - {error_data['error']}"
                else:
                    error_msg += f" - {json.dumps(error_data)}"
            except:
                error_body = response.text[:500]
                logger.error(f"Token exchange error body: {error_body}")
                error_msg += f" - {error_body}"
            
            return jsonify({"error": error_msg}), status_code
        
        token_data = response.json()
        log_safe_data = {
            k: v if k not in ('access_token', 'refresh_token') else '[REDACTED]' 
            for k, v in token_data.items()
        }
        logger.info(f"Token exchange successful: {json.dumps(log_safe_data)}")
        
        return jsonify(token_data)

    except Exception as e:
        error_msg = f"Exception during token exchange: {str(e)}"
        logger.exception("Token exchange failed")
        return jsonify({"error": error_msg}), 500

@app.route('/api/activities', methods=['GET'])
def get_activities():
    """Get athlete activities"""
    access_token = request.headers.get('Authorization', '').replace('Bearer ', '')

    if not access_token:
        return jsonify({"error": "No access token provided"}), 401

    params = {k: v for k, v in request.args.items()}

    if 'after' not in params:
        fifteen_weeks_ago = int(time.time() - (9072000))
        params['after'] = fifteen_weeks_ago
        logger.info(f"Limiting activities to last 15 weeks (after {fifteen_weeks_ago})")

    try:
        retries = 0
        max_retries = 3
        backoff_factor = 1
        
        while retries <= max_retries:
            try:
                logger.info(f"Fetching activities (attempt {retries+1}/{max_retries+1})")
                response = requests.get(
                    STRAVA_ACTIVITIES_URL,
                    headers={'Authorization': f'Bearer {access_token}'},
                    params=params,
                    timeout=15
                )
                
                # Check if we got a 5xx error to retry
                if 500 <= response.status_code < 600:
                    retries += 1
                    if retries <= max_retries:
                        wait_time = backoff_factor * (2 ** (retries - 1))
                        logger.warning(f"Received {response.status_code} from Strava API. Retrying in {wait_time} seconds...")
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"Failed to fetch activities after {max_retries+1} attempts: received {response.status_code}")
                        break
                
                # Process successful response or non-5xx error
                response.raise_for_status()
                return jsonify(response.json())
                
            except (requests.ConnectionError, requests.Timeout) as e:
                retries += 1
                if retries <= max_retries:
                    wait_time = backoff_factor * (2 ** (retries - 1))
                    logger.warning(f"Network error fetching activities: {str(e)}. Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    raise
        
        # If we get here, we've exhausted retries with 5xx errors
        return jsonify({"error": f"Failed to fetch activities after {max_retries+1} attempts"}), 500
        
    except requests.RequestException as e:
        logger.error(f"Error fetching activities: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/athlete/zones', methods=['GET'])
def get_athlete_zones():
    """Get athlete zones with retry on 500 errors"""
    access_token = request.headers.get('Authorization', '').replace('Bearer ', '')

    if not access_token:
        return jsonify({"error": "No access token provided"}), 401

    try:
        retries = 0
        max_retries = 3
        backoff_factor = 1
        
        while retries <= max_retries:
            try:
                logger.info(f"Fetching athlete zones (attempt {retries+1}/{max_retries+1})")
                response = requests.get(
                    STRAVA_ATHLETE_ZONES_URL,
                    headers={'Authorization': f'Bearer {access_token}'},
                    timeout=15
                )
                
                # Check if we got a 5xx error to retry
                if 500 <= response.status_code < 600:
                    retries += 1
                    if retries <= max_retries:
                        wait_time = backoff_factor * (2 ** (retries - 1))
                        logger.warning(f"Received {response.status_code} from Strava API. Retrying in {wait_time} seconds...")
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"Failed to fetch athlete zones after {max_retries+1} attempts: received {response.status_code}")
                        break
                
                # Process successful response or non-5xx error
                response.raise_for_status()
                return jsonify(response.json())
                
            except (requests.ConnectionError, requests.Timeout) as e:
                retries += 1
                if retries <= max_retries:
                    wait_time = backoff_factor * (2 ** (retries - 1))
                    logger.warning(f"Network error fetching athlete zones: {str(e)}. Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    raise
        
        # If we get here, we've exhausted retries with 5xx errors
        return jsonify({"error": f"Failed to fetch athlete zones after {max_retries+1} attempts"}), 500
        
    except requests.RequestException as e:
        logger.error(f"Error fetching athlete zones: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/refresh-token', methods=['POST'])
def refresh_token():
    """Refresh access token using refresh token"""
    refresh_token = request.json.get('refresh_token')

    if not refresh_token:
        return jsonify({"error": "No refresh token provided"}), 400

    payload = {
        'client_id': STRAVA_CLIENT_ID,
        'client_secret': STRAVA_CLIENT_SECRET,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token'
    }

    try:
        response = make_token_request_with_retry(payload)

        if response.status_code != 200:
            error_msg = f"Strava API error: {response.status_code}"
            try:
                error_data = response.json()
                if 'message' in error_data:
                    error_msg += f" - {error_data['message']}"
                elif 'error' in error_data:
                    error_msg += f" - {error_data['error']}"
            except:
                error_msg += f" - {response.text[:200]}"
            logger.error(f"Token refresh error: {error_msg}")
            return jsonify({"error": error_msg}), response.status_code
        
        return jsonify(response.json())
    except requests.RequestException as e:
        logger.error(f"Error refreshing token: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug-info', methods=['GET'])
def debug_info():
    """Endpoint to check server configuration (no sensitive data)"""
    return jsonify({
        "strava_client_id": STRAVA_CLIENT_ID,
        "expected_redirect_uri": EXPECTED_REDIRECT_URI,
        "server_time": time.time()
    })

if __name__ == '__main__':
    logger.info("Starting Strava API backend server")
    app.run(debug=True, port=int(os.getenv('PORT', 5000)))
