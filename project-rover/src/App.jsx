// App.js
import React, { useState, useEffect } from 'react';

// --- Map Imports ---
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';

// --- Icon Imports ---
import {
  MapPinIcon,
  HomeModernIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';
import {
  ClockIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'; // <-- NEW: Outline icons for stats

// --- Custom Leaflet Icons (Unchanged) ---
const blueIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const depotIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'depot-marker',
});
const routeColors = ['#1d4ed8', '#be185d', '#ca8a04', '#16a34a'];

// --- Routing Machine Component (Unchanged) ---
const RoutingMachine = ({ waypoints, color }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const leafletWaypoints = waypoints.map(wp => L.latLng(wp[0], wp[1]));
    const routingControl = L.Routing.control({
      waypoints: leafletWaypoints,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
      }),
      createMarker: () => null,
      show: false,
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: false,
      lineOptions: {
        styles: [{ color: color, opacity: 0.8, weight: 6 }],
      },
    }).addTo(map);
    return () => map.removeControl(routingControl);
  }, [map, waypoints, color]);
  return null;
};

// --- Main App Component ---
export default function App() {
  const [locations, setLocations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [indexRoutes, setIndexRoutes] = useState([]);
  const [routeStats, setRouteStats] = useState([]); // <-- NEW: Holds time/distance
  const [mode, setMode] = useState('normal');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoutes = async (apiMode) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:8000/get_data?mode=${apiMode}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Set state with fallbacks
      setLocations(data.locations || []);
      setRoutes(data.routes || []);
      setIndexRoutes(data.index_routes || []);
      setRouteStats(data.route_stats || []); // <-- NEW: Set the stats
      
      setMode(apiMode);
    } catch (e) {
      console.error('Failed to fetch routes:', e);
      setError('Failed to connect to backend. Is it running on port 8000?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes('normal');
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
      {/* Left Control Panel */}
      <div className="flex w-1/3 flex-col border-r border-gray-200 bg-white p-6 shadow-lg z-10">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          AI Dynamic Routing Dashboard
        </h1>

        {/* Action Buttons (Unchanged) */}
        <div className="mb-8 space-y-3">
          <button
            onClick={() => fetchRoutes('normal')}
            disabled={isLoading}
            className={`w-full rounded-md px-5 py-3 text-lg font-semibold text-white shadow-md transition-all ${
              mode === 'normal' && !isLoading
                ? 'bg-indigo-700 hover:bg-indigo-800'
                : 'bg-indigo-400'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Show Normal Route
          </button>
          <button
            onClick={() => fetchRoutes('traffic')}
            disabled={isLoading}
            className={`w-full rounded-md px-5 py-3 text-lg font-semibold shadow-sm transition-all ${
              mode === 'traffic' && !isLoading
                ? 'bg-red-700 hover:bg-red-800 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Simulate Traffic Jam
          </button>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto pr-2">
          {/* Stop List (Unchanged) */}
          <h2 className="mb-3 text-xl font-semibold text-gray-800">
            Delivery Stops
          </h2>
          <div className="mb-6 space-y-2">
            {locations.map((loc, index) => (
              <div
                key={index}
                className="flex items-center rounded-md bg-gray-50 p-3"
              >
                {index === 0 ? (
                  <HomeModernIcon className="mr-3 h-6 w-6 flex-shrink-0 text-indigo-700" />
                ) : (
                  <MapPinIcon className="mr-3 h-6 w-6 flex-shrink-0 text-red-500" />
                )}
                <div className="flex-1">
                  <span className="font-bold text-gray-800">
                    {index === 0 ? 'Depot' : `Stop ${index}`}
                  </span>
                  <p className="text-sm text-gray-600">
                    {loc[0].toFixed(4)}, {loc[1].toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Vehicle Routes Section */}
          <h2 className="mb-3 text-xl font-semibold text-gray-800">
            Vehicle Routes
          </h2>
          <div className="space-y-3">
            {indexRoutes.map((route, vIndex) => (
              <RouteDisplay
                key={vIndex}
                vehicleIndex={vIndex}
                routeIndices={route}
                color={routeColors[vIndex % routeColors.length]}
                stats={routeStats[vIndex]} // <-- NEW: Pass the stats object
              />
            ))}
          </div>
        </div>

        {/* Legend (Unchanged) */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h3 className="mb-3 text-base font-semibold text-gray-800">Legend</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <HomeModernIcon className="mr-2 h-5 w-5 text-indigo-700" /> Depot
            </li>
            <li className="flex items-center">
              <MapPinIcon className="mr-2 h-5 w-5 text-red-500" /> Delivery Stop
            </li>
            {routes.map((route, index) => (
              <li key={index} className="flex items-center">
                <TruckIcon className="mr-2 h-5 w-5" style={{ color: routeColors[index % routeColors.length] }} />
                Vehicle {index + 1} Route
                <span
                  className="ml-2 h-2 w-8"
                  style={{ backgroundColor: routeColors[index % routeColors.length] }}
                ></span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Map View (Unchanged) */}
      <div className="flex-1 relative">
        {isLoading && <LoadingOverlay />}
        {!isLoading && error && <ErrorOverlay error={error} />}
        <MapComponent
          locations={locations}
          routes={routes}
          routeColors={routeColors}
        />
      </div>
    </div>
  );
}

// --- Helper function to format the route text (Unchanged) ---
function formatRouteText(routeIndices) {
  return routeIndices
    .map(index => (index === 0 ? 'Depot' : `Stop ${index}`))
    .join(' → ');
}

// --- UPDATED: Component to display a single vehicle's route ---
function RouteDisplay({ vehicleIndex, routeIndices, color, stats }) {
  const routeText = formatRouteText(routeIndices);

  return (
    <div className="rounded-md border-l-4 p-4 shadow-sm bg-white" style={{ borderColor: color }}>
      <div className="flex items-center mb-2">
        <TruckIcon className="mr-3 h-6 w-6 flex-shrink-0" style={{ color: color }} />
        <h3 className="text-lg font-bold" style={{ color: color }}>
          Vehicle {vehicleIndex + 1}
        </h3>
      </div>
      
      {/* --- NEW STATS SECTION --- */}
      {stats && (
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center text-gray-700">
            <ClockIcon className="mr-1.5 h-5 w-5 text-gray-500" />
            <strong>Time:</strong>
            <span className="ml-1">{stats.time} min</span>
          </div>
          <div className="flex items-center text-gray-700">
            <ArrowsRightLeftIcon className="mr-1.5 h-5 w-5 text-gray-500" />
            <strong>Distance:</strong>
            <span className="ml-1">{stats.distance} km</span>
          </div>
        </div>
      )}
      {/* --- END: NEW STATS SECTION --- */}

      <p className="text-sm text-gray-800 font-medium">
        {routeText}
      </p>
    </div>
  );
}


// --- Map Component (Unchanged) ---
function MapComponent({ locations, routes, routeColors }) {
  const mapCenter = [40.7128, -74.0060];
  return (
    <MapContainer center={mapCenter} zoom={12} className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      <ChangeView bounds={locations} />
      {locations.map((loc, index) => (
        <Marker
          key={index}
          position={loc}
          icon={index === 0 ? depotIcon : blueIcon}
        >
          <Popup>
            <b>{index === 0 ? 'Depot' : `Stop ${index}`}</b>
            <br />
            {loc[0].toFixed(4)}, {loc[1].toFixed(4)}
          </Popup>
        </Marker>
      ))}
      {routes.map((route, index) => (
        <RoutingMachine
          key={index}
          waypoints={route}
          color={routeColors[index % routeColors.length]}
        />
      ))}
    </MapContainer>
  );
}

// --- Helper Components (All Unchanged) ---
function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

function LoadingOverlay() {
  return (
    <div className="absolute top-0 left-0 h-full w-full bg-black bg-opacity-50 z-[1000] flex items-center justify-center">
      <div className="text-center text-white">
        <ArrowPathIcon className="h-16 w-16 animate-spin mx-auto" />
        <h2 className="mt-4 text-2xl font-bold">Calculating optimal routes...</h2>
        <p className="mt-2 text-lg">Communicating with backend...</p>
      </div>
    </div>
  );
}

function ErrorOverlay({ error }) {
  return (
    <div className="absolute top-0 left-0 h-full w-full bg-red-800 bg-opacity-70 z-[1000] flex items-center justify-center p-8">
      <div className="text-center text-white">
        <ExclamationTriangleIcon className="h-16 w-16 text-yellow-300 mx-auto" />
        <h2 className="mt-4 text-2xl font-bold">Connection Error</h2>
        <p className="mt-2 text-lg">{error}</p>
        <p className="mt-4 text-sm">Please ensure the Python backend is running with `uvicorn app:app --reload --port 8000`</p>
      </div>
    </div>
  );
}