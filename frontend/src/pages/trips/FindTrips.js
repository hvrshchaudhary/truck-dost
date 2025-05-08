import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './FindTrips.css';
import '../../styles/map.css';

const API_URL = 'http://localhost:5001';
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const FindTrips = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Proposal state
  const [proposalMessages, setProposalMessages] = useState({});
  const [proposalPrices, setProposalPrices] = useState({});
  const [proposalSubmitting, setProposalSubmitting] = useState({});
  const [proposalSuccess, setProposalSuccess] = useState({});
  const [proposalErrors, setProposalErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    startLatitude: '',
    startLongitude: '',
    endLatitude: '',
    endLongitude: '',
    startLocationName: '',
    endLocationName: '',
    _geocodedStartName: '',
    _geocodedEndName: ''
  });

  // Map related state
  const [viewState, setViewState] = useState({
    longitude: 78.9629, // Default to center of India
    latitude: 20.5937,
    zoom: 4
  });

  const [showMap, setShowMap] = useState(false);
  const [activeLocation, setActiveLocation] = useState(null); // 'pickup' or 'delivery'
  const [mapMarkers, setMapMarkers] = useState({
    pickup: null,  // {longitude, latitude}
    delivery: null // {longitude, latitude}
  });

  // Refs for map elements
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const deliveryMarkerRef = useRef(null);

  // Define updateMarker
  const updateMarker = useCallback((lng, lat, locationType) => {
    if (!mapInstanceRef.current) return;

    const markerOptions = {
        color: locationType === 'pickup' ? '#4CAF50' : '#F44336',
        draggable: false
    };

    if (locationType === 'pickup') {
      if (pickupMarkerRef.current) pickupMarkerRef.current.remove();
      pickupMarkerRef.current = new mapboxgl.Marker(markerOptions)
        .setLngLat([lng, lat])
        .addTo(mapInstanceRef.current);
    } else if (locationType === 'delivery') {
      if (deliveryMarkerRef.current) deliveryMarkerRef.current.remove();
      deliveryMarkerRef.current = new mapboxgl.Marker(markerOptions)
        .setLngLat([lng, lat])
        .addTo(mapInstanceRef.current);
    }
  }, []);

  // Define reverseGeocode
  const reverseGeocode = useCallback(async (lng, lat, addressDisplayField) => {
    try {
      setFormData(prev => ({ ...prev, [addressDisplayField]: 'Fetching address...' }));
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=address,poi,place,locality,region,country`
      );
      if (response.data && response.data.features && response.data.features.length > 0) {
        const placeName = response.data.features[0].place_name;
        setFormData(prev => ({ ...prev, [addressDisplayField]: placeName }));
      } else {
        setFormData(prev => ({ ...prev, [addressDisplayField]: `Location at [${lng.toFixed(6)}, ${lat.toFixed(6)}]` }));
      }
    } catch (err) {
      console.error('Error in reverse geocoding:', err);
      setFormData(prev => ({ ...prev, [addressDisplayField]: `Location at [${lng.toFixed(6)}, ${lat.toFixed(6)}]` }));
      if (err.response && err.response.status === 401) {
        alert("Failed to fetch address: Invalid Mapbox Access Token.");
      }
    }
  }, []);

  // Define handleMapClick
  const handleMapClick = useCallback((event) => {
    if (!activeLocation || !mapInstanceRef.current) return;

    const { lng, lat } = event.lngLat;
    const currentZoom = mapInstanceRef.current.getZoom(); // Get current zoom level

    setMapMarkers(prev => ({
      ...prev,
      [activeLocation]: { longitude: lng, latitude: lat }
    }));

    // Update formData based on activeLocation and call reverseGeocode with the correct field name
    if (activeLocation === 'pickup') {
      setFormData(prev => ({
        ...prev,
        startLongitude: lng.toFixed(6),
        startLatitude: lat.toFixed(6),
        // startLocationName: 'Fetching address...' // Optionally set a fetching message here
      }));
      reverseGeocode(lng, lat, 'startLocationName'); // Update startLocationName directly
    } else if (activeLocation === 'delivery') {
      setFormData(prev => ({
        ...prev,
        endLongitude: lng.toFixed(6),
        endLatitude: lat.toFixed(6),
        // endLocationName: 'Fetching address...' // Optionally set a fetching message here
      }));
      reverseGeocode(lng, lat, 'endLocationName'); // Update endLocationName directly
    }

    // Update the marker on the map
    updateMarker(lng, lat, activeLocation);

    // Crucially, update viewState to keep the map centered on the new selection
    setViewState({
      longitude: lng,
      latitude: lat,
      zoom: currentZoom > 10 ? currentZoom : 14 // Maintain current zoom or set a reasonable default
    });

  }, [activeLocation, updateMarker, reverseGeocode, setViewState /* ensure setViewState is in dep array if from context/props */]);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.user.role !== 'manufacturer') {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  // Initialize and cleanup map
  useEffect(() => {
    if (showMap && mapContainerRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom
      });
      mapInstanceRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
        showUserLocation: true
      });
      mapInstanceRef.current.addControl(geolocate, 'top-right');

      geolocate.on('geolocate', (e) => {
        const lng = e.coords.longitude;
        const lat = e.coords.latitude;
        const newZoom = 15; // Define a consistent zoom level for geolocation

        // Update viewState to keep it consistent with the geolocated position
        setViewState({
          longitude: lng,
          latitude: lat,
          zoom: newZoom
        });
        
        // Fly to the new location
        mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: newZoom });

        if (activeLocation) {
          const simulatedEvent = { lngLat: { lng, lat } };
          handleMapClick(simulatedEvent);
        }
      });

      mapInstanceRef.current.on('click', handleMapClick);

      if (mapMarkers.pickup) {
        updateMarker(mapMarkers.pickup.longitude, mapMarkers.pickup.latitude, 'pickup');
      }
      if (mapMarkers.delivery) {
        updateMarker(mapMarkers.delivery.longitude, mapMarkers.delivery.latitude, 'delivery');
      }
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        pickupMarkerRef.current = null;
        deliveryMarkerRef.current = null;
      }
    };
  }, [showMap, viewState.longitude, viewState.latitude, viewState.zoom, activeLocation, handleMapClick, updateMarker, mapMarkers.pickup, mapMarkers.delivery]);

  // Update map center when viewState changes
  useEffect(() => {
    if (mapInstanceRef.current && showMap) {
      mapInstanceRef.current.setCenter([viewState.longitude, viewState.latitude]);
      mapInstanceRef.current.setZoom(viewState.zoom);
    }
  }, [viewState, showMap]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSearchResults([]);

    // Ensure coordinates are numbers before sending
    const startLat = parseFloat(formData.startLatitude);
    const startLng = parseFloat(formData.startLongitude);
    const endLat = parseFloat(formData.endLatitude);
    const endLng = parseFloat(formData.endLongitude);

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      setErrorMsg('Valid coordinates are required for searching. Please select on map or use address search.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const response = await axios.get(
        `${API_URL}/api/trips/near-route`,
        {
          params: {
            startLatitude: startLat,
            startLongitude: startLng,
            endLatitude: endLat,
            endLongitude: endLng
          },
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const trips = response.data.map(trip => ({ ...trip, driver: trip.driver || {} }));
      setSearchResults(trips);
      setSearchPerformed(true);
    } catch (err) {
      console.error('Error searching for trips:', err);
      setErrorMsg(err.message || 'Failed to search for trips');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/manufacturer-dashboard');
  };

  // Open map for selecting a location
  const openLocationSelector = (locationType) => {
    setActiveLocation(locationType);
    setShowMap(true);
    
    // Try to get user's current location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          // If map is already initialized, fly to the location
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo({ 
              center: [longitude, latitude], 
              zoom: 14, 
              essential: true
            });
          } else {
            // Otherwise, set view state for initialization
            setViewState({
              longitude,
              latitude,
              zoom: 14
            });
          }
        },
        (error) => {
          console.log("Error getting location:", error.message);
          // Fall back to existing marker or default view
          setExistingOrDefaultLocation(locationType);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setExistingOrDefaultLocation(locationType);
    }
  };
  
  // Helper function to use existing marker location or default to India
  const setExistingOrDefaultLocation = (locationType) => {
    let targetLng = viewState.longitude;
    let targetLat = viewState.latitude;
    let targetZoom = viewState.zoom;

    if (locationType === 'pickup' && mapMarkers.pickup) {
      targetLng = mapMarkers.pickup.longitude;
      targetLat = mapMarkers.pickup.latitude;
      targetZoom = 13;
    } else if (locationType === 'delivery' && mapMarkers.delivery) {
      targetLng = mapMarkers.delivery.longitude;
      targetLat = mapMarkers.delivery.latitude;
      targetZoom = 13;
    } else {
      // Default to India if no markers
      targetLng = 78.9629;
      targetLat = 20.5937;
      targetZoom = 4;
    }
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({ center: [targetLng, targetLat], zoom: targetZoom });
    } else {
      setViewState({ longitude: targetLng, latitude: targetLat, zoom: targetZoom });
    }
  };

  // Get current location using browser's geolocation API - Replaced by Mapbox GeolocateControl
  const getCurrentLocation = () => {
    if (!activeLocation) {
      alert('Please first specify if you are selecting a pickup or delivery location.');
      return;
    }
    alert("Please use the 'My Location' button directly on the map (top-right corner).");
  };

  // Close map and confirm location selection
  const confirmLocationSelection = () => {
    setShowMap(false);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';

    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Display location from either address or coordinates
  const getLocationDisplay = (address, coordinates) => {
    if (address) return address;

    if (coordinates && coordinates.coordinates && coordinates.coordinates.length === 2) {
      return `Lat: ${coordinates.coordinates[1]}, Long: ${coordinates.coordinates[0]}`;
    }

    return 'Location not specified';
  };

  // Handle proposal message change
  const handleProposalMessageChange = (tripId, message) => {
    setProposalMessages({
      ...proposalMessages,
      [tripId]: message
    });
  };

  // Handle proposal price change
  const handleProposalPriceChange = (tripId, price) => {
    setProposalPrices({
      ...proposalPrices,
      [tripId]: price
    });
  };

  // Send proposal to driver
  const handleSendProposal = async (tripId, event) => {
    event.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setProposalSubmitting(prev => ({
      ...prev,
      [tripId]: true
    }));

    setProposalErrors(prev => ({
      ...prev,
      [tripId]: ''
    }));

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const trip = searchResults.find(t => t._id === tripId);
      if (!trip) {
        throw new Error('Trip information not found.');
      }

      const driverId = extractDriverId(trip.driver);
      if (!driverId) {
        throw new Error('Driver information is missing or invalid.');
      }

      const message = proposalMessages[tripId] || '';
      const offeredPrice = parseFloat(proposalPrices[tripId]);

      if (isNaN(offeredPrice) || offeredPrice <= 0) {
        setProposalErrors(prev => ({
          ...prev,
          [tripId]: 'Please enter a valid proposed price.'
        }));
        setProposalSubmitting(prev => ({ ...prev, [tripId]: false }));
        return;
      }

      const proposalData = {
        driver: driverId,
        trip: tripId,
        price: offeredPrice,
          message: message,
      };

      await axios.post(
        `${API_URL}/api/proposals`,
        proposalData,
        config
      );

      setProposalSuccess(prev => ({
        ...prev,
        [tripId]: true
      }));

      setProposalMessages(prev => ({
        ...prev,
        [tripId]: ''
      }));
      setProposalPrices(prev => ({
        ...prev,
        [tripId]: ''
      }));

      setTimeout(() => {
        setProposalSuccess(prev => ({
          ...prev,
          [tripId]: false
        }));
      }, 3000);

    } catch (err) {
      let errorMessage = 'Failed to send proposal. Please try again.';

      if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg;
      } else if (err.response?.data?.errors?.[0]?.msg) {
        errorMessage = err.response.data.errors[0].msg;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setProposalErrors(prev => ({
        ...prev,
        [tripId]: errorMessage
      }));
    } finally {
      setProposalSubmitting(prev => ({
        ...prev,
        [tripId]: false
      }));
    }
  };

  // Helper to safely extract driver ID from different formats
  const extractDriverId = (driver) => {
    if (!driver) return null;
    if (typeof driver === 'string') return driver;
    return driver._id || null;
  };

  // Forward geocode address and then submit search
  const handleAddressSearch = async () => {
    setLoading(true);
    setErrorMsg('');
    setSearchResults([]);

    if (!formData.startLocationName && (!formData.startLatitude || !formData.startLongitude)) {
        setErrorMsg('Please provide a starting location (address or coordinates).');
        setLoading(false);
        return;
    }
    if (!formData.endLocationName && (!formData.endLatitude || !formData.endLongitude)) {
        setErrorMsg('Please provide a destination location (address or coordinates).');
        setLoading(false);
        return;
    }

    let startCoords = { lat: parseFloat(formData.startLatitude), lng: parseFloat(formData.startLongitude) };
    let endCoords = { lat: parseFloat(formData.endLatitude), lng: parseFloat(formData.endLongitude) };
    let geocodedStartName = formData._geocodedStartName || '';
    let geocodedEndName = formData._geocodedEndName || '';

    try {
        // Geocode start location if address is provided and no valid coordinates yet
        if (formData.startLocationName && (isNaN(startCoords.lat) || isNaN(startCoords.lng))) {
            const startResponse = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(formData.startLocationName)}.json?access_token=${mapboxgl.accessToken}&country=IN&limit=1` // Limit to India, take first result
            );
            if (startResponse.data && startResponse.data.features && startResponse.data.features.length > 0) {
                const { center, place_name } = startResponse.data.features[0];
                startCoords = { lng: center[0], lat: center[1] };
                geocodedStartName = place_name;
                setFormData(prev => ({
                    ...prev,
                    startLongitude: center[0].toFixed(6),
                    startLatitude: center[1].toFixed(6),
                    _geocodedStartName: place_name
                }));
                if (showMap) updateMarker(center[0], center[1], 'pickup');
            } else {
                throw new Error(`Could not find coordinates for start location: ${formData.startLocationName}`);
            }
        }

        // Geocode end location if address is provided and no valid coordinates yet
        if (formData.endLocationName && (isNaN(endCoords.lat) || isNaN(endCoords.lng))) {
            const endResponse = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(formData.endLocationName)}.json?access_token=${mapboxgl.accessToken}&country=IN&limit=1` // Limit to India
            );
            if (endResponse.data && endResponse.data.features && endResponse.data.features.length > 0) {
                const { center, place_name } = endResponse.data.features[0];
                endCoords = { lng: center[0], lat: center[1] };
                geocodedEndName = place_name;
                setFormData(prev => ({
                    ...prev,
                    endLongitude: center[0].toFixed(6),
                    endLatitude: center[1].toFixed(6),
                    _geocodedEndName: place_name
                }));
                 if (showMap) updateMarker(center[0], center[1], 'delivery');
            } else {
                throw new Error(`Could not find coordinates for end location: ${formData.endLocationName}`);
            }
        }
        
        // Center map on midpoint if both geocoded successfully
        if (startCoords.lng && startCoords.lat && endCoords.lng && endCoords.lat && mapInstanceRef.current && showMap) {
            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend([startCoords.lng, startCoords.lat]);
            bounds.extend([endCoords.lng, endCoords.lat]);
            mapInstanceRef.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
        }

        // After geocoding (if necessary), proceed with the existing search logic but using potentially updated coords
        if (isNaN(startCoords.lat) || isNaN(startCoords.lng) || isNaN(endCoords.lat) || isNaN(endCoords.lng)) {
            throw new Error('Valid coordinates could not be determined for search.');
        }

        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        const response = await axios.get(
            `${API_URL}/api/trips/near-route`,
            {
                params: {
                    startLatitude: startCoords.lat,
                    startLongitude: startCoords.lng,
                    endLatitude: endCoords.lat,
                    endLongitude: endCoords.lng
                },
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
        const trips = response.data.map(trip => ({ ...trip, driver: trip.driver || {} }));
        setSearchResults(trips);
        setSearchPerformed(true);

    } catch (err) {
        console.error('Error during address search or trip finding:', err);
        setErrorMsg(err.message || 'Failed to search for trips using address.');
        setSearchPerformed(true); // To show no results message
        setSearchResults([]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="find-trips-page">
      <header className="find-trips-header">
        <button onClick={handleBack} className="back-btn">
          &larr; Back to Dashboard
        </button>
        <h1>Find Available Trips</h1>
      </header>

      {showMap && (
        <div className="map-selection-overlay">
          <div className="map-header">
            <h3>Select {activeLocation === 'pickup' ? 'Pickup' : 'Delivery'} Location</h3>
            <button className="close-map-btn" onClick={() => setShowMap(false)}>×</button>
          </div>
          <div className="map-container">
            <div
              ref={mapContainerRef}
              style={{ width: '100%', height: '400px' }}
            ></div>
          </div>
          <div className="map-actions">
            <p className="map-instruction">Click on the map to select a location</p>
            <button
              className="select-location-btn"
              onClick={confirmLocationSelection}
            >
              Confirm Location
            </button>
          </div>
        </div>
      )}

      <div className="search-container">
        <form onSubmit={(e) => { e.preventDefault(); handleAddressSearch(); }} className="search-form">
          <div className="form-header">
            <h2>Search Parameters</h2>
            <p>Enter pickup and delivery addresses or select on map / use coordinates.</p>
          </div>

          <div className="location-inputs">
            <div className="location-group">
              <label htmlFor="startLocationName">Pickup Location Address</label>
              <div className="map-selection">
                <div className="address-display">
                  {formData.startLocationName ? (
                    <div className="selected-address">{formData.startLocationName}</div>
                  ) : (
                    <div className="no-address-selected">No starting point selected</div>
                  )}
                </div>
                <button
                  type="button"
                  className="location-btn"
                  onClick={() => openLocationSelector('pickup')}
                >
                  Select from Map
                </button>
              </div>
            </div>

            <div className="location-group">
              <label htmlFor="endLocationName">Delivery Location Address</label>
              <div className="map-selection">
                <div className="address-display">
                  {formData.endLocationName ? (
                    <div className="selected-address">{formData.endLocationName}</div>
                  ) : (
                    <div className="no-address-selected">No destination selected</div>
                  )}
                </div>
                <button
                  type="button"
                  className="location-btn"
                  onClick={() => openLocationSelector('delivery')}
                >
                  Select from Map
                </button>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search for Trips by Address/Coords'}
            </button>
          </div>
        </form>
      </div>

      {/* Display search results */}
      <div className="results-container">
        {errorMsg && <div className="error-message">{errorMsg}</div>}

        {searchPerformed && searchResults.length === 0 && !loading && !errorMsg && (
          <div className="no-results">
            <h3>No trips found near your route</h3>
            <p>Try adjusting your search parameters or check back later</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="results-list">
            <h2>Available Trips ({searchResults.length})</h2>

            {searchResults.map((trip) => {
              const driverId = extractDriverId(trip.driver);
              const hasDriverId = !!driverId;
              const driverName = trip.driver?.name || 'Unknown Driver';

              // For debugging
              console.log(`Trip ${trip._id} driver:`, trip.driver);
              console.log(`Extracted driver ID:`, driverId);

              return (
                <div key={trip._id} className="trip-card">
                  <div className="trip-card-header">
                    <h3>Trip #{trip._id.substring(0, 8)}</h3>
                    <span className="price">₹{trip.price}</span>
                  </div>

                  <div className="trip-card-details">
                    <div className="trip-locations">
                      <div className="trip-location">
                        <span className="location-label">From:</span>
                        <span className="location-value">
                          {getLocationDisplay(trip.startAddress, trip.startCoordinates)}
                        </span>
                      </div>
                      <div className="trip-location">
                        <span className="location-label">To:</span>
                        <span className="location-value">
                          {getLocationDisplay(trip.endAddress, trip.endCoordinates)}
                        </span>
                      </div>
                    </div>

                    <div className="trip-times">
                      <div className="trip-time">
                        <span className="time-label">Pickup:</span>
                        <span className="time-value">{formatDate(trip.pickupTime)}</span>
                      </div>
                      <div className="trip-time">
                        <span className="time-label">Delivery:</span>
                        <span className="time-value">{formatDate(trip.dropTime)}</span>
                      </div>
                      <div className="trip-driver">
                        <span className="driver-label">Driver:</span>
                        <span className="driver-value">
                          {driverName}
                          {hasDriverId && driverId && <span> (ID: {driverId.substring(0, 6)}...)</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="trip-card-actions">
                    {proposalSuccess[trip._id] ? (
                      <div className="proposal-success">
                        ✓ Proposal sent successfully!
                      </div>
                    ) : (
                      <form
                        className="proposal-form"
                        onSubmit={(e) => handleSendProposal(trip._id, e)}
                      >
                        <div className="proposal-input-group">
                          <textarea
                            className="proposal-message"
                            placeholder="Add a message for the driver (optional)"
                            value={proposalMessages[trip._id] || ''}
                            onChange={(e) => handleProposalMessageChange(trip._id, e.target.value)}
                          />
                          <input
                            type="number"
                            className="proposal-price"
                            placeholder="Your Proposed Price (₹)"
                            value={proposalPrices[trip._id] || ''}
                            onChange={(e) => handleProposalPriceChange(trip._id, e.target.value)}
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="send-proposal-btn"
                          disabled={proposalSubmitting[trip._id] || !hasDriverId}
                        >
                          {proposalSubmitting[trip._id] ? 'Sending...' :
                            !hasDriverId ? 'Missing Driver Info' : 'Send Proposal'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindTrips; 