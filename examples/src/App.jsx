import React, { useState } from 'react';
import BusMap from './BusMap';
import BusTracker from './BusTracker';
import RouteVisualization from './RouteVisualization';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [selectedService, setSelectedService] = useState('27');
  const [selectedStop, setSelectedStop] = useState('65011');

  return (
    <div className="App">
      <header>
        <h1>Singapore Bus Tracker</h1>
        <nav>
          <button 
            onClick={() => setActiveTab('map')}
            className={activeTab === 'map' ? 'active' : ''}
          >
            Bus Map
          </button>
          <button 
            onClick={() => setActiveTab('tracker')}
            className={activeTab === 'tracker' ? 'active' : ''}
          >
            Bus Tracker
          </button>
          <button 
            onClick={() => setActiveTab('route')}
            className={activeTab === 'route' ? 'active' : ''}
          >
            Route Visualization
          </button>
        </nav>
        
        {activeTab !== 'map' && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div>
              <label>Bus Service: </label>
              <input 
                type="text" 
                value={selectedService} 
                onChange={(e) => setSelectedService(e.target.value)}
                placeholder="Enter bus service number"
                style={{ marginLeft: '5px' }}
              />
            </div>
            {activeTab === 'tracker' && (
              <div>
                <label>Bus Stop Code: </label>
                <input 
                  type="text" 
                  value={selectedStop} 
                  onChange={(e) => setSelectedStop(e.target.value)}
                  placeholder="Enter bus stop code"
                  style={{ marginLeft: '5px' }}
                />
                <small style={{ marginLeft: '5px', color: '#666' }}>
                  (e.g., 65011 for Sengkang Int)
                </small>
              </div>
            )}
          </div>
        )}
      </header>

      <main>
        {activeTab === 'map' && <BusMap />}
        {activeTab === 'tracker' && (
          <BusTracker 
            serviceNumber={selectedService}
            busStopCode={selectedStop}
            refreshInterval={30000}
            showRoute={true}
          />
        )}
        {activeTab === 'route' && (
          <RouteVisualization 
            serviceNumber={selectedService}
            showStops={true}
            showPatternLabels={true}
          />
        )}
      </main>
    </div>
  );
}

export default App; 