import React from 'react';
import { useNavigate } from 'react-router-dom';
import AgendaHeader from '../components/AgendaHeader';
import { UserProfile } from '../types';

interface ChatAssistantProps {
  user: UserProfile;
  onMenuClick?: () => void;
  onBack?: () => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ user, onMenuClick, onBack }) => {
  return (
    <div className="h-full flex flex-col bg-background-dark">
      <AgendaHeader title="Asistente IA" user={user} onMenuClick={onMenuClick} onBack={onBack} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-primary mb-4">smart_toy</span>
        <h2 className="text-xl font-bold text-white mb-2">Asistente IA</h2>
        <p className="text-text-secondary text-sm">El asistente de chat está en desarrollo.</p>
      </div>
    </div>
  );
};

export default ChatAssistant;
