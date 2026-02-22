import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NhannhtMetroNavComponent } from './nhannht-metro-nav.component';

@Component({
  standalone: true,
  imports: [NhannhtMetroNavComponent],
  template: `
    <nhannht-metro-nav
      [logo]="logo()"
      [links]="links()">
      <div actions>Action slot</div>
    </nhannht-metro-nav>
  `,
})
class TestHostComponent {
  logo = signal('Viecz');
  links = signal([
    { label: 'Market', route: '/', icon: 'store' },
    { label: 'Wallet', route: '/wallet' },
  ]);
}

describe('NhannhtMetroNavComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should render logo text', () => {
    expect(fixture.nativeElement.textContent).toContain('Viecz');
  });

  it('should render navigation links', () => {
    const links = fixture.nativeElement.querySelectorAll('a');
    // 1 logo link + 2 nav links
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(fixture.nativeElement.textContent).toContain('Market');
    expect(fixture.nativeElement.textContent).toContain('Wallet');
  });

  it('should render icon when link has icon property', () => {
    const icons = fixture.nativeElement.querySelectorAll('nhannht-metro-icon');
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });

  it('should render actions slot', () => {
    expect(fixture.nativeElement.textContent).toContain('Action slot');
  });

  it('should not render icon for links without icon', () => {
    // Wallet link has no icon - check that we only have 1 icon (from Market link)
    const navIcons = fixture.nativeElement.querySelectorAll('nhannht-metro-icon');
    expect(navIcons.length).toBe(1);
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle icon rendering when a link has its icon removed', () => {
      // Initially Market link has an icon, Wallet link has none
      const host = fixture.componentInstance;
      let icons = fixture.nativeElement.querySelectorAll('nhannht-metro-icon');
      expect(icons.length).toBe(1);

      // Remove all icons from links
      host.links.set([
        { label: 'Market', route: '/' },
        { label: 'Wallet', route: '/wallet' },
      ]);
      fixture.detectChanges();
      icons = fixture.nativeElement.querySelectorAll('nhannht-metro-icon');
      expect(icons.length).toBe(0);
    });

    it('should toggle icon rendering when a link gets an icon added', () => {
      const host = fixture.componentInstance;
      host.links.set([
        { label: 'Market', route: '/' },
        { label: 'Wallet', route: '/wallet' },
      ]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('nhannht-metro-icon').length).toBe(0);

      host.links.set([
        { label: 'Market', route: '/', icon: 'store' },
        { label: 'Wallet', route: '/wallet', icon: 'account_balance_wallet' },
      ]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('nhannht-metro-icon').length).toBe(2);
    });

    it('should update logo when logo input changes', () => {
      const host = fixture.componentInstance;
      expect(fixture.nativeElement.textContent).toContain('Viecz');

      host.logo.set('MyApp');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('MyApp');
    });

    it('should update links when links input changes', () => {
      const host = fixture.componentInstance;
      expect(fixture.nativeElement.textContent).toContain('Market');

      host.links.set([{ label: 'Dashboard', route: '/dashboard' }]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Dashboard');
      expect(fixture.nativeElement.textContent).not.toContain('Market');
    });
  });
});
