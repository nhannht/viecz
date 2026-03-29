import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();
  });

  it('should redirect to /login on init', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
