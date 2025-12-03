import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { createAlertWebSocket } from '../utils/websocket';
import { Message } from 'primereact/message';

/**
 * Example component showing how to use WebSocket for real-time alerts
 * You can integrate this into your Alerts page or Dashboard
 */
export default function WebSocketExample() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [wsClient] = useState(() => createAlertWebSocket());
  
  const { isConnected, lastMessage, sendMessage } = useWebSocket(wsClient, {
    onConnect: () => {
      console.log('WebSocket connected');
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    },
  });

  useEffect(() => {
    if (lastMessage?.type === 'alert') {
      setAlerts((prev) => [lastMessage.data, ...prev].slice(0, 10)); // Keep last 10 alerts
    }
  }, [lastMessage]);

  // Send ping every 30 seconds to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <Message
          severity={isConnected ? 'success' : 'warn'}
          text={isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
        />
      </div>

      <h3 className="text-xl font-bold mb-4">Real-time Alerts</h3>
      
      {alerts.length === 0 ? (
        <p className="text-gray-500">No alerts received yet...</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <p className="font-semibold">{alert.message || 'Alert'}</p>
              {alert.timestamp && (
                <p className="text-sm text-gray-500">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

