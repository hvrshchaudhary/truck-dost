import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Point } from 'ol/geom';
import Feature from 'ol/Feature';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import { defaults as defaultControls } from 'ol/control';
import './FindTrips.css';

const API_URL = 'http://localhost:5001';

const FindTrips = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Proposal state
  const [proposalMessages, setProposalMessages] = useState({});
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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vectorSourceRef = useRef(null);

  // Define updateMarker before it's used
  const updateMarker = useCallback((lng, lat, locationType) => {
    if (!vectorSourceRef.current) return;

    const features = vectorSourceRef.current.getFeatures();
    features.forEach(feature => {
      if (feature.get('locationType') === locationType) {
        vectorSourceRef.current.removeFeature(feature);
      }
    });

    const marker = new Feature({
      geometry: new Point(fromLonLat([lng, lat])),
      name: `${locationType} marker`
    });

    marker.set('locationType', locationType);
    vectorSourceRef.current.addFeature(marker);
  }, []);

  // Define reverseGeocode before it's used
  const reverseGeocode = useCallback(async (lng, lat, addressField) => {
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
            'User-Agent': 'TruckDost-App'
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
      } else {
        // Fallback to coordinate-based address if no result
        setFormData(prev => ({
          ...prev,
          [addressField]: `Location at [${lng.toFixed(6)}, ${lat.toFixed(6)}]`
        }));
      }
    } catch (err) {
      console.error('Error in reverse geocoding:', err);
      setFormData(prev => ({
        ...prev,
        [addressField]: `Location at [${lng.toFixed(6)}, ${lat.toFixed(6)}]`
      }));
    }
  }, []);

  // Define handleMapClick after its dependencies
  const handleMapClick = useCallback((coords) => {
    if (!activeLocation) return;

    const { longitude, latitude } = coords;

    setMapMarkers(prev => ({
      ...prev,
      [activeLocation]: { longitude, latitude }
    }));

    if (activeLocation === 'pickup') {
      setFormData(prev => ({
        ...prev,
        startLongitude: longitude.toFixed(6),
        startLatitude: latitude.toFixed(6)
      }));
      reverseGeocode(longitude, latitude, 'startLocationName');
    } else if (activeLocation === 'delivery') {
      setFormData(prev => ({
        ...prev,
        endLongitude: longitude.toFixed(6),
        endLatitude: latitude.toFixed(6)
      }));
      reverseGeocode(longitude, latitude, 'endLocationName');
    }

    updateMarker(longitude, latitude, activeLocation);
  }, [activeLocation, updateMarker, reverseGeocode]);

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
    if (showMap && mapRef.current && !mapInstanceRef.current) {
      vectorSourceRef.current = new VectorSource();
      const vectorLayer = new VectorLayer({
        source: vectorSourceRef.current,
        style: (feature) => {
          const locationType = feature.get('locationType');
          return new Style({
            image: new Circle({
              radius: 8,
              fill: new Fill({
                color: locationType === 'pickup' ? '#4CAF50' : '#F44336'
              }),
              stroke: new Stroke({
                color: 'white',
                width: 2
              })
            })
          });
        }
      });

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

      mapInstanceRef.current.on('click', (evt) => {
        if (!activeLocation) return;

        const coords = mapInstanceRef.current.getCoordinateFromPixel(evt.pixel);
        const lonLat = toLonLat(coords);

        handleMapClick({
          longitude: lonLat[0],
          latitude: lonLat[1]
        });
      });

      if (activeLocation === 'pickup' && mapMarkers.pickup) {
        updateMarker(
          mapMarkers.pickup.longitude,
          mapMarkers.pickup.latitude,
          'pickup'
        );
      } else if (activeLocation === 'delivery' && mapMarkers.delivery) {
        updateMarker(
          mapMarkers.delivery.longitude,
          mapMarkers.delivery.latitude,
          'delivery'
        );
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
        vectorSourceRef.current = null;
      }
    };
  }, [
    showMap,
    activeLocation,
    mapMarkers.pickup,
    mapMarkers.delivery,
    viewState.latitude,
    viewState.longitude,
    viewState.zoom,
    handleMapClick,
    updateMarker
  ]);

  // Update map center when viewState changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getView().setCenter(
        fromLonLat([viewState.longitude, viewState.latitude])
      );
      mapInstanceRef.current.getView().setZoom(viewState.zoom);
    }
  }, [viewState]);

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

    try {
      // Validate coordinates
      const startLat = parseFloat(formData.startLatitude);
      const startLng = parseFloat(formData.startLongitude);
      const endLat = parseFloat(formData.endLatitude);
      const endLng = parseFloat(formData.endLongitude);

      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        throw new Error('Please enter valid coordinates');
      }

      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // Make API call to search for trips
      const response = await axios.get(
        `${API_URL}/api/trips/near-route`,
        {
          params: {
            startLatitude: formData.startLatitude,
            startLongitude: formData.startLongitude,
            endLatitude: formData.endLatitude,
            endLongitude: formData.endLongitude
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Search results:', response.data);

      // Check if each trip has a driver object
      const trips = response.data.map(trip => {
        if (!trip.driver) {
          console.warn(`Trip ${trip._id} has no driver information`);
        } else {
          console.log(`Trip ${trip._id} has driver:`, trip.driver);
        }
        return trip;
      });

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

    // If we already have coordinates for this location type, center the map there
    if (locationType === 'pickup' && mapMarkers.pickup) {
      setViewState({
        longitude: mapMarkers.pickup.longitude,
        latitude: mapMarkers.pickup.latitude,
        zoom: 13
      });
    } else if (locationType === 'delivery' && mapMarkers.delivery) {
      setViewState({
        longitude: mapMarkers.delivery.longitude,
        latitude: mapMarkers.delivery.latitude,
        zoom: 13
      });
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
          handleMapClick({
            longitude: lng,
            latitude: lat
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

      const proposalData = {
        driver: driverId,
        trip: tripId,
        proposalDetails: {
          message: message,
          requestedPrice: trip.price || 0
        }
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

      <div className="search-container">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="form-header">
            <h2>Search Parameters</h2>
            <p>Enter your pickup and delivery locations to find nearby trips</p>
          </div>

          <div className="location-inputs">
            <div className="location-group">
              <label>Pickup Location</label>
              <div className="coords-group">
                <input
                  type="text"
                  name="startLatitude"
                  placeholder="Latitude"
                  value={formData.startLatitude}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="startLongitude"
                  placeholder="Longitude"
                  value={formData.startLongitude}
                  onChange={handleChange}
                  required
                />
              </div>
              <input
                type="text"
                name="startLocationName"
                placeholder="Location Name (Optional)"
                value={formData.startLocationName}
                onChange={handleChange}
              />
              <button
                type="button"
                className="map-button"
                onClick={() => openLocationSelector('pickup')}
              >
                Select on Map
              </button>
            </div>

            <div className="location-group">
              <label>Delivery Location</label>
              <div className="coords-group">
                <input
                  type="text"
                  name="endLatitude"
                  placeholder="Latitude"
                  value={formData.endLatitude}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="endLongitude"
                  placeholder="Longitude"
                  value={formData.endLongitude}
                  onChange={handleChange}
                  required
                />
              </div>
              <input
                type="text"
                name="endLocationName"
                placeholder="Location Name (Optional)"
                value={formData.endLocationName}
                onChange={handleChange}
              />
              <button
                type="button"
                className="map-button"
                onClick={() => openLocationSelector('delivery')}
              >
                Select on Map
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search for Trips'}
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

                          {proposalErrors[trip._id] && (
                            <div className="proposal-error">{proposalErrors[trip._id]}</div>
                          )}
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