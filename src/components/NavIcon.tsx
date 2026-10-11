import {
  LayoutDashboard, MessageSquare, UserCircle, FolderOpen, FileText,
  Microscope, GitCompare, Clock, Pill, Target, Lightbulb, Settings,
  ShieldCheck, BellRing, FileHeart, QrCode, HeartPulse, type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, MessageSquare, UserCircle, FolderOpen, FileText,
  Microscope, GitCompare, Clock, Pill, Target, Lightbulb, Settings, ShieldCheck, BellRing,
  FileHeart, QrCode, HeartPulse,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}
