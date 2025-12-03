/**
 * WebSocket utility for connecting to Django Channels
 */

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimeout: number | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private isConnecting = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      // If already connecting, wait for that connection
      if (this.isConnecting) {
        // Wait a bit and check again
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve();
          } else {
            reject(new Error('Connection already in progress'));
          }
        }, 100);
        return;
      }

      // Close existing connection if in closing/closed state
      if (this.ws && (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED)) {
        this.ws = null;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected:', this.url);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          console.error('WebSocket URL:', this.url);
          this.isConnecting = false;
          // Don't reject immediately, let onclose handle it
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed', event.code, event.reason || 'No reason');
          this.isConnecting = false;
          
          // Only attempt reconnect if it wasn't a normal closure (code 1000)
          // and if we haven't exceeded max attempts
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            // Add delay before reconnecting to prevent spam
            setTimeout(() => {
              this.attemptReconnect();
            }, 1000);
          } else if (event.code === 1000) {
            // Normal closure, reset reconnect attempts
            this.reconnectAttempts = 0;
          }
          
          // Reject the promise if connection failed
          if (event.code !== 1000) {
            reject(new Error(`WebSocket closed with code ${event.code}`));
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    // Don't reconnect if already connecting or connected
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      // Double-check we're not already connected before reconnecting
      if (this.ws?.readyState !== WebSocket.OPEN && !this.isConnecting) {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, this.reconnectDelay);
  }

  private handleMessage(data: any): void {
    const type = data.type || 'message';
    const listeners = this.listeners.get(type) || [];
    
    listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in WebSocket listener:', error);
      }
    });
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not open. Message not sent:', data);
    }
  }

  disconnect(): void {
    // Clear any pending reconnect attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Prevent reconnection when manually disconnecting
    this.reconnectAttempts = this.maxReconnectAttempts;
    
    if (this.ws) {
      // Use code 1000 for normal closure to prevent auto-reconnect
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Helper functions for specific WebSocket connections
export const createAlertWebSocket = (): WebSocketClient => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = '8000'; // Django default port
  return new WebSocketClient(`${protocol}//${host}:${port}/ws/alerts/`);
};

export const createCameraWebSocket = (cameraId: string | number): WebSocketClient => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = '8000';
  return new WebSocketClient(`${protocol}//${host}:${port}/ws/camera/${cameraId}/`);
};

export const createDashboardWebSocket = (): WebSocketClient => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = '8000';
  return new WebSocketClient(`${protocol}//${host}:${port}/ws/dashboard/`);
};

