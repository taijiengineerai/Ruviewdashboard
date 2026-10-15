# RuView Dashboard

A local dashboard for the [RuView](https://github.com/ruvnet/RuView) sensing server: people count, breathing and heart rate, motion, signal quality, CSI waterfall, 17-keypoint pose, nodes and an event log.

It also has:

- **Health checklist.** Shows whether the dashboard is running, whether your laptop is on WiFi (network name and signal, read with `netsh`), whether the sensing server is reachable and frames are arriving, signal quality, presence, vitals, floor-plan setup, and whether locating you is possible.
- **My place.** Add one tab per floor (for example Ground floor and Upstairs). Draw each floor's rooms on a 1 m grid, then place your router, laptop and ESP32 nodes. The plan is saved in your browser. Depending on what you have, it shows:
  - **3+ ESP32 nodes:** a rough position, about ±1.5 m, worked out from which nodes see the most movement. The room you're in is highlighted.
  - **1–2 nodes:** the room nearest the strongest activity.
  - **Laptop WiFi only:** a ~5 m "someone is nearby" circle. RSSI can't tell where you are.

With no sensing server running it shows **DEMO** data generated in the browser. It switches to **LIVE** when it can reach one.

## Quick start (Windows, laptop WiFi)

After building RuView once (below), this one command starts the sensing server in WiFi mode and the dashboard. It also generates a fresh token and opens your browser:

```
powershell -ExecutionPolicy Bypass -File C:\RuViewDashboard\start-ruview.ps1
```

Press Ctrl+C in that window to stop both.

**One-time build** (Rust 1.89 is installed automatically; the build takes about 6 minutes):

```
cd C:\RuView
git submodule update --init --recursive --depth 1
cd v2
cargo build --release -p wifi-densepose-sensing-server
```

In laptop WiFi mode, breathing, heart rate and signal quality stay blank: RuView's calibration needs ESP32 CSI data, so it withholds them rather than guess. Pose and location also need ESP32 nodes.

## Run (manual)

1. Start a RuView sensing server on port 3000 (see below).
2. In this folder, run:

   ```
   set RUVIEW_API_TOKEN=<the same token the sensing server uses>
   node server.js
   ```

3. Open http://localhost:8090

`server.js` has no dependencies. It serves the page and proxies `/health`, `/api/*` and `/ws/*` to the sensing server. That keeps the browser on one origin, because RuView rejects cross-origin requests, and it keeps the token out of the page.

Options: `RUVIEW_URL` (default `http://localhost:3000`), `PORT` (default `8090`).

## Getting a sensing server

- **Docker, simulated data, no hardware:** needs Docker Desktop.
  ```
  docker pull ruvnet/wifi-densepose:latest
  docker run -p 127.0.0.1:3000:3000 -e RUVIEW_API_TOKEN=<token> ruvnet/wifi-densepose:latest
  ```
- **Real sensing:** an ESP32-S3 board (~$9) flashed with RuView's CSI firmware, then the server with `CSI_SOURCE=esp32` and `RUVIEW_UDP_ALLOW=<node-ip>`. See RuView's `docs/user-guide.md`.

Heads-up: `C:\snap-shop` also uses port 3000. Stop it first, or run RuView on a different port and set `RUVIEW_URL`.

## Caveats (from RuView's own docs)

- The vital signs have not been validated. This is not a medical device.
- The live single-ESP32 pose is a demonstrator skeleton, not a validated model.
- A laptop's WiFi gives RSSI only: coarse presence and motion, with no vitals or pose.
