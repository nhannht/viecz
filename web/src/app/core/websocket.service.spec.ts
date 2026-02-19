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
    onmessage: ((ev: MessageEvent) => void) | null;
    onclose: (() => void) | null;
    onerror: (() => void) | null;
  };
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    authSpy = { getAccessToken: vi.fn().mockReturnValue('test-token') };
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // WebSocket.OPEN
      onmessage: null,
      onclose: null,
      onerror: null,
    };

    // Save original and replace with a constructor function
    originalWebSocket = globalThis.WebSocket;
    (globalThis as any).WebSocket = function MockWebSocket() {
      return mockWs;
    } as any;
    // Preserve OPEN constant
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
    globalThis.WebSocket = originalWebSocket;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('connect', () => {
    it('should create WebSocket when token exists', () => {
      service.connect();
      // Should have set up handlers (proves ws was created)
      expect(mockWs.onmessage).toBeTruthy();
    });

    it('should not connect when no token', () => {
      authSpy.getAccessToken.mockReturnValue(null);
      service.connect();
      // onmessage not set = no WebSocket created
      expect(mockWs.onmessage).toBeNull();
    });

    it('should not create duplicate connections', () => {
      service.connect();
      const firstOnmessage = mockWs.onmessage;
      service.connect();
      // Should still be the same handler (not re-created)
      expect(mockWs.onmessage).toBe(firstOnmessage);
    });

    it('should emit messages on onmessage', () => {
      service.connect();
      const receivedMessages: WsMessage[] = [];
      service.messages$.subscribe((msg) => receivedMessages.push(msg));

      mockWs.onmessage!(new MessageEvent('message', {
        data: JSON.stringify({ type: 'message', content: 'hello' }),
      }));

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].content).toBe('hello');
    });

    it('should handle invalid JSON gracefully', () => {
      service.connect();
      const receivedMessages: WsMessage[] = [];
      service.messages$.subscribe((msg) => receivedMessages.push(msg));

      // Should not throw
      mockWs.onmessage!(new MessageEvent('message', { data: 'invalid-json' }));

      expect(receivedMessages.length).toBe(0);
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
      // Don't connect first
      service.send({ type: 'message' });
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('should not send when socket is not OPEN', () => {
      service.connect();
      mockWs.readyState = 3; // CLOSED
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
    it('should close websocket', () => {
      service.connect();
      service.disconnect();

      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', () => {
      // Should not throw
      service.disconnect();
    });
  });
});
