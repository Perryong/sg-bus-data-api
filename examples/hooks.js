import { useEffect, useState } from 'react';

// Custom hook for bus arrivals
export function useBusArrivals(stopCode, refreshInterval = 30000) {
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stopCode) return;

    const fetchArrivals = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://sg-bus-api.vercel.app/api/realtime/arrivals?busStopCode=${stopCode}`
        );
        if (!response.ok) throw new Error('Failed to fetch arrivals');
        const data = await response.json();
        setArrivals(data.arrivals);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArrivals();
    const interval = setInterval(fetchArrivals, refreshInterval);
    return () => clearInterval(interval);
  }, [stopCode, refreshInterval]);

  return { arrivals, loading, error };
}

// Custom hook for nearby bus stops
export function useNearbyStops(latitude, longitude, radius = 0.01) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!latitude || !longitude) return;

    const fetchNearbyStops = async () => {
      setLoading(true);
      const bbox = [
        longitude - radius, latitude - radius,
        longitude + radius, latitude + radius
      ].join(',');

      try {
        const response = await fetch(
          `https://sg-bus-api.vercel.app/api/bus-stops/geojson?bbox=${bbox}`
        );
        const data = await response.json();
        setStops(data.features);
      } catch (error) {
        console.error('Failed to fetch nearby stops:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyStops();
  }, [latitude, longitude, radius]);

  return { stops, loading };
}

// Custom hook for bus route data
export function useBusRoute(serviceNumber) {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serviceNumber) return;

    const fetchRouteData = async () => {
      setLoading(true);
      try {
        const [routeResponse, stopsResponse] = await Promise.all([
          fetch(`https://sg-bus-api.vercel.app/api/bus-routes/geojson?service=${serviceNumber}`),
          fetch(`https://sg-bus-api.vercel.app/api/bus-stops/geojson?service=${serviceNumber}`)
        ]);

        const [routeGeoJSON, stopsGeoJSON] = await Promise.all([
          routeResponse.json(),
          stopsResponse.json()
        ]);

        setRouteData({
          routes: routeGeoJSON.features,
          stops: stopsGeoJSON.features
        });
      } catch (error) {
        console.error('Failed to fetch route data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRouteData();
  }, [serviceNumber]);

  return { routeData, loading };
}