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