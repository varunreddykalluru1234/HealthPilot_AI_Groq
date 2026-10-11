export type PageKey =
  | 'dashboard'
  | 'copilot'
  | 'profile'
  | 'records'
  | 'abha'
  | 'reports'
  | 'report-analysis'
  | 'report-comparison'
  | 'timeline'
  | 'medications'
  | 'reminders'
  | 'goals'
  | 'insights'
  | 'settings'
  | 'privacy';

export const navItems: { key: PageKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { key: 'copilot', label: 'AI Health Copilot', icon: 'MessageSquare' },
  { key: 'profile', label: 'Health Profile', icon: 'UserCircle' },
  { key: 'records', label: 'Health Records', icon: 'FolderOpen' },
  { key: 'abha', label: 'ABHA & Health Records', icon: 'FileHeart' },
  { key: 'reports', label: 'Medical Reports', icon: 'FileText' },
  { key: 'report-analysis', label: 'Report Analysis', icon: 'Microscope' },
  { key: 'report-comparison', label: 'Report Comparison', icon: 'GitCompare' },
  { key: 'timeline', label: 'Health Timeline', icon: 'Clock' },
  { key: 'medications', label: 'Medications', icon: 'Pill' },
  { key: 'reminders', label: 'Reminders', icon: 'BellRing' },
  { key: 'goals', label: 'Health Goals', icon: 'Target' },
  { key: 'insights', label: 'Health Insights', icon: 'Lightbulb' },
  { key: 'settings', label: 'Settings', icon: 'Settings' },
  { key: 'privacy', label: 'Privacy & Safety', icon: 'ShieldCheck' },
];
