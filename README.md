# RuView Dashboard

A local dashboard for the [RuView](https://github.com/ruvnet/RuView) sensing server: people count, breathing and heart rate, motion, signal quality, CSI waterfall, 17-keypoint pose, nodes and an event log.

With no sensing server running it shows **DEMO** data generated in the browser. It switches to **LIVE** when it can reach one.

## Run

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
