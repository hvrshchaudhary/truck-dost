import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import {fromLonLat, toLonLat} from 'ol/proj';
import {Point} from 'ol/geom';
import Feature from 'ol/Feature';
import {Vector as VectorLayer} from 'ol/layer';
import {Vector as VectorSource} from 'ol/source';
import {Style, Circle, Fill, Stroke} from 'ol/style';
import {defaults as defaultControls} from 'ol/control';
import './TripForm.css';

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
  const [userData, setUserData] = useState(null);
  
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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vectorSourceRef = useRef(null);

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
          const response = await axios.get('http://localhost:5001/api/trips', {
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
      
      setUserData(decoded.user);
    } catch (err) {
      console.error('Token verification failed:', err);
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);
  
  // Initialize and cleanup map
  useEffect(() => {
    if (showMap && mapRef.current && !mapInstanceRef.current) {
      // Create vector source and layer for markers
      vectorSourceRef.current = new VectorSource();
      const vectorLayer = new VectorLayer({
        source: vectorSourceRef.current,
        style: (feature) => {
          const locationType = feature.get('locationType');
          return new Style({
            image: new Circle({
              radius: 8,
              fill: new Fill({
                color: locationType === 'start' ? '#4CAF50' : '#F44336'
              }),
              stroke: new Stroke({
                color: 'white',
                width: 2
              })
            })
          });
        }
      });
      
      // Create map
      mapInstanceRef.current = new Map({
        target: mapRef.current,
        layers: [
          new TileLayer({
            source: new OSM()
          }),
          vectorLayer
        ],
        controls: defaultControls(),
        view: new View({
          center: fromLonLat([viewState.longitude, viewState.latitude]),
          zoom: viewState.zoom
        })
      });
      
      // Add click event handler
      mapInstanceRef.current.on('click', (evt) => {
        if (!activeLocation) return;
        
        const coords = mapInstanceRef.current.getCoordinateFromPixel(evt.pixel);
        const lonLat = toLonLat(coords);
        
        // Use the handleMapClick function with the converted coordinates
        handleMapClick({
          lngLat: {
            lng: lonLat[0],
            lat: lonLat[1]
          }
        });
        
        // Update the marker on the map
        updateMarker(lonLat[0], lonLat[1], activeLocation);
      });
      
      // Add existing marker if any
      if (activeLocation === 'start' && mapMarkers.start) {
        updateMarker(
          mapMarkers.start.longitude, 
          mapMarkers.start.latitude,
          'start'
        );
      } else if (activeLocation === 'end' && mapMarkers.end) {
        updateMarker(
          mapMarkers.end.longitude, 
          mapMarkers.end.latitude,
          'end'
        );
      }
    }
    
    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
        vectorSourceRef.current = null;
      }
    };
  }, [showMap, activeLocation]);
  
  // Update map center when viewState changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getView().setCenter(
        fromLonLat([viewState.longitude, viewState.latitude])
      );
      mapInstanceRef.current.getView().setZoom(viewState.zoom);
    }
  }, [viewState]);
  
  // Function to update marker on the map
  const updateMarker = (lng, lat, locationType) => {
    if (!vectorSourceRef.current) return;
    
    // Clear existing markers of the same type
    const features = vectorSourceRef.current.getFeatures();
    features.forEach(feature => {
      if (feature.get('locationType') === locationType) {
        vectorSourceRef.current.removeFeature(feature);
      }
    });
    
    // Add new marker
    const marker = new Feature({
      geometry: new Point(fromLonLat([lng, lat])),
      name: `${locationType} marker`
    });
    
    marker.set('locationType', locationType);
    vectorSourceRef.current.addFeature(marker);
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

  const handleCoordinateChange = (e, type, index) => {
    const { value } = e.target;
    const newValue = value === '' ? 0 : parseFloat(value);
    
    setFormData(prevState => {
      const newCoordinates = [...prevState[type]];
      newCoordinates[index] = newValue;
      return {
        ...prevState,
        [type]: newCoordinates
      };
    });
    
    // Update marker on the map if coordinates are changed manually
    if (type === 'startCoordinates') {
      setMapMarkers(prev => ({
        ...prev,
        start: { longitude: index === 0 ? newValue : prev.start?.longitude, 
                 latitude: index === 1 ? newValue : prev.start?.latitude }
      }));
      
      if (showMap && activeLocation === 'start' && vectorSourceRef.current) {
        const lon = index === 0 ? newValue : mapMarkers.start?.longitude;
        const lat = index === 1 ? newValue : mapMarkers.start?.latitude;
        if (lon && lat) {
          updateMarker(lon, lat, 'start');
        }
      }
    } else if (type === 'endCoordinates') {
      setMapMarkers(prev => ({
        ...prev,
        end: { longitude: index === 0 ? newValue : prev.end?.longitude, 
               latitude: index === 1 ? newValue : prev.end?.latitude }
      }));
      
      if (showMap && activeLocation === 'end' && vectorSourceRef.current) {
        const lon = index === 0 ? newValue : mapMarkers.end?.longitude;
        const lat = index === 1 ? newValue : mapMarkers.end?.latitude;
        if (lon && lat) {
          updateMarker(lon, lat, 'end');
        }
      }
    }
  };
  
  // Open map for selecting a location
  const openMapSelector = (locationType) => {
    setActiveLocation(locationType);
    setShowMap(true);
    
    // If we already have coordinates for this location type, center the map there
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
    }
  };
  
  // Handle click on map to place a marker
  const handleMapClick = (event) => {
    if (!activeLocation) return;
    
    const { lng, lat } = event.lngLat;
    
    // Update marker position
    setMapMarkers(prev => ({
      ...prev,
      [activeLocation]: { longitude: lng, latitude: lat }
    }));
    
    // Update form data with new coordinates
    if (activeLocation === 'start') {
      setFormData(prev => ({
        ...prev,
        startCoordinates: [lng, lat]
      }));
      // Get address (reverse geocoding)
      reverseGeocode(lng, lat, 'startAddress');
    } else if (activeLocation === 'end') {
      setFormData(prev => ({
        ...prev,
        endCoordinates: [lng, lat]
      }));
      // Get address (reverse geocoding)
      reverseGeocode(lng, lat, 'endAddress');
    }
  };
  
  // Get current location using browser's geolocation API
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Update map view
        setViewState({
          longitude: lng,
          latitude: lat,
          zoom: 15
        });
        
        // Update marker
        if (activeLocation) {
          updateMarker(lng, lat, activeLocation);
          
          // Update form data and state
          handleMapClick({
            lngLat: { lng, lat }
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert(`Error getting your location: ${error.message}`);
      },
      { enableHighAccuracy: true }
    );
  };
  
  // Close map and confirm location selection
  const confirmLocationSelection = () => {
    setShowMap(false);
  };
  
  // Reverse geocoding (coordinates to address)
  const reverseGeocode = async (lng, lat, addressField) => {
    try {
      // Show loading state
      setFormData(prev => ({
        ...prev,
        [addressField]: 'Fetching address...'
      }));

      // Use OpenStreetMap's Nominatim API to get address from coordinates
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'TruckDost-App' // It's good practice to identify your app
          }
        }
      );

      if (response.data && response.data.display_name) {
        // Format the address nicely
        const addressData = response.data.address;
        let formattedAddress = '';
        
        // Create a descriptive address with nearby landmarks if available
        if (addressData.road || addressData.amenity || addressData.building) {
          formattedAddress += (addressData.road || addressData.amenity || addressData.building) + ', ';
        }
        
        if (addressData.suburb || addressData.neighbourhood) {
          formattedAddress += (addressData.suburb || addressData.neighbourhood) + ', ';
        }
        
        if (addressData.city || addressData.town || addressData.village) {
          formattedAddress += (addressData.city || addressData.town || addressData.village) + ', ';
        }
        
        if (addressData.state) {
          formattedAddress += addressData.state;
        }
        
        if (addressData.postcode) {
          formattedAddress += ' - ' + addressData.postcode;
        }
        
        // If formatted address is empty or too short, fall back to display_name
        if (formattedAddress.length < 10) {
          formattedAddress = response.data.display_name;
        }
        
        setFormData(prev => ({
          ...prev,
          [addressField]: formattedAddress
        }));
        
        console.log('Address found:', formattedAddress);
      } else {
        // Fallback to coordinate-based address if no result
        setFormData(prev => ({
          ...prev,
          [addressField]: `Location at [${lng.toFixed(6)}, ${lat.toFixed(6)}]`
        }));
        
        console.warn('No address found for coordinates:', lng, lat);
      }
    } catch (err) {
      console.error('Error in reverse geocoding:', err);
      setFormData(prev => ({
        ...prev,
        [addressField]: `Location at [${lng.toFixed(6)}, ${lat.toFixed(6)}]`
      }));
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
              ref={mapRef} 
              style={{ width: '100%', height: '400px' }}
            ></div>
            <div className="map-controls">
              <button 
                className="geolocate-btn" 
                onClick={getCurrentLocation}
                title="Use your current location"
              >
                <span role="img" aria-label="Location">📍</span> My Location
              </button>
            </div>
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
          <label htmlFor="startAddress">Starting Point (Address)</label>
          <input
            type="text"
            id="startAddress"
            name="startAddress"
            value={formData.startAddress}
            onChange={handleChange}
            placeholder="Enter starting address"
            required
          />
          <button 
            type="button" 
            className="location-btn"
            onClick={() => openMapSelector('start')}
          >
            Select from Map
          </button>
        </div>
        
        <div className="form-group coordinates-group">
          <label>Starting Coordinates</label>
          <div className="coordinates-inputs">
            <div className="coordinate-input">
              <label htmlFor="startLongitude">Longitude</label>
              <input
                type="number"
                id="startLongitude"
                value={formData.startCoordinates[0]}
                onChange={(e) => handleCoordinateChange(e, 'startCoordinates', 0)}
                step="0.000001"
                required
              />
            </div>
            <div className="coordinate-input">
              <label htmlFor="startLatitude">Latitude</label>
              <input
                type="number"
                id="startLatitude"
                value={formData.startCoordinates[1]}
                onChange={(e) => handleCoordinateChange(e, 'startCoordinates', 1)}
                step="0.000001"
                required
              />
            </div>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="endAddress">Destination (Address)</label>
          <input
            type="text"
            id="endAddress"
            name="endAddress"
            value={formData.endAddress}
            onChange={handleChange}
            placeholder="Enter destination address"
            required
          />
          <button 
            type="button" 
            className="location-btn"
            onClick={() => openMapSelector('end')}
          >
            Select from Map
          </button>
        </div>
        
        <div className="form-group coordinates-group">
          <label>Destination Coordinates</label>
          <div className="coordinates-inputs">
            <div className="coordinate-input">
              <label htmlFor="endLongitude">Longitude</label>
              <input
                type="number"
                id="endLongitude"
                value={formData.endCoordinates[0]}
                onChange={(e) => handleCoordinateChange(e, 'endCoordinates', 0)}
                step="0.000001"
                required
              />
            </div>
            <div className="coordinate-input">
              <label htmlFor="endLatitude">Latitude</label>
              <input
                type="number"
                id="endLatitude"
                value={formData.endCoordinates[1]}
                onChange={(e) => handleCoordinateChange(e, 'endCoordinates', 1)}
                step="0.000001"
                required
              />
            </div>
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