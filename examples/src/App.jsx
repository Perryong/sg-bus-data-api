import React, { useState } from 'react';
import BusMap from './BusMap';
import BusTracker from './BusTracker';
import RouteVisualization from './RouteVisualization';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [selectedService, setSelectedService] = useState('27');

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
          <div style={{ marginTop: '10px' }}>
            <label>Bus Service: </label>
            <input 
              type="text" 
              value={selectedService} 
              onChange={(e) => setSelectedService(e.target.value)}
              placeholder="Enter bus service number"
            />
          </div>
        )}
      </header>

      <main>
        {activeTab === 'map' && <BusMap />}
        {activeTab === 'tracker' && (
          <BusTracker 
            serviceNumber={selectedService}
            refreshInterval={30000}
            showCongestion={true}
            showRoute={false}
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