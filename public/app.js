// Initialize map
const map = L.map('map', { 
  zoomControl: true,
  attributionControl: true
}).setView([1.3521, 103.8198], 12);

// Add tile layer with dark theme
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  className: 'map-tiles'
}).addTo(map);

// Layer groups
const stopsLayer = L.layerGroup().addTo(map);
const routesLayer = L.layerGroup().addTo(map);

// Utility functions
const $ = (id) => document.getElementById(id);

function showLoading(element, text = 'Loading...') {
  element.innerHTML = `<div class="loading"><div class="spinner"></div>${text}</div>`;
}

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

function showNotification(message, type = 'info') {
  // Simple notification system
  const notification = document.createElement('div');
  notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? 'var(--accent-danger)' : 'var(--accent-primary)'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-md);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function renderStopsGeoJSON(geojson) {
  const layer = L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
              radius: 6,
              fillColor: '#00d4aa',
              color: '#64ffda',
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.7
          });
      },
      onEachFeature: (feature, layer) => {
          const p = feature.properties;
          const services = (p.services || []).slice(0, 15).join(', ');
          const popupContent = `
              <div style="font-family: Inter, sans-serif; min-width: 200px;">
                  <h3 style="color: var(--accent-primary); margin-bottom: 0.5rem; font-size: 1rem;">${p.name}</h3>
                  <p style="color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.875rem;">${p.road}</p>
                  <p style="color: var(--text-muted); margin-bottom: 0.75rem; font-size: 0.75rem;">Stop Code: ${p.code}</p>
                  <div style="background: var(--bg-tertiary); padding: 0.75rem; border-radius: 8px;">
                      <p style="color: var(--text-muted); margin-bottom: 0.5rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Services:</p>
                      <p style="color: var(--text-primary); font-size: 0.875rem; line-height: 1.4;">${services}</p>
                  </div>
              </div>
          `;
          layer.bindPopup(popupContent, {
              maxWidth: 300,
              className: 'custom-popup'
          });
      }
  });
  
  stopsLayer.addLayer(layer);
  
  try {
      map.fitBounds(layer.getBounds(), { 
          padding: [20, 20],
          maxZoom: 15
      });
  } catch (e) {
      console.warn('Could not fit bounds:', e);
  }
}

function renderRoutesGeoJSON(geojson) {
  const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];
  let colorIndex = 0;
  
  const layer = L.geoJSON(geojson, {
      style: (feature) => ({
          color: colors[colorIndex++ % colors.length],
          weight: 4,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round'
      }),
      onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.number) {
              layer.bindPopup(`
                  <div style="font-family: Inter, sans-serif;">
                      <h3 style="color: var(--accent-primary); margin-bottom: 0.5rem;">Service ${feature.properties.number}</h3>
                      <p style="color: var(--text-secondary); font-size: 0.875rem;">Bus Route</p>
                  </div>
              `);
          }
      }
  });
  
  routesLayer.addLayer(layer);
  
  try {
      map.fitBounds(layer.getBounds(), { 
          padding: [20, 20],
          maxZoom: 15
      });
  } catch (e) {
      console.warn('Could not fit bounds:', e);
  }
}

// Event listeners
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
      stopsLayer.clearLayers();
      showNotification('Loading bus stops...', 'info');
      
      const { data } = await fetchJSON(url);
      renderStopsGeoJSON(data);
      
      const count = data.features ? data.features.length : 0;
      showNotification(`Loaded ${count} bus stops`, 'success');
  } catch (e) {
      showNotification(`Failed to load stops: ${e.message}`, 'error');
      console.error('Load stops error:', e);
  }
});

$("loadRoutes").addEventListener('click', async () => {
  const service = $("service").value.trim();
  const params = new URLSearchParams();
  
  if (service) params.set('service', service);
  params.set('format', 'geojson');
  
  const url = `/api/bus-routes?${params.toString()}`;
  
  try {
      routesLayer.clearLayers();
      showNotification('Loading bus routes...', 'info');
      
      const { data } = await fetchJSON(url);
      renderRoutesGeoJSON(data);
      
      const count = data.features ? data.features.length : 0;
      showNotification(`Loaded ${count} bus routes`, 'success');
  } catch (e) {
      showNotification(`Failed to load routes: ${e.message}`, 'error');
      console.error('Load routes error:', e);
  }
});

$("clear").addEventListener('click', () => {
  clearLayers();
  showNotification('Map cleared', 'info');
});

$("fetchArrivals").addEventListener('click', async () => {
  const stop = $("arrStop").value.trim();
  const svc = $("arrService").value.trim();
  
  if (!stop) {
      showNotification('Please enter a bus stop code', 'error');
      return;
  }
  
  const params = new URLSearchParams();
  params.set('busStopCode', stop);
  if (svc) params.set('serviceNo', svc);
  
  const url = `/api/arrivals?${params.toString()}`;
  const arrivalsContainer = $("arrivals");
  
  showLoading(arrivalsContainer, 'Fetching arrivals...');
  
  try {
      const { data } = await fetchJSON(url);
      
      if (!data.arrivals || data.arrivals.length === 0) {
          arrivalsContainer.innerHTML = '<li class="arrival-item">No arrivals found</li>';
          return;
      }
      
      const list = data.arrivals.map(item => {
          const buses = (item.buses || []).map(b => {
              const time = b.minutesAway === 0 ? 'Arr' : `${b.minutesAway}m`;
              const load = b.load ? ` (${b.load})` : '';
              return `${time}${load}`;
          }).join(', ');
          
          return `
              <li class="arrival-item">
                  <div class="arrival-title">
                      <span>Service ${item.serviceNo}</span>
                      <span class="service-badge">${item.operator || 'SBS'}</span>
                  </div>
                  <div class="arrival-bus">${buses || 'No data available'}</div>
              </li>
          `;
      }).join('');
      
      arrivalsContainer.innerHTML = list;
      showNotification(`Loaded arrivals for stop ${stop}`, 'success');
  } catch (e) {
      arrivalsContainer.innerHTML = `<li class="arrival-item">Error: ${e.message}</li>`;
      showNotification(`Failed to fetch arrivals: ${e.message}`, 'error');
      console.error('Fetch arrivals error:', e);
  }
});

// Dynamic API endpoint functions
function buildApiUrl(endpoint, params) {
  const url = new URL(endpoint, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
      if (value && value.trim()) {
          url.searchParams.set(key, value.trim());
      }
  });
  return url.toString();
}

// API endpoint event listeners
$("openStopsApi").addEventListener('click', () => {
  const search = $("apiStopsSearch").value;
  const url = buildApiUrl('/api/bus-stops', {
      search: search,
      limit: '10',
      format: 'geojson'
  });
  window.open(url, '_blank');
  showNotification(`Opening bus stops API${search ? ` for "${search}"` : ''}`, 'info');
});

$("openServiceApi").addEventListener('click', () => {
  const search = $("apiServiceSearch").value;
  const url = buildApiUrl('/api/bus-services', {
      search: search
  });
  window.open(url, '_blank');
  showNotification(`Opening bus services API${search ? ` for service "${search}"` : ''}`, 'info');
});

$("openRouteApi").addEventListener('click', () => {
  const service = $("apiRouteService").value;
  const format = $("apiRouteFormat").value;
  
  if (!service || !service.trim()) {
      showNotification('Please enter a service number for routes', 'error');
      $("apiRouteService").focus();
      return;
  }
  
  const url = buildApiUrl('/api/bus-routes', {
      service: service,
      format: format
  });
  window.open(url, '_blank');
  showNotification(`Opening route API for service "${service}" in ${format.toUpperCase()} format`, 'info');
});

$("openArrivalApi").addEventListener('click', () => {
  const stopCode = $("apiArrivalStop").value;
  const service = $("apiArrivalService").value;
  
  if (!stopCode || !stopCode.trim()) {
      showNotification('Please enter a bus stop code for arrivals', 'error');
      $("apiArrivalStop").focus();
      return;
  }
  
  const url = buildApiUrl('/api/arrivals', {
      busStopCode: stopCode,
      serviceNo: service
  });
  window.open(url, '_blank');
  showNotification(`Opening arrivals API for stop "${stopCode}"${service ? ` and service "${service}"` : ''}`, 'info');
});

// Sync main controls with API endpoint inputs
function syncInputs() {
  const mainSearch = $("search").value;
  const mainService = $("service").value;
  const mainArrStop = $("arrStop").value;
  const mainArrService = $("arrService").value;
  
  // Sync from main controls to API inputs
  if (mainSearch && !$("apiStopsSearch").value) {
      $("apiStopsSearch").value = mainSearch;
  }
  if (mainService && !$("apiServiceSearch").value) {
      $("apiServiceSearch").value = mainService;
  }
  if (mainService && !$("apiRouteService").value) {
      $("apiRouteService").value = mainService;
  }
  if (mainArrStop && !$("apiArrivalStop").value) {
      $("apiArrivalStop").value = mainArrStop;
  }
  if (mainArrService && !$("apiArrivalService").value) {
      $("apiArrivalService").value = mainArrService;
  }
}

// Add sync listeners to main controls
[$("search"), $("service"), $("arrStop"), $("arrService")].forEach(input => {
  input.addEventListener('input', syncInputs);
});

// Enhanced keyboard shortcuts for API endpoints
document.addEventListener('keydown', (e) => {
  if (e.altKey) {
      switch (e.key) {
          case '1':
              e.preventDefault();
              $("openStopsApi").click();
              break;
          case '2':
              e.preventDefault();
              $("openServiceApi").click();
              break;
          case '3':
              e.preventDefault();
              $("openRouteApi").click();
              break;
          case '4':
              e.preventDefault();
              $("openArrivalApi").click();
              break;
      }
  }
});

// Health check
$("checkHealth").addEventListener('click', async () => {
  const status = $("healthStatus");
  const indicator = $("healthIndicator");
  
  status.textContent = 'Checking...';
  indicator.className = 'status-indicator';
  
  try {
      const res = await fetch('/api/health');
      const json = await res.json();
      const healthStatus = json?.data?.status || 'Unknown';
      
      status.textContent = healthStatus;
      
      if (res.ok && healthStatus === 'healthy') {
          indicator.className = 'status-indicator healthy';
          showNotification('API is healthy', 'success');
      } else {
          indicator.className = 'status-indicator error';
          showNotification('API health check failed', 'error');
      }
  } catch (e) {
      status.textContent = 'Error';
      indicator.className = 'status-indicator error';
      showNotification('Failed to check API health', 'error');
      console.error('Health check error:', e);
  }
});

// Map overlay controls
$("centerMap").addEventListener('click', () => {
  map.setView([1.3521, 103.8198], 12);
  showNotification('Map centered', 'info');
});

$("toggleFullscreen").addEventListener('click', () => {
  const mapContainer = document.querySelector('.map-container');
  
  if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().then(() => {
          showNotification('Entered fullscreen mode', 'info');
          setTimeout(() => map.invalidateSize(), 100);
      }).catch(() => {
          showNotification('Fullscreen not supported', 'error');
      });
  } else {
      document.exitFullscreen().then(() => {
          showNotification('Exited fullscreen mode', 'info');
          setTimeout(() => map.invalidateSize(), 100);
      });
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
          case 's':
              e.preventDefault();
              $("loadStops").click();
              break;
          case 'r':
              e.preventDefault();
              $("loadRoutes").click();
              break;
          case 'k':
              e.preventDefault();
              $("clear").click();
              break;
          case 'a':
              e.preventDefault();
              $("fetchArrivals").click();
              break;
      }
  }
  
  if (e.key === 'Escape') {
      clearLayers();
  }
});

// Auto-resize map on window resize
window.addEventListener('resize', () => {
  setTimeout(() => map.invalidateSize(), 100);
});

// Input field enhancements
const inputs = document.querySelectorAll('.input-field');
inputs.forEach(input => {
  input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          if (input.id === 'arrStop' || input.id === 'arrService') {
              $("fetchArrivals").click();
          } else {
              $("loadStops").click();
          }
      }
  });
});

// Initialize with some default data
document.addEventListener('DOMContentLoaded', () => {
  // Auto health check on load
  setTimeout(() => {
      $("checkHealth").click();
  }, 1000);
  
  // Add some example values
  $("search").placeholder = "Try 'Sengkang' or 'Orchard'";
  $("service").placeholder = "Try '27' or '133'";
  $("arrStop").placeholder = "Try '65011' (Sengkang Int)";
  
  // Set some example values for API endpoints
  $("apiStopsSearch").placeholder = "sengkang, orchard, etc.";
  $("apiServiceSearch").placeholder = "27, 133, 190, etc.";
  $("apiRouteService").placeholder = "27, 133, 190, etc.";
  $("apiArrivalStop").placeholder = "65011, 01012, etc.";
  $("apiArrivalService").placeholder = "27, 133 (optional)";
  
  // Initial sync
  syncInputs();
});

// Add tooltip functionality for keyboard shortcuts
function addTooltips() {
  const tooltips = [
      { element: $("openStopsApi"), text: "Alt+1: Open Stops API" },
      { element: $("openServiceApi"), text: "Alt+2: Open Services API" },
      { element: $("openRouteApi"), text: "Alt+3: Open Routes API" },
      { element: $("openArrivalApi"), text: "Alt+4: Open Arrivals API" }
  ];
  
  tooltips.forEach(({ element, text }) => {
      element.title = text;
  });
}

// Call addTooltips after DOM is loaded
document.addEventListener('DOMContentLoaded', addTooltips);

// Add custom CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
      from {
          opacity: 1;
          transform: translateY(0);
      }
      to {
          opacity: 0;
          transform: translateY(-10px);
      }
  }
  
  .custom-popup .leaflet-popup-content-wrapper {
      background: var(--bg-card) !important;
      color: var(--text-primary) !important;
      border-radius: var(--border-radius) !important;
      border: 1px solid var(--border-primary) !important;
      box-shadow: var(--shadow-md) !important;
  }
  
  .custom-popup .leaflet-popup-tip {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-primary) !important;
  }
  
  .leaflet-control-zoom a {
      background-color: var(--bg-card) !important;
      border: 1px solid var(--border-primary) !important;
      color: var(--text-primary) !important;
  }
  
  .leaflet-control-zoom a:hover {
      background-color: var(--bg-card-hover) !important;
      border-color: var(--accent-primary) !important;
  }
  
  .leaflet-control-attribution {
      background: rgba(30, 33, 57, 0.9) !important;
      color: var(--text-muted) !important;
      border-radius: 4px !important;
      border: 1px solid var(--border-primary) !important;
  }
  
  .leaflet-control-attribution a {
      color: var(--accent-secondary) !important;
  }
`;
document.head.appendChild(style);