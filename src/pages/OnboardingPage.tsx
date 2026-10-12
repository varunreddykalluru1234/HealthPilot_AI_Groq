import { useState } from 'react';
import { Activity, ArrowRight, ArrowLeft, Check, Sparkles, User, Heart, Pill, Moon, Target } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { uid, nowISO } from '@/utils/helpers';
import type { UserProfile, HealthMeasurement } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface OnboardingPageProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const steps = [
  { num: 1, title: 'Personal Information', icon: User, desc: 'Tell us about yourself' },
  { num: 2, title: 'Basic Health', icon: Heart, desc: 'Your vitals and measurements' },
  { num: 3, title: 'Health Information', icon: Pill, desc: 'Conditions, allergies, medications' },
  { num: 4, title: 'Lifestyle', icon: Moon, desc: 'Sleep, exercise, diet, hydration' },
  { num: 5, title: 'Health Goals', icon: Target, desc: 'What do you want to achieve?' },
];

const goalOptions = [
  'Improve sleep', 'Improve fitness', 'Maintain weight', 'Track blood pressure',
  'Stay consistent with medication', 'Understand health reports', 'Increase activity', 'Track hydration',
];

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { state, dispatch } = useApp();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState({
    fullName: state.profile?.fullName ?? '',
    avatarUrl: state.profile?.avatarUrl ?? '',
    age: '',
    dateOfBirth: '',
    gender: '',
    height: '',
    weight: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    bloodGroup: '',
    conditions: '',
    allergies: '',
    medications: '',
    familyHistory: '',
    sleepHours: '',
    exerciseFrequency: '',
    diet: '',
    waterIntake: '',
    selectedGoals: [] as string[],
  });

  const update = (key: string, value: string | string[]) => setData((prev) => ({ ...prev, [key]: value }));

  const toggleGoal = (goal: string) => {
    setData((prev) => ({
      ...prev,
      selectedGoals: prev.selectedGoals.includes(goal)
        ? prev.selectedGoals.filter((g) => g !== goal)
        : [...prev.selectedGoals, goal],
    }));
  };

  const canProceed = (): boolean => {
    if (currentStep === 1) return !!data.fullName.trim();
    return true;
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleComplete = () => {
    const profile: UserProfile = {
      id: state.profile?.id ?? uid('prof-'),
      mode: 'real',
      fullName: data.fullName,
      email: state.profile?.email ?? '',
      avatarUrl: data.avatarUrl || undefined,
      age: data.age ? parseInt(data.age) : undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      gender: data.gender || undefined,
      height: data.height ? parseFloat(data.height) : undefined,
      weight: data.weight ? parseFloat(data.weight) : undefined,
      bloodPressureSystolic: data.bloodPressureSystolic ? parseInt(data.bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: data.bloodPressureDiastolic ? parseInt(data.bloodPressureDiastolic) : undefined,
      heartRate: data.heartRate ? parseInt(data.heartRate) : undefined,
      bloodGroup: data.bloodGroup || undefined,
      conditions: data.conditions ? data.conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      allergies: data.allergies ? data.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
      medications: data.medications ? data.medications.split(',').map((s) => s.trim()).filter(Boolean) : [],
      familyHistory: data.familyHistory ? data.familyHistory.split(',').map((s) => s.trim()).filter(Boolean) : [],
      sleepHours: data.sleepHours ? parseFloat(data.sleepHours) : undefined,
      exerciseFrequency: data.exerciseFrequency || undefined,
      diet: data.diet || undefined,
      waterIntake: data.waterIntake ? parseInt(data.waterIntake) : undefined,
      goals: data.selectedGoals,
      createdAt: state.profile?.createdAt ?? nowISO(),
      updatedAt: nowISO(),
    };

    const measurementsToCreate: HealthMeasurement[] = [];
    const ts = nowISO();

    if (data.weight) {
      measurementsToCreate.push({
        id: uid('meas-'),
        type: 'weight',
        value: parseFloat(data.weight),
        unit: 'kg',
        date: ts,
        source: 'user',
        sourceLabel: 'Onboarding',
        createdAt: ts,
      });
    }
    if (data.bloodPressureSystolic) {
      measurementsToCreate.push({
        id: uid('meas-'),
        type: 'blood_pressure',
        value: parseFloat(data.bloodPressureSystolic),
        secondaryValue: data.bloodPressureDiastolic ? parseFloat(data.bloodPressureDiastolic) : undefined,
        unit: 'mmHg',
        secondaryUnit: 'mmHg',
        date: ts,
        source: 'user',
        sourceLabel: 'Onboarding',
        createdAt: ts,
      });
    }
    if (data.heartRate) {
      measurementsToCreate.push({
        id: uid('meas-'),
        type: 'heart_rate',
        value: parseFloat(data.heartRate),
        unit: 'bpm',
        date: ts,
        source: 'user',
        sourceLabel: 'Onboarding',
        createdAt: ts,
      });
    }
    if (data.sleepHours) {
      measurementsToCreate.push({
        id: uid('meas-'),
        type: 'sleep',
        value: parseFloat(data.sleepHours),
        unit: 'hours',
        date: ts,
        source: 'user',
        sourceLabel: 'Onboarding',
        createdAt: ts,
      });
    }

    dispatch({ type: 'SET_ONBOARDED', profile });
    measurementsToCreate.forEach((m) => dispatch({ type: 'ADD_MEASUREMENT', measurement: m }));
    showToast('Your HealthPilot profile is ready!', 'success');
    onComplete();
  };

  const handleSkipAll = () => {
    // Build the profile to mark as onboarded. If one already exists (e.g. a
    // returning user) keep it intact; otherwise create a minimal stub so that
    // SET_ONBOARDED always fires and isOnboarded is set to true. Without this
    // guard, a fresh Supabase sign-in (state.profile === null) would silently
    // skip the dispatch, leave isOnboarded=false, and trap the user here.
    const profile: UserProfile = state.profile ?? {
      id: uid('prof-'),
      mode: 'real',
      fullName: '',
      email: '',
      conditions: [],
      allergies: [],
      medications: [],
      familyHistory: [],
      goals: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    dispatch({ type: 'SET_ONBOARDED', profile });
    showToast('Onboarding skipped. You can complete your profile later.', 'info');
    onComplete();
  };

  const progress = (currentStep / steps.length) * 100;
  const StepIcon = steps[currentStep - 1].icon;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-navy-800">HealthPilot AI</span>
          </div>
          <button onClick={handleSkipAll} className="text-sm text-navy-400 hover:text-navy-600 transition-colors">
            Skip for now
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <StepIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-navy-400">Step {currentStep} of {steps.length}</p>
                  <h2 className="font-semibold text-navy-800">{steps[currentStep - 1].title}</h2>
                </div>
              </div>
              <span className="text-sm font-medium text-teal-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Step indicators */}
          <div className="hidden sm:flex items-center justify-between mb-8">
            {steps.map((s) => (
              <div key={s.num} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  currentStep > s.num ? 'bg-teal-600 text-white' : currentStep === s.num ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-400' : 'bg-slate-100 text-navy-300'
                }`}>
                  {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                {s.num < steps.length && <div className={`w-12 h-0.5 mx-1 ${currentStep > s.num ? 'bg-teal-600' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 sm:p-8 animate-fade-in">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-2">
                  <UserAvatar
                    name={data.fullName || 'User'}
                    avatarUrl={data.avatarUrl}
                    size="xl"
                    editable={true}
                    onAvatarChange={(url) => update('avatarUrl', url)}
                  />
                  <p className="text-xs text-navy-400 mt-2 font-medium">Click to upload or choose a profile photo</p>
                </div>
                <Input label="Full name" placeholder="Jane Doe" value={data.fullName} onChange={(e) => update('fullName', e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Age" type="number" placeholder="34" value={data.age} onChange={(e) => update('age', e.target.value)} />
                  <Input label="Date of birth" type="date" value={data.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
                </div>
                <Select
                  label="Gender"
                  value={data.gender}
                  onChange={(e) => update('gender', e.target.value)}
                  options={[
                    { value: '', label: 'Prefer not to say' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Male', label: 'Male' },
                    { value: 'Non-binary', label: 'Non-binary' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Height (cm)" type="number" placeholder="168" value={data.height} onChange={(e) => update('height', e.target.value)} />
                  <Input label="Weight (kg)" type="number" placeholder="64.5" value={data.weight} onChange={(e) => update('weight', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="BP Systolic (mmHg)" type="number" placeholder="120" value={data.bloodPressureSystolic} onChange={(e) => update('bloodPressureSystolic', e.target.value)} />
                  <Input label="BP Diastolic (mmHg)" type="number" placeholder="80" value={data.bloodPressureDiastolic} onChange={(e) => update('bloodPressureDiastolic', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Heart rate (bpm)" type="number" placeholder="72" value={data.heartRate} onChange={(e) => update('heartRate', e.target.value)} />
                  <Select
                    label="Blood group"
                    value={data.bloodGroup}
                    onChange={(e) => update('bloodGroup', e.target.value)}
                    options={[
                      { value: '', label: 'Select blood group' },
                      { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
                      { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
                      { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
                      { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
                    ]}
                  />
                </div>
                <p className="text-xs text-navy-400">All fields are optional. You can update them later in your Health Profile.</p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <Input label="Existing conditions" placeholder="e.g., Hypothyroidism, Asthma (comma-separated)" value={data.conditions} onChange={(e) => update('conditions', e.target.value)} hint="Leave empty if none" />
                <Input label="Allergies" placeholder="e.g., Penicillin, Peanuts (comma-separated)" value={data.allergies} onChange={(e) => update('allergies', e.target.value)} hint="Leave empty if none" />
                <Input label="Current medications" placeholder="e.g., Levothyroxine 50mcg (comma-separated)" value={data.medications} onChange={(e) => update('medications', e.target.value)} hint="List medications prescribed by your healthcare professional" />
                <Input label="Family history" placeholder="e.g., Father: Diabetes (comma-separated)" value={data.familyHistory} onChange={(e) => update('familyHistory', e.target.value)} hint="Optional but useful for preventive care" />
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <Input label="Average sleep (hours per night)" type="number" placeholder="7" value={data.sleepHours} onChange={(e) => update('sleepHours', e.target.value)} />
                <Select
                  label="Exercise frequency"
                  value={data.exerciseFrequency}
                  onChange={(e) => update('exerciseFrequency', e.target.value)}
                  options={[
                    { value: '', label: 'Select frequency' },
                    { value: 'Rarely', label: 'Rarely' },
                    { value: '1-2x per week', label: '1-2x per week' },
                    { value: '3x per week', label: '3x per week' },
                    { value: '4-5x per week', label: '4-5x per week' },
                    { value: 'Daily', label: 'Daily' },
                  ]}
                />
                <Select
                  label="Diet"
                  value={data.diet}
                  onChange={(e) => update('diet', e.target.value)}
                  options={[
                    { value: '', label: 'Select diet type' },
                    { value: 'Balanced', label: 'Balanced' },
                    { value: 'Vegetarian', label: 'Vegetarian' },
                    { value: 'Vegan', label: 'Vegan' },
                    { value: 'Low-carb', label: 'Low-carb' },
                    { value: 'Mediterranean', label: 'Mediterranean' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
                <Input label="Water intake (glasses per day)" type="number" placeholder="8" value={data.waterIntake} onChange={(e) => update('waterIntake', e.target.value)} />
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <p className="text-sm text-navy-500 mb-4">Select the health goals you'd like to work toward. You can change these later.</p>
                <div className="grid grid-cols-2 gap-2">
                  {goalOptions.map((goal) => (
                    <button
                      key={goal}
                      onClick={() => toggleGoal(goal)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        data.selectedGoals.includes(goal)
                          ? 'border-teal-400 bg-teal-50 text-teal-700'
                          : 'border-slate-200 text-navy-600 hover:border-slate-300'
                      }`}
                    >
                      {data.selectedGoals.includes(goal) && <Check className="w-4 h-4 text-teal-600" />}
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button onClick={handleNext} disabled={!canProceed()} rightIcon={currentStep < 5 ? <ArrowRight className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}>
                {currentStep < 5 ? 'Continue' : 'Complete Setup'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
