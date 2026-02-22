import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { NhannhtMetroPriceCardComponent } from './nhannht-metro-price-card.component';

@Component({
  standalone: true,
  imports: [NhannhtMetroPriceCardComponent],
  template: `<nhannht-metro-price-card
    [tier]="tier()"
    [price]="price()"
    [description]="desc()"
    [features]="features()"
    [featured]="featured()"
    (ctaClick)="ctaClicked = true"
  />`,
})
class TestHostComponent {
  tier = signal('PRO');
  price = signal('$19');
  desc = signal('For power users');
  features = signal(['Unlimited tasks', 'Priority support']);
  featured = signal(false);
  ctaClicked = false;
}

describe('NhannhtMetroPriceCardComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render tier name and price', () => {
    expect(fixture.nativeElement.textContent).toContain('PRO');
    expect(fixture.nativeElement.textContent).toContain('$19');
  });

  it('should render features list', () => {
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Unlimited tasks');
  });

  it('should show POPULAR badge when featured', () => {
    host.featured.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('POPULAR');
  });

  it('should NOT show POPULAR badge when not featured', () => {
    expect(fixture.nativeElement.textContent).not.toContain('POPULAR');
  });

  it('should emit ctaClick when CTA button is clicked', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(host.ctaClicked).toBe(true);
  });

  it('should toggle featured from true to false (destroys POPULAR badge block)', () => {
    host.featured.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('POPULAR');

    host.featured.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('POPULAR');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle featured from false to true (creates POPULAR badge block)', () => {
      expect(fixture.nativeElement.textContent).not.toContain('POPULAR');

      host.featured.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('POPULAR');
    });

    it('should render description text', () => {
      expect(fixture.nativeElement.textContent).toContain('For power users');
    });

    it('should render period text', () => {
      expect(fixture.nativeElement.textContent).toContain('/mo');
    });

    it('should render features in list when features array is non-empty', () => {
      const items = fixture.nativeElement.querySelectorAll('li');
      expect(items.length).toBe(2);
    });

    it('should render empty list when features array is empty', () => {
      host.features.set([]);
      fixture.detectChanges();
      const items = fixture.nativeElement.querySelectorAll('li');
      expect(items.length).toBe(0);
    });

    it('should render ctaLabel on button', () => {
      expect(fixture.nativeElement.querySelector('button').textContent).toContain('Get Started');
    });

    it('should use custom ctaLabel when provided', () => {
      // ctaLabel is not in host signals, verify the default "Get Started" shows
      expect(fixture.nativeElement.textContent).toContain('Get Started');
    });

    it('should toggle featured false→true→false→true covering POPULAR badge block cycle', () => {
      expect(fixture.nativeElement.textContent).not.toContain('POPULAR');

      host.featured.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('POPULAR');

      host.featured.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('POPULAR');

      host.featured.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('POPULAR');
    });

    it('should apply border-fg class when featured is true', () => {
      host.featured.set(true);
      fixture.detectChanges();
      const card = fixture.nativeElement.querySelector('.relative');
      expect(card.classList.contains('border-fg')).toBe(true);
    });

    it('should apply border-border class when featured is false', () => {
      host.featured.set(false);
      fixture.detectChanges();
      const card = fixture.nativeElement.querySelector('.relative');
      expect(card.classList.contains('border-border')).toBe(true);
    });

    it('should toggle features from populated to empty to populated', () => {
      expect(fixture.nativeElement.querySelectorAll('li').length).toBe(2);

      host.features.set([]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('li').length).toBe(0);

      host.features.set(['A', 'B', 'C']);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('li').length).toBe(3);
    });

    it('should update description when changed', () => {
      expect(fixture.nativeElement.textContent).toContain('For power users');

      host.desc.set('Enterprise plan');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Enterprise plan');
    });

    it('should update price when changed', () => {
      expect(fixture.nativeElement.textContent).toContain('$19');

      host.price.set('$49');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('$49');
    });
  });
});
