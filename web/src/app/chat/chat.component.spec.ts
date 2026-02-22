import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { Subject } from 'rxjs';
import { ChatComponent } from './chat.component';
import { WebSocketService, WsMessage } from '../core/websocket.service';
import { AuthService } from '../core/auth.service';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let httpTesting: HttpTestingController;
  let wsMessages$: Subject<WsMessage>;
  let wsSpy: any;

  beforeEach(async () => {
    wsMessages$ = new Subject<WsMessage>();
    wsSpy = {
      connect: vi.fn(),
      joinConversation: vi.fn(),
      sendMessage: vi.fn(),
      sendTyping: vi.fn(),
      markRead: vi.fn(),
      disconnect: vi.fn(),
      messages$: wsMessages$,
      connectionStatus: vi.fn().mockReturnValue('connected'),
    };

    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: WebSocketService, useValue: wsSpy },
        {
          provide: AuthService,
          useValue: {
            currentUser: vi.fn().mockReturnValue({ id: 1, name: 'Test' }),
            getAccessToken: vi.fn().mockReturnValue('token'),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '5' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  function init() {
    fixture.detectChanges();
    // Flush conversation metadata request
    const convReq = httpTesting.expectOne('/api/v1/conversations/5');
    convReq.flush({
      id: 5, task_id: 10, poster_id: 1, tasker_id: 2,
      last_message: 'Hi', last_message_at: '2026-02-14T10:00:00Z',
      created_at: '2026-02-14T10:00:00Z', updated_at: '2026-02-14T10:00:00Z',
      poster: { id: 1, name: 'Alice' },
      tasker: { id: 2, name: 'Bob' },
      task: { id: 10, title: 'Clean room' },
    });
    // Flush messages request (server returns DESC order)
    const msgReq = httpTesting.expectOne(r => r.url === '/api/v1/conversations/5/messages');
    msgReq.flush([
      { id: 2, conversation_id: 5, sender_id: 1, content: 'World', is_read: false, created_at: '2026-02-14T10:01:00Z', updated_at: '2026-02-14T10:01:00Z' },
      { id: 1, conversation_id: 5, sender_id: 2, content: 'Hi', is_read: false, created_at: '2026-02-14T10:00:00Z', updated_at: '2026-02-14T10:00:00Z' },
    ]);
    fixture.detectChanges();
  }

  it('should create and load conversation', () => {
    init();
    expect(component).toBeTruthy();
    expect(component.conversationId()).toBe(5);
    expect(wsSpy.connect).toHaveBeenCalled();
    expect(wsSpy.joinConversation).toHaveBeenCalledWith(5);
    expect(wsSpy.markRead).toHaveBeenCalledWith(5);
  });

  it('should reverse messages to chronological order', () => {
    init();
    expect(component.messages().length).toBe(2);
    // After reversing DESC, first message should be the oldest (id=1)
    expect(component.messages()[0].content).toBe('Hi');
    expect(component.messages()[1].content).toBe('World');
  });

  it('should display task title in header', () => {
    init();
    expect(fixture.nativeElement.textContent).toContain('#10');
    expect(fixture.nativeElement.textContent).toContain('Clean room');
  });

  it('should display other user name', () => {
    init();
    expect(component.otherName()).toBe('Bob');
  });

  it('should show loading spinner before messages load', () => {
    fixture.detectChanges();
    expect(component.loading()).toBe(true);
    // Flush both requests
    httpTesting.expectOne('/api/v1/conversations/5').flush({});
    httpTesting.expectOne(r => r.url === '/api/v1/conversations/5/messages').flush([]);
  });

  it('should show empty state when no messages', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations/5').flush({});
    httpTesting.expectOne(r => r.url === '/api/v1/conversations/5/messages').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no messages yet');
  });

  it('should send message via WebSocket', () => {
    init();
    component.newMessage = 'Hello!';
    component.sendMessage();
    expect(wsSpy.sendMessage).toHaveBeenCalledWith(5, 'Hello!');
    expect(component.newMessage).toBe('');
  });

  it('should not send empty message', () => {
    init();
    component.newMessage = '   ';
    component.sendMessage();
    expect(wsSpy.sendMessage).not.toHaveBeenCalled();
  });

  it('should send typing indicator', () => {
    init();
    component.onTyping();
    expect(wsSpy.sendTyping).toHaveBeenCalledWith(5);
  });

  it('should handle incoming message via WebSocket', () => {
    init();
    wsMessages$.next({
      type: 'message',
      conversation_id: 5,
      message_id: 3,
      sender_id: 2,
      content: 'New msg',
      created_at: '2026-02-14T11:00:00Z',
    });
    expect(component.messages().length).toBe(3);
    expect(component.messages()[2].content).toBe('New msg');
  });

  it('should ignore messages for other conversations', () => {
    init();
    wsMessages$.next({
      type: 'message',
      conversation_id: 99,
      message_id: 3,
      sender_id: 2,
      content: 'Other',
    });
    expect(component.messages().length).toBe(2);
  });

  it('should show typing indicator for other user', () => {
    init();
    wsMessages$.next({ type: 'typing', conversation_id: 5, sender_id: 2 });
    expect(component.isTyping()).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('is typing');
  });

  it('should not show typing for own user', () => {
    init();
    wsMessages$.next({ type: 'typing', conversation_id: 5, sender_id: 1 });
    expect(component.isTyping()).toBe(false);
  });

  it('should show chat closed banner', () => {
    init();
    wsMessages$.next({ type: 'chat_closed', conversation_id: 5 });
    fixture.detectChanges();
    expect(component.chatClosed()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('chat closed');
  });

  it('should show live connection status', () => {
    init();
    expect(component.connectionLabel()).toBe('● live');
  });

  it('should handle message_sent type', () => {
    init();
    wsMessages$.next({
      type: 'message_sent',
      conversation_id: 5,
      message_id: 10,
      sender_id: 1,
      content: 'My msg',
    });
    expect(component.messages().length).toBe(3);
  });

  it('should handle error loading messages', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations/5').flush({});
    httpTesting.expectOne(r => r.url === '/api/v1/conversations/5/messages')
      .error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
  });

  describe('connectionLabel', () => {
    it('should return live label when connected', () => {
      wsSpy.connectionStatus.mockReturnValue('connected');
      expect(component.connectionLabel()).toContain('live');
    });

    it('should return connecting label', () => {
      wsSpy.connectionStatus.mockReturnValue('connecting');
      expect(component.connectionLabel()).toContain('connecting');
    });

    it('should return reconnecting label', () => {
      wsSpy.connectionStatus.mockReturnValue('reconnecting');
      expect(component.connectionLabel()).toContain('reconnecting');
    });

    it('should return offline label when disconnected', () => {
      wsSpy.connectionStatus.mockReturnValue('disconnected');
      expect(component.connectionLabel()).toContain('offline');
    });
  });
});
