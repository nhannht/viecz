import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { NhannhtMetroMenuComponent } from './nhannht-metro-menu.component';

@Component({
  standalone: true,
  imports: [NhannhtMetroMenuComponent],
  template: `
    <div class="wrapper">
      <nhannht-metro-menu [open]="open()" (closed)="closedCount = closedCount + 1">
        <button class="nhannht-metro-menu-item">Item 1</button>
        <button class="nhannht-metro-menu-item">Item 2</button>
      </nhannht-metro-menu>
    </div>
  `,
})
class TestHostComponent {
  open = signal(false);
  closedCount = 0;
}

describe('NhannhtMetroMenuComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not render menu content when closed', () => {
    expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();
  });

  it('should render menu content when open', () => {
    host.open.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Item 1');
  });

  it('should emit closed on click outside when open', () => {
    host.open.set(true);
    fixture.detectChanges();
    document.body.click();
    expect(host.closedCount).toBe(1);
  });

  it('should NOT emit closed on click outside when closed', () => {
    host.open.set(false);
    fixture.detectChanges();
    document.body.click();
    expect(host.closedCount).toBe(0);
  });

  it('should NOT emit closed on click inside menu', () => {
    host.open.set(true);
    fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('nhannht-metro-menu');
    menu.click();
    expect(host.closedCount).toBe(0);
  });

  it('should emit closed on Escape key when open', () => {
    host.open.set(true);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.closedCount).toBe(1);
  });

  it('should NOT emit closed on Escape key when closed', () => {
    host.open.set(false);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.closedCount).toBe(0);
  });

  describe('template conditional toggles', () => {
    it('should toggle open from false to true (creates menu block)', () => {
      expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();

      host.open.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeTruthy();
    });

    it('should toggle open from true to false (destroys menu block)', () => {
      host.open.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeTruthy();

      host.open.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();
    });
  });
});
