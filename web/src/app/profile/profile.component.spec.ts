import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PLATFORM_ID, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { UserService } from '../core/user.service';
import { AuthService } from '../core/auth.service';
import { User } from '../core/models';
import { NhannhtMetroSnackbarService } from '../shared/services/nhannht-metro-snackbar.service';
import { ComponentRef } from '@angular/core';

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  university: 'DHQG-HCM',
  is_verified: true,
  rating: 4.5,
  total_tasks_completed: 10,
  total_tasks_posted: 5,
  total_earnings: 500000,
  is_tasker: false,
  auth_provider: 'email',
  email_verified: true,
  bio: 'Hello world',
  tasker_skills: ['Delivery', 'Teaching'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let componentRef: ComponentRef<ProfileComponent>;
  let userSpy: any;
  let authSpy: any;
  let snackbarSpy: any;

  beforeEach(async () => {
    userSpy = {
      getMyProfile: vi.fn().mockReturnValue(of(mockUser)),
      getProfile: vi.fn().mockReturnValue(of(mockUser)),
      updateProfile: vi.fn().mockReturnValue(of({ ...mockUser, name: 'Updated' })),
      uploadAvatar: vi.fn().mockReturnValue(of({ ...mockUser, avatar_url: 'new.jpg' })),
      becomeTasker: vi.fn().mockReturnValue(of({ ...mockUser, is_tasker: true })),
    };
    authSpy = {
      currentUser: signal({ id: 1, name: 'Test User' }),
      logout: vi.fn(),
    };
    snackbarSpy = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: UserService, useValue: userSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NhannhtMetroSnackbarService, useValue: snackbarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('id', '1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load own profile using getMyProfile', () => {
    expect(userSpy.getMyProfile).toHaveBeenCalled();
    expect(component.user()?.name).toBe('Test User');
    expect(component.loading()).toBe(false);
  });

  it('should load other user profile using getProfile', async () => {
    userSpy.getMyProfile.mockClear();
    componentRef.setInput('id', '99');
    component.ngOnInit();
    expect(userSpy.getProfile).toHaveBeenCalledWith(99);
  });

  it('should detect own profile', () => {
    expect(component.isOwnProfile()).toBe(true);
  });

  it('should render user name', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test User');
  });

  it('should render stats', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('10');
    expect(el.textContent).toContain('4.5');
  });

  it('should render bio', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Hello world');
  });

  it('should render skills', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Delivery');
    expect(el.textContent).toContain('Teaching');
  });

  it('should toggle editing mode', () => {
    expect(component.editing()).toBe(false);
    component.editing.set(true);
    expect(component.editing()).toBe(true);
  });

  it('should save profile', () => {
    component.editName = 'Updated';
    component.editPhone = '0123';
    component.editBio = 'New bio';
    component.saveProfile();

    expect(userSpy.updateProfile).toHaveBeenCalledWith({
      name: 'Updated',
      phone: '0123',
      bio: 'New bio',
    });
    expect(component.user()?.name).toBe('Updated');
    expect(component.editing()).toBe(false);
  });

  it('should handle save error', () => {
    userSpy.updateProfile.mockReturnValue(throwError(() => ({ error: { error: 'Bad' } })));
    component.saveProfile();
    expect(component.saving()).toBe(false);
  });

  it('should upload avatar', () => {
    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as any;
    component.onAvatarChange(event);
    expect(userSpy.uploadAvatar).toHaveBeenCalledWith(file);
    expect(component.user()?.avatar_url).toBe('new.jpg');
  });

  it('should handle no file in avatar change', () => {
    const event = { target: { files: [] } } as any;
    component.onAvatarChange(event);
    expect(userSpy.uploadAvatar).not.toHaveBeenCalled();
  });

  it('should become tasker', () => {
    component.becomeTasker();
    expect(userSpy.becomeTasker).toHaveBeenCalled();
    expect(component.user()?.is_tasker).toBe(true);
  });

  it('should handle become tasker error', () => {
    userSpy.becomeTasker.mockReturnValue(throwError(() => ({ error: { error: 'Fail' } })));
    component.becomeTasker();
    // Should not throw
  });

  it('should handle avatar upload error', () => {
    userSpy.uploadAvatar.mockReturnValue(throwError(() => ({ error: { error: 'Upload fail' } })));
    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    component.onAvatarChange({ target: { files: [file] } } as any);
    // Should not throw
  });

  it('should handle loading error', () => {
    userSpy.getMyProfile.mockReturnValue(throwError(() => new Error('fail')));
    component.ngOnInit();
    expect(component.loading()).toBe(false);
  });

  it('should show Become Tasker button for non-taskers', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Become Tasker');
  });
});
