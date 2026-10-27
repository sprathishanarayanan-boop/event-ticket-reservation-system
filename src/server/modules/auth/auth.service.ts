import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { generateToken, AuthUser, UserRole } from '../../middleware/auth';

export class AuthService {
  async register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    tenantName?: string;
    tenantId?: string;
  }) {
    const existing = await db.getOne('SELECT id FROM users WHERE email = ?', [data.email.toLowerCase()]);
    if (existing) {
      throw new Error('Email is already registered');
    }

    let tenantId = data.tenantId || null;

    // If organizer is registering and provides tenantName, create a tenant if not provided
    if (data.role === 'ORGANIZER' && !tenantId) {
      const orgName = data.tenantName || `${data.name}'s Organization`;
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
      tenantId = uuidv4();
      await db.execute(
        'INSERT INTO tenants (id, name, slug, logo_url) VALUES (?, ?, ?, ?)',
        [tenantId, orgName, slug, `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&auto=format&fit=crop`]
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const userId = uuidv4();

    await db.execute(
      'INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, tenantId, data.name, data.email.toLowerCase(), passwordHash, data.role]
    );

    const user: AuthUser = {
      id: userId,
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role,
      tenantId,
    };

    const token = generateToken(user);
    return { token, user };
  }

  async login(data: { email: string; password: string }) {
    const user = await db.getOne<{
      id: string;
      tenant_id: string | null;
      name: string;
      email: string;
      password_hash: string;
      role: UserRole;
    }>('SELECT * FROM users WHERE email = ?', [data.email.toLowerCase()]);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
    };

    const token = generateToken(authUser);
    return { token, user: authUser };
  }

  async getProfile(userId: string) {
    const user = await db.getOne<{
      id: string;
      tenant_id: string | null;
      name: string;
      email: string;
      role: UserRole;
      created_at: string;
    }>('SELECT id, tenant_id, name, email, role, created_at FROM users WHERE id = ?', [userId]);

    if (!user) {
      throw new Error('User not found');
    }

    let tenant = null;
    if (user.tenant_id) {
      tenant = await db.getOne('SELECT * FROM tenants WHERE id = ?', [user.tenant_id]);
    }

    return { ...user, tenant };
  }
}

export const authService = new AuthService();
