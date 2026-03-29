import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { VieczTabsComponent } from './viecz-tabs.component';

@Component({
  standalone: true,
  imports: [VieczTabsComponent],
  template: `
    <viecz-tabs
      [tabs]="tabs()"
      [activeTab]="activeTab()"
      (tabChanged)="activeTab.set($event)">
      <p>Tab content</p>
    </viecz-tabs>
  `,
})
class TestHostComponent {
  tabs = signal([
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'My Tasks' },
    { value: 'completed', label: 'Completed' },
  ]);
  activeTab = signal('all');
}

describe('VieczTabsComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render all tabs', () => {
    const buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(buttons.length).toBe(3);
  });

  it('should display tab labels', () => {
    expect(fixture.nativeElement.textContent).toContain('All');
    expect(fixture.nativeElement.textContent).toContain('My Tasks');
    expect(fixture.nativeElement.textContent).toContain('Completed');
  });

  it('should mark active tab with aria-selected true', () => {
    const buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(buttons[0].getAttribute('aria-selected')).toBe('true');
    expect(buttons[1].getAttribute('aria-selected')).toBe('false');
  });

  it('should apply active classes to active tab', () => {
    const buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(buttons[0].classList.contains('text-fg')).toBe(true);
    expect(buttons[1].classList.contains('text-muted')).toBe(true);
  });

  it('should emit tabChanged and update active tab on click', () => {
    const buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host.activeTab()).toBe('mine');
    expect(buttons[1].getAttribute('aria-selected')).toBe('true');
  });

  it('should render tabpanel with projected content', () => {
    const panel = fixture.nativeElement.querySelector('[role="tabpanel"]');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('Tab content');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle active tab from first to second (changes active CSS classes)', () => {
      let buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
      expect(buttons[0].classList.contains('text-fg')).toBe(true);
      expect(buttons[1].classList.contains('text-muted')).toBe(true);

      host.activeTab.set('mine');
      fixture.detectChanges();
      buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
      expect(buttons[1].classList.contains('text-fg')).toBe(true);
      expect(buttons[0].classList.contains('text-muted')).toBe(true);
    });

    it('should toggle active tab from second back to first', () => {
      host.activeTab.set('mine');
      fixture.detectChanges();
      let buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
      expect(buttons[1].classList.contains('text-fg')).toBe(true);

      host.activeTab.set('all');
      fixture.detectChanges();
      buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
      expect(buttons[0].classList.contains('text-fg')).toBe(true);
      expect(buttons[1].classList.contains('text-muted')).toBe(true);
    });

    it('should update tabs list when tabs input changes', () => {
      host.tabs.set([
        { value: 'tab1', label: 'Tab One' },
        { value: 'tab2', label: 'Tab Two' },
      ]);
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
      expect(buttons.length).toBe(2);
      expect(fixture.nativeElement.textContent).toContain('Tab One');
      expect(fixture.nativeElement.textContent).toContain('Tab Two');
    });

    it('should update border-b class when active tab changes', () => {
      let buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
      expect(buttons[0].classList.contains('border-b-2')).toBe(true);
      expect(buttons[1].classList.contains('border-b-2')).toBe(false);

      host.activeTab.set('mine');
      fixture.detectChanges();
      buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
      expect(buttons[1].classList.contains('border-b-2')).toBe(true);
      expect(buttons[0].classList.contains('border-b-2')).toBe(false);
    });
  });
});
