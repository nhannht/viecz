import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConversationListComponent } from './conversation-list.component';
import { Conversation } from '../core/models';

const mockConversations: Conversation[] = [
  {
    id: 1, task_id: 10, poster_id: 1, tasker_id: 2,
    last_message_at: '2026-02-14T14:30:00Z', last_message: 'Hello!',
    created_at: '2026-02-14T10:00:00Z', updated_at: '2026-02-14T14:30:00Z',
  },
  {
    id: 2, task_id: 20, poster_id: 1, tasker_id: 3,
    last_message_at: undefined as any, last_message: '',
    created_at: '2026-02-14T11:00:00Z', updated_at: '2026-02-14T11:00:00Z',
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
    expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
  });

  it('should display conversations after load', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush(mockConversations);
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.conversations().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Task #10');
    expect(fixture.nativeElement.textContent).toContain('Hello!');
  });

  it('should show empty state when no conversations', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No conversations yet');
  });

  it('should show "No messages yet" for conversation with empty last_message', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/v1/conversations').flush([mockConversations[1]]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No messages yet');
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
});
