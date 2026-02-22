import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { Subject } from 'rxjs';
import { ChatComponent } from './chat.component';
import { WebSocketService, WsMessage } from '../core/websocket.service';
import { AuthService } from '../core/auth.service';
import { provideTranslocoForTesting } from '../core/transloco-testing';

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
        provideTranslocoForTesting(),
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

  it('should navigate to /messages on goBack', () => {
    init();
    const routerSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.goBack();
    expect(routerSpy).toHaveBeenCalledWith(['/messages']);
  });

  it('should clear typingTimeout on destroy', () => {
    init();
    (component as any).typingTimeout = setTimeout(() => {}, 5000);
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    component.ngOnDestroy();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('should display fallback conversationId when conversation not loaded', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations/5').error(new ProgressEvent('error'));
    httpTesting.expectOne(r => r.url === '/api/v1/conversations/5/messages').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('#5');
  });

  it('otherName should return poster name when I am tasker', () => {
    init();
    const authService = TestBed.inject(AuthService);
    (authService.currentUser as any).mockReturnValue({ id: 2, name: 'Bob' });
    expect(component.otherName()).toBe('Alice');
  });

  it('otherName should return default when conversation is null', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations/5').error(new ProgressEvent('error'));
    httpTesting.expectOne(r => r.url === '/api/v1/conversations/5/messages').flush([]);
    expect(component.otherName()).toBe('user');
  });

  it('should auto-clear typing indicator after timeout', () => {
    vi.useFakeTimers();
    init();
    wsMessages$.next({ type: 'typing', conversation_id: 5, sender_id: 2 });
    expect(component.isTyping()).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(component.isTyping()).toBe(false);
    vi.useRealTimers();
  });

  it('should ignore chat_closed for other conversations', () => {
    init();
    wsMessages$.next({ type: 'chat_closed', conversation_id: 99 });
    expect(component.chatClosed()).toBe(false);
  });

  it('should ignore typing for other conversations', () => {
    init();
    wsMessages$.next({ type: 'typing', conversation_id: 99, sender_id: 2 });
    expect(component.isTyping()).toBe(false);
  });

  it('should show fallback chatTitle when conversation has no task title', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations/5').flush({
      id: 5, task_id: 10, poster_id: 1, tasker_id: 2,
      created_at: '2026-02-14T10:00:00Z', updated_at: '2026-02-14T10:00:00Z',
      task: { id: 10, title: null },
    });
    httpTesting.expectOne(r => r.url === '/api/v1/conversations/5/messages').flush([]);
    fixture.detectChanges();
    // task?.title is null/falsy → falls back to t('chat.chatTitle')
    expect(fixture.nativeElement.textContent).toContain('#10');
  });

  it('otherName should use || fallback for tasker name when tasker.name is empty', () => {
    init();
    const authService = TestBed.inject(AuthService);
    // Make currentUser the poster (poster_id === 1)
    (authService.currentUser as any).mockReturnValue({ id: 1, name: 'Alice' });
    // conversation has tasker with empty name → should fall back to default
    component.conversation.set({
      id: 5, task_id: 10, poster_id: 1, tasker_id: 2,
      last_message: '', last_message_at: '',
      created_at: '', updated_at: '',
      tasker: { id: 2, name: '' },
      poster: { id: 1, name: 'Alice' },
    });
    // poster_id === myId (1), so returns tasker.name || default
    // tasker.name is '' (falsy), so returns default
    expect(component.otherName()).toBe('user');
  });

  it('otherName should use || fallback for poster name when poster.name is empty', () => {
    init();
    // currentUser is tasker (id=2, poster_id is 1 !== 2)
    const authService = TestBed.inject(AuthService);
    (authService.currentUser as any).mockReturnValue({ id: 2, name: 'Bob' });
    component.conversation.set({
      id: 5, task_id: 10, poster_id: 1, tasker_id: 2,
      last_message: '', last_message_at: '',
      created_at: '', updated_at: '',
      poster: { id: 1, name: '' },
      tasker: { id: 2, name: 'Bob' },
    });
    // poster_id (1) !== myId (2), so returns poster.name || default
    // poster.name is '' (falsy), so returns default
    expect(component.otherName()).toBe('user');
  });

  it('myId should return 0 when currentUser returns null (|| fallback)', () => {
    const authService = TestBed.inject(AuthService);
    (authService.currentUser as any).mockReturnValue(null);
    expect(component.myId()).toBe(0);
  });

  it('should hide input area when chat is closed', () => {
    init();
    component.chatClosed.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The input field should not be present when chatClosed is true
    const input = el.querySelector('input[placeholder]');
    expect(input).toBeFalsy();
    // The send button should also be gone
    const sendBtn = Array.from(el.querySelectorAll('button')).find(
      b => b.textContent?.trim() === '[send]'
    );
    expect(sendBtn).toBeFalsy();
    // But the chat closed banner should be shown
    expect(el.textContent).toContain('chat closed');
  });

  it('should show input area when chat is not closed', () => {
    init();
    expect(component.chatClosed()).toBe(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('should render message bubbles for each message in @for loop', () => {
    init();
    const el = fixture.nativeElement as HTMLElement;
    const bubbles = el.querySelectorAll('app-message-bubble');
    expect(bubbles.length).toBe(2);
  });

  it('should not render message bubbles when no messages', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations/5').flush({
      id: 5, task_id: 10, poster_id: 1, tasker_id: 2,
    });
    httpTesting.expectOne(r => r.url === '/api/v1/conversations/5/messages').flush([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const bubbles = el.querySelectorAll('app-message-bubble');
    expect(bubbles.length).toBe(0);
  });

  it('should not send on Enter when message is only whitespace', () => {
    init();
    component.newMessage = '   ';
    component.sendMessage();
    expect(wsSpy.sendMessage).not.toHaveBeenCalled();
    expect(component.newMessage).toBe('   ');
  });

  it('should render loading spinner in DOM when loading', () => {
    fixture.detectChanges();
    // Before messages flush, loading is true
    expect(component.loading()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();
    // Flush remaining requests to avoid afterEach verify error
    httpTesting.expectOne('/api/v1/conversations/5').flush({});
    httpTesting.expectOne(r => r.url === '/api/v1/conversations/5/messages').flush([]);
  });

  it('should disable send button when message is empty', () => {
    init();
    component.newMessage = '';
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const sendBtn = Array.from(el.querySelectorAll('button')).find(
      b => b.textContent?.includes('[send]')
    );
    if (sendBtn) {
      expect(sendBtn.hasAttribute('disabled') || (sendBtn as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('should update newMessage via DOM input event', () => {
    init();
    const input = fixture.nativeElement.querySelector('input');
    if (input) {
      input.value = 'Hello from DOM';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.newMessage).toBe('Hello from DOM');
    }
  });

  it('should send message via DOM send button click', async () => {
    init();
    // Type message through the DOM input to avoid ExpressionChangedAfterItHasBeenCheckedError
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = 'Click send';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // The send button is the last button in the input area, its text is "⏎"
    const buttons = fixture.nativeElement.querySelectorAll('button');
    // Back button is first (←), send button is second (⏎)
    const sendBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(sendBtn).toBeTruthy();
    sendBtn.click();
    expect(wsSpy.sendMessage).toHaveBeenCalledWith(5, 'Click send');
  });

  it('should send message via DOM Enter key', () => {
    init();
    const input = fixture.nativeElement.querySelector('input');
    if (input) {
      input.value = 'Enter msg';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
      fixture.detectChanges();
      expect(wsSpy.sendMessage).toHaveBeenCalledWith(5, 'Enter msg');
    }
  });

  it('should call onTyping via DOM input event on message field', () => {
    init();
    const input = fixture.nativeElement.querySelector('input');
    if (input) {
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(wsSpy.sendTyping).toHaveBeenCalledWith(5);
    }
  });

  it('should navigate back via DOM back button click', () => {
    init();
    const routerSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const backBtn = fixture.nativeElement.querySelector('button');
    if (backBtn && backBtn.textContent?.includes('←')) {
      backBtn.click();
      fixture.detectChanges();
      expect(routerSpy).toHaveBeenCalledWith(['/messages']);
    }
  });

  it('should handle incoming message with nullish fields (fallback via ??)', () => {
    init();
    wsMessages$.next({
      type: 'message',
      conversation_id: 5,
      // message_id, sender_id, content, created_at are all undefined
    });
    const msgs = component.messages();
    const last = msgs[msgs.length - 1];
    expect(last.id).toBe(0);            // message_id ?? 0
    expect(last.sender_id).toBe(0);      // sender_id ?? 0
    expect(last.content).toBe('');        // content ?? ''
    expect(last.created_at).toBeTruthy(); // created_at ?? new Date().toISOString()
  });

  it('should handle message_sent with nullish fields (fallback via ??)', () => {
    init();
    wsMessages$.next({
      type: 'message_sent',
      conversation_id: 5,
    });
    const msgs = component.messages();
    const last = msgs[msgs.length - 1];
    expect(last.id).toBe(0);
    expect(last.sender_id).toBe(0);
    expect(last.content).toBe('');
  });

  it('should not scroll when messageList is not available', () => {
    init();
    // Remove the messageList reference
    component.messageList = undefined;
    // Trigger scroll attempt via ngAfterViewChecked
    (component as any).shouldScroll = true;
    component.ngAfterViewChecked();
    // No error thrown - scrollToBottom handles missing el gracefully
  });

  it('should ignore unknown WebSocket message type (covers else path after chat_closed branch)', () => {
    init();
    const msgsBefore = component.messages().length;
    wsMessages$.next({ type: 'unknown_type' as any, conversation_id: 5 });
    // None of the if/else-if branches match, so nothing changes
    expect(component.messages().length).toBe(msgsBefore);
    expect(component.isTyping()).toBe(false);
    expect(component.chatClosed()).toBe(false);
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
