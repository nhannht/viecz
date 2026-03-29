import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { ConversationListComponent } from './conversation-list.component';
import { AuthService } from '../core/auth.service';
import { Conversation } from '../core/models';
import { provideTranslocoForTesting } from '../core/transloco-testing';

const mockConversations: Conversation[] = [
  {
    id: 1, task_id: 10, poster_id: 1, tasker_id: 2,
    last_message_at: '2026-02-14T14:30:00Z', last_message: 'Hello!',
    created_at: '2026-02-14T10:00:00Z', updated_at: '2026-02-14T14:30:00Z',
    poster: { id: 1, name: 'Alice' },
    tasker: { id: 2, name: 'Bob' },
    task: { id: 10, title: 'Clean my room' },
  },
  {
    id: 2, task_id: 20, poster_id: 1, tasker_id: 3,
    last_message_at: undefined as any, last_message: '',
    created_at: '2026-02-14T11:00:00Z', updated_at: '2026-02-14T11:00:00Z',
    poster: { id: 1, name: 'Alice' },
    tasker: { id: 3, name: 'Charlie' },
    task: { id: 20, title: 'Deliver groceries' },
  },
];

describe('ConversationListComponent', () => {
  let component: ConversationListComponent;
  let fixture: ComponentFixture<ConversationListComponent>;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConversationListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConversationListComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
    expect(component).toBeTruthy();
  });

  it('should show loading spinner initially', () => {
    fixture.detectChanges();
    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
  });

  it('should display conversations with task titles after load', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.conversations().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('#10');
    expect(fixture.nativeElement.textContent).toContain('Clean my room');
  });

  it('should show empty state when no conversations', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No conversations yet');
  });

  it('should show no messages indicator for empty conversation', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([mockConversations[1]]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no messages yet');
  });

  it('should navigate to conversation on click', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    fixture.detectChanges();

    component.openConversation(mockConversations[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/messages', 1]);
  });

  it('should handle error gracefully', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.conversations().length).toBe(0);
  });

  it('should show terminal-style header', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('> MESSAGES');
  });

  it('should set error state on load error', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(component.error()).toBe(true);
  });

  it('retryLoad should clear error and reload', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(component.error()).toBe(true);

    component.retryLoad();
    expect(component.error()).toBe(false);
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    expect(component.conversations().length).toBe(2);
  });

  it('goToMarketplace should navigate to /', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
    component.goToMarketplace();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('getLastMessageLabel should include other name and message', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    const label = component.getLastMessageLabel(mockConversations[0]);
    // Current user has no ID, so poster_id !== myId → returns poster name
    expect(label).toContain('Alice');
    expect(label).toContain('Hello!');
  });

  it('getOtherName should return poster name when current user is tasker', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    // Default user from HttpClient is not set, so poster_id !== myId → returns poster name
    const name = component.getOtherName(mockConversations[0]);
    expect(name).toBe('Alice');
  });

  it('should show error fallback when error is true', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();
  });

  it('should render divider between conversations but not after last', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // Two conversations, one divider between them
    const dividers = el.querySelectorAll('.border-t.border-border.mx-3');
    expect(dividers.length).toBe(1);
  });

  it('should not render divider when only one conversation', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([mockConversations[0]]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const dividers = el.querySelectorAll('.border-t.border-border.mx-3');
    expect(dividers.length).toBe(0);
  });

  it('should render conversation buttons with task ids', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(el.textContent).toContain('#10');
    expect(el.textContent).toContain('#20');
  });

  it('should not render loading spinner after load completes', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeFalsy();
  });

  it('should not show error fallback or empty state when conversations exist', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-error-fallback')).toBeFalsy();
    expect(el.querySelector('app-empty-state')).toBeFalsy();
  });

  it('should show empty state component in DOM when no conversations', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should display last message with other name prefix', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // mockConversations[0] has last_message 'Hello!' - should show with name prefix
    expect(el.textContent).toContain('Hello!');
  });

  it('getOtherName should return tasker name when current user is poster (poster_id === myId)', () => {
    // Override AuthService so currentUser().id matches poster_id (1)
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ConversationListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ id: 1, name: 'Alice' }),
            getAccessToken: () => 'token',
          },
        },
      ],
    });
    const f = TestBed.createComponent(ConversationListComponent);
    const h = TestBed.inject(HttpTestingController);
    f.detectChanges();
    h.expectOne('/api/v1/conversations').flush(mockConversations);
    const c = f.componentInstance;
    // poster_id === myId (1), so returns tasker name 'Bob'
    expect(c.getOtherName(mockConversations[0])).toBe('Bob');
    h.verify();
  });

  it('getOtherName should return default when tasker name is missing and user is poster', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ConversationListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ id: 1, name: 'Alice' }),
            getAccessToken: () => 'token',
          },
        },
      ],
    });
    const f = TestBed.createComponent(ConversationListComponent);
    const h = TestBed.inject(HttpTestingController);
    f.detectChanges();
    h.expectOne('/api/v1/conversations').flush([]);
    const c = f.componentInstance;
    // Conversation where poster_id matches myId but tasker has no name
    const convNoTaskerName: Conversation = {
      ...mockConversations[0],
      tasker: { id: 2, name: '' },
    };
    // tasker.name is falsy (''), falls through to default
    expect(c.getOtherName(convNoTaskerName)).toBe('user');
    h.verify();
  });

  it('getOtherName should return default when poster name is missing and user is tasker', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
    // Conversation where poster has no name and user is NOT poster
    const convNoPosterName: Conversation = {
      ...mockConversations[0],
      poster: { id: 1, name: '' },
    };
    // poster.name is falsy (''), falls through to default
    expect(component.getOtherName(convNoPosterName)).toBe('user');
  });

  it('should show untitled task fallback when conversation has no task title (|| fallback branch)', () => {
    const convNoTitle: Conversation = {
      id: 3, task_id: 30, poster_id: 1, tasker_id: 2,
      last_message: 'Hello', last_message_at: '2026-02-14T10:00:00Z',
      created_at: '2026-02-14T10:00:00Z', updated_at: '2026-02-14T10:00:00Z',
      poster: { id: 1, name: 'Alice' },
      tasker: { id: 2, name: 'Bob' },
      task: { id: 30, title: '' },
    };
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([convNoTitle]);
    fixture.detectChanges();
    // task?.title is '' (falsy), falls back to t('conversationList.untitledTask')
    expect(fixture.nativeElement.textContent).toContain('Untitled task');
  });

  it('getLastMessageLabel should return noMessagesYet when last_message is empty (covers if !conv.last_message branch)', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
    const convNoMsg: Conversation = {
      ...mockConversations[0],
      last_message: '',
    };
    const label = component.getLastMessageLabel(convNoMsg);
    expect(label).toContain('no messages yet');
  });

  it('should render all four states: loading → error → empty → list (covers all template branches)', () => {
    // 1. loading state
    fixture.detectChanges();
    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.querySelector('viecz-spinner')).toBeTruthy();

    // Flush with error to reach error state
    httpTesting.expectOne('/api/v1/conversations').error(new ProgressEvent('error'));
    fixture.detectChanges();

    // 2. error state
    expect(component.error()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-error-fallback')).toBeTruthy();

    // 3. Retry → empty state
    component.retryLoad();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
    fixture.detectChanges();
    expect(component.conversations().length).toBe(0);
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();

    // 4. Retry → list state
    component.retryLoad();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    fixture.detectChanges();
    expect(component.conversations().length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('button').length).toBeGreaterThan(0);
  });
});
