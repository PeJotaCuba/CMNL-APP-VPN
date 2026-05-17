import React from 'react';
import Home from './Home';
import { UserProfile, Program } from '../types';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onMenuClick?: () => void;
  programs: Program[];
  filterEnabled: boolean;
  onToggleFilter: () => void;
  onBack?: () => void;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
  return <Home {...props} />;
};

export default Dashboard;
