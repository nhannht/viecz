import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { NhannhtMetroStepComponent } from './nhannht-metro-step.component';

@Component({
  standalone: true,
  imports: [NhannhtMetroStepComponent],
  template: `<nhannht-metro-step [number]="number()" [title]="title()" [description]="desc()" />`,
})
class TestHostComponent {
  number = signal('01');
  title = signal('Connect');
  desc = signal('Link your tools');
}

describe('NhannhtMetroStepComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render step number', () => {
    expect(fixture.nativeElement.textContent).toContain('01');
  });

  it('should render title and description', () => {
    expect(fixture.nativeElement.textContent).toContain('Connect');
    expect(fixture.nativeElement.textContent).toContain('Link your tools');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('template conditional toggles', () => {
    it('should update number when number input changes', () => {
      expect(fixture.nativeElement.textContent).toContain('01');

      host.number.set('02');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('02');
      expect(fixture.nativeElement.textContent).not.toContain('01');
    });

    it('should update title when title input changes', () => {
      expect(fixture.nativeElement.textContent).toContain('Connect');

      host.title.set('Deploy');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Deploy');
      expect(fixture.nativeElement.textContent).not.toContain('Connect');
    });

    it('should update description when description input changes', () => {
      expect(fixture.nativeElement.textContent).toContain('Link your tools');

      host.desc.set('Push to production');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Push to production');
    });

    it('should show empty description when description is empty string', () => {
      host.desc.set('');
      fixture.detectChanges();
      const p = fixture.nativeElement.querySelector('p');
      expect(p.textContent.trim()).toBe('');
    });
  });
});
