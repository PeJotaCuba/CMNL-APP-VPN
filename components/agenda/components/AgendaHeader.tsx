import React from 'react';
import { UserProfile } from '../types';
import CMNLHeader from '../../CMNLHeader';

export interface AgendaHeaderProps {
  title: string;
  user: UserProfile;
  onMenuClick?: () => void;
  onBack?: () => void;
  children?: React.ReactNode;
}

const AgendaHeader: React.FC<AgendaHeaderProps> = ({ title, user, onMenuClick, onBack, children }) => {
  return (
    <CMNLHeader 
      user={user} 
      sectionTitle={title} 
      onMenuClick={onMenuClick} 
      onBack={onBack}
    >
      {children}
    </CMNLHeader>
  );
};

export default AgendaHeader;
