# NOAA-Hydrograph

## NOAA National Water Prediction Service — Interactive Hydrograph Viewer

A standalone, browser-based interactive hydrograph viewer displaying observed and forecast water conditions from the National Oceanic and Atmospheric Administration (NOAA) National Water Prediction Service (NWPS).

Developed for integration with ArcGIS Online and ArcGIS Experience Builder, supporting water-monitoring stations throughout Connecticut, Rhode Island, and Massachusetts.

## Project Overview

The NOAA-Hydrograph application provides:

- Live NOAA water-level observations.
- Official forecast hydrographs, where available.
- Flood-stage thresholds and classifications.
- Interactive hydrograph visualization and time controls.
- Station identification and NOAA/NWS branding.
- Automatic station selection using a URL parameter.
- Compatibility with GitHub Pages and ArcGIS Experience Builder.

The application is designed to support **145 NOAA water-monitoring stations** using one centrally maintained viewer.

## Access the Viewer

**GitHub Pages application:**

https://depicted-maps.github.io/NOAA-Hydrograph/

**Example — Blackstone River at Woonsocket, Rhode Island:**

https://depicted-maps.github.io/NOAA-Hydrograph/?station=woor1

The viewer automatically retrieves the selected station's available NOAA observations and forecasts.

*Note: These addresses will become operational once GitHub Pages has been configured and the application successfully deployed.*

## Data Sources

Water-monitoring information is retrieved from NOAA's National Water Prediction Service.

Official NOAA station information:

https://water.noaa.gov/

NOAA NWPS API:

https://api.water.noaa.gov/nwps/v1/

Data availability varies by station. Not all stations provide forecasts or published flood thresholds.

## Technical Architecture

The application is a static web viewer developed using HTML, CSS, and JavaScript.

Primary files:

- `index.html` — Application entry point.
- `app.js` — NOAA data retrieval and hydrograph functionality.
- `styles.css` — Application appearance and responsive layout.
- `assets/noaa-nws-emblems.png` — NOAA/NWS identification graphics.
- `LICENSE-RiverWise.txt` — Open-source attribution and licensing.

No dedicated application server or Home Assistant installation is required.

## RiverWise Open-Source Components

Portions of the NOAA data-processing and flood-classification logic were adapted from the MIT-licensed RiverWise project.

Original project:

https://github.com/TheWillMiller/river-wise

The original copyright and MIT licensing information is retained in `LICENSE-RiverWise.txt`.

## ArcGIS Experience Builder Integration

The application is intended for display within an ArcGIS Experience Builder Embed widget.

The workflow is:

1. A user selects a NOAA station on the map.
2. Experience Builder identifies the selected feature.
3. The feature's `INTERACTIVE_GRAPH_URL` supplies the viewer address.
4. The viewer retrieves the station's NOAA observations and forecasts.
5. The hydrograph updates to represent the selected station.

USGS stations continue to use their separately configured USGS hydrograph service.

## Deployment

This application is hosted using GitHub Pages.

To publish:

1. Create a public GitHub repository named `NOAA-Hydrograph`.
2. Upload the project files, preserving the directory structure.
3. Commit the files to the `main` branch.
4. Open **Settings → Pages**.
5. Select **Deploy from a branch**.
6. Choose **main** and **/ (root)**.
7. Save and verify the published application.

The application must be tested against NOAA's official station information before operational use.

## Process Documentation

**Process** is the project's comprehensive technical, development, deployment, and maintenance record.

It documents source materials, code adaptation, file inventories, verification procedures, GitHub deployment, ArcGIS integration, version history, and recovery instructions.

The authoritative Process documentation is maintained separately and should be included in this repository.

## Project Status

**Application version:** v1.00.5

**Development status:** Proof of concept — deployment and live station validation pending.

**Initial validation stations:**

- WOOR1 — Blackstone River at Woonsocket, RI
- HFDC3 — Connecticut River at Hartford, CT
- NWPR1 — Newport Harbor, RI

## Disclaimer

This is an independently developed visualization application using NOAA water data. It is not an official NOAA or National Weather Service product, and NOAA/NWS branding does not imply endorsement.

For official observations, forecasts, flood warnings, and public safety information, consult NOAA and the National Weather Service directly.
