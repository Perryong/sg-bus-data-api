const map = L.map('map', { zoomControl: true }).setView([1.3521, 103.8198], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const stopsLayer = L.layerGroup().addTo(map);
const routesLayer = L.layerGroup().addTo(map);

const $ = (id) => document.getElementById(id);

function clearLayers() {
  stopsLayer.clearLayers();
  routesLayer.clearLayers();
  $("arrivals").innerHTML = '';
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function renderStopsGeoJSON(geojson) {
  const icon = L.circleMarker([0,0], { radius: 5, color: '#10b981', fillOpacity: 0.9 });
  const layer = L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 5, color: '#10b981', fillOpacity: 0.9 }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      const services = (p.services || []).slice(0, 12).join(', ');
      layer.bindPopup(`<b>${p.name}</b><br/>${p.road}<br/><small>${p.code}</small><br/>Services: ${services}`);
    }
  });
  stopsLayer.addLayer(layer);
  try {
    map.fitBounds(layer.getBounds(), { padding: [20,20] });
  } catch (_) {}
}

function renderRoutesGeoJSON(geojson) {
  const layer = L.geoJSON(geojson, {
    style: (feature) => ({ color: '#60a5fa', weight: 3, opacity: 0.8 })
  });
  routesLayer.addLayer(layer);
  try {
    map.fitBounds(layer.getBounds(), { padding: [20,20] });
  } catch (_) {}
}

// UI actions
$("loadStops").addEventListener('click', async () => {
  const search = encodeURIComponent($("search").value.trim());
  const service = encodeURIComponent($("service").value.trim());
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (service) params.set('service', service);
  params.set('limit', '1000');
  params.set('format', 'geojson');
  const url = `/api/bus-stops?${params.toString()}`;
  try {
    const { data } = await fetchJSON(url);
    renderStopsGeoJSON(data);
  } catch (e) {
    alert(`Failed to load stops: ${e.message}`);
  }
});

$("loadRoutes").addEventListener('click', async () => {
  const service = $("service").value.trim();
  const params = new URLSearchParams();
  if (service) params.set('service', service);
  params.set('format', 'geojson');
  const url = `/api/bus-routes?${params.toString()}`;
  try {
    const { data } = await fetchJSON(url);
    renderRoutesGeoJSON(data);
  } catch (e) {
    alert(`Failed to load routes: ${e.message}`);
  }
});

$("clear").addEventListener('click', clearLayers);

$("fetchArrivals").addEventListener('click', async () => {
  const stop = $("arrStop").value.trim();
  const svc = $("arrService").value.trim();
  if (!stop) { alert('Enter bus stop code'); return; }
  const params = new URLSearchParams();
  params.set('busStopCode', stop);
  if (svc) params.set('serviceNo', svc);
  const url = `/api/arrivals?${params.toString()}`;
  $("arrivals").innerHTML = 'Loading...';
  try {
    const { data } = await fetchJSON(url);
    const list = (data.arrivals || []).map(item => {
      const buses = (item.buses || []).map(b => `${b.minutesAway}m (${b.load})`).join(', ');
      return `<li class="arrival-item"><div class="arrival-title">Service ${item.serviceNo}</div><div class="arrival-bus">${buses || 'No data'}</div></li>`;
    }).join('');
    $("arrivals").innerHTML = list || '<li>No arrivals</li>';
  } catch (e) {
    $("arrivals").innerHTML = `<li>Error: ${e.message}</li>`;
  }
});

// Health check button
document.getElementById('checkHealth').addEventListener('click', async () => {
  const status = document.getElementById('healthStatus');
  status.textContent = 'Checking...';
  try {
    const res = await fetch('/api/health');
    const json = await res.json();
    status.textContent = json?.data?.status || 'Unknown';
    status.style.color = res.ok ? '#10b981' : '#ef4444';
  } catch (e) {
    status.textContent = 'Error';
    status.style.color = '#ef4444';
  }
});


