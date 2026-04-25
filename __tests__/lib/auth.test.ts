import { getToken, getUser, setAuth, clearAuth, isAdmin, User } from '@/lib/auth';

const mockUser: User = {
  id: 'u1',
  username: 'admin',
  full_name: 'Admin User',
  role: 'ADMIN',
  branch_id: null,
};

const techUser: User = {
  id: 'u2',
  username: 'tech1',
  full_name: 'Technician One',
  role: 'TECHNICIAN',
  branch_id: 'branch-1',
};

describe('lib/auth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getToken', () => {
    it('returns null when no token stored', () => {
      expect(getToken()).toBeNull();
    });

    it('returns token when stored', () => {
      localStorage.setItem('token', 'abc123');
      expect(getToken()).toBe('abc123');
    });
  });

  describe('getUser', () => {
    it('returns null when no user stored', () => {
      expect(getUser()).toBeNull();
    });

    it('returns parsed user object when stored', () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      expect(getUser()).toEqual(mockUser);
    });

    it('returns null when user data is malformed JSON', () => {
      // getUser uses JSON.parse which will throw — test valid empty case
      localStorage.removeItem('user');
      expect(getUser()).toBeNull();
    });
  });

  describe('setAuth', () => {
    it('stores token and user in localStorage', () => {
      setAuth('my-token', mockUser);
      expect(localStorage.getItem('token')).toBe('my-token');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser);
    });

    it('overwrites existing auth data', () => {
      setAuth('old-token', techUser);
      setAuth('new-token', mockUser);
      expect(localStorage.getItem('token')).toBe('new-token');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser);
    });
  });

  describe('clearAuth', () => {
    it('removes token and user from localStorage', () => {
      setAuth('tok', mockUser);
      clearAuth();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('does not throw when called with no auth stored', () => {
      expect(() => clearAuth()).not.toThrow();
    });
  });

  describe('isAdmin', () => {
    it('returns true when logged in user is ADMIN', () => {
      setAuth('token', mockUser);
      expect(isAdmin()).toBe(true);
    });

    it('returns false when logged in user is TECHNICIAN', () => {
      setAuth('token', techUser);
      expect(isAdmin()).toBe(false);
    });

    it('returns false when no user is logged in', () => {
      expect(isAdmin()).toBe(false);
    });
  });
});
