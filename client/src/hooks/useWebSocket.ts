import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export type WebSocketEventType = 
  | 'connected'
  | 'notification'
  | 'call_update'
  | 'call_new'
  | 'call_ended'
  | 'contact_update'
  | 'contact_new'
  | 'contact_deleted'
  | 'sms_new'
  | 'sms_update'
  | 'voicemail_new'
  | 'agent_status'
  | 'conversation_update'
  | 'system'
  | 'pong';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: any;
  message?: string;
  timestamp: string;
}

type MessageHandler = (message: WebSocketMessage) => void;

interface UseWebSocketOptions {
  onMessage?: MessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

const globalHandlers = new Map<WebSocketEventType, Set<MessageHandler>>();
let globalSocket: WebSocket | null = null;
let isConnecting = false;

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { 
    onMessage, 
    onConnect, 
    onDisconnect, 
    autoReconnect = true,
    reconnectInterval = 3000 
  } = options;
  
  const { user } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isConnected, setIsConnected] = useState(globalSocket?.readyState === WebSocket.OPEN);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    globalSocket?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'
  );

  const subscribe = useCallback((eventType: WebSocketEventType, handler: MessageHandler) => {
    if (!globalHandlers.has(eventType)) {
      globalHandlers.set(eventType, new Set());
    }
    globalHandlers.get(eventType)!.add(handler);

    return () => {
      globalHandlers.get(eventType)?.delete(handler);
    };
  }, []);

  const connect = useCallback(() => {
    if (globalSocket?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }

    isConnecting = true;
    setConnectionStatus('connecting');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      globalSocket = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnecting = false;
        setIsConnected(true);
        setConnectionStatus('connected');
        
        if (user) {
          ws.send(JSON.stringify({
            type: 'auth',
            userId: user.id,
            organizationId: '88872271-d973-49c5-a3bd-6d4fc18c60f2'
          }));
        }
        
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
        
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          onMessage?.(message);
          
          const handlers = globalHandlers.get(message.type);
          handlers?.forEach(handler => {
            try {
              handler(message);
            } catch (e) {
              console.error('Error in WebSocket handler:', e);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        isConnecting = false;
        globalSocket = null;
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        onDisconnect?.();
        
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting = false;
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      isConnecting = false;
      setConnectionStatus('disconnected');
    }
  }, [user, onConnect, onDisconnect, onMessage, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (globalSocket) {
      globalSocket.close();
      globalSocket = null;
    }
  }, []);

  const send = useCallback((data: any) => {
    if (globalSocket?.readyState === WebSocket.OPEN) {
      globalSocket.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    if (!globalSocket || globalSocket.readyState === WebSocket.CLOSED) {
      connect();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  useEffect(() => {
    if (globalSocket?.readyState === WebSocket.OPEN && user) {
      globalSocket.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
        organizationId: '88872271-d973-49c5-a3bd-6d4fc18c60f2'
      }));
    }
  }, [user]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    send,
    subscribe
  };
}

export function useWebSocketEvent(
  eventType: WebSocketEventType | WebSocketEventType[],
  handler: MessageHandler,
  deps: any[] = []
) {
  const { subscribe } = useWebSocket();
  
  useEffect(() => {
    const eventTypes = Array.isArray(eventType) ? eventType : [eventType];
    const unsubscribes = eventTypes.map(type => subscribe(type, handler));
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [eventType, subscribe, ...deps]);
}
