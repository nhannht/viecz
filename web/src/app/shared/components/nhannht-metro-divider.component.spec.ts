import { TestBed } from '@angular/core/testing';
import { NhannhtMetroDividerComponent } from './nhannht-metro-divider.component';

describe('NhannhtMetroDividerComponent', () => {
  it('should render an hr element', () => {
    TestBed.configureTestingModule({ imports: [NhannhtMetroDividerComponent] });
    const fixture = TestBed.createComponent(NhannhtMetroDividerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('hr')).toBeTruthy();
  });
});
