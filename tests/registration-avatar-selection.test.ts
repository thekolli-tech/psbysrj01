import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIME_AVATARS, validateAvatarUpload, getSafeAvatar, DEFAULT_AVATAR } from '../src/shared/avatar.js';

test('ANIME_AVATARS collection contains 12 high-quality 2D anime character avatars', () => {
  assert.equal(ANIME_AVATARS.length, 12);
  ANIME_AVATARS.forEach((avatar) => {
    assert.ok(avatar.id, 'Avatar must have an ID');
    assert.ok(avatar.name, 'Avatar must have a name');
    assert.ok(avatar.roleHint, 'Avatar must have a role hint');
    assert.ok(avatar.url.startsWith('https://api.dicebear.com/'), 'Avatar URL must start with https://api.dicebear.com/');
    assert.ok(!avatar.url.includes('.svg'), 'Avatar URL must not be SVG');
    
    // Validate with safe avatar validator
    const validation = validateAvatarUpload(avatar.url);
    assert.equal(validation.valid, true, `Avatar ${avatar.id} must pass validation: ${validation.error}`);
    assert.equal(validation.avatar, avatar.url);
  });
});

test('Avatar validator allows valid Base64 raster image data and rejects SVG/HTML scripts', () => {
  // Valid Base64 JPEG
  const validJpeg = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64');
  const jpegResult = validateAvatarUpload(validJpeg);
  assert.equal(jpegResult.valid, true);

  // Rejects SVG data URI
  const svgData = 'data:image/svg+xml;base64,' + Buffer.from('<svg></svg>').toString('base64');
  const svgResult = validateAvatarUpload(svgData);
  assert.equal(svgResult.valid, false);
  assert.match(svgResult.error || '', /SVG and vector formats are not permitted/);

  // Rejects script payload
  const xssUrl = 'https://example.com/photo.svg';
  const xssResult = validateAvatarUpload(xssUrl);
  assert.equal(xssResult.valid, false);

  // getSafeAvatar fallback
  assert.equal(getSafeAvatar(null), DEFAULT_AVATAR);
  assert.equal(getSafeAvatar(''), DEFAULT_AVATAR);
  assert.equal(getSafeAvatar(ANIME_AVATARS[0].url), ANIME_AVATARS[0].url);
});
