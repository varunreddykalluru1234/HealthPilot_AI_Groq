import { useState } from 'react';
import { UserCircle, User, Heart, Pill, Moon, Target, Edit2, Save, X, Sparkles, Plus, FileHeart, ExternalLink, ShieldCheck, Camera } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { nowISO, uid } from '@/utils/helpers';

export function ProfilePage() {
  const { state, dispatch, isDemo } = useApp();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(state.profile);

  if (!state.profile) {
    return <div className="text-center py-12 text-navy-400">No profile found. Please complete onboarding.</div>;
  }

  const profile = state.profile;
  const abha = state.abhaConnection;

  const handleAvatarChange = (newUrl: string) => {
    update('avatarUrl', newUrl);
    dispatch({
      type: 'UPDATE_PROFILE',
      profile: { ...profile, avatarUrl: newUrl, updatedAt: nowISO() },
    });
    showToast('Profile picture updated successfully.', 'success');
  };

  const handleSave = () => {
    if (!form) return;
    dispatch({ type: 'UPDATE_PROFILE', profile: { ...form, updatedAt: nowISO() } });

    // Automatically sync updated vitals as measurements for Dashboard tracking
    const ts = nowISO();
    if (form.weight !== undefined && form.weight !== profile.weight) {
      dispatch({
        type: 'ADD_MEASUREMENT',
        measurement: {
          id: uid('meas-'),
          type: 'weight',
          value: form.weight,
          unit: 'kg',
          date: ts,
          source: 'user',
          sourceLabel: 'Health Profile',
          createdAt: ts,
        },
      });
    }
    if ((form.bloodPressureSystolic !== undefined || form.bloodPressureDiastolic !== undefined) &&
        (form.bloodPressureSystolic !== profile.bloodPressureSystolic || form.bloodPressureDiastolic !== profile.bloodPressureDiastolic)) {
      dispatch({
        type: 'ADD_MEASUREMENT',
        measurement: {
          id: uid('meas-'),
          type: 'blood_pressure',
          value: form.bloodPressureSystolic || 120,
          secondaryValue: form.bloodPressureDiastolic || 80,
          unit: 'mmHg',
          secondaryUnit: 'mmHg',
          date: ts,
          source: 'user',
          sourceLabel: 'Health Profile',
          createdAt: ts,
        },
      });
    }
    if (form.heartRate !== undefined && form.heartRate !== profile.heartRate) {
      dispatch({
        type: 'ADD_MEASUREMENT',
        measurement: {
          id: uid('meas-'),
          type: 'heart_rate',
          value: form.heartRate,
          unit: 'bpm',
          date: ts,
          source: 'user',
          sourceLabel: 'Health Profile',
          createdAt: ts,
        },
      });
    }
    if (form.sleepHours !== undefined && form.sleepHours !== profile.sleepHours) {
      dispatch({
        type: 'ADD_MEASUREMENT',
        measurement: {
          id: uid('meas-'),
          type: 'sleep',
          value: form.sleepHours,
          unit: 'hours',
          date: ts,
          source: 'user',
          sourceLabel: 'Health Profile',
          createdAt: ts,
        },
      });
    }

    setEditing(false);
    showToast('Health profile updated successfully.', 'success');
  };

  const handleCancel = () => {
    setForm(profile);
    setEditing(false);
  };

  const update = (key: string, value: string | number | string[] | undefined) => setForm((prev) => prev ? { ...prev, [key]: value } : prev);

  const addListItem = (key: 'conditions' | 'allergies' | 'medications' | 'familyHistory' | 'goals', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setForm((prev) => prev && !prev[key].includes(trimmed) ? { ...prev, [key]: [...prev[key], trimmed] } : prev);
  };

  const removeListItem = (key: 'conditions' | 'allergies' | 'medications' | 'familyHistory' | 'goals', value: string) => {
    setForm((prev) => prev ? { ...prev, [key]: prev[key].filter((v) => v !== value) } : prev);
  };

  const InfoRow = ({ label, value }: { label: string; value: string | undefined }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-navy-400">{label}</span>
      <span className="text-sm font-medium text-navy-700">{value || 'Not provided'}</span>
    </div>
  );

  const ListRow = ({ label, items }: { label: string; items: string[] }) => (
    <div className="py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-navy-400">{label}</span>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {items.map((item, i) => <Badge key={i} variant="slate">{item}</Badge>)}
        </div>
      ) : (
        <p className="text-sm text-navy-300 mt-1">None recorded</p>
      )}
    </div>
  );

  const ChipInput = ({ label, items, onAdd, onRemove, placeholder }: { label: string; items: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; placeholder: string }) => {
    const [value, setValue] = useState('');
    return (
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1">{label}</label>
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {items.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-lg">
                {item}
                <button onClick={() => onRemove(item)} className="hover:text-teal-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(value); setValue(''); } }}
            placeholder={placeholder}
            className="flex-1 input-base"
          />
          <button
            onClick={() => { onAdd(value); setValue(''); }}
            disabled={!value.trim()}
            className="px-3 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Profile"
        subtitle="Your complete health information"
        icon={<UserCircle className="w-5 h-5" />}
        action={editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} leftIcon={<X className="w-4 h-4" />}>Cancel</Button>
            <Button size="sm" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>Save</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => { setForm(profile); setEditing(true); }} leftIcon={<Edit2 className="w-4 h-4" />}>Edit Profile</Button>
        )}
      />

      {isDemo && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <p className="text-sm text-amber-700">This is a Demo Profile. Sample data is clearly labeled and separate from real user data.</p>
        </div>
      )}

      {/* Profile Hero Card with Avatar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50/80 to-teal-50/30 p-6 sm:p-7 border border-slate-200/90 shadow-card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar with Camera edit button */}
          <div className="flex flex-col items-center">
            <UserAvatar
              name={profile.fullName}
              avatarUrl={profile.avatarUrl}
              size="xl"
              showStatus={true}
              editable={true}
              onAvatarChange={handleAvatarChange}
            />
            <span className="text-[11px] text-teal-700 font-semibold mt-2.5 flex items-center gap-1 hover:underline cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              Change Photo
            </span>
          </div>

          {/* Profile Identity Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="font-heading font-extrabold text-navy-950 text-2xl tracking-tight">
                {profile.fullName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Patient
              </span>
            </div>

            <p className="text-xs sm:text-sm text-navy-500 font-medium">{profile.email}</p>

            {/* Quick Health Stats Pills */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
              {profile.age && (
                <span className="px-3 py-1 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-navy-700 shadow-xs">
                  {profile.age} Years Old
                </span>
              )}
              {profile.gender && (
                <span className="px-3 py-1 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-navy-700 shadow-xs">
                  {profile.gender}
                </span>
              )}
              {profile.bloodGroup && (
                <span className="px-3 py-1 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-bold text-rose-700 shadow-xs">
                  Blood Group: {profile.bloodGroup}
                </span>
              )}
              {profile.height && (
                <span className="px-3 py-1 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-navy-700 shadow-xs">
                  {profile.height} cm
                </span>
              )}
              {profile.weight && (
                <span className="px-3 py-1 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-navy-700 shadow-xs">
                  {profile.weight} kg
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader title="Personal Information" icon={<User className="w-5 h-5" />} />
        <CardBody>
          {editing && form ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Full name" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
              <Input
                label="Age (years)"
                type="number"
                value={form.age?.toString() ?? ''}
                onChange={(e) => update('age', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g. 34"
              />
              <Input
                label="Date of birth"
                type="date"
                value={form.dateOfBirth ?? ''}
                onChange={(e) => {
                  const dob = e.target.value;
                  update('dateOfBirth', dob);
                  if (dob) {
                    const birth = new Date(dob);
                    if (!isNaN(birth.getTime())) {
                      const today = new Date();
                      let age = today.getFullYear() - birth.getFullYear();
                      const m = today.getMonth() - birth.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                        age--;
                      }
                      if (age >= 0 && age < 130) {
                        update('age', age);
                      }
                    }
                  }
                }}
              />
              <Select label="Gender" value={form.gender ?? ''} onChange={(e) => update('gender', e.target.value)}
                options={[{ value: '', label: 'Prefer not to say' }, { value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }, { value: 'Non-binary', label: 'Non-binary' }, { value: 'Other', label: 'Other' }]} />
              <Input label="Email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-x-8">
              <InfoRow label="Name" value={profile.fullName} />
              <InfoRow label="Age" value={profile.age ? `${profile.age} years` : undefined} />
              <InfoRow label="Date of birth" value={profile.dateOfBirth} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow label="Email" value={profile.email} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* ABDM / ABHA Digital Identity */}
      <Card className="border-teal-100">
        <CardHeader title="ABDM / ABHA Digital Identity" icon={<FileHeart className="w-5 h-5 text-teal-600" />} />
        <CardBody>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-navy-500 uppercase tracking-wider">Status:</span>
                {abha?.isConnected ? (
                  <Badge variant="teal" icon={<ShieldCheck className="w-3 h-3 text-emerald-600" />}>Demo Connected</Badge>
                ) : (
                  <Badge variant="slate">Not Connected</Badge>
                )}
              </div>
              <p className="text-sm font-bold text-navy-800">
                {abha?.isConnected ? (
                  <span>ABHA ID: <span className="font-mono text-teal-700">{abha.abhaId}</span> ({abha.abhaAddress})</span>
                ) : (
                  'Connect ABHA ID for simulated digital health record exchange'
                )}
              </p>
              <p className="text-xs text-navy-400">
                {abha?.isConnected
                  ? `Simulated consent active • Facility: ${abha.hipName || 'Apollo Diagnostics (HIP)'}`
                  : 'Ayushman Bharat Digital Mission (ABDM) integration simulation'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('abha')}
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              {abha?.isConnected ? 'Manage ABHA & Records' : 'Connect ABHA (Demo)'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Vitals */}
      <Card>
        <CardHeader title="Vitals" icon={<Heart className="w-5 h-5" />} />
        <CardBody>
          {editing && form ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Height (cm)" type="number" value={form.height?.toString() ?? ''} onChange={(e) => update('height', e.target.value ? parseFloat(e.target.value) : undefined)} />
              <Input label="Weight (kg)" type="number" value={form.weight?.toString() ?? ''} onChange={(e) => update('weight', e.target.value ? parseFloat(e.target.value) : undefined)} />
              <Input label="Blood pressure (systolic)" type="number" value={form.bloodPressureSystolic?.toString() ?? ''} onChange={(e) => update('bloodPressureSystolic', e.target.value ? parseInt(e.target.value) : undefined)} />
              <Input label="Blood pressure (diastolic)" type="number" value={form.bloodPressureDiastolic?.toString() ?? ''} onChange={(e) => update('bloodPressureDiastolic', e.target.value ? parseInt(e.target.value) : undefined)} />
              <Input label="Heart rate (bpm)" type="number" value={form.heartRate?.toString() ?? ''} onChange={(e) => update('heartRate', e.target.value ? parseInt(e.target.value) : undefined)} />
              <Select label="Blood group" value={form.bloodGroup ?? ''} onChange={(e) => update('bloodGroup', e.target.value)}
                options={[{ value: '', label: 'Select' }, ...['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => ({ value: b, label: b }))]} />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-x-8">
              <InfoRow label="Height" value={profile.height ? `${profile.height} cm` : undefined} />
              <InfoRow label="Weight" value={profile.weight ? `${profile.weight} kg` : undefined} />
              <InfoRow label="Blood pressure" value={profile.bloodPressureSystolic ? `${profile.bloodPressureSystolic}/${profile.bloodPressureDiastolic} mmHg` : undefined} />
              <InfoRow label="Heart rate" value={profile.heartRate ? `${profile.heartRate} bpm` : undefined} />
              <InfoRow label="Blood group" value={profile.bloodGroup} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Medical Information */}
      <Card>
        <CardHeader title="Medical Information" icon={<Pill className="w-5 h-5" />} />
        <CardBody>
          {editing && form ? (
            <div className="space-y-4">
              <ChipInput label="Conditions" items={form.conditions} onAdd={(v) => addListItem('conditions', v)} onRemove={(v) => removeListItem('conditions', v)} placeholder="e.g., Hypothyroidism" />
              <ChipInput label="Allergies" items={form.allergies} onAdd={(v) => addListItem('allergies', v)} onRemove={(v) => removeListItem('allergies', v)} placeholder="e.g., Penicillin" />
              <ChipInput label="Medications" items={form.medications} onAdd={(v) => addListItem('medications', v)} onRemove={(v) => removeListItem('medications', v)} placeholder="e.g., Levothyroxine" />
              <ChipInput label="Family history" items={form.familyHistory} onAdd={(v) => addListItem('familyHistory', v)} onRemove={(v) => removeListItem('familyHistory', v)} placeholder="e.g., Diabetes" />
            </div>
          ) : (
            <div className="space-y-2">
              <ListRow label="Conditions" items={profile.conditions} />
              <ListRow label="Allergies" items={profile.allergies} />
              <ListRow label="Medications" items={profile.medications} />
              <ListRow label="Family history" items={profile.familyHistory} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Lifestyle */}
      <Card>
        <CardHeader title="Lifestyle" icon={<Moon className="w-5 h-5" />} />
        <CardBody>
          {editing && form ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Sleep (hours/night)" type="number" value={form.sleepHours?.toString() ?? ''} onChange={(e) => update('sleepHours', e.target.value ? parseFloat(e.target.value) : undefined)} />
              <Select label="Exercise frequency" value={form.exerciseFrequency ?? ''} onChange={(e) => update('exerciseFrequency', e.target.value)}
                options={[{ value: '', label: 'Select' }, ...['Rarely', '1-2x per week', '3x per week', '4-5x per week', 'Daily'].map((f) => ({ value: f, label: f }))]} />
              <Select label="Diet" value={form.diet ?? ''} onChange={(e) => update('diet', e.target.value)}
                options={[{ value: '', label: 'Select' }, ...['Balanced', 'Vegetarian', 'Vegan', 'Low-carb', 'Mediterranean', 'Other'].map((d) => ({ value: d, label: d }))]} />
              <Input label="Water intake (glasses/day)" type="number" value={form.waterIntake?.toString() ?? ''} onChange={(e) => update('waterIntake', e.target.value ? parseInt(e.target.value) : undefined)} />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-x-8">
              <InfoRow label="Sleep" value={profile.sleepHours ? `${profile.sleepHours} hours/night` : undefined} />
              <InfoRow label="Exercise" value={profile.exerciseFrequency} />
              <InfoRow label="Diet" value={profile.diet} />
              <InfoRow label="Water intake" value={profile.waterIntake ? `${profile.waterIntake} glasses/day` : undefined} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader title="Health Goals" icon={<Target className="w-5 h-5" />} />
        <CardBody>
          {editing && form ? (
            <ChipInput
              label="Active Health Goals"
              items={form.goals}
              onAdd={(v) => addListItem('goals', v)}
              onRemove={(v) => removeListItem('goals', v)}
              placeholder="e.g., Improve sleep, Track blood pressure, Daily 8k steps"
            />
          ) : profile.goals.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.goals.map((g, i) => <Badge key={i} variant="teal">{g}</Badge>)}
            </div>
          ) : (
            <p className="text-sm text-navy-300">No goals set yet. Visit the Health Goals page or click Edit Profile to add your health goals.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
