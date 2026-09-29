 # Quickstart: Personal Job Application Tracker

## Prerequisites

- Python 3.11 or later
- Node.js LTS with npm

## Install

From the repository root, create and activate a Python virtual environment in PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
```

Install frontend dependencies:

```powershell
Set-Location frontend
npm install
Set-Location ..
```

## Run in Development

Start Flask in one terminal:

```powershell
$env:FLASK_APP = "job_tracker:create_app"
flask run --host 127.0.0.1 --port 5000
```

Start Vite in a second terminal:

```powershell
Set-Location frontend
npm run dev
```

Open the local URL printed by Vite. Its `/api` proxy forwards requests to Flask. Keep both processes bound to loopback; do not use a network-wide host such as `0.0.0.0`.

## Run Tests

From the repository root:

```powershell
pytest
Set-Location frontend
npm test
```

## Build and Run the Local App

Build the React frontend into the Flask app's static build directory:

```powershell
Set-Location frontend
npm run build
Set-Location ..
```

Then run Flask bound to loopback and open `http://127.0.0.1:5000`:

```powershell
$env:FLASK_APP = "job_tracker:create_app"
flask run --host 127.0.0.1 --port 5000
```

The SQLite database is created in the Flask instance directory. It contains personal application data; do not commit it or move it into a web-served directory.
