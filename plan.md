# TruckDost Prototype Implementation Plan

This plan outlines the components and steps needed to build a minimal prototype of the TruckDost platform, focusing on core functionality.

**Assumptions:**
*   Basic project structure exists (e.g., `frontend` and `backend` directories).
*   Standard tooling setup (Node.js, npm/yarn, React dev server).
*   Database (MongoDB) is chosen and accessible.

---

## Component 1: Backend - Core Setup & User Authentication

**Overview:** Set up the basic Node.js/Express server, connect to the database, and implement user registration/login functionality.

**Status:** Completed (Note: Implementation uses separate Manufacturer/TruckDriver models instead of a single User model, and auth logic appears integrated into route files rather than separate middleware).

---

## Component 2: Backend - Trip & Booking Management

**Overview:** Implement the core logic for managing trip listings and booking requests (referred to as Proposals in the code) via API endpoints.

**Status:** Completed

---

## Component 3: Frontend - Setup & Authentication

**Overview:** Set up the React frontend, implement basic routing, and create components for user registration and login, connecting them to the backend.

**Status:** Completed (Note: Implementation deviates from the plan. Routing is in `frontend/src/App.js`. Login is handled in `frontend/src/pages/login/Templogin.js`. Registration uses `frontend/src/components/Form.js` rendered by `frontend/src/pages/login/DriverSignup.js` and `ManufacturerSignup.js`. Auth state managed via localStorage and checks within dashboard components, no separate context or protected route component.)

---

## Component 4: Frontend - Driver Dashboard

**Overview:** Implement the UI for drivers to manage their trip listings and booking requests.

**Status:** Completed (Note: Implementation deviates from the plan. Trip creation is in `frontend/src/pages/trips/TripForm.js` (includes extra map features). Viewing/deleting own trips is in `frontend/src/pages/dashboards/TruckDriverDashboard.js`. Viewing/managing received proposals (bookings) is done per-trip via `frontend/src/pages/proposals/TripProposals.js`.)

---

## Component 5: Frontend - Manufacturer Dashboard

**Overview:** Implement the UI for manufacturers to search for trips and manage their booking requests.

**Status:** Incomplete

**Remaining Work:**
*   **Modify Search:** Update `frontend/src/pages/trips/FindTrips.js` to allow searching by origin/destination text fields (as planned) instead of/in addition to map coordinates. Adjust backend API call if necessary.
*   **Implement Send Proposal:** Add functionality (e.g., a button) to the search results in `frontend/src/pages/trips/FindTrips.js` to allow manufacturers to send a booking proposal for a specific trip (calling `POST /api/proposals`).
*   **Implement View Sent Proposals:** Create a new component/page (e.g., `frontend/src/pages/proposals/MySentProposals.js`) to display a list of proposals sent by the logged-in manufacturer and their status (`pending`, `accepted`, `rejected`). This will require fetching data (e.g., `GET /api/proposals/sent`). Add navigation to this page from `frontend/src/pages/dashboards/ManufacturerDashboard.js`.

**Files (for remaining work):**

*   `frontend/src/pages/trips/FindTrips.js`: Modify search form, add 'Send Proposal' button/logic.
*   `frontend/src/pages/proposals/MySentProposals.js` (New): Component to display sent proposals and their status.
*   `frontend/src/pages/dashboards/ManufacturerDashboard.js`: Add link/navigation to `MySentProposals.js`.
*   `frontend/src/App.js`: Add route for `MySentProposals.js`.

**Functionality (for remaining work):**
*   Manufacturers can search trips by origin/destination text.
*   Manufacturers can send a booking proposal for a specific trip from search results.
*   Manufacturers can view a list of their previously sent proposals and see if they were accepted or rejected.

---

## Component 6: Frontend - Mapbox Integration for Location Handling

**Overview:** Replace the existing OpenLayers map implementation with Mapbox GL JS for improved UI/UX and features in trip creation and searching.

**Goal:** Achieve functional parity with the old implementation using Mapbox, including selecting start/end points on a map, reverse geocoding, and manual coordinate input. Enhance search with Mapbox Geocoding for text-based origin/destination lookup.

**Key Mapbox Documentation References:**
*   Mapbox GL JS API: [https://docs.mapbox.com/mapbox-gl-js/api/](https://docs.mapbox.com/mapbox-gl-js/api/)
*   React Example (Update a feature in realtime): [https://docs.mapbox.com/mapbox-gl-js/example/live-update-feature/](https://docs.mapbox.com/mapbox-gl-js/example/live-update-feature/)
*   Mapbox Geocoding API: [https://docs.mapbox.com/api/search/geocoding/](https://docs.mapbox.com/api/search/geocoding/) (Implicitly, as it's the standard Mapbox offering for this)
*   Mapbox `GeolocateControl`: [https://docs.mapbox.com/mapbox-gl-js/api/markers/#geolocatecontrol](https://docs.mapbox.com/mapbox-gl-js/api/markers/#geolocatecontrol)

**Files to Modify & High-Level Changes:**

1.  **`frontend/src/pages/trips/TripForm.js`**:
    *   Remove OpenLayers imports and related map logic (initialization, event handlers, marker management).
    *   Import `mapbox-gl` and its CSS.
    *   Initialize `mapboxgl.Map` in a `useEffect` hook, attaching it to a `div` ref.
    *   Implement map click listeners to get coordinates (`lngLat` from event).
    *   Use `mapboxgl.Marker` to display and update markers for start and end locations.
    *   Replace Nominatim reverse geocoding with Mapbox Geocoding API calls to get addresses from coordinates.
    *   Integrate `mapboxgl.GeolocateControl` for "My Location" functionality or implement custom geolocation using browser API + `map.flyTo()`.
    *   Ensure manual coordinate input fields still update the Mapbox map markers and vice-versa.

2.  **`frontend/src/pages/trips/FindTrips.js`**:
    *   Apply similar OpenLayers-to-Mapbox conversion as in `TripForm.js` for the map used to select pickup/delivery locations.
    *   For the planned text-based origin/destination search:
        *   Implement input fields for origin and destination addresses.
        *   Use Mapbox Geocoding API (forward geocoding) to convert these text addresses into coordinates.
        *   Pass these coordinates to the existing backend search API (`/api/trips/near-route`).
    *   Consider displaying returned trip results (start/end points) on the map if feasible.

3.  **`frontend/src/pages/trips/TripForm.css`** and **`frontend/src/pages/trips/FindTrips.css`**:
    *   Update CSS rules to correctly style the Mapbox map container (`<div ref={mapContainerRef} />`), markers, and any custom controls if needed.
    *   Remove CSS related to OpenLayers elements.

4.  **`public/index.html`** (or main HTML file):
    *   Ensure the Mapbox GL JS CSS file (`mapbox-gl.css`) is linked if not already handled by JS import. It's usually imported in the main JS/React entry point or directly in the components.

5.  **`package.json`** (in `frontend` directory):
    *   Run `npm install mapbox-gl` or `yarn add mapbox-gl`.
    *   Consider running `npm uninstall ol` or `yarn remove ol` if OpenLayers is no longer used anywhere else in the project.

**General Steps & Considerations:**
*   Obtain a Mapbox Access Token and securely manage it (e.g., via environment variables). It will be needed for `mapboxgl.accessToken`.
*   Adapt existing state management (for coordinates, addresses, map visibility) to work with Mapbox's API and event model.
*   The core data flow (selecting points on map -> updating form state -> submitting form) should remain similar, but with Mapbox APIs.
*   Error handling for geocoding requests and map loading should be implemented.
*   Test thoroughly on different browsers/devices if possible.
--- 