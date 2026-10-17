import React from 'react';
import { AVATARS, avatarSpec, type AvatarSpec } from '../../shared/avatars';

export function Avatar({ id, label, className = '' }: { id?: string | null; label?: string; className?: string }) {
  const spec = avatarSpec(id);
  return (
    <svg viewBox="0 0 80 80" role="img" aria-label={label || spec.label} className={className}>
      <rect width="80" height="80" rx="18" fill="#F8FAFC" />
      <Shoulders spec={spec} />
      <Head spec={spec} />
      <Hair spec={spec} />
      <Face spec={spec} />
      <Accessory spec={spec} />
    </svg>
  );
}

function Shoulders({ spec }: { spec: AvatarSpec }) {
  return (
    <g>
      <path d="M10 78c6-16 16-24 30-24s24 8 30 24" fill={spec.outfit} />
      {spec.outfitStyle === 'suit' || spec.outfitStyle === 'blazer' ? (
        <path d="M34 56l6 16 6-16" fill="#F8FAFC" opacity="0.9" />
      ) : null}
      {spec.outfitStyle === 'hoodie' ? <path d="M28 58c6 6 18 6 24 0" fill="none" stroke="#0F172A" strokeWidth="2" opacity="0.35" /> : null}
    </g>
  );
}

function Head({ spec }: { spec: AvatarSpec }) {
  const width = spec.presentation === 'feminine' ? 28 : spec.presentation === 'masculine' ? 32 : 30;
  return <ellipse cx="40" cy="36" rx={width / 2} ry="18" fill={spec.skin} />;
}

function Hair({ spec }: { spec: AvatarSpec }) {
  const color = spec.hair;
  if (spec.hairStyle === 'bob') return <path d="M22 34c2-16 34-16 36 0 0 10-4 16-8 16V34H30v16c-4 0-8-6-8-16z" fill={color} />;
  if (spec.hairStyle === 'curly') return <path d="M20 36c0-16 12-22 20-22s20 6 20 22c-4-6-8-8-12-6 2 4 2 8 0 12-4-4-8-4-12 0-2-6-2-10 0-14-6-2-12 2-16 8z" fill={color} />;
  if (spec.hairStyle === 'bun') return <g><path d="M24 36c1-12 31-14 32 2-6-6-20-6-32-2z" fill={color} /><circle cx="40" cy="16" r="6" fill={color} /></g>;
  if (spec.hairStyle === 'fade') return <path d="M26 34c1-10 27-12 28 0-8-6-20-6-28 0z" fill={color} />;
  if (spec.hairStyle === 'long') return <path d="M22 34c2-16 34-18 38 2-2 18-6 28-8 28-2-8-2-16-4-22-4 8-6 16-8 22-2-2-8-14-10-30z" fill={color} />;
  return <path d="M24 34c1-12 31-14 32 2-8-8-24-8-32-2z" fill={color} />;
}

function Face({ spec }: { spec: AvatarSpec }) {
  return (
    <g>
      <circle cx="33" cy="36" r="1.6" fill="#1F2937" />
      <circle cx="47" cy="36" r="1.6" fill="#1F2937" />
      <path d="M35 43c2 3 8 3 10 0" fill="none" stroke="#9A3412" strokeWidth="1.4" strokeLinecap="round" />
      {spec.presentation !== 'feminine' ? <path d="M30 40h4M46 40h4" stroke={spec.hair} strokeWidth="1" opacity="0.45" /> : null}
    </g>
  );
}

function Accessory({ spec }: { spec: AvatarSpec }) {
  if (spec.accessory === 'glasses') {
    return <g fill="none" stroke="#0F172A" strokeWidth="1.6"><circle cx="33" cy="36" r="4" /><circle cx="47" cy="36" r="4" /><path d="M37 36h6" /></g>;
  }
  if (spec.accessory === 'headphones') {
    return <g fill="none" stroke="#0F172A" strokeWidth="2"><path d="M26 38c0-12 28-12 28 0" /><rect x="22" y="36" width="6" height="10" rx="2" fill="#0F172A" /><rect x="52" y="36" width="6" height="10" rx="2" fill="#0F172A" /></g>;
  }
  return null;
}

export function AvatarPicker({ value, onChange }: { value?: string | null; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATARS.map(avatar => {
        const selected = avatar.id === value;
        return (
          <button
            key={avatar.id}
            type="button"
            aria-label={avatar.label}
            aria-pressed={selected}
            onClick={() => onChange(avatar.id)}
            className={`rounded-xl border p-1 ${selected ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'}`}
          >
            <Avatar id={avatar.id} className="w-full h-auto" />
          </button>
        );
      })}
    </div>
  );
}
