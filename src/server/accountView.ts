import { resolveAvatarId } from '../shared/avatars.ts';
import { presentPhone } from '../shared/phonePrivacy.ts';

export interface AccountViewer {
  id?: string | null;
  role?: string | null;
}

/** Public account shape. Password hashes, salts, and other people's full phone numbers are omitted. */
export function serializeAccount(user: any, viewer: AccountViewer | null | undefined): Record<string, unknown> {
  const ownerId = user?.id || null;
  return {
    id: user.id,
    public_id: user.public_id || user.publicId || '',
    name: user.name,
    email: user.email,
    phone: presentPhone(user.phone, viewer, ownerId),
    role: user.role,
    avatar: resolveAvatarId(user.avatar),
    organization: user.organization || '',
    wallet_balance: Number(user.wallet_balance ?? user.walletBalance ?? 0),
    is_verified: Number(user.is_verified ?? (user.isVerified ? 1 : 0)),
    email_verified: Number(user.email_verified ?? (user.emailVerified ? 1 : 0)),
    phone_verified: Number(user.phone_verified ?? (user.phoneVerified ? 1 : 0)),
    account_status: user.account_status || user.accountStatus || 'ACTIVE',
    must_change_password: Number(user.must_change_password || 0),
    assignedPropertyIds: Array.isArray(user.assignedPropertyIds)
      ? user.assignedPropertyIds
      : JSON.parse(user.assigned_properties || '[]')
  };
}
