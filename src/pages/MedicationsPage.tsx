import { useState } from 'react';
import { Pill, Plus, Edit2, Trash2, Check, Clock, X, Sparkles, Bell, Calendar } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, uid, nowISO, todayISO } from '@/utils/helpers';
import type { Medication, Reminder } from '@/types';

export function MedicationsPage() {
  const { state, dispatch, isDemo } = useApp();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [form, setForm] = useState({
    name: '', dosage: '', frequency: 'Once daily', time: '08:00',
    startDate: todayISO(), endDate: '', notes: '',
  });

  const openAdd = () => {
    setEditingMed(null);
    setForm({ name: '', dosage: '', frequency: 'Once daily', time: '08:00', startDate: todayISO(), endDate: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (med: Medication) => {
    setEditingMed(med);
    setForm({
      name: med.name, dosage: med.dosage, frequency: med.frequency, time: med.time,
      startDate: med.startDate.split('T')[0], endDate: med.endDate?.split('T')[0] ?? '', notes: med.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.dosage.trim()) {
      showToast('Please enter medication name and dosage.', 'error');
      return;
    }
    if (editingMed) {
      dispatch({ type: 'UPDATE_MEDICATION', medication: {
        ...editingMed, name: form.name, dosage: form.dosage, frequency: form.frequency,
        time: form.time, startDate: form.startDate, endDate: form.endDate || undefined,
        notes: form.notes || undefined, updatedAt: nowISO(),
      }});
      showToast('Medication updated successfully.', 'success');
    } else {
      const med: Medication = {
        id: uid('med-'), name: form.name, dosage: form.dosage, frequency: form.frequency,
        time: form.time, startDate: form.startDate, endDate: form.endDate || undefined,
        notes: form.notes || undefined, source: isDemo ? 'demo' : 'user',
        takenToday: false, adherence: 0, createdAt: nowISO(), updatedAt: nowISO(),
      };
      dispatch({ type: 'ADD_MEDICATION', medication: med });
      // Also create a reminder
      const reminder: Reminder = {
        id: uid('rem-'), title: `Take ${form.name}`, type: 'medication',
        date: todayISO(), time: form.time, completed: false, createdAt: nowISO(),
      };
      dispatch({ type: 'ADD_REMINDER', reminder });
      showToast('Medication added with reminder.', 'success');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_MEDICATION', id });
    showToast('Medication deleted.', 'success');
  };

  const handleToggleTaken = (id: string) => {
    dispatch({ type: 'TOGGLE_MEDICATION_TAKEN', id });
  };

  // ISO date string for today — used to derive the real taken state at render
  // time so that stale localStorage data (no lastTakenDate field) is handled
  // gracefully without any migration.
  const todayStr = new Date().toISOString().split('T')[0];

  // Derive live adherence from takenDates when available, else fall back to
  // the stored value (covers demo medications that have no takenDates array).
  const liveAdherence = (med: import('@/types').Medication): number => {
    if (!med.takenDates || med.takenDates.length === 0) return med.adherence;
    const start = new Date(med.startDate);
    if (isNaN(start.getTime())) return med.adherence;
    const totalDays =
      Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    if (totalDays <= 0) return 0;
    return Math.min(
      100,
      Math.round((med.takenDates.length / totalDays) * 100)
    );
  };

  const frequencyOptions = [
    { value: 'Once daily', label: 'Once daily' },
    { value: 'Twice daily', label: 'Twice daily' },
    { value: 'Three times daily', label: 'Three times daily' },
    { value: 'As needed', label: 'As needed' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Every other day', label: 'Every other day' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medications & Reminders"
        subtitle="Organize medications prescribed by your healthcare professional"
        icon={<Pill className="w-5 h-5" />}
        action={<Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Medication</Button>}
      />

      <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-2">
        <Pill className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">This feature helps you organize medications prescribed by your healthcare professional. HealthPilot AI never prescribes medication.</p>
      </div>

      {state.medications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Pill className="w-8 h-8" />}
            title="No medications recorded"
            description="Add medications that have been prescribed by your healthcare professional to keep track of dosages, schedules, and adherence."
            action={<Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Medication</Button>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {state.medications.map((med) => (
            <Card key={med.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-800">{med.name}</h3>
                    <p className="text-xs text-navy-400">{med.dosage}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(med)} className="p-1.5 rounded-lg hover:bg-slate-100 text-navy-400"><Edit2 className="w-4 h-4" /></button>
                  {med.source !== 'demo' && (
                    <button onClick={() => handleDelete(med.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-navy-300" /><span className="text-navy-600">{med.frequency}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-navy-300" /><span className="text-navy-600">{med.time}</span></div>
                <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-navy-300" /><span className="text-navy-600">Since {formatDate(med.startDate, { month: 'short', year: 'numeric' })}</span></div>
                {med.endDate && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-navy-300" /><span className="text-navy-600">Until {formatDate(med.endDate, { month: 'short', year: 'numeric' })}</span></div>}
              </div>

              {med.notes && <p className="text-xs text-navy-400 mb-3 p-2 bg-slate-50 rounded-lg">{med.notes}</p>}

              {med.source === 'demo' && <div className="mb-3"><Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo Data</Badge></div>}

              {/* Adherence bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-navy-400">Adherence</span>
                  <span className="text-xs font-medium text-navy-600">{liveAdherence(med)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${liveAdherence(med) >= 80 ? 'bg-teal-500' : liveAdherence(med) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${liveAdherence(med)}%` }} />
                </div>
              </div>

              <button
                onClick={() => handleToggleTaken(med.id)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  (med.takenToday && med.lastTakenDate === todayStr)
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'bg-slate-50 text-navy-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {(med.takenToday && med.lastTakenDate === todayStr)
                  ? <><Check className="w-4 h-4" /> Taken today</>
                  : <><Clock className="w-4 h-4" /> Mark as taken</>}
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMed ? 'Edit Medication' : 'Add Medication'}
        subtitle="Record medications prescribed by your healthcare professional"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingMed ? 'Save Changes' : 'Add Medication'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Medication name" placeholder="e.g., Levothyroxine" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Dosage" placeholder="e.g., 50mcg" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
            <Select label="Frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} options={frequencyOptions} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <Input label="End date (optional)" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <Input label="Notes (optional)" placeholder="e.g., Take on empty stomach" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
