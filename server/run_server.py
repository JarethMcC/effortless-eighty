import os
import logging
from waitress import serve
from app import app

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

if __name__ == '__main__':
    # Get port from environment or use default
    port = int(os.environ.get('PORT', 5000))

    # Log startup message
    logger.info(f"Starting server on port {port}")
    logger.info("Using Waitress production server")

    # Run the app with Waitress
    serve(app, host='0.0.0.0', port=port, threads=6)
