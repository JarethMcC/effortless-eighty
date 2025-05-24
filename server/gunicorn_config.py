import multiprocessing
import os

# Bind to this socket
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"

# Number of worker processes
# Using the recommended formula: (2 x num_cores) + 1
workers = multiprocessing.cpu_count() * 2 + 1

# Worker class to use
worker_class = "sync"

# Timeout in seconds
timeout = 30

# Log level
loglevel = "info"

# Access log format
accesslog = "-"  # Log to stdout

# Error log
errorlog = "-"  # Log to stderr

# Preload the application
preload_app = True

# Restart workers after this many requests
max_requests = 1000
max_requests_jitter = 50  # Adds randomness to max_requests
