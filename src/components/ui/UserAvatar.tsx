import { useState, useRef, type ChangeEvent } from 'react';
import { Camera, Sparkles, Check, Upload, User, HeartPulse, Activity, Stethoscope } from 'lucide-react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showStatus?: boolean;
  statusColor?: string;
  editable?: boolean;
  onAvatarChange?: (newUrl: string) => void;
  className?: string;
}

const sizeConfig = {
  xs: {
    container: 'w-7 h-7 text-xs',
    dot: 'w-2 h-2 -bottom-0.5 -right-0.5 border',
    icon: 'w-3.5 h-3.5',
    camera: 'w-2.5 h-2.5',
  },
  sm: {
    container: 'w-9 h-9 text-xs',
    dot: 'w-2.5 h-2.5 bottom-0 right-0 border-[1.5px]',
    icon: 'w-4 h-4',
    camera: 'w-3 h-3',
  },
  md: {
    container: 'w-12 h-12 text-sm',
    dot: 'w-3 h-3 bottom-0 right-0 border-2',
    icon: 'w-5 h-5',
    camera: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'w-16 h-16 text-base',
    dot: 'w-3.5 h-3.5 bottom-0.5 right-0.5 border-2',
    icon: 'w-7 h-7',
    camera: 'w-4 h-4',
  },
  xl: {
    container: 'w-20 h-20 text-xl',
    dot: 'w-4 h-4 bottom-1 right-1 border-2',
    icon: 'w-9 h-9',
    camera: 'w-5 h-5',
  },
  '2xl': {
    container: 'w-28 h-28 text-2xl',
    dot: 'w-5 h-5 bottom-1.5 right-1.5 border-2',
    icon: 'w-12 h-12',
    camera: 'w-6 h-6',
  },
};

export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250',
];

export function UserAvatar({
  name = 'User',
  avatarUrl,
  size = 'md',
  showStatus = true,
  statusColor = 'bg-emerald-500',
  editable = false,
  onAvatarChange,
  className = '',
}: UserAvatarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase() || 'U';
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          onAvatarChange(event.target.result);
          setModalOpen(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const currentSize = sizeConfig[size];

  return (
    <>
      <div className={`relative inline-block flex-shrink-0 group ${className}`}>
        {/* Glowing Gradient Border Ring */}
        <div className="absolute -inset-0.5 bg-gradient-to-tr from-teal-500 via-emerald-400 to-cyan-500 rounded-full blur-xs opacity-80 group-hover:opacity-100 transition duration-300" />

        {/* Circular Avatar Body */}
        <div
          onClick={() => editable && setModalOpen(true)}
          className={`relative ${currentSize.container} rounded-full overflow-hidden border-2 border-white shadow-md flex items-center justify-center select-none ${
            editable ? 'cursor-pointer' : ''
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            /* Sleek Dark MedTech Obsidian Gradient with Vibrant Shine */
            <div className="w-full h-full bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center relative overflow-hidden">
              {/* Radial inner glow */}
              <div className="absolute inset-0 bg-radial from-teal-500/20 via-transparent to-transparent pointer-events-none" />
              <span className="font-heading font-extrabold text-white tracking-wider drop-shadow-sm">
                {getInitials(name)}
              </span>
            </div>
          )}

          {/* Edit Hover Overlay */}
          {editable && (
            <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white">
              <Camera className={`${currentSize.camera}`} />
              {size === 'xl' || size === '2xl' ? (
                <span className="text-[10px] font-semibold mt-1">Change</span>
              ) : null}
            </div>
          )}
        </div>

        {/* Live Active Status Indicator Dot */}
        {showStatus && (
          <span
            className={`absolute ${currentSize.dot} ${statusColor} rounded-full border-white shadow-xs z-10`}
            title="Active Patient Sync"
          >
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75 pointer-events-none" />
          </span>
        )}
      </div>

      {/* Avatar Picker Modal */}
      {modalOpen && editable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/90 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-heading font-bold text-navy-900 text-lg">Update Profile Picture</h3>
                <p className="text-xs text-navy-400 mt-0.5">Upload a photo or select a clinical avatar</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-navy-400 hover:text-navy-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Preview */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-teal-500 shadow-md">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center text-white font-heading font-bold text-lg">
                      {getInitials(name)}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="font-heading font-bold text-navy-900 text-sm">{name}</p>
                <p className="text-xs text-navy-400">Personal Health Account</p>
                {avatarUrl && (
                  <button
                    onClick={() => {
                      onAvatarChange?.('');
                      setModalOpen(false);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 mt-1 cursor-pointer"
                  >
                    Remove picture & use initials
                  </button>
                )}
              </div>
            </div>

            {/* Upload Custom File */}
            <div>
              <p className="text-xs font-semibold text-navy-700 mb-2">Upload from computer</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/70 text-teal-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-teal-600" />
                <span>Upload image (PNG, JPG, WebP)</span>
              </button>
            </div>

            {/* Preset Avatars Selection */}
            <div>
              <p className="text-xs font-semibold text-navy-700 mb-2">Or choose a profile avatar</p>
              <div className="grid grid-cols-6 gap-2.5">
                {PRESET_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onAvatarChange?.(url);
                      setModalOpen(false);
                    }}
                    className={`relative rounded-full aspect-square overflow-hidden border-2 transition-all hover:scale-105 cursor-pointer ${
                      avatarUrl === url ? 'border-teal-600 ring-2 ring-teal-500/30' : 'border-slate-200 hover:border-teal-400'
                    }`}
                  >
                    <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                    {avatarUrl === url && (
                      <span className="absolute inset-0 bg-teal-600/40 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-navy-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
