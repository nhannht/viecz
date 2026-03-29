import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { VieczCardComponent } from './viecz-card.component';

@Component({
  standalone: true,
  imports: [VieczCardComponent],
  template: `<viecz-card [featured]="featured()" [hoverable]="hoverable()">
    <p>Card content</p>
  </viecz-card>`,
})
class TestHostComponent {
  featured = signal(false);
  hoverable = signal(false);
}

describe('VieczCardComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render projected content', () => {
    expect(fixture.nativeElement.textContent).toContain('Card content');
  });

  it('should apply border-border by default (not featured)', () => {
    const div = fixture.nativeElement.querySelector('div');
    expect(div.classList.contains('border-border')).toBe(true);
    expect(div.classList.contains('border-fg')).toBe(false);
  });

  it('should apply border-fg when featured', () => {
    host.featured.set(true);
    fixture.detectChanges();
    const div = fixture.nativeElement.querySelector('div');
    expect(div.classList.contains('border-fg')).toBe(true);
  });

  it('should apply hover classes when hoverable', () => {
    host.hoverable.set(true);
    fixture.detectChanges();
    const div = fixture.nativeElement.querySelector('div');
    expect(div.classList.contains('hover:border-fg')).toBe(true);
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should toggle featured from false to true (adds border-fg class)', () => {
      let div = fixture.nativeElement.querySelector('div');
      expect(div.classList.contains('border-border')).toBe(true);
      expect(div.classList.contains('border-fg')).toBe(false);

      host.featured.set(true);
      fixture.detectChanges();
      div = fixture.nativeElement.querySelector('div');
      expect(div.classList.contains('border-fg')).toBe(true);
      expect(div.classList.contains('border-border')).toBe(false);
    });

    it('should toggle featured from true to false (removes border-fg class)', () => {
      host.featured.set(true);
      fixture.detectChanges();
      let div = fixture.nativeElement.querySelector('div');
      expect(div.classList.contains('border-fg')).toBe(true);

      host.featured.set(false);
      fixture.detectChanges();
      div = fixture.nativeElement.querySelector('div');
      expect(div.classList.contains('border-border')).toBe(true);
      expect(div.classList.contains('border-fg')).toBe(false);
    });

    it('should toggle hoverable from false to true (adds hover classes)', () => {
      let div = fixture.nativeElement.querySelector('div');
      expect(div.classList.contains('hover:border-fg')).toBe(false);

      host.hoverable.set(true);
      fixture.detectChanges();
      div = fixture.nativeElement.querySelector('div');
      expect(div.classList.contains('hover:border-fg')).toBe(true);
    });

    it('should toggle hoverable from true to false (removes hover classes)', () => {
      host.hoverable.set(true);
      fixture.detectChanges();
      let div = fixture.nativeElement.querySelector('div');
      expect(div.classList.contains('hover:border-fg')).toBe(true);

      host.hoverable.set(false);
      fixture.detectChanges();
      div = fixture.nativeElement.querySelector('div');
      expect(div.classList.contains('hover:border-fg')).toBe(false);
    });
  });
});
