import React from 'react';
import type { CandidateProfile } from '../../types';
import { CvPreview } from '../shared/CvPreview';
import { X } from 'lucide-react';

interface CvPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CandidateProfile;
}

export const CvPreviewModal: React.FC<CvPreviewModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-xs" />
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl p-6 z-10 space-y-4 max-h-[92vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Vista Previa de tu Currículum Vitae
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <CvPreview profile={profile} showControls={true} />
      </div>
    </div>
  );
};
