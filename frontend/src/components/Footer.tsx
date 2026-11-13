import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Instagram, ExternalLink, ShieldCheck, GraduationCap, Settings as SettingsIcon } from 'lucide-react';

interface FooterProps {
  onNavigateToTab?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateToTab }) => {
  return (
    <footer className="no-print mt-12 border-t border-black/8 dark:border-white/8 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md text-xs text-gray-500 dark:text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Top row: Brand & Sponsor / Instagram actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-6">
          <div className="flex items-center space-x-3 text-center md:text-left">
            <img
              src="/oportia-icon.svg"
              alt="Oportia Jobs IA"
              className="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900 dark:text-white text-sm">
                  Oportia Jobs IA
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#20A88A]/10 dark:bg-[#20A88A]/20 text-[#20A88A] dark:text-[#8AD9C4] border border-[#20A88A]/30">
                  v1.1.0
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tu talento. Tus decisiones. Tus oportunidades.
              </p>
            </div>
          </div>

          {/* Social & Sponsor CTA Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* Instagram Link */}
            <a
              href="https://www.instagram.com/not.kano/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 hover:from-pink-500/20 hover:via-purple-500/20 hover:to-amber-500/20 text-pink-700 dark:text-pink-300 border border-pink-500/20 transition shadow-xs active:scale-95 font-medium"
              title="Sígueme en Instagram @not.kano"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
              <span>@not.kano</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
            </a>

            {/* GitHub Sponsors Link */}
            <a
              href="https://github.com/sponsors/alejandroham"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800/60 transition shadow-xs active:scale-95 font-semibold animate-pulse hover:animate-none"
              title="Apoya el desarrollo continuo de Oportia Jobs IA en GitHub Sponsors"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>Conviértete en Sponsor</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
            </a>
          </div>
        </div>

        {/* Middle row: Quick Navigation */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs font-medium">
          <Link
            to="/"
            className="hover:text-[#20A88A] dark:hover:text-[#8AD9C4] transition"
          >
            Inicio
          </Link>
          <Link
            to="/empleos"
            className="hover:text-[#20A88A] dark:hover:text-[#8AD9C4] transition"
          >
            Buscar empleo
          </Link>
          <Link
            to="/postulaciones"
            className="hover:text-[#20A88A] dark:hover:text-[#8AD9C4] transition"
          >
            Mis postulaciones
          </Link>
          <Link
            to="/aprender"
            className="hover:text-[#20A88A] dark:hover:text-[#8AD9C4] transition flex items-center space-x-1 text-[#20A88A] dark:text-[#8AD9C4] font-semibold"
          >
            <GraduationCap className="w-3 h-3" />
            <span>Aprender</span>
          </Link>
          <Link
            to="/perfil"
            className="hover:text-[#20A88A] dark:hover:text-[#8AD9C4] transition"
          >
            Mi perfil
          </Link>
          <Link
            to="/ajustes"
            className="hover:text-[#20A88A] dark:hover:text-[#8AD9C4] transition flex items-center space-x-1"
          >
            <SettingsIcon className="w-3 h-3" />
            <span>Ajustes</span>
          </Link>
        </div>

        {/* Bottom row: Credits and Legal Compliance */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1.5">
            <span>Creado y diseñado por</span>
            <a
              href="https://github.com/alejandroham"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 transition"
            >
              Alejandro Ham
            </a>
            <span>• Código abierto bajo Licencia MIT</span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Soberanía Digital 100% Local-First & Cumplimiento Ley N° 21.719 (Chile)</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
