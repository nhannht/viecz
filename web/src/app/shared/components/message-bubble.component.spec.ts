import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { MessageBubbleComponent } from './message-bubble.component';
import { Message } from '../../core/models';

const mockMessage: Message = {
  id: 1,
  conversation_id: 1,
  sender_id: 1,
  content: 'Hello there!',
  is_read: false,
  created_at: '2026-02-14T14:02:00Z',
  updated_at: '2026-02-14T14:02:00Z',
};

@Component({
  standalone: true,
  imports: [MessageBubbleComponent],
  template: `<app-message-bubble [message]="msg()" [isMine]="mine()" [senderName]="sender()" />`,
})
class TestHostComponent {
  msg = signal(mockMessage);
  mine = signal(true);
  sender = signal('Bob');
}

describe('MessageBubbleComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.nativeElement.querySelector('app-message-bubble')).toBeTruthy();
  });

  it('should display message content', () => {
    expect(fixture.nativeElement.textContent).toContain('Hello there!');
  });

  it('should show "you>" label when isMine is true', () => {
    expect(fixture.nativeElement.textContent).toContain('you>');
  });

  it('should show sender name when isMine is false', () => {
    host.mine.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Bob>');
  });

  it('should display time in HH:MM format', () => {
    // The time will be locale-dependent, but should contain digits and colon
    const text = fixture.nativeElement.textContent;
    expect(text).toMatch(/\[\d{2}:\d{2}\]/);
  });

  it('should apply reduced opacity for other user messages', () => {
    host.mine.set(false);
    fixture.detectChanges();
    const div = fixture.nativeElement.querySelector('app-message-bubble div');
    expect(div.classList.contains('opacity-70')).toBe(true);
  });

  it('should not apply reduced opacity for own messages', () => {
    const div = fixture.nativeElement.querySelector('app-message-bubble div');
    expect(div.classList.contains('opacity-70')).toBe(false);
  });
});
