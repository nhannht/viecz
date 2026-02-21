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

  it('should apply self-end class when isMine is true', () => {
    const bubble = fixture.nativeElement.querySelector('app-message-bubble div');
    expect(bubble.classList.contains('self-end')).toBe(true);
  });

  it('should apply self-start class when isMine is false', () => {
    host.mine.set(false);
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('app-message-bubble div');
    expect(bubble.classList.contains('self-start')).toBe(true);
  });

  it('should show read icon when message is read and mine', () => {
    host.msg.set({ ...mockMessage, is_read: true });
    host.mine.set(true);
    fixture.detectChanges();
    const icons = fixture.nativeElement.querySelectorAll('nhannht-metro-icon');
    const readIcon = Array.from(icons).find((i: any) => i.textContent?.includes('done_all'));
    expect(readIcon).toBeTruthy();
  });

  it('should not show read icon when message is not read', () => {
    host.msg.set({ ...mockMessage, is_read: false });
    host.mine.set(true);
    fixture.detectChanges();
    const icons = fixture.nativeElement.querySelectorAll('nhannht-metro-icon');
    const readIcon = Array.from(icons).find((i: any) => i.textContent?.includes('done_all'));
    expect(readIcon).toBeFalsy();
  });

  it('should not show read icon for others messages even if read', () => {
    host.msg.set({ ...mockMessage, is_read: true });
    host.mine.set(false);
    fixture.detectChanges();
    const icons = fixture.nativeElement.querySelectorAll('nhannht-metro-icon');
    const readIcon = Array.from(icons).find((i: any) => i.textContent?.includes('done_all'));
    expect(readIcon).toBeFalsy();
  });

  it('should display time', () => {
    expect(fixture.nativeElement.textContent.trim()).toBeTruthy();
  });
});
