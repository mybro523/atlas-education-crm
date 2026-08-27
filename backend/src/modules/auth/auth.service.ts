import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** User shape returned to the client (login / register / me). */
export interface SafeUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: Role;
  language: string;
  branchId: string | null;
  telegramChatId: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface AuthResult extends AuthTokens {
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.findByIdentifier(dto.email, dto.phone);
    if (existing) {
      throw new ConflictException('User with this email or phone already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        passwordHash,
        // Public self-registration is ALWAYS a student. Privileged accounts
        // (admin/manager/teacher/founder) are created only via POST /users by a
        // founder. The client cannot choose its own role or branch here — doing
        // so previously let any anonymous caller mint a FOUNDER account.
        role: Role.STUDENT,
        language: dto.language ?? this.config.get<string>('defaultLanguage') ?? 'ru',
        branchId: null,
      },
    });

    const tokens = await this.issueTokens({
      sub: user.id,
      role: user.role,
      branchId: user.branchId,
    });
    return { ...tokens, user: await this.buildUserPayload(user.id) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.validateUser(dto.email, dto.phone, dto.password);
    const tokens = await this.issueTokens({
      sub: user.id,
      role: user.role,
      branchId: user.branchId,
    });
    return { ...tokens, user: await this.buildUserPayload(user.id) };
  }

  async validateUser(
    email: string | undefined,
    phone: string | undefined,
    password: string,
  ) {
    const user = await this.findByIdentifier(email, phone);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async refresh(userId: string, presentedToken: string): Promise<AuthTokens> {
    const now = new Date();
    // Refresh tokens are stored as a deterministic SHA-256 digest, so the exact
    // presented token is found by direct index lookup. (bcrypt cannot be used
    // here: it truncates inputs at 72 bytes, and every JWT for one user shares
    // the same first 72 bytes — the `sub` prefix — so bcrypt.compare matched the
    // wrong row and rotation/revocation silently targeted a different token.)
    const tokenHash = this.hashToken(presentedToken);
    // Prefer a LIVE row for this exact token. Historically two tokens could be
    // byte-identical (same sub + same iat second → same JWT → same hash), so a
    // hash could match both a revoked row and a live one; picking the revoked
    // row first made reuse-detection revoke the whole family and logged users
    // out on their second page reload. New tokens carry a random jti so hashes
    // are unique, but the live-first lookup also keeps old sessions working.
    const record = await this.prisma.refreshToken.findFirst({
      where: { userId, tokenHash, revokedAt: null, expiresAt: { gt: now } },
    });

    if (!record) {
      // No live row. If a revoked/expired row matches this token, this is a
      // REUSE of a rotated token — possibly stolen. Revoke the whole family so
      // neither the attacker nor the victim can keep refreshing.
      const stale = await this.prisma.refreshToken.findFirst({
        where: { userId, tokenHash },
      });
      if (stale) {
        await this.prisma.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        });
      }
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Rotate: revoke the used token before issuing a new pair.
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: now },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return this.issueTokens({ sub: user.id, role: user.role, branchId: user.branchId });
  }

  async me(userId: string): Promise<SafeUser> {
    return this.buildUserPayload(userId);
  }

  /** Revoke all active refresh tokens for the user (server-side logout). */
  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Compose the client-facing user object. `fullName` is derived from the linked
   * role profile (student/teacher/employee), falling back to email/phone.
   */
  private async buildUserPayload(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        language: true,
        branchId: true,
        telegramChatId: true,
        isActive: true,
        createdAt: true,
        studentProfile: { select: { firstName: true, middleName: true, lastName: true } },
        teacherProfile: { select: { firstName: true, middleName: true, lastName: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const { studentProfile, teacherProfile, employee, ...base } = user;
    const profile = studentProfile ?? teacherProfile ?? employee ?? null;
    const fullName = profile
      ? [
          profile.firstName,
          (profile as { middleName?: string | null }).middleName,
          profile.lastName,
        ]
          .filter(Boolean)
          .join(' ')
      : base.email ?? base.phone ?? 'User';

    return { ...base, role: base.role as unknown as Role, fullName };
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessTtl'),
    });
    // jti makes every refresh token globally unique. Without it, two tokens
    // minted for one user within the same second are byte-identical (same
    // payload + iat), which collides their SHA-256 rows and breaks rotation
    // bookkeeping (see refresh()).
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshTtl'),
      },
    );

    await this.persistRefreshToken(payload.sub, refreshToken);
    return { accessToken, refreshToken };
  }

  /** Deterministic digest for refresh-token storage (see refresh() for why not bcrypt). */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async persistRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const decoded = this.jwt.decode(refreshToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  private findByIdentifier(email?: string, phone?: string) {
    const or: Array<{ email?: string } | { phone?: string }> = [];
    if (email) or.push({ email });
    if (phone) or.push({ phone });
    if (or.length === 0) {
      return null;
    }
    return this.prisma.user.findFirst({ where: { OR: or } });
  }
}
