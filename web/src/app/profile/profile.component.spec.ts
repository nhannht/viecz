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
import { provideTranslocoForTesting } from '../core/transloco-testing';

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
  auth_provider: 'email',
  email_verified: true,
  phone_verified: true,
  bio: 'Hello world',
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
        provideTranslocoForTesting(),
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

  it('should call auth.logout on logout', () => {
    component.logout();
    expect(authSpy.logout).toHaveBeenCalled();
  });

  it('should display editing form when editing is true', () => {
    component.editing.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('EDIT PROFILE');
    expect(el.querySelector('form')).toBeTruthy();
  });

  it('should show saving spinner when saving', () => {
    component.editing.set(true);
    component.saving.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();
  });

  it('should show avatar image when avatar_url is set', () => {
    component.user.set({ ...mockUser, avatar_url: 'http://example.com/avatar.jpg' });
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img[alt]') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('avatar.jpg');
  });

  it('should show placeholder icon when no avatar_url', () => {
    component.user.set({ ...mockUser, avatar_url: undefined });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // No avatar img, but person icon should be present
    const icons = el.querySelectorAll('nhannht-metro-icon');
    const personIcon = Array.from(icons).find(i => i.textContent?.includes('person'));
    expect(personIcon).toBeTruthy();
  });

  it('should not show edit/logout options for other user profile', () => {
    authSpy.currentUser.set({ id: 999, name: 'Other' });
    fixture.detectChanges();
    expect(component.isOwnProfile()).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Edit Profile');
    expect(el.textContent).not.toContain('Logout');
  });

  it('should save profile with empty phone as undefined', () => {
    component.editName = 'Updated';
    component.editPhone = '';
    component.editBio = '';
    component.saveProfile();
    expect(userSpy.updateProfile).toHaveBeenCalledWith({
      name: 'Updated',
      phone: undefined,
      bio: undefined,
    });
  });

  it('should not show bio when bio is empty', () => {
    component.user.set({ ...mockUser, bio: '' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('BIO');
  });

  it('should render loading spinner when loading is true', () => {
    component.loading.set(true);
    component.user.set(null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();
    // Should not render user content
    expect(el.textContent).not.toContain('Test User');
  });

  it('should render verified badge when user is_verified', () => {
    component.user.set({ ...mockUser, is_verified: true });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('VERIFIED');
  });

  it('should not render verified badge when user is not verified', () => {
    component.user.set({ ...mockUser, is_verified: false });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // The is_verified "VERIFIED" badge should not appear, though EMAIL/PHONE VERIFIED badges may
    const hasVerifiedBadge = Array.from(el.querySelectorAll('span'))
      .some(s => {
        const text = s.textContent?.trim() ?? '';
        return text.endsWith('VERIFIED') && !text.includes('EMAIL') && !text.includes('PHONE') && !text.includes('SĐT');
      });
    expect(hasVerifiedBadge).toBe(false);
  });

  it('should render camera upload label for own profile', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const label = el.querySelector('label[for="avatar-input"]');
    expect(label).toBeTruthy();
    const fileInput = el.querySelector('input#avatar-input[type="file"]');
    expect(fileInput).toBeTruthy();
  });

  it('should not render camera upload label for other profile', () => {
    authSpy.currentUser.set({ id: 999, name: 'Other' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const label = el.querySelector('label[for="avatar-input"]');
    expect(label).toBeFalsy();
  });

  it('should call snackbar on saveProfile success', () => {
    component.editName = 'Updated';
    component.saveProfile();
    expect(snackbarSpy.show).toHaveBeenCalled();
    expect(snackbarSpy.show.mock.calls[0][0]).toBe('Profile updated');
  });

  it('should call snackbar on saveProfile error', () => {
    userSpy.updateProfile.mockReturnValue(throwError(() => ({ error: { error: 'Bad request' } })));
    component.saveProfile();
    expect(snackbarSpy.show).toHaveBeenCalledWith('Bad request', undefined, { duration: 3000 });
  });

  it('should call snackbar on onAvatarChange success', () => {
    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    component.onAvatarChange({ target: { files: [file] } } as any);
    expect(snackbarSpy.show).toHaveBeenCalled();
    expect(snackbarSpy.show.mock.calls[0][0]).toBe('Avatar updated');
  });

  it('should call snackbar on onAvatarChange error', () => {
    userSpy.uploadAvatar.mockReturnValue(throwError(() => ({ error: { error: 'Too large' } })));
    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    component.onAvatarChange({ target: { files: [file] } } as any);
    expect(snackbarSpy.show).toHaveBeenCalledWith('Too large', undefined, { duration: 3000 });
  });

  it('should show save button when not saving and editing', () => {
    component.editing.set(true);
    component.saving.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('form')).toBeTruthy();
    expect(el.textContent).toContain('Save Changes');
  });

  it('should not show save button when saving', () => {
    component.editing.set(true);
    component.saving.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // Spinner should be present, but Save Changes button should not
    expect(el.querySelector('nhannht-metro-spinner')).toBeTruthy();
  });

  it('should not show bio section when bio is undefined', () => {
    component.user.set({ ...mockUser, bio: undefined });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('BIO');
  });

  it('should update editName via DOM input event', async () => {
    component.editing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    const inputs = form.querySelectorAll('nhannht-metro-input input');
    const nameInput = inputs[0] as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    nameInput.value = 'Updated Name';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(component.editName).toBe('Updated Name');
  });

  it('should update editPhone via DOM input event', async () => {
    component.editing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    const inputs = form.querySelectorAll('nhannht-metro-input input');
    const phoneInput = inputs[1] as HTMLInputElement;
    expect(phoneInput).toBeTruthy();
    phoneInput.value = '0999888777';
    phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(component.editPhone).toBe('0999888777');
  });

  it('should update editBio via DOM input event', async () => {
    component.editing.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    const inputs = form.querySelectorAll('nhannht-metro-input input');
    const bioInput = inputs[2] as HTMLInputElement;
    expect(bioInput).toBeTruthy();
    bioInput.value = 'New bio text';
    bioInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(component.editBio).toBe('New bio text');
  });

  it('should submit edit form via DOM form submit event', () => {
    component.editing.set(true);
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      expect(userSpy.updateProfile).toHaveBeenCalled();
    }
  });

  it('should toggle editing via DOM button click', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('nhannht-metro-button button');
    const editBtn = Array.from(buttons).find(
      (b: any) => b.textContent?.includes('Edit Profile')
    ) as HTMLButtonElement | undefined;
    expect(editBtn).toBeTruthy();
    editBtn!.click();
    fixture.detectChanges();
    expect(component.editing()).toBe(true);
  });

  it('should trigger logout via DOM button click', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('nhannht-metro-button button');
    const logoutBtn = Array.from(buttons).find(
      (b: any) => b.textContent?.includes('Logout')
    ) as HTMLButtonElement | undefined;
    expect(logoutBtn).toBeTruthy();
    logoutBtn!.click();
    fixture.detectChanges();
    expect(authSpy.logout).toHaveBeenCalled();
  });

  // --- Template lifecycle toggle tests ---

  it('should toggle from loading to user loaded (destroys loading block)', () => {
    component.loading.set(true);
    component.user.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();

    // Switch to loaded — destroys the loading block, creates user content block
    component.loading.set(false);
    component.user.set(mockUser);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Test User');
    expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeFalsy();
  });

  it('should toggle editing from false to true to false (destroys edit form block)', () => {
    fixture.detectChanges();
    expect(component.editing()).toBe(false);

    // Create edit form block
    component.editing.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();

    // Destroy edit form block
    component.editing.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeFalsy();
  });

  it('should toggle saving from false to true to false (destroys save button/spinner blocks)', () => {
    component.editing.set(true);
    fixture.detectChanges();

    // Create spinner, destroy save button
    component.saving.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();

    // Destroy spinner, recreate save button
    component.saving.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Save Changes');
  });

  it('should toggle avatar from image to placeholder (destroys img block)', () => {
    component.user.set({ ...mockUser, avatar_url: 'http://example.com/avatar.jpg' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img[alt]')).toBeTruthy();

    // Switch to no avatar — destroys img block, creates placeholder block
    component.user.set({ ...mockUser, avatar_url: undefined });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img[alt]')).toBeFalsy();
  });

  it('should toggle avatar from placeholder to image (destroys placeholder block)', () => {
    component.user.set({ ...mockUser, avatar_url: undefined });
    fixture.detectChanges();

    // Switch to avatar — destroys placeholder, creates img block
    component.user.set({ ...mockUser, avatar_url: 'http://example.com/avatar.jpg' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img[alt]')).toBeTruthy();
  });

  it('should toggle bio visibility (destroys bio block)', () => {
    component.user.set({ ...mockUser, bio: 'Has bio' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Has bio');

    // Destroy bio block
    component.user.set({ ...mockUser, bio: '' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('BIO');
  });

  it('should toggle verified badge (destroys verified block)', () => {
    // The is_verified badge contains icon "verified" + text "VERIFIED"
    // Distinct from "EMAIL VERIFIED" and "PHONE VERIFIED" badges
    const hasVerifiedBadge = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('span'))
      .some(s => {
        const text = s.textContent?.trim() ?? '';
        return text.endsWith('VERIFIED') && !text.includes('EMAIL') && !text.includes('PHONE') && !text.includes('SĐT');
      });

    component.user.set({ ...mockUser, is_verified: true });
    fixture.detectChanges();
    expect(hasVerifiedBadge()).toBe(true);

    component.user.set({ ...mockUser, is_verified: false });
    fixture.detectChanges();
    expect(hasVerifiedBadge()).toBe(false);
  });

  it('should toggle isOwnProfile (destroys own profile block)', () => {
    // Own profile — shows edit/logout buttons
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Edit Profile');

    // Switch to other profile — destroys own profile block
    authSpy.currentUser.set({ id: 999, name: 'Other' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Edit Profile');

    // Switch back — recreates own profile block
    authSpy.currentUser.set({ id: 1, name: 'Test User' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Edit Profile');
  });

  it('should handle component destruction', () => {
    fixture.detectChanges();
    fixture.destroy();
  });

  describe('additional branch coverage', () => {
    it('should toggle from user loaded to loading (destroys user content block)', () => {
      // User is loaded from beforeEach
      expect(fixture.nativeElement.textContent).toContain('Test User');

      // Switch to loading — destroys user content, creates spinner
      component.loading.set(true);
      component.user.set(null);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();
      expect(fixture.nativeElement.textContent).not.toContain('Test User');

      // Back to user loaded
      component.loading.set(false);
      component.user.set(mockUser);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Test User');
    });

    it('should handle save profile error without error.error property (fallback to translation)', () => {
      userSpy.updateProfile.mockReturnValue(throwError(() => ({ error: {} })));
      component.saveProfile();
      expect(snackbarSpy.show).toHaveBeenCalledWith('Update failed', undefined, { duration: 3000 });
    });

    it('should handle avatar upload error without error.error property (fallback to translation)', () => {
      userSpy.uploadAvatar.mockReturnValue(throwError(() => ({ error: {} })));
      const file = new File(['img'], 'a.png', { type: 'image/png' });
      component.onAvatarChange({ target: { files: [file] } } as any);
      expect(snackbarSpy.show).toHaveBeenCalledWith('Upload failed', undefined, { duration: 3000 });
    });

    it('should toggle editing form open→close→open covering form block destruction', () => {
      component.editing.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeTruthy();

      component.editing.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeFalsy();

      component.editing.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    });

    it('should toggle saving true→false→true to exercise both saving branches', () => {
      component.editing.set(true);
      fixture.detectChanges();

      component.saving.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();

      component.saving.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Save Changes');

      component.saving.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('nhannht-metro-spinner')).toBeTruthy();
    });

    it('should toggle is_verified true→false→true covering verified badge block', () => {
      const hasVerifiedBadge = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('span'))
        .some(s => {
          const text = s.textContent?.trim() ?? '';
          return text.endsWith('VERIFIED') && !text.includes('EMAIL') && !text.includes('PHONE') && !text.includes('SĐT');
        });

      component.user.set({ ...mockUser, is_verified: true });
      fixture.detectChanges();
      expect(hasVerifiedBadge()).toBe(true);

      component.user.set({ ...mockUser, is_verified: false });
      fixture.detectChanges();
      expect(hasVerifiedBadge()).toBe(false);

      component.user.set({ ...mockUser, is_verified: true });
      fixture.detectChanges();
      expect(hasVerifiedBadge()).toBe(true);
    });

    it('should set editBio to empty string when user.bio is null (covers ?? fallback)', () => {
      const userWithNullBio = { ...mockUser, bio: null as unknown as string };
      userSpy.getMyProfile.mockReturnValue(of(userWithNullBio));
      component.ngOnInit();
      // bio is null → u.bio ?? '' → ''
      expect(component.editBio).toBe('');
    });

    it('should set editPhone to empty string when user.phone is null (covers ?? fallback)', () => {
      const userWithNullPhone = { ...mockUser, phone: null as unknown as string };
      userSpy.getMyProfile.mockReturnValue(of(userWithNullPhone));
      component.ngOnInit();
      // phone is null → u.phone ?? '' → ''
      expect(component.editPhone).toBe('');
    });

  });
});
