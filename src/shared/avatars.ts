export const DEFAULT_AVATAR_ID = 'avatar-01';

export type HairStyle = 'short' | 'bob' | 'curly' | 'bun' | 'fade' | 'long';
export type OutfitStyle = 'suit' | 'blazer' | 'hoodie' | 'casual';
export type Accessory = 'none' | 'glasses' | 'headphones';
export type Presentation = 'masculine' | 'feminine' | 'neutral';

export interface AvatarSpec {
  id: string;
  label: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: string;
  outfitStyle: OutfitStyle;
  accessory: Accessory;
  presentation: Presentation;
}

const SKINS = ['#F4D3C0', '#E7B894', '#D09A6C', '#A86B43', '#7A4B2C', '#4C2E1C'];
const HAIRS = ['#241C18', '#4A3424', '#8A4B32', '#C6A56A', '#E4E4EA', '#7A2344'];
const HAIR_STYLES: HairStyle[] = ['short', 'bob', 'curly', 'bun', 'fade', 'long'];
const OUTFITS = ['#1E3A5F', '#334155', '#0F766E', '#F5E6D3', '#14532D', '#7F1D1D'];
const OUTFIT_STYLES: OutfitStyle[] = ['suit', 'blazer', 'hoodie', 'casual'];
const ACCESSORIES: Accessory[] = ['none', 'glasses', 'headphones'];
const PRESENTATIONS: Presentation[] = ['masculine', 'feminine', 'neutral'];

function buildAvatars(): AvatarSpec[] {
  const avatars: AvatarSpec[] = [];
  for (let index = 0; index < 24; index += 1) {
    const number = String(index + 1).padStart(2, '0');
    avatars.push({
      id: `avatar-${number}`,
      label: `Studio portrait ${number}`,
      skin: SKINS[index % SKINS.length],
      hair: HAIRS[(index * 3) % HAIRS.length],
      hairStyle: HAIR_STYLES[index % HAIR_STYLES.length],
      outfit: OUTFITS[(index * 5) % OUTFITS.length],
      outfitStyle: OUTFIT_STYLES[index % OUTFIT_STYLES.length],
      accessory: ACCESSORIES[index % ACCESSORIES.length],
      presentation: PRESENTATIONS[index % PRESENTATIONS.length]
    });
  }
  return avatars;
}

export const AVATARS: readonly AvatarSpec[] = buildAvatars();
const AVATAR_IDS = new Set(AVATARS.map(avatar => avatar.id));

export function isAllowedAvatar(value: string | null | undefined): boolean {
  return AVATAR_IDS.has(String(value || ''));
}

export function resolveAvatarId(value: string | null | undefined): string {
  return isAllowedAvatar(value) ? String(value) : DEFAULT_AVATAR_ID;
}

export function avatarSpec(value: string | null | undefined): AvatarSpec {
  const id = resolveAvatarId(value);
  return AVATARS.find(avatar => avatar.id === id) || AVATARS[0];
}
