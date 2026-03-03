import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { ProfileRedirectComponent } from './profile-redirect.component';
import { AuthService } from '../core/auth.service';
import { User } from '../core/models';

describe('ProfileRedirectComponent', () => {
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let authSpy: { currentUser: ReturnType<typeof signal<User | null>> };

  beforeEach(() => {
    routerSpy = { navigate: vi.fn().mockReturnValue(Promise.resolve(true)) };
    authSpy = { currentUser: signal<User | null>(null) };

    TestBed.configureTestingModule({
      imports: [ProfileRedirectComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    });
  });

  it('should redirect to /profile/:id when logged in', () => {
    authSpy.currentUser.set({ id: 42, email: 'a@b.c', name: 'Test' } as User);
    const fixture = TestBed.createComponent(ProfileRedirectComponent);
    fixture.detectChanges();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile', 42], { replaceUrl: true });
  });

  it('should redirect to /login when not logged in', () => {
    const fixture = TestBed.createComponent(ProfileRedirectComponent);
    fixture.detectChanges();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/phone'], { replaceUrl: true });
  });
});
