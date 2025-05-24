# Effortless Eighty - Strava Activity Analyzer

This application visualizes your Strava activities with a focus on the 80/20 running principle. It helps you track the intensity distribution of your training to ensure optimal training stress and recovery.

[effortlesseighty.com](https://effortlesseighty.com)

## Project Overview

Effortless Eighty is a full-stack application that:
- Connects with your Strava account to access your activity data
- Categorizes your activities as Easy or Hard based on heart rate zones
- Visualizes your training intensity distribution
- Helps you maintain the optimal 80/20 easy-to-hard ratio for endurance training

## Project Structure

This repository contains both the React frontend application and the Python backend server in a single codebase:

```
effortless-eighty/
├── public/              # Public assets for React
├── server/              # Python Flask backend
│   └── app.py           # Flask application with Strava API integration
├── src/                 # React frontend source
│   ├── components/      # React components
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main React application
│   └── config.ts        # Configuration settings
└── .env                 # Environment configuration (not tracked in git)
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Python 3.8 or higher
- Strava API credentials (Client ID and Secret)

## Setup Instructions

### Environment Setup

1. Create a `.env` file in the root directory with your Strava API credentials:

```
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
pip install flask flask-cors requests python-dotenv
```

### Running the Application Locally

The application uses a development proxy to run both frontend and backend simultaneously:

```bash
npm run dev
```

This command starts:
- React development server at http://localhost:3000
- Flask API server at http://localhost:5001

## Development

### Frontend Development

The frontend is built with:
- React 
- TypeScript
- React Router for navigation
- Chart.js for data visualization
- Axios for API requests

To run only the frontend:
```bash
npm start
```

### Backend Development

The backend uses:
- Flask
- Flask-CORS for cross-origin requests
- Strava API integration

To run only the backend:
```bash
cd server
python app.py
```

## Strava API Integration

This application uses the Strava API to fetch:
- User activities
- Heart rate zones
- Athlete information

Users must authorize the application with their Strava account to provide access to their data.

## Deployment

To deploy this application:

1. Update the `STRAVA_REDIRECT_URI` in both frontend and backend code to your production URL
2. Build the frontend:
```bash
npm run build
```
3. Deploy the backend and serve the static files from the build directory

## Learn More

- [Strava API Documentation](https://developers.strava.com/docs/reference/)
- [React Documentation](https://reactjs.org/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [80/20 Training Principle](https://www.runnersworld.com/training/a20807474/running-80-20-rule/)
