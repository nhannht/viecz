import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { NhannhtMetroChatBubbleComponent } from './nhannht-metro-chat-bubble.component';
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
  imports: [NhannhtMetroChatBubbleComponent],
  template: `<nhannht-metro-chat-bubble [message]="msg()" [isMine]="mine()" />`,
})
class TestHostComponent {
  msg = signal(mockMessage);
  mine = signal(true);
}

describe('NhannhtMetroChatBubbleComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideTranslocoForTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display message content', () => {
    expect(fixture.nativeElement.textContent).toContain('Hello there!');
  });

  it('should right-align mine messages', () => {
    const outer = fixture.nativeElement.querySelector('.flex');
    expect(outer.classList.contains('justify-end')).toBe(true);
  });

  it('should left-align other messages', () => {
    host.mine.set(false);
    fixture.detectChanges();
    const outer = fixture.nativeElement.querySelector('.flex');
    expect(outer.classList.contains('justify-start')).toBe(true);
  });

  it('should apply dark background for mine messages', () => {
    const bubble = fixture.nativeElement.querySelector('.max-w-\\[70\\%\\]');
    expect(bubble.className).toContain('bg-fg');
  });

  it('should apply light background for other messages', () => {
    host.mine.set(false);
    fixture.detectChanges();
    const bubble = fixture.nativeElement.querySelector('.max-w-\\[70\\%\\]');
    expect(bubble.className).toContain('bg-card');
  });

  it('should show read receipt icon when isMine and is_read', () => {
    host.msg.set({ ...mockMessage, is_read: true });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
    expect(icon).toBeTruthy();
  });

  it('should NOT show read receipt when not is_read', () => {
    host.msg.set({ ...mockMessage, is_read: false });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
    expect(icon).toBeNull();
  });

  it('should NOT show read receipt when not isMine', () => {
    host.mine.set(false);
    host.msg.set({ ...mockMessage, is_read: true });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('nhannht-metro-icon');
    expect(icon).toBeNull();
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle isMine from true to false (changes alignment classes)', () => {
      let outer = fixture.nativeElement.querySelector('.flex');
      expect(outer.classList.contains('justify-end')).toBe(true);

      host.mine.set(false);
      fixture.detectChanges();
      outer = fixture.nativeElement.querySelector('.flex');
      expect(outer.classList.contains('justify-start')).toBe(true);
      expect(outer.classList.contains('justify-end')).toBe(false);
    });

    it('should toggle isMine from false to true (changes alignment back)', () => {
      host.mine.set(false);
      fixture.detectChanges();
      let outer = fixture.nativeElement.querySelector('.flex');
      expect(outer.classList.contains('justify-start')).toBe(true);

      host.mine.set(true);
      fixture.detectChanges();
      outer = fixture.nativeElement.querySelector('.flex');
      expect(outer.classList.contains('justify-end')).toBe(true);
    });

    it('should toggle read receipt from hidden to shown (is_read: false -> true with isMine)', () => {
      // isMine=true, is_read=false: no icon
      host.msg.set({ ...mockMessage, is_read: false });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-icon')).toBeNull();

      // is_read=true: icon appears
      host.msg.set({ ...mockMessage, is_read: true });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-icon')).toBeTruthy();
    });

    it('should toggle read receipt from shown to hidden (is_read: true -> false)', () => {
      host.msg.set({ ...mockMessage, is_read: true });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-icon')).toBeTruthy();

      host.msg.set({ ...mockMessage, is_read: false });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-icon')).toBeNull();
    });
  });
});
