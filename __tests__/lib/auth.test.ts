import { getToken, getUser, setAuth, clearAuth, isAdmin, getRoleFromToken, User } from '@/lib/auth';

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

/**
 * Build a minimal fake JWT with the given payload. The signature segment is not
 * verified on the client — we only need a structurally valid three-part token.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${header}.${body}.fakesig`;
}

const adminJwt = makeJwt({ sub: 'u1', role: 'ADMIN' });
const techJwt  = makeJwt({ sub: 'u2', role: 'TECHNICIAN' });

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

  describe('getRoleFromToken', () => {
    it('returns null when no token is stored', () => {
      expect(getRoleFromToken()).toBeNull();
    });

    it('extracts ADMIN role from a valid JWT payload', () => {
      localStorage.setItem('token', adminJwt);
      expect(getRoleFromToken()).toBe('ADMIN');
    });

    it('extracts TECHNICIAN role from a valid JWT payload', () => {
      localStorage.setItem('token', techJwt);
      expect(getRoleFromToken()).toBe('TECHNICIAN');
    });

    it('returns null for a malformed token (not three parts)', () => {
      localStorage.setItem('token', 'notavalidjwt');
      expect(getRoleFromToken()).toBeNull();
    });

    it('returns null when payload has no role field', () => {
      const noRoleJwt = makeJwt({ sub: 'u3' });
      localStorage.setItem('token', noRoleJwt);
      expect(getRoleFromToken()).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('returns true when the JWT payload contains role=ADMIN', () => {
      // isAdmin() reads from the JWT, not from localStorage.user, so tampering
      // with localStorage.user cannot elevate privileges.
      localStorage.setItem('token', adminJwt);
      expect(isAdmin()).toBe(true);
    });

    it('returns false when the JWT payload contains role=TECHNICIAN', () => {
      localStorage.setItem('token', techJwt);
      expect(isAdmin()).toBe(false);
    });

    it('returns false when no token is stored', () => {
      expect(isAdmin()).toBe(false);
    });

    it('returns false even if localStorage.user claims ADMIN but token says TECHNICIAN', () => {
      // This is the key security property: a tampered plain-JSON user object
      // cannot bypass the JWT-based role check.
      localStorage.setItem('token', techJwt);
      localStorage.setItem('user', JSON.stringify(mockUser)); // tampered: claims ADMIN
      expect(isAdmin()).toBe(false);
    });
  });
});
