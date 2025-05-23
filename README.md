# Effortless Eighty - Strava Activity Analyzer

This application visualizes your Strava activities with a focus on the 80/20 running principle.

## Project Structure

This repository contains the React frontend application. The Python backend is in a separate repository: [effortless-eighty-backend](https://github.com/jarethmcc/effortless-eighty-backend).

## Backend Setup

1. Clone the backend repository:
```bash
git clone https://github.com/jarethmcc/effortless-eighty-backend.git
cd effortless-eighty-backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file in the `effortless-eighty-backend` directory with your Strava API credentials:
```
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
```

6. Run the backend server from the `effortless-eighty-backend` directory:
```bash
python app.py
```

The backend will run on http://localhost:5000

## Frontend Setup

The frontend is a React application bootstrapped with Create React App.

### Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

## Deployment

To deploy this application:

1. Deploy the Python backend to a server with proper environment variables set
2. Update the `API_BASE_URL` in `src/config.ts` to point to your deployed backend
3. Deploy the React frontend to a static hosting service

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
