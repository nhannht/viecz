import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Conversation, Message } from './models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);

  listConversations() {
    return this.http.get<Conversation[]>('/api/v1/conversations');
  }

  createConversation(taskId: number, taskerId: number) {
    return this.http.post<Conversation>('/api/v1/conversations', {
      task_id: taskId,
      tasker_id: taskerId,
    });
  }

  getConversation(id: number) {
    return this.http.get<Conversation>(`/api/v1/conversations/${id}`);
  }

  getMessages(conversationId: number, limit = 50, offset = 0) {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<Message[]>(`/api/v1/conversations/${conversationId}/messages`, { params });
  }
}
