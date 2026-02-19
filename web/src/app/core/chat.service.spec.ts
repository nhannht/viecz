import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { Conversation, Message } from './models';

const mockConversation: Conversation = {
  id: 1,
  task_id: 10,
  poster_id: 1,
  tasker_id: 2,
  last_message_at: '2026-02-14T14:30:00Z',
  last_message: 'Hello!',
  created_at: '2026-02-14T10:00:00Z',
  updated_at: '2026-02-14T14:30:00Z',
};

const mockMessage: Message = {
  id: 1,
  conversation_id: 1,
  sender_id: 1,
  content: 'Hello!',
  is_read: false,
  created_at: '2026-02-14T14:00:00Z',
  updated_at: '2026-02-14T14:00:00Z',
};

describe('ChatService', () => {
  let service: ChatService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listConversations', () => {
    it('should fetch conversations via GET', () => {
      service.listConversations().subscribe();
      const req = httpTesting.expectOne('/api/v1/conversations');
      expect(req.request.method).toBe('GET');
      req.flush([mockConversation]);
    });

    it('should return conversations array', () => {
      const spy = vi.fn();
      service.listConversations().subscribe(spy);
      httpTesting.expectOne('/api/v1/conversations').flush([mockConversation]);
      expect(spy).toHaveBeenCalledWith([mockConversation]);
    });
  });

  describe('createConversation', () => {
    it('should POST to create conversation', () => {
      service.createConversation(10, 2).subscribe();
      const req = httpTesting.expectOne('/api/v1/conversations');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ task_id: 10, tasker_id: 2 });
      req.flush(mockConversation);
    });

    it('should return created conversation', () => {
      const spy = vi.fn();
      service.createConversation(10, 2).subscribe(spy);
      httpTesting.expectOne('/api/v1/conversations').flush(mockConversation);
      expect(spy).toHaveBeenCalledWith(mockConversation);
    });
  });

  describe('getMessages', () => {
    it('should fetch messages with default params', () => {
      service.getMessages(1).subscribe();
      const req = httpTesting.expectOne(r => r.url === '/api/v1/conversations/1/messages');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('50');
      expect(req.request.params.get('offset')).toBe('0');
      req.flush([mockMessage]);
    });

    it('should fetch messages with custom params', () => {
      service.getMessages(1, 20, 10).subscribe();
      const req = httpTesting.expectOne(r => r.url === '/api/v1/conversations/1/messages');
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('offset')).toBe('10');
      req.flush([mockMessage]);
    });

    it('should return messages array', () => {
      const spy = vi.fn();
      service.getMessages(1).subscribe(spy);
      httpTesting.expectOne(r => r.url === '/api/v1/conversations/1/messages').flush([mockMessage]);
      expect(spy).toHaveBeenCalledWith([mockMessage]);
    });
  });
});
