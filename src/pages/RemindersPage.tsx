import { useState } from 'react';
import { BellRing, Plus, Edit2, Trash2, Check, Clock, Calendar, Pill, Stethoscope, FlaskConical, Target, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, relativeDate, uid, nowISO, todayISO } from '@/utils/helpers';
import type { Reminder, ReminderType } from '@/types';

const typeConfig: Record<ReminderType, { icon: typeof Pill; color: string; bg: string }> = {
  medication: { icon: Pill, color: 'text-teal-600', bg: 'bg-teal-50' },
  appointment: { icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50' },
  checkup: { icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50' },
  test: { icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50' },
  goal: { icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
};

const typeOptions = [
  { value: 'medication', label: 'Medication' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'checkup', label: 'Checkup' },
  { value: 'test', label: 'Test / Lab Work' },
  { value: 'goal', label: 'Goal Reminder' },
];

type Tab = 'today' | 'upcoming' | 'completed';

export function RemindersPage() {
  const { state, dispatch, isDemo } = useApp();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form, setForm] = useState({
    title: '', type: 'medication' as ReminderType, date: todayISO(), time: '08:00', notes: '',
  });

  const todayDateStr = new Date().toISOString().split('T')[0];

  const openAdd = () => {
    setEditingReminder(null);
    setForm({ title: '', type: 'medication', date: todayISO(), time: '08:00', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setForm({
      title: reminder.title,
      type: reminder.type,
      date: reminder.date.split('T')[0],
      time: reminder.time ?? '08:00',
      notes: reminder.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      showToast('Please enter a reminder title.', 'error');
      return;
    }
    if (editingReminder) {
      dispatch({ type: 'UPDATE_REMINDER', reminder: {
        ...editingReminder,
        title: form.title,
        type: form.type,
        date: new Date(form.date).toISOString(),
        time: form.time || undefined,
        notes: form.notes || undefined,
      }});
      showToast('Reminder updated.', 'success');
    } else {
      const reminder: Reminder = {
        id: uid('rem-'),
        title: form.title,
        type: form.type,
        date: new Date(form.date).toISOString(),
        time: form.time || undefined,
        completed: false,
        notes: form.notes || undefined,
        createdAt: nowISO(),
      };
      dispatch({ type: 'ADD_REMINDER', reminder });
      showToast('Reminder added.', 'success');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_REMINDER', id });
    showToast('Reminder deleted.', 'success');
  };

  const handleToggle = (id: string) => {
    dispatch({ type: 'TOGGLE_REMINDER', id });
  };

  const sortedReminders = [...state.reminders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const todayReminders = sortedReminders.filter((r) => !r.completed && r.date.split('T')[0] === todayDateStr);
  const upcomingReminders = sortedReminders.filter((r) => !r.completed && r.date.split('T')[0] !== todayDateStr);
  const completedReminders = sortedReminders.filter((r) => r.completed);

  const tabCounts: Record<Tab, number> = {
    today: todayReminders.length,
    upcoming: upcomingReminders.length,
    completed: completedReminders.length,
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ];

  const currentList = activeTab === 'today' ? todayReminders : activeTab === 'upcoming' ? upcomingReminders : completedReminders;

  const renderReminderCard = (reminder: Reminder) => {
    const config = typeConfig[reminder.type];
    const Icon = config.icon;
    return (
      <Card key={reminder.id} className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${config.bg} ${config.color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-medium text-navy-800 ${reminder.completed ? 'line-through text-navy-400' : ''}`}>{reminder.title}</h3>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(reminder)} className="p-1.5 rounded-lg hover:bg-slate-100 text-navy-400">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(reminder.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-navy-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(reminder.date, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {reminder.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {reminder.time}
                </span>
              )}
              {isDemo && reminder.createdAt.includes('2024') && (
                <Badge variant="amber">Demo</Badge>
              )}
            </div>
            {reminder.notes && (
              <p className="text-xs text-navy-400 mt-2 p-2 bg-slate-50 rounded-lg">{reminder.notes}</p>
            )}
            {!reminder.completed && (
              <button
                onClick={() => handleToggle(reminder.id)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-slate-50 text-navy-600 border border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all"
              >
                <Check className="w-4 h-4" />
                Mark as done
              </button>
            )}
            {reminder.completed && (
              <button
                onClick={() => handleToggle(reminder.id)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-slate-50 text-navy-400 border border-slate-200 hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
                Mark as not done
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        subtitle="Manage medication, appointment, and checkup reminders"
        icon={<BellRing className="w-5 h-5" />}
        action={<Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Reminder</Button>}
      />

      <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-2">
        <BellRing className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">Reminders help you stay on track with medications, appointments, and health checkups. HealthPilot AI does not provide medical advice.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-navy-800 shadow-sm'
                : 'text-navy-400 hover:text-navy-600'
            }`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-navy-400'
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reminder list */}
      {currentList.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BellRing className="w-8 h-8" />}
            title={activeTab === 'today' ? 'No reminders for today' : activeTab === 'upcoming' ? 'No upcoming reminders' : 'No completed reminders yet'}
            description={activeTab === 'today'
              ? 'Add a reminder for a medication, appointment, or health checkup to stay on track.'
              : activeTab === 'upcoming'
              ? 'Future reminders will appear here once you create them.'
              : 'Completed reminders will appear here so you can review your history.'}
            action={<Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Reminder</Button>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {currentList.map(renderReminderCard)}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingReminder ? 'Edit Reminder' : 'Add Reminder'}
        subtitle="Set a reminder for medications, appointments, or checkups"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingReminder ? 'Save Changes' : 'Add Reminder'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" placeholder="e.g., Take Levothyroxine" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ReminderType })} options={typeOptions} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <Input label="Notes (optional)" placeholder="e.g., Take with water before breakfast" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
