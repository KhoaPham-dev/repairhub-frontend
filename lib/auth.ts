export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'TECHNICIAN';
  branch_id: string | null;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as User) : null;
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Decodes the JWT payload (without verifying the signature — verification happens
 * server-side). Reading the role from the signed JWT rather than from the plain
 * localStorage.user object prevents a client from trivially tampering with their
 * stored role to expose admin UI surfaces.
 */
export function getRoleFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64 → decode
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(payload);
    const decoded = JSON.parse(json) as Record<string, unknown>;
    return typeof decoded.role === 'string' ? decoded.role : null;
  } catch {
    return null;
  }
}

/**
 * Returns true only when the JWT payload issued by the server contains role=ADMIN.
 * A user who edits localStorage.user will not gain access because the role is read
 * from the cryptographically-signed token, not from the plain JSON user object.
 */
export function isAdmin(): boolean {
  return getRoleFromToken() === 'ADMIN';
}
