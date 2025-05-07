import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './TripForm.css';
import '../../styles/map.css';

// Ensure your Mapbox token is set in your .env file as REACT_APP_MAPBOX_TOKEN
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.error('Mapbox token is missing! Please set REACT_APP_MAPBOX_TOKEN in your .env file');
  // You could throw an error here or display a more user-friendly message on the page
  // For now, an alert will make it obvious during development if the token is missing.
  alert('Mapbox access token is not configured. Please check the console and ensure REACT_APP_MAPBOX_TOKEN is set in your .env file in the frontend directory and restart the server.');
}
mapboxgl.accessToken = MAPBOX_TOKEN;

const TripForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    startAddress: '',
    endAddress: '',
    startCoordinates: [0, 0], // [longitude, latitude]
    endCoordinates: [0, 0],   // [longitude, latitude]
    pickupTime: '',
    dropTime: '',
    price: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Map related state
  const [viewState, setViewState] = useState({
    longitude: 78.9629, // Default to center of India
    latitude: 20.5937,
    zoom: 4
  });

  const [showMap, setShowMap] = useState(false);
  const [activeLocation, setActiveLocation] = useState(null); // 'start' or 'end'
  const [mapMarkers, setMapMarkers] = useState({
    start: null,  // {longitude, latitude}
    end: null     // {longitude, latitude}
  });

  // Refs for map elements
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);

      // Check token expiration
      const currentTime = Date.now() / 1000; // Convert to seconds
      if (decoded.exp && decoded.exp < currentTime) {
        console.error('Token has expired, redirecting to login');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      // Check if user has correct role
      if (decoded.user.role !== 'truckDriver') {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      // Verify token with backend (optional but adds security)
      const verifyToken = async () => {
        try {
          // No need to save response as it's not used
          await axios.get('http://localhost:5001/api/trips', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          // If we got a successful response, token is valid
          console.log('Token verified with backend');
        } catch (error) {
          if (error.response && error.response.status === 401) {
            console.error('Token validation failed on backend');
            localStorage.removeItem('token');
            navigate('/login');
          }
        }
      };
      verifyToken();

      // Removed setting userData
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  // Define handleMapClick function before it's used in useEffect
  const handleMapClick = (event) => {
    if (!activeLocation || !mapInstanceRef.current) return;

    const { lng, lat } = event.lngLat;

    if (activeLocation === 'start') {
      setFormData(prev => ({ ...prev, startCoordinates: [lng, lat] }));
      setMapMarkers(prev => ({ ...prev, start: { longitude: lng, latitude: lat } }));
      updateMarker(lng, lat, 'start');
      reverseGeocode(lng, lat, 'startAddress');
    } else {
      setFormData(prev => ({ ...prev, endCoordinates: [lng, lat] }));
      setMapMarkers(prev => ({ ...prev, end: { longitude: lng, latitude: lat } }));
      updateMarker(lng, lat, 'end');
      reverseGeocode(lng, lat, 'endAddress');
    }
  };

  // Initialize and cleanup map
  useEffect(() => {
    if (showMap && mapContainerRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Standard Mapbox street style
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom
      });

      // Add navigation control (zoom buttons, compass)
      mapInstanceRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add geolocate control
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true, // Continuously track user location
        showUserHeading: true,   // Show user heading icon
        showUserLocation: true
      });
      mapInstanceRef.current.addControl(geolocate, 'top-right');

      // Geolocate event to update form when location is found via control
      geolocate.on('geolocate', (e) => {
        const lng = e.coords.longitude;
        const lat = e.coords.latitude;
        
        // Update map view to the geolocated position
        mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 15 });

        if (activeLocation) {
           // Programmatically call handleMapClick logic
          if (activeLocation === 'start') {
            setFormData(prev => ({ ...prev, startCoordinates: [lng, lat] }));
            setMapMarkers(prev => ({ ...prev, start: { longitude: lng, latitude: lat } }));
            updateMarker(lng, lat, 'start');
            reverseGeocode(lng, lat, 'startAddress');
          } else {
            setFormData(prev => ({ ...prev, endCoordinates: [lng, lat] }));
            setMapMarkers(prev => ({ ...prev, end: { longitude: lng, latitude: lat } }));
            updateMarker(lng, lat, 'end');
            reverseGeocode(lng, lat, 'endAddress');
          }
        }
      });
      
      mapInstanceRef.current.on('click', handleMapClick);

      // Re-add existing markers if they exist when map loads
      if (mapMarkers.start) {
        updateMarker(mapMarkers.start.longitude, mapMarkers.start.latitude, 'start');
      }
      if (mapMarkers.end) {
        updateMarker(mapMarkers.end.longitude, mapMarkers.end.latitude, 'end');
      }
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        // No need to manually remove markers from map, map.remove() handles it.
        startMarkerRef.current = null;
        endMarkerRef.current = null;
      }
    };
  }, [showMap, viewState.longitude, viewState.latitude, viewState.zoom, activeLocation]);

  // Update map center and zoom when viewState changes
  useEffect(() => {
    if (mapInstanceRef.current && showMap) { // Only update if map is visible
      mapInstanceRef.current.setCenter([viewState.longitude, viewState.latitude]);
      mapInstanceRef.current.setZoom(viewState.zoom);
    }
  }, [viewState, showMap]);

  // Function to update marker on the map
  const updateMarker = (lng, lat, locationType) => {
    if (!mapInstanceRef.current) return;

    const markerOptions = {
        color: locationType === 'start' ? '#4CAF50' : '#F44336', // Green for start, Red for end
        draggable: false // Markers are not draggable by default
    };

    if (locationType === 'start') {
      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
      }
      startMarkerRef.current = new mapboxgl.Marker(markerOptions)
        .setLngLat([lng, lat])
        .addTo(mapInstanceRef.current);
    } else if (locationType === 'end') {
      if (endMarkerRef.current) {
        endMarkerRef.current.remove();
      }
      endMarkerRef.current = new mapboxgl.Marker(markerOptions)
        .setLngLat([lng, lat])
        .addTo(mapInstanceRef.current);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: name === 'price' ?
        (value === '' ? '' : parseFloat(value)) :
        value
    }));
  };

  // handleCoordinateChange can be removed if no longer called directly or indirectly.
  // For now, let's comment it out to ensure no unexpected breakages if formData coordinates are still set programmatically elsewhere.
  /*
  const handleCoordinateChange = (e, type, index) => {
    const { value } = e.target;
    const newValue = value === '' ? 0 : parseFloat(value);

    let newLng, newLat;
    let updatedCoords = {};

    setFormData(prevState => {
      const newCoordinates = [...prevState[type]];
      newCoordinates[index] = newValue;

      if (type === 'startCoordinates') {
        newLng = index === 0 ? newValue : prevState.startCoordinates[0];
        newLat = index === 1 ? newValue : prevState.startCoordinates[1];
        updatedCoords = { start: { longitude: newLng, latitude: newLat } };
      } else if (type === 'endCoordinates') {
        newLng = index === 0 ? newValue : prevState.endCoordinates[0];
        newLat = index === 1 ? newValue : prevState.endCoordinates[1];
        updatedCoords = { end: { longitude: newLng, latitude: newLat } };
      }
      return { ...prevState, [type]: newCoordinates };
    });

    setMapMarkers(prev => ({ ...prev, ...updatedCoords }));

    if (newLng !== undefined && newLat !== undefined && !isNaN(newLng) && !isNaN(newLat)) {
        if (showMap && mapInstanceRef.current) { 
            const locationType = type === 'startCoordinates' ? 'start' : 'end';
            updateMarker(newLng, newLat, locationType);
            mapInstanceRef.current.flyTo({ center: [newLng, newLat], zoom: 13 });
      }
    }
  };
  */

  // Open map for selecting a location
  const openMapSelector = (locationType) => {
    setActiveLocation(locationType);
    setShowMap(true);

    // Attempt to get current location and center map there first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setViewState({
            longitude,
            latitude,
            zoom: 14 // Desired zoom level for current location
          });
          // If a marker for this type already exists, and it's different from current location,
          // it will be added/updated by the map initialization/update logic anyway.
          // The map will flyTo this new viewState.
        },
        (err) => {
          console.warn(`Error getting geolocation: ${err.message}. Falling back to default/marker location.`);
          // Fallback to existing marker or default view if geolocation fails
          if (locationType === 'start' && mapMarkers.start) {
            setViewState({
              longitude: mapMarkers.start.longitude,
              latitude: mapMarkers.start.latitude,
              zoom: 13
            });
          } else if (locationType === 'end' && mapMarkers.end) {
            setViewState({
              longitude: mapMarkers.end.longitude,
              latitude: mapMarkers.end.latitude,
              zoom: 13
            });
          } else {
            // Default to India if no markers and no geolocation
            setViewState({
              longitude: 78.9629, 
              latitude: 20.5937,
              zoom: 4
            });
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.warn('Geolocation not supported. Falling back to default/marker location.');
      // Fallback logic if geolocation API is not supported at all
    if (locationType === 'start' && mapMarkers.start) {
      setViewState({
        longitude: mapMarkers.start.longitude,
        latitude: mapMarkers.start.latitude,
        zoom: 13
      });
    } else if (locationType === 'end' && mapMarkers.end) {
      setViewState({
        longitude: mapMarkers.end.longitude,
        latitude: mapMarkers.end.latitude,
        zoom: 13
      });
      } else {
        setViewState({
          longitude: 78.9629, 
          latitude: 20.5937,
          zoom: 4
        });
      }
    }
  };

  // Get current location using browser's geolocation API - Replaced by GeolocateControl
  const getCurrentLocation = () => {
    // This button can now trigger the GeolocateControl if needed, 
    // or simply inform user to use the map's own geolocate button.
    // For now, we keep it, but its primary function is superseded by mapboxgl.GeolocateControl
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please use the maps location button.');
      return;
    }
    if(!activeLocation) {
      alert('Please first specify if you are selecting a start or end location.');
      return;
    }

    alert("Please use the 'My Location' button directly on the map (top-right corner).");
    // The GeolocateControl handles this now.
    // If you want this button to programmatically trigger geolocate:
    // const geolocateControl = mapInstanceRef.current._controls.find(ctrl => ctrl instanceof mapboxgl.GeolocateControl);
    // if (geolocateControl) {
    //   geolocateControl.trigger();
    // }
  };

  // Close map and confirm location selection
  const confirmLocationSelection = () => {
    setShowMap(false);
  };

  // Reverse geocoding (coordinates to address) using Mapbox API
  const reverseGeocode = async (lng, lat, addressField) => {
    try {
      setFormData(prev => ({ ...prev, [addressField]: 'Fetching address...' }));

      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=address,poi,place,locality,region,country`,
        {
          headers: {
            'Accept-Language': 'en',
          }
        }
      );

      if (response.data && response.data.features && response.data.features.length > 0) {
        const placeName = response.data.features[0].place_name;
        setFormData(prev => ({ ...prev, [addressField]: placeName }));
        console.log('Address found:', placeName);
      } else {
        setFormData(prev => ({ ...prev, [addressField]: `Location at [${lng.toFixed(6)}, ${lat.toFixed(6)}]` }));
        console.warn('No address found for coordinates:', lng, lat);
      }
    } catch (err) {
      console.error('Error in reverse geocoding:', err);
      setFormData(prev => ({ ...prev, [addressField]: `Location at [${lng.toFixed(6)}, ${lat.toFixed(6)}]` }));
       if (err.response && err.response.status === 401) {
        alert("Failed to fetch address: Invalid Mapbox Access Token. Please check your REACT_APP_MAPBOX_TOKEN environment variable.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      // Ensure we're sending the token in the correct format as expected by the backend
      // The auth middleware expects: Authorization: Bearer <token>
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Ensure 'Bearer ' prefix is included
        }
      };

      // Log the token being used
      console.log('Using token for auth:', token.substring(0, 20) + '...');

      // Validate coordinates
      if (formData.startCoordinates.some(isNaN) || formData.endCoordinates.some(isNaN)) {
        throw new Error('Coordinates must be valid numbers');
      }

      // Format date fields
      const requestData = {
        ...formData,
        pickupTime: new Date(formData.pickupTime).toISOString(),
        dropTime: new Date(formData.dropTime).toISOString()
      };

      // Add debug logs
      console.log('Sending trip data:', requestData);

      const response = await axios.post(
        'http://localhost:5001/api/trips',
        requestData,
        config
      );

      console.log('Trip created successfully:', response.data);
      alert('Trip created successfully!');
      navigate('/truck-driver-dashboard');
    } catch (err) {
      console.error('Error creating trip:', err);

      let errorMessage = 'Failed to create trip. Please try again.';

      if (err.response) {
        console.error('Error response:', err.response.status, err.response.data);

        // Handle specific error cases
        if (err.response.status === 401) {
          errorMessage = 'Authentication failed. Please log out and log in again.';

          // Redirect to login if token is invalid
          localStorage.removeItem('token');
          setTimeout(() => navigate('/login'), 2000);
        } else if (err.response.data) {
          errorMessage = err.response.data.msg ||
            (err.response.data.errors && err.response.data.errors[0]?.msg) ||
            errorMessage;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/truck-driver-dashboard');
  };

  return (
    <div className="trip-form-container">
      <h1>List New Trip</h1>

      {error && <div className="error-message">{error}</div>}

      {showMap && (
        <div className="map-selection-overlay">
          <div className="map-header">
            <h3>Select {activeLocation === 'start' ? 'Starting' : 'Destination'} Location</h3>
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

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="startAddress">Starting Point</label>
          <div className="map-selection">
            <div className="address-display">
              {formData.startAddress ? (
                <div className="selected-address">{formData.startAddress}</div>
              ) : (
                <div className="no-address-selected">No starting point selected</div>
              )}
            </div>
          <button
            type="button"
            className="location-btn"
            onClick={() => openMapSelector('start')}
          >
            Select from Map
          </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="endAddress">Destination</label>
          <div className="map-selection">
            <div className="address-display">
              {formData.endAddress ? (
                <div className="selected-address">{formData.endAddress}</div>
              ) : (
                <div className="no-address-selected">No destination selected</div>
              )}
            </div>
          <button
            type="button"
            className="location-btn"
            onClick={() => openMapSelector('end')}
          >
            Select from Map
          </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="pickupTime">Pickup Time</label>
          <input
            type="datetime-local"
            id="pickupTime"
            name="pickupTime"
            value={formData.pickupTime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="dropTime">Drop Time</label>
          <input
            type="datetime-local"
            id="dropTime"
            name="dropTime"
            value={formData.dropTime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="price">Price (₹)</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="Enter price in rupees"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating Trip...' : 'Create Trip'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TripForm; 