import React from 'react';
import { BrandLogo } from './BrandLogo';
import { ViewType } from '../../types';
import {
  Phone,
  Mail,
  MapPin,
  LifeBuoy,
  Youtube,
  Instagram,
  Linkedin,
  Facebook
} from 'lucide-react';
import { COMPANY_CONTACT_DISPLAY, COMPANY_CONTACT_TEL } from '../../shared/companyContact';

interface PlatformFooterProps {
  onNavigateView?: (view: ViewType) => void;
  onOpenSupport?: () => void;
  onReplayIntro?: () => void;
  hasBottomNav?: boolean;
  className?: string;
}

export const PlatformFooter: React.FC<PlatformFooterProps> = ({
  onNavigateView,
  onOpenSupport,
  onReplayIntro,
  hasBottomNav = false,
  className = ''
}) => {
  const handleNav = (view: ViewType) => {
    if (onNavigateView) {
      onNavigateView(view);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer
      className={`bg-[#FAFCFD] border-t border-[#E8E4D8] py-5 px-4 sm:px-6 lg:px-8 mt-auto select-none ${
        hasBottomNav ? 'pb-24 lg:pb-6' : 'pb-6'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Row: Brand Logo, Secretariat Contact & Social Links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand Logo & Direct Secretariat Links */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
            <button
              type="button"
              onClick={() => handleNav('HOME')}
              className="cursor-pointer focus:outline-none shrink-0"
              aria-label="Property Studio home"
            >
              <BrandLogo variant="compact" size="sm" className="h-8 sm:h-9 w-auto object-contain" />
            </button>
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3.5 gap-y-1.5 text-xs text-slate-600">
              <a
                href={COMPANY_CONTACT_TEL}
                className="flex items-center gap-1.5 hover:text-[#B49029] font-semibold transition-colors"
                title="Call Secretariat"
              >
                <Phone className="w-3.5 h-3.5 text-[#B49029] shrink-0" />
                <span>{COMPANY_CONTACT_DISPLAY}</span>
              </a>
              <a
                href="mailto:info@propertystudio.org"
                className="flex items-center gap-1.5 hover:text-[#B49029] font-mono transition-colors"
                title="Email Secretariat"
              >
                <Mail className="w-3.5 h-3.5 text-[#B49029] shrink-0" />
                <span>info@propertystudio.org</span>
              </a>
              <span className="hidden lg:inline text-slate-400">·</span>
              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Secretariat · Hyderabad & Global</span>
              </span>
            </div>
          </div>

          {/* Official Social Media Channels (6 Verified Icons) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. WhatsApp Channel */}
            <a
              href="https://whatsapp.com/channel/0029VbDqFrPATRSnJ2S9x10t"
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp Channel"
              aria-label="WhatsApp Channel"
              className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 hover:border-emerald-500 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-all hover:scale-105 shadow-2xs"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.085-1.808-.4-.984-.407-1.616-1.396-1.666-1.46-.048-.067-.406-.54-.406-1.032 0-.493.258-.733.35-.833.093-.101.203-.127.271-.127.068 0 .135.001.194.004.062.003.146-.024.227.172.085.203.288.704.313.755.025.05.042.11.008.177-.034.067-.051.109-.101.168-.051.06-.107.133-.153.179-.051.05-.104.105-.045.206.06.101.265.438.568.708.391.349.72.457.822.508.102.051.161.042.22-.025.06-.068.254-.296.322-.397.068-.102.136-.085.229-.051.093.034.593.28.695.331.102.051.17.076.195.119.025.042.025.245-.119.65zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.176L2 22l4.981-1.307A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
              </svg>
            </a>

            {/* 2. YouTube Studio */}
            <a
              href="https://www.youtube.com/@PropertyStudio-SwamyReddyJavid"
              target="_blank"
              rel="noopener noreferrer"
              title="YouTube Studio"
              aria-label="YouTube Studio"
              className="w-8 h-8 rounded-lg bg-red-50 border border-red-200/80 hover:border-red-500 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all hover:scale-105 shadow-2xs"
            >
              <Youtube className="w-4 h-4" />
            </a>

            {/* 3. Instagram */}
            <a
              href="https://www.instagram.com/propertystudio_srj/"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram @propertystudio_srj"
              aria-label="Instagram @propertystudio_srj"
              className="w-8 h-8 rounded-lg bg-pink-50 border border-pink-200/80 hover:border-pink-500 hover:bg-pink-100 text-pink-600 flex items-center justify-center transition-all hover:scale-105 shadow-2xs"
            >
              <Instagram className="w-4 h-4" />
            </a>

            {/* 4. LinkedIn Network */}
            <a
              href="https://www.linkedin.com/in/property-studio-73065743b/"
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn Network"
              aria-label="LinkedIn Network"
              className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 hover:border-blue-600 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all hover:scale-105 shadow-2xs"
            >
              <Linkedin className="w-4 h-4" />
            </a>

            {/* 5. Facebook Business */}
            <a
              href="https://www.facebook.com/profile.php?id=61595090693424"
              target="_blank"
              rel="noopener noreferrer"
              title="Facebook Business"
              aria-label="Facebook Profile / Facebook Business"
              className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/80 hover:border-indigo-600 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-all hover:scale-105 shadow-2xs"
            >
              <Facebook className="w-4 h-4" />
            </a>

            {/* 6. Twitter / X */}
            <a
              href="https://x.com/propertystudio_"
              target="_blank"
              rel="noopener noreferrer"
              title="Twitter / X"
              aria-label="Twitter / X @propertystudio_"
              className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 hover:border-slate-900 hover:bg-slate-200 text-slate-900 flex items-center justify-center transition-all hover:scale-105 shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom Row: Minimalist Copyright & Governance Links */}
        <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2.5">
          <div className="text-center sm:text-left">
            © 2026 Property Studio Media & Intelligence. All rights reserved.
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => handleNav('ABOUT')}
              className="hover:text-slate-900 hover:underline cursor-pointer transition-colors font-semibold text-slate-700"
            >
              About Us
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleNav('PRIVACY')}
              className="hover:text-slate-900 hover:underline cursor-pointer transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleNav('TERMS')}
              className="hover:text-slate-900 hover:underline cursor-pointer transition-colors"
            >
              Terms & Conditions
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleNav('CHAT')}
              className="hover:text-slate-900 hover:underline cursor-pointer transition-colors"
            >
              Contact Secretariat
            </button>
            {onOpenSupport && (
              <>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className="text-[#B49029] hover:underline font-semibold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <LifeBuoy className="w-3 h-3" />
                  <span>Support Desk</span>
                </button>
              </>
            )}
            {onReplayIntro && (
              <>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={onReplayIntro}
                  className="hover:text-[#B49029] text-slate-600 hover:underline cursor-pointer transition-colors"
                  title="Watch Cinematic Intro Animation"
                >
                  <span>🎬 Watch Intro</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
