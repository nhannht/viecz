import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { User } from './models';

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
  phone_verified: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('UserService', () => {
  let service: UserService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProfile', () => {
    it('should fetch a user by id', () => {
      service.getProfile(1).subscribe(u => {
        expect(u.id).toBe(1);
        expect(u.name).toBe('Test User');
      });
      const req = httpTesting.expectOne('/api/v1/users/1');
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });
  });

  describe('getMyProfile', () => {
    it('should fetch current user profile', () => {
      service.getMyProfile().subscribe(u => {
        expect(u.email).toBe('test@example.com');
      });
      const req = httpTesting.expectOne('/api/v1/users/me');
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('should PUT profile data', () => {
      const updates = { name: 'New Name', phone: '0901234567' };
      service.updateProfile(updates).subscribe(u => {
        expect(u.name).toBe('New Name');
      });
      const req = httpTesting.expectOne('/api/v1/users/me');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updates);
      req.flush({ ...mockUser, name: 'New Name' });
    });

    it('should handle partial updates', () => {
      service.updateProfile({ bio: 'Hello' }).subscribe();
      const req = httpTesting.expectOne('/api/v1/users/me');
      expect(req.request.body).toEqual({ bio: 'Hello' });
      req.flush(mockUser);
    });
  });

  describe('uploadAvatar', () => {
    it('should POST FormData with avatar file', () => {
      const file = new File(['img'], 'avatar.png', { type: 'image/png' });
      service.uploadAvatar(file).subscribe(u => {
        expect(u.avatar_url).toBe('https://example.com/avatar.jpg');
      });
      const req = httpTesting.expectOne('/api/v1/users/me/avatar');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush({ ...mockUser, avatar_url: 'https://example.com/avatar.jpg' });
    });
  });

  describe('becomeTasker', () => {
    it('should POST to become-tasker endpoint', () => {
      service.becomeTasker().subscribe(u => {
        expect(u.is_tasker).toBe(true);
      });
      const req = httpTesting.expectOne('/api/v1/users/become-tasker');
      expect(req.request.method).toBe('POST');
      req.flush({ ...mockUser, is_tasker: true });
    });
  });
});
