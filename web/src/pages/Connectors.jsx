import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Terminal,
  Zap,
  X,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

// Use localhost for dev, production URL for prod
const API_URL = 'http://localhost:4000';
export default function Connectors() {
  const { getToken } = useAuth();
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [cdcEvents, setCdcEvents] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const wsRef = useRef(null);
  const [liveEvents, setLiveEvents] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    type: 'postgres_cdc',
    host: '',
    port: '5432',
    database: '',
    user: '',
    password: '',
    ssl: false,
  });

  // Create apiCall function with auth
  const apiCall = async (endpoint, method = 'GET', body = null) => {
    const token = await getToken();
    const url = `${API_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  };

  useEffect(() => {
    fetchConnectors();
  }, []);

  useEffect(() => {
    setupWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const setupWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.MODE === 'production' 
      ? 'dataflow-api-production-7b08.up.railway.app'
      : 'localhost:4000';
    const wsUrl = `${protocol}//${wsHost}/ws/cdc`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[CDC] WebSocket connected');
      connectors.forEach(conn => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          connectorId: conn.id,
        }));
      });
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'cdc_change') {
        const { connectorId, data } = message;

        setLiveEvents(prev => ({
          ...prev,
          [connectorId]: [data, ...(prev[connectorId] || [])].slice(0, 10),
        }));

        notifyNewEvent(connectorId, data);
      }
    };

    ws.onerror = (error) => {
      console.error('[CDC] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[CDC] WebSocket disconnected');
      // setTimeout(setupWebSocket, 3000); // Disabled in dev
    };

    wsRef.current = ws;
  };

  const notifyNewEvent = (connectorId, event) => {
    const conn = connectors.find(c => c.id === connectorId);
    if (conn && window.Notification?.permission === 'granted') {
      new Notification('CDC Event Captured', {
        body: `${event.operation} on ${event.schema}.${event.table}`,
        tag: `cdc-${connectorId}`,
      });
    }
  };

  const fetchConnectors = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/api/connectors/list', 'GET');
      setConnectors(data);
    } catch (error) {
      console.error('Failed to fetch connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnector = async (e) => {
    e.preventDefault();
    setTestResult(null);

    try {
      const response = await apiCall('/api/connectors/create-public', 'POST', {
        name: formData.name,
        type: formData.type,
        config: {
          host: formData.host,
          port: parseInt(formData.port),
          database: formData.database,
          user: formData.user,
          password: formData.password,
          ssl: formData.ssl,
        },
      });

      setTestResult({ success: true, message: response.message });
      setFormData({
        name: '',
        type: 'postgres_cdc',
        host: '',
        port: '5432',
        database: '',
        user: '',
        password: '',
        ssl: false,
      });

      fetchConnectors();
      setTimeout(() => setShowCreateModal(false), 1500);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    }
  };

  const handleTestConnection = async (e) => {
    e.preventDefault();
    setTestResult(null);

    try {
      const response = await apiCall('/api/connectors/test-public', 'POST', {
        type: formData.type,
        config: {
          host: formData.host,
          port: parseInt(formData.port),
          database: formData.database,
          user: formData.user,
          password: formData.password,
          ssl: formData.ssl,
        },
      });

      setTestResult(response);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    }
  };

  const handleStartCDC = async (connectorId) => {
    try {
      await apiCall(`/api/connectors/${connectorId}/start`, 'POST');
      fetchConnectors();

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          connectorId,
        }));
      }
    } catch (error) {
      console.error('Failed to start CDC:', error);
    }
  };

  const handleStopCDC = async (connectorId) => {
    try {
      await apiCall(`/api/connectors/${connectorId}/stop`, 'POST');
      fetchConnectors();
    } catch (error) {
      console.error('Failed to stop CDC:', error);
    }
  };

  const handleDeleteConnector = async (connectorId) => {
    if (!window.confirm('Are you sure you want to delete this connector?')) return;

    try {
      await apiCall(`/api/connectors/${connectorId}`, 'DELETE');
      fetchConnectors();
      setLiveEvents(prev => {
        const updated = { ...prev };
        delete updated[connectorId];
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete connector:', error);
    }
  };

  const handleViewEvents = async (connector) => {
    try {
      setSelectedConnector(connector);
      const data = await apiCall(`/api/connectors/${connector.id}/events`, 'GET');
      setCdcEvents(data);
      setShowEventsModal(true);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Zap className="w-8 h-8 text-cyan-400" />
              CDC Connectors
            </h1>
            <p className="text-gray-400">
              Real-time change capture from PostgreSQL databases
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-5 h-5" />
            New Connector
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Loading connectors...</p>
          </div>
        ) : connectors.length === 0 ? (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-12 text-center">
            <Terminal className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No connectors yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition"
            >
              Create your first connector
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {connectors.map(connector => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                liveEvents={liveEvents[connector.id] || []}
                onStart={() => handleStartCDC(connector.id)}
                onStop={() => handleStopCDC(connector.id)}
                onDelete={() => handleDeleteConnector(connector.id)}
                onViewEvents={() => handleViewEvents(connector)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateConnectorModal
          onClose={() => {
            setShowCreateModal(false);
            setTestResult(null);
          }}
          formData={formData}
          setFormData={setFormData}
          testResult={testResult}
          onTest={handleTestConnection}
          onCreate={handleCreateConnector}
        />
      )}

      {showEventsModal && (
        <EventsModal
          connector={selectedConnector}
          events={cdcEvents}
          onClose={() => setShowEventsModal(false)}
        />
      )}
    </div>
  );
}

function ConnectorCard({
  connector,
  liveEvents,
  onStart,
  onStop,
  onDelete,
  onViewEvents,
}) {
  const isActive = connector.status === 'active';
  const isError = connector.status === 'error';

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">{connector.name}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="px-3 py-1 bg-gray-700 rounded">
              {connector.type === 'postgres_cdc' ? 'PostgreSQL' : connector.type}
            </span>
            {isActive && (
              <span className="flex items-center gap-1 text-cyan-400">
                <Activity className="w-4 h-4 animate-pulse" />
                Streaming
              </span>
            )}
            {isError && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-4 h-4" />
                Error
              </span>
            )}
            {!isActive && !isError && (
              <span className="flex items-center gap-1 text-gray-400">
                <Clock className="w-4 h-4" />
                Inactive
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive ? (
            <button
              onClick={onStop}
              className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition"
              title="Stop CDC"
            >
              <Pause className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onStart}
              className="p-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded transition"
              title="Start CDC"
            >
              <Play className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onViewEvents}
            className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition"
            title="View events"
          >
            <Eye className="w-5 h-5" />
          </button>

          <button
            onClick={onDelete}
            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition"
            title="Delete connector"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-700">
        <div>
          <p className="text-xs text-gray-500 mb-1">Events Captured</p>
          <p className="text-lg font-semibold text-cyan-400">
            {connector.eventsCaptured || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <p className="text-sm text-white">{connector.status}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Last Synced</p>
          <p className="text-sm text-white">
            {connector.lastSyncedAt
              ? new Date(connector.lastSyncedAt).toLocaleTimeString()
              : 'Never'}
          </p>
        </div>
      </div>

      {liveEvents.length > 0 && (
        <div className="bg-gray-900/50 rounded p-3 max-h-48 overflow-y-auto">
          <p className="text-xs text-gray-400 mb-2 font-mono">LIVE EVENTS</p>
          {liveEvents.map((event, idx) => (
            <div key={idx} className="text-xs font-mono text-green-400 mb-1 truncate">
              <span className="text-cyan-400">{event.operation}</span>
              {' '}
              <span className="text-gray-500">{event.schema}.{event.table}</span>
            </div>
          ))}
        </div>
      )}

      {isError && connector.errorMessage && (
        <div className="bg-red-900/20 border border-red-700 rounded p-3 mt-3">
          <p className="text-xs text-red-400">Error: {connector.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

function CreateConnectorModal({
  onClose,
  formData,
  setFormData,
  testResult,
  onTest,
  onCreate,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Create Connector</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Connector Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Postgres DB"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="postgres_cdc">PostgreSQL CDC</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Host
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={e => setFormData({ ...formData, host: e.target.value })}
                placeholder="localhost"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Port
              </label>
              <input
                type="number"
                value={formData.port}
                onChange={e => setFormData({ ...formData, port: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Database
            </label>
            <input
              type="text"
              value={formData.database}
              onChange={e => setFormData({ ...formData, database: e.target.value })}
              placeholder="postgres"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              User
            </label>
            <input
              type="text"
              value={formData.user}
              onChange={e => setFormData({ ...formData, user: e.target.value })}
              placeholder="postgres"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={formData.ssl}
              onChange={e => setFormData({ ...formData, ssl: e.target.checked })}
              className="rounded"
            />
            Use SSL
          </label>

          {testResult && (
            <div
              className={`p-3 rounded text-sm ${
                testResult.success
                  ? 'bg-green-900/20 border border-green-700 text-green-400'
                  : 'bg-red-900/20 border border-red-700 text-red-400'
              }`}
            >
              {testResult.success ? (
                <div>
                  <p className="font-semibold mb-1">✓ Connection successful</p>
                  <p className="text-xs">{testResult.wal_level}</p>
                </div>
              ) : (
                <p>{testResult.error || testResult.message}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onTest}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition"
            >
              Test Connection
            </button>
            <button
              type="submit"
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded transition"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EventsModal({ connector, events, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            CDC Events - {connector.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {events.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No events captured yet</p>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div
                  key={event.id}
                  className="bg-gray-900/50 border border-gray-700 rounded p-4 font-mono text-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        event.operation === 'INSERT'
                          ? 'bg-green-900/50 text-green-400'
                          : event.operation === 'UPDATE'
                            ? 'bg-blue-900/50 text-blue-400'
                            : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {event.operation}
                    </span>
                    <span className="text-gray-400">
                      {event.schema_name}.{event.table_name}
                    </span>
                    <span className="text-gray-600 ml-auto text-xs">
                      LSN: {event.lsn}
                    </span>
                  </div>

                  {event.before_data && (
                    <div className="text-gray-400 mb-2">
                      Before: {JSON.stringify(JSON.parse(event.before_data), null, 2)}
                    </div>
                  )}

                  {event.after_data && (
                    <div className="text-green-400">
                      After: {JSON.stringify(JSON.parse(event.after_data), null, 2)}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(event.captured_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
