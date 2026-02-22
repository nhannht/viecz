import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { MessageBubbleComponent } from './message-bubble.component';
import { Message } from '../../core/models';
import { provideTranslocoForTesting } from '../../core/transloco-testing';

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
      providers: [provideTranslocoForTesting()],
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

  it('should show sender.name from message when senderName is empty and not mine', () => {
    host.mine.set(false);
    host.sender.set('');
    host.msg.set({ ...mockMessage, sender: { id: 5, name: 'Alice' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Alice>');
  });

  it('should show default "user" when senderName is empty and no sender on message', () => {
    host.mine.set(false);
    host.sender.set('');
    host.msg.set({ ...mockMessage, sender: undefined });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('user>');
  });

  it('should toggle isMine from true to false (destroys "you" label block)', () => {
    expect(fixture.nativeElement.textContent).toContain('you>');

    host.mine.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Bob>');
    expect(fixture.nativeElement.textContent).not.toContain('you>');
  });

  it('should toggle isMine from false to true (destroys sender label block)', () => {
    host.mine.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Bob>');

    host.mine.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('you>');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle opacity class when isMine changes from true to false', () => {
      const div = fixture.nativeElement.querySelector('app-message-bubble div');
      expect(div.classList.contains('opacity-70')).toBe(false);

      host.mine.set(false);
      fixture.detectChanges();
      const divAfter = fixture.nativeElement.querySelector('app-message-bubble div');
      expect(divAfter.classList.contains('opacity-70')).toBe(true);
    });

    it('should toggle opacity class when isMine changes from false to true', () => {
      host.mine.set(false);
      fixture.detectChanges();
      const div = fixture.nativeElement.querySelector('app-message-bubble div');
      expect(div.classList.contains('opacity-70')).toBe(true);

      host.mine.set(true);
      fixture.detectChanges();
      const divAfter = fixture.nativeElement.querySelector('app-message-bubble div');
      expect(divAfter.classList.contains('opacity-70')).toBe(false);
    });

    it('should update senderLabel when senderName changes', () => {
      host.mine.set(false);
      host.sender.set('Charlie');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Charlie>');

      host.sender.set('Diana');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Diana>');
    });

    it('should update time display when message created_at changes', () => {
      host.msg.set({ ...mockMessage, created_at: '2026-02-14T09:00:00Z' });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toMatch(/\[\d{2}:\d{2}\]/);
    });

    it('should update message content when message changes', () => {
      host.msg.set({ ...mockMessage, content: 'Updated content' });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Updated content');
    });
  });
});
