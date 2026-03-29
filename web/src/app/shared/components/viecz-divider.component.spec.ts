import { TestBed } from '@angular/core/testing';
import { VieczDividerComponent } from './viecz-divider.component';

describe('VieczDividerComponent', () => {
  it('should render an hr element', () => {
    TestBed.configureTestingModule({ imports: [VieczDividerComponent] });
    const fixture = TestBed.createComponent(VieczDividerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('hr')).toBeTruthy();
  });
});
