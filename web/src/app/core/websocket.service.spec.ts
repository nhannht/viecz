import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { WebSocketService, WsMessage } from './websocket.service';
import { AuthService } from './auth.service';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let authSpy: { getAccessToken: ReturnType<typeof vi.fn> };
  let mockWs: {
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    readyState: number;
    onopen: ((ev: Event) => void) | null;
    onmessage: ((ev: MessageEvent) => void) | null;
    onclose: (() => void) | null;
    onerror: (() => void) | null;
  };
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    authSpy = { getAccessToken: vi.fn().mockReturnValue('test-token') };
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    };

    originalWebSocket = globalThis.WebSocket;
    (globalThis as any).WebSocket = function MockWebSocket() {
      return mockWs;
    } as any;
    (globalThis.WebSocket as any).OPEN = 1;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });

    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.WebSocket = originalWebSocket;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with disconnected status', () => {
    expect(service.connectionStatus()).toBe('disconnected');
  });

  describe('connect', () => {
    it('should create WebSocket when token exists', () => {
      service.connect();
      expect(mockWs.onmessage).toBeTruthy();
    });

    it('should set status to connecting', () => {
      service.connect();
      expect(service.connectionStatus()).toBe('connecting');
    });

    it('should set status to connected on open', () => {
      service.connect();
      mockWs.onopen!(new Event('open'));
      expect(service.connectionStatus()).toBe('connected');
    });

    it('should not connect when no token', () => {
      authSpy.getAccessToken.mockReturnValue(null);
      service.connect();
      expect(mockWs.onmessage).toBeNull();
    });

    it('should not create duplicate connections', () => {
      service.connect();
      const firstOnmessage = mockWs.onmessage;
      service.connect();
      expect(mockWs.onmessage).toBe(firstOnmessage);
    });

    it('should emit messages on onmessage', () => {
      service.connect();
      const received: WsMessage[] = [];
      service.messages$.subscribe((msg) => received.push(msg));

      mockWs.onmessage!(new MessageEvent('message', {
        data: JSON.stringify({ type: 'message', content: 'hello' }),
      }));

      expect(received.length).toBe(1);
      expect(received[0].content).toBe('hello');
    });

    it('should handle invalid JSON gracefully', () => {
      service.connect();
      const received: WsMessage[] = [];
      service.messages$.subscribe((msg) => received.push(msg));
      mockWs.onmessage!(new MessageEvent('message', { data: 'invalid-json' }));
      expect(received.length).toBe(0);
    });

    it('should reconnect with exponential backoff on close', () => {
      service.connect();
      mockWs.onopen!(new Event('open'));

      // Reset mock for reconnect
      mockWs.onmessage = null;
      mockWs.onclose!();

      expect(service.connectionStatus()).toBe('reconnecting');

      // After 1s (2^0 * 1000), should reconnect
      vi.advanceTimersByTime(1000);
      expect(mockWs.onmessage).toBeTruthy();
    });

    it('should increase backoff delay on subsequent retries', () => {
      service.connect();
      mockWs.onclose!();

      // First retry at 1s
      mockWs.onmessage = null;
      vi.advanceTimersByTime(1000);
      expect(mockWs.onmessage).toBeTruthy();

      // Second close
      mockWs.onmessage = null;
      mockWs.onclose!();

      // Should NOT reconnect at 1s (needs 2s)
      vi.advanceTimersByTime(1500);
      expect(mockWs.onmessage).toBeNull();

      vi.advanceTimersByTime(600);
      expect(mockWs.onmessage).toBeTruthy();
    });

    it('should stop retrying after max retries', () => {
      service.connect();

      for (let i = 0; i < 5; i++) {
        mockWs.onmessage = null;
        mockWs.onclose!();
        vi.advanceTimersByTime(60000);
      }

      // 6th close should NOT schedule reconnect
      mockWs.onmessage = null;
      mockWs.onclose!();
      vi.advanceTimersByTime(60000);
      expect(service.connectionStatus()).toBe('disconnected');
    });

    it('should reset retry count on successful connection', () => {
      service.connect();
      mockWs.onclose!();
      vi.advanceTimersByTime(1000);
      mockWs.onopen!(new Event('open'));
      expect(service.connectionStatus()).toBe('connected');
    });
  });

  describe('send', () => {
    it('should send JSON when connected', () => {
      service.connect();
      const msg: WsMessage = { type: 'message', conversation_id: 1, content: 'hello' };
      service.send(msg);
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(msg));
    });

    it('should not send when not connected', () => {
      service.send({ type: 'message' });
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('should not send when socket is not OPEN', () => {
      service.connect();
      mockWs.readyState = 3;
      service.send({ type: 'message' });
      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('joinConversation', () => {
    it('should send join message', () => {
      service.connect();
      service.joinConversation(42);
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'join', conversation_id: 42 }),
      );
    });
  });

  describe('sendMessage', () => {
    it('should send message to conversation', () => {
      service.connect();
      service.sendMessage(1, 'Hello!');
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'message', conversation_id: 1, content: 'Hello!' }),
      );
    });
  });

  describe('sendTyping', () => {
    it('should send typing indicator', () => {
      service.connect();
      service.sendTyping(5);
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'typing', conversation_id: 5 }),
      );
    });
  });

  describe('markRead', () => {
    it('should send read message', () => {
      service.connect();
      service.markRead(3);
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'read', conversation_id: 3 }),
      );
    });
  });

  describe('disconnect', () => {
    it('should close websocket and set disconnected', () => {
      service.connect();
      service.disconnect();
      expect(mockWs.close).toHaveBeenCalled();
      expect(service.connectionStatus()).toBe('disconnected');
    });

    it('should handle disconnect when not connected', () => {
      service.disconnect();
      expect(service.connectionStatus()).toBe('disconnected');
    });

    it('should cancel pending reconnect timer', () => {
      service.connect();
      mockWs.onclose!();
      // Reconnect scheduled, now disconnect
      service.disconnect();
      vi.advanceTimersByTime(60000);
      // Should not have attempted reconnect
      expect(service.connectionStatus()).toBe('disconnected');
    });
  });

  describe('onerror', () => {
    it('should close ws on error', () => {
      service.connect();
      mockWs.onerror!();
      expect(mockWs.close).toHaveBeenCalled();
    });
  });
});
