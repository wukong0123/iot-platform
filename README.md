# Smart Locker IoT Platform

Minimal but complete IoT platform for a smart locker system using:

- Node.js + Express
- MQTT (`mqtt.js`) with a local embedded broker
- MongoDB
- Static HTML/JS dashboard
- Multi-locker simulator

## Project structure

```text
iot-platform/
  backend/
    src/
  frontend/
  simulator/
  package.json
```

## Features

- MQTT topic subscription on `locker/{lockerId}/data`
- Ingestion of locker telemetry into MongoDB
- Latest state tracking per locker
- REST API for locker list, latest state, and history
- Alert rules:
  - `temperature > 35`
  - `has_package = 1` for longer than `PACKAGE_STALE_SECONDS`
  - bonus anomaly checks:
    - door left open too long
    - sudden temperature spike
- Frontend dashboard for live status and recent history
- Simulator that publishes random readings every 5 seconds for multiple lockers

## Data model

Historical readings:

```json
{
  "locker_id": 1,
  "temperature": 30,
  "door": 1,
  "has_package": 1,
  "timestamp": "2026-04-27T13:00:00.000Z"
}
```

## Prerequisites

1. Node.js 18+ installed
2. MongoDB installed locally

If you do not already run MongoDB as a service, start it manually from this project folder:

```powershell
mongod --dbpath .\mongo-data
```

## Setup

1. Open a terminal in `project/iot-platform`
2. Copy `.env.example` to `.env` if you want custom ports or thresholds
3. Install dependencies:

```powershell
npm.cmd install
```

## Run

Start the backend:

```powershell
npm.cmd run start:backend
```

Start the simulator in a second terminal:

```powershell
npm.cmd run start:simulator
```

Open the dashboard in a browser:

```text
http://127.0.0.1:3000
```

## REST API

- `GET /lockers` -> list all latest locker states
- `GET /locker/:id` -> latest state for one locker
- `GET /history/:id` -> historical readings for one locker
- `GET /health` -> backend health and active thresholds

Examples:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/lockers
Invoke-RestMethod http://127.0.0.1:3000/locker/1
Invoke-RestMethod http://127.0.0.1:3000/history/1
```

## Notes

- The backend starts an MQTT broker on port `1883` by default.
- The simulator publishes to `locker/1/data`, `locker/2/data`, and `locker/3/data`.
- Thresholds are configurable through environment variables in `.env`.
