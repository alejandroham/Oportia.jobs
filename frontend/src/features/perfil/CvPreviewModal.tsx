import React from 'react';
import type { CandidateProfile } from '../../types';
import { CvPreview } from '../shared/CvPreview';
import { Dialog } from '../../components/ui/Dialog';

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
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Vista Previa de tu Currículum Vitae"
      maxWidth="3xl"
    >
      <CvPreview profile={profile} showControls={true} />
    </Dialog>
  );
};
