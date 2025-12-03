import { useEffect, useRef, useState } from 'react';
import { WebSocketClient } from '../utils/websocket';

export interface UseWebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export function useWebSocket(
  wsClient: WebSocketClient | null,
  options: UseWebSocketOptions = {}
) {
  const {
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectDelay = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocketClient | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!wsClient) {
      return;
    }

    // Prevent multiple connections if already connected
    if (wsClient.isConnected()) {
      setIsConnected(true);
      return;
    }

    wsRef.current = wsClient;
    let isMounted = true;
    let connectionAttempted = false;

    const connect = async () => {
      if (!isMounted || connectionAttempted) return;
      connectionAttempted = true;
      
      try {
        await wsClient.connect();
        if (isMounted) {
          setIsConnected(true);
          onConnect?.();
        }
      } catch (error) {
        if (!isMounted) return;
        connectionAttempted = false;
        
        console.error('WebSocket connection error:', error);
        onError?.(error as Event);
        
        // Don't auto-reconnect here - let the WebSocket client handle it
        // The client's onclose handler will handle reconnection
      }
    };

    // Listen for all messages
    const messageHandler = (data: any) => {
      setLastMessage(data);
    };

    wsClient.on('alert', messageHandler);
    wsClient.on('frame', messageHandler);
    wsClient.on('detection', messageHandler);
    wsClient.on('dashboard_update', messageHandler);
    wsClient.on('pong', messageHandler);

    // Small delay to prevent rapid connection attempts
    const timeoutId = setTimeout(() => {
      connect();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      wsClient.off('alert', messageHandler);
      wsClient.off('frame', messageHandler);
      wsClient.off('detection', messageHandler);
      wsClient.off('dashboard_update', messageHandler);
      wsClient.off('pong', messageHandler);
      
      // Don't disconnect here - let the WebSocket client handle its own lifecycle
      // Disconnecting here causes the connect/disconnect loop
      setIsConnected(false);
    };
    // Only depend on wsClient, not the callback functions to prevent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsClient]);

  const sendMessage = (data: any) => {
    if (wsRef.current?.isConnected()) {
      wsRef.current.send(data);
    }
  };

  const subscribe = (event: string, callback: (data: any) => void) => {
    wsRef.current?.on(event, callback);
  };

  const unsubscribe = (event: string, callback: (data: any) => void) => {
    wsRef.current?.off(event, callback);
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
  };
}

