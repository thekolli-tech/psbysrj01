import React from 'react';
import {
  Phone,
  Mail,
  Youtube,
  Instagram,
  Linkedin,
  Facebook,
  ExternalLink
} from 'lucide-react';
import { COMPANY_CONTACT_DISPLAY, COMPANY_CONTACT_TEL } from '../../shared/companyContact';

export const SOCIAL_MEDIA_LINKS = [
  {
    name: 'WhatsApp Channel',
    url: 'https://whatsapp.com/channel/0029VbDqFrPATRSnJ2S9x10t',
    handle: 'Official Updates',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200/80 hover:bg-emerald-100',
    icon: (
      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.767 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.085-1.808-.4-.984-.407-1.616-1.396-1.666-1.46-.048-.067-.406-.54-.406-1.032 0-.493.258-.733.35-.833.093-.101.203-.127.271-.127.068 0 .135.001.194.004.062.003.146-.024.227.172.085.203.288.704.313.755.025.05.042.11.008.177-.034.067-.051.109-.101.168-.051.06-.107.133-.153.179-.051.05-.104.105-.045.206.06.101.265.438.568.708.391.349.72.457.822.508.102.051.161.042.22-.025.06-.068.254-.296.322-.397.068-.102.136-.085.229-.051.093.034.593.28.695.331.102.051.17.076.195.119.025.042.025.245-.119.65zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.176L2 22l4.981-1.307A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
      </svg>
    )
  },
  {
    name: 'YouTube Studio',
    url: 'https://www.youtube.com/@PropertyStudio-SwamyReddyJavid',
    handle: '@PropertyStudio',
    color: 'bg-red-50 text-red-600 border-red-200/80 hover:bg-red-100',
    icon: <Youtube className="w-4 h-4 shrink-0" />
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/propertystudio_srj/',
    handle: '@propertystudio_srj',
    color: 'bg-pink-50 text-pink-600 border-pink-200/80 hover:bg-pink-100',
    icon: <Instagram className="w-4 h-4 shrink-0" />
  },
  {
    name: 'LinkedIn Network',
    url: 'https://www.linkedin.com/in/property-studio-73065743b/',
    handle: 'Property Studio',
    color: 'bg-blue-50 text-blue-600 border-blue-200/80 hover:bg-blue-100',
    icon: <Linkedin className="w-4 h-4 shrink-0" />
  },
  {
    name: 'Facebook Page',
    url: 'https://www.facebook.com/profile.php?id=61595090693424',
    handle: 'Official Page',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200/80 hover:bg-indigo-100',
    icon: <Facebook className="w-4 h-4 shrink-0" />
  },
  {
    name: 'Twitter / X',
    url: 'https://x.com/propertystudio_',
    handle: '@propertystudio_',
    color: 'bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200',
    icon: (
      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  }
];

export const MobileSocialSection: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`space-y-3 pt-3 border-t border-slate-100 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B99A24]">
          OFFICIAL SOCIAL MEDIA
        </span>
        <span className="text-[10px] font-semibold text-slate-400">Verified Channels</span>
      </div>

      {/* Grid of Social Channels */}
      <div className="grid grid-cols-2 gap-2">
        {SOCIAL_MEDIA_LINKS.map(link => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 shadow-2xs ${link.color}`}
            title={`Follow on ${link.name}`}
          >
            {link.icon}
            <div className="min-w-0 flex-1">
              <span className="block font-bold text-[11px] truncate">{link.name}</span>
              <span className="block text-[9px] opacity-75 truncate">{link.handle}</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
          </a>
        ))}
      </div>

      {/* Direct Secretariat Contacts */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1.5 text-xs text-slate-600">
        <a
          href={COMPANY_CONTACT_TEL}
          className="flex items-center gap-2 hover:text-[#B49029] font-semibold transition-colors"
        >
          <Phone className="w-3.5 h-3.5 text-[#B49029] shrink-0" />
          <span>Call: {COMPANY_CONTACT_DISPLAY}</span>
        </a>
        <a
          href="mailto:info@propertystudio.org"
          className="flex items-center gap-2 hover:text-[#B49029] font-mono transition-colors text-[11px]"
        >
          <Mail className="w-3.5 h-3.5 text-[#B49029] shrink-0" />
          <span>info@propertystudio.org</span>
        </a>
      </div>
    </div>
  );
};
