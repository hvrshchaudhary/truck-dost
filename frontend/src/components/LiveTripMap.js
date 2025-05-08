import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'; // Import Mapbox CSS

const LiveTripMap = ({ destinationCoordinates, mapboxAccessToken, plannedStartCoordinates, tripStartCoordinates, onTripEnd }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geolocateControlRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [userLocation, setUserLocation] = useState(null); // For potential future use or display
  const [isTripActive, setIsTripActive] = useState(true); // New state for trip status

  useEffect(() => {
    if (!isTripActive) return; // Don't initialize map if trip has ended

    if (!mapboxAccessToken || mapboxAccessToken === 'YOUR_MAPBOX_ACCESS_TOKEN') {
      console.error('Mapbox Access Token is not configured. Ensure REACT_APP_MAPBOX_TOKEN is set.');
      // Optionally, display a message in the UI
      return;
    }

    if (!destinationCoordinates || destinationCoordinates.length !== 2) {
      console.error('Invalid destination coordinates provided.');
      return;
    }

    mapboxgl.accessToken = mapboxAccessToken;

    const initialCenter = plannedStartCoordinates && plannedStartCoordinates.length === 2 
      ? plannedStartCoordinates 
      : destinationCoordinates;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12', // Standard Mapbox street style
      center: initialCenter, // Initial center
      zoom: 10,
    });

    const map = mapRef.current;

    // Add destination marker
    new mapboxgl.Marker({ color: 'red' })
      .setLngLat(destinationCoordinates)
      .setPopup(new mapboxgl.Popup().setText('Final Destination'))
      .addTo(map);

    // Add trip start marker if provided and different from final destination
    if (tripStartCoordinates && 
        tripStartCoordinates.length === 2 && 
        (tripStartCoordinates[0] !== destinationCoordinates[0] || tripStartCoordinates[1] !== destinationCoordinates[1])) {
      new mapboxgl.Marker({ color: 'orange' })
        .setLngLat(tripStartCoordinates)
        .setPopup(new mapboxgl.Popup().setText('Trip Starting Point'))
        .addTo(map);
    }

    // Geolocate control to get user's current location
    geolocateControlRef.current = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true, // Continuously update user's location
      showUserHeading: true,   // Show direction user is facing
      showAccuracyCircle: true,
    });
    map.addControl(geolocateControlRef.current);

    const fetchRoute = async (startCoords, endCoords) => {
      const profile = 'driving-traffic'; // Use 'driving-traffic' for real-time traffic or 'driving'
      
      let coordinatesString = ``;
      if (tripStartCoordinates && tripStartCoordinates.length === 2) {
        // Route: Current Location -> Trip Start -> Final Destination
        coordinatesString = `${startCoords[0]},${startCoords[1]};${tripStartCoordinates[0]},${tripStartCoordinates[1]};${endCoords[0]},${endCoords[1]}`;
      } else {
        // Route: Current Location -> Final Destination (fallback or no intermediate start point)
        coordinatesString = `${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}`;
      }

      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesString}?steps=true&geometries=geojson&overview=full&access_token=${mapboxAccessToken}`;

      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const routeGeoJSON = data.routes[0].geometry;
          if (map.getSource('route')) {
            map.getSource('route').setData(routeGeoJSON);
          } else {
            // This case should ideally not happen if added on load
            map.addSource('route', { type: 'geojson', data: routeGeoJSON });
            map.addLayer({ /* ... route layer definition ... */ });
          }
          // Fit map to route bounds
          const coordinates = routeGeoJSON.coordinates;
          if (coordinates.length > 0) {
            const bounds = new mapboxgl.LngLatBounds(
              coordinates[0],
              coordinates[0]
            );
            for (const coord of coordinates) {
              bounds.extend(coord);
            }
            map.fitBounds(bounds, {
              padding: {top: 50, bottom:50, left: 50, right: 50},
              maxZoom: 15
            });
          }


        } else {
          console.warn('No route found:', data.message || 'Check API response.');
          if (map.getSource('route')) {
            map.getSource('route').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
          }
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };
    
    map.on('load', () => {
      // Add source and layer for the route line
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [], // Initially empty
          },
        },
      });
      map.addLayer({
        id: 'route-layer', // Unique ID for the layer
        type: 'line',
        source: 'route', // Reference the source ID
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#007cbf', // A distinct blue color
          'line-width': 7,
          'line-opacity': 0.75,
        },
      });
      
      // Trigger geolocation to get initial position and draw route
      // Small delay to ensure map is fully ready for geolocate.trigger()
      setTimeout(() => {
        if (geolocateControlRef.current) {
            geolocateControlRef.current.trigger();
        }
      }, 500);
    });

    // Listen for geolocate event to update route
    const onGeolocate = (e) => {
      const newLocation = [e.coords.longitude, e.coords.latitude];
      setUserLocation(newLocation); // Update state for potential display
      fetchRoute(newLocation, destinationCoordinates);
    };

    const onGeolocateError = (e) => {
        console.error('Geolocation error:', e.message);
        alert(`Geolocation error: ${e.message}. Please ensure location services are enabled and permissions are granted.`);
    };

    if (geolocateControlRef.current) {
        geolocateControlRef.current.on('geolocate', onGeolocate);
        geolocateControlRef.current.on('error', onGeolocateError);
    }

    // Cleanup on unmount or when trip ends
    return () => {
      if (geolocateControlRef.current) {
        // Explicitly stop tracking if component unmounts while trip is active
        // or if trip is programmatically stopped.
        if (geolocateControlRef.current.hasOwnProperty('_watchState') && geolocateControlRef.current._watchState !== 'OFF') {
             try {
                // Note: _watchState is an internal detail, might break in future mapbox-gl versions.
                // A more robust way would be to remove and re-add the control, or manage watchID if accessible.
                // For now, we assume it's active if not 'OFF' and try to stop it.
                // map.removeControl(geolocateControlRef.current) might be safer if just stopping.
             } catch (e) {
                console.warn("Could not explicitly stop geolocate watch state:", e);
             }
        }
        geolocateControlRef.current.off('geolocate', onGeolocate);
        geolocateControlRef.current.off('error', onGeolocateError);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null; // Ensure it's cleaned up for potential re-renders
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationCoordinates, mapboxAccessToken, plannedStartCoordinates, tripStartCoordinates, isTripActive]); // Add isTripActive

  const handleEndTrip = () => {
    setIsTripActive(false);
    if (geolocateControlRef.current) {
        // Attempt to stop geolocation tracking
        // The GeolocateControl doesn't have a public .stop() method. 
        // Removing and re-adding is one way, or relying on the cleanup in useEffect.
        // For an immediate visual stop, we can try to remove it.
        // However, the 'map.removeControl' might cause issues if mapRef.current is already null or being removed.
        // Best to let the useEffect cleanup handle it when isTripActive changes.
    }
    if (mapRef.current && mapRef.current.getSource('route')) {
      // Optionally clear the route line
      // mapRef.current.getSource('route').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
    }
    if (onTripEnd) {
      onTripEnd();
    }
  };

  if (!isTripActive) {
    return (
      <div className="trip-completion-message card-style" style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Trip Successfully Completed!</h3>
        {/* Further actions like a button to go back or delete could be handled by the parent component */}
      </div>
    );
  }

  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: '500px' }}>
        {(!mapboxAccessToken || mapboxAccessToken === 'YOUR_MAPBOX_ACCESS_TOKEN') && (
           <p style={{position: 'absolute', top: '10px', left: '10px', zIndex: 10, color: 'red', backgroundColor: 'white', padding: '5px', borderRadius: '3px' }}>
             Mapbox Access Token is not configured. Ensure REACT_APP_MAPBOX_TOKEN is set.
           </p>
        )}
        {(!destinationCoordinates || destinationCoordinates.length !== 2) && (
           <p style={{position: 'absolute', top: '40px', left: '10px', zIndex: 10, color: 'red', backgroundColor: 'white', padding: '5px', borderRadius: '3px' }}>
             Invalid or missing destination.
           </p>
        )}
        <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, bottom: 0, width: '100%', height: '100%' }} />
      </div>

      {isTripActive && (
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={handleEndTrip} 
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545', // A common red for destructive actions
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            End Trip
          </button>
        </div>
      )}
    </>
  );
};

export default LiveTripMap; 