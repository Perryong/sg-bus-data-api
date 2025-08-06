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
          `https://sg-bus-data-api.vercel.app/api/arrivals?busStopCode=${stopCode}`
        );
        if (!response.ok) throw new Error('Failed to fetch arrivals');
        const data = await response.json();
        if (data.success && data.data.arrivals) {
          setArrivals(data.data.arrivals);
        } else {
          throw new Error(data.error?.message || 'Invalid response format');
        }
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
          `https://sg-bus-data-api.vercel.app/api/bus-stops?bbox=${bbox}&format=geojson`
        );
        const data = await response.json();
        if (data.success && data.data.features) {
          setStops(data.data.features);
        } else {
          setStops([]);
        }
      } catch (error) {
        console.error('Failed to fetch nearby stops:', error);
        setStops([]);
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
          fetch(`https://sg-bus-data-api.vercel.app/api/bus-routes?service=${serviceNumber}&format=geojson`),
          fetch(`https://sg-bus-data-api.vercel.app/api/bus-stops?service=${serviceNumber}&format=geojson`)
        ]);

        const [routeData, stopsData] = await Promise.all([
          routeResponse.json(),
          stopsResponse.json()
        ]);

        if (routeData.success && stopsData.success) {
          setRouteData({
            routes: routeData.data.features || [],
            stops: stopsData.data.features || []
          });
        } else {
          setRouteData(null);
        }
      } catch (error) {
        console.error('Failed to fetch route data:', error);
        setRouteData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRouteData();
  }, [serviceNumber]);

  return { routeData, loading };
}

// Custom hook for real-time bus positions
export function useBusPositions(serviceNumber, refreshInterval = 30000) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!serviceNumber) return;

    const fetchPositions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://sg-bus-data-api.vercel.app/api/realtime?serviceNo=${serviceNumber}`
        );
        if (!response.ok) throw new Error('Failed to fetch bus positions');
        const data = await response.json();
        if (data.success && data.data.positions) {
          setPositions(data.data.positions);
        } else {
          throw new Error(data.error?.message || 'Invalid response format');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, refreshInterval);
    return () => clearInterval(interval);
  }, [serviceNumber, refreshInterval]);

  return { positions, loading, error };
}