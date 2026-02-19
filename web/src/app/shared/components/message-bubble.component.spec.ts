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
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

@Component({
  standalone: true,
  imports: [MessageBubbleComponent],
  template: `<app-message-bubble [message]="msg()" [isMine]="mine()" />`,
})
class TestHostComponent {
  msg = signal(mockMessage);
  mine = signal(true);
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

  it('should apply mine class when isMine is true', () => {
    const bubble = fixture.nativeElement.querySelector('.msg-bubble');
    expect(bubble.classList.contains('mine')).toBe(true);
    expect(bubble.classList.contains('theirs')).toBe(false);
  });

  it('should apply theirs class when isMine is false', () => {
    host.mine.set(false);
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('.msg-bubble');
    expect(bubble.classList.contains('theirs')).toBe(true);
    expect(bubble.classList.contains('mine')).toBe(false);
  });

  it('should show read icon when message is read and mine', () => {
    host.msg.set({ ...mockMessage, is_read: true });
    host.mine.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.read-icon')).toBeTruthy();
  });

  it('should not show read icon when message is not read', () => {
    host.msg.set({ ...mockMessage, is_read: false });
    host.mine.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.read-icon')).toBeFalsy();
  });

  it('should not show read icon for others messages even if read', () => {
    host.msg.set({ ...mockMessage, is_read: true });
    host.mine.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.read-icon')).toBeFalsy();
  });

  it('should display time', () => {
    const timeEl = fixture.nativeElement.querySelector('.msg-time');
    expect(timeEl.textContent.trim()).toBeTruthy();
  });
});
