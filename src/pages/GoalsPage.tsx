import { useState } from 'react';
import { Target, Plus, Edit2, Trash2, TrendingUp, Calendar, X, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { uid, nowISO, formatDate } from '@/utils/helpers';
import type { HealthGoal } from '@/types';

const goalCategories = [
  { value: 'sleep', label: 'Sleep' },
  { value: 'activity', label: 'Activity' },
  { value: 'weight', label: 'Weight' },
  { value: 'blood_pressure', label: 'Blood Pressure' },
  { value: 'medication', label: 'Medication' },
  { value: 'hydration', label: 'Hydration' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'other', label: 'Other' },
];

export function GoalsPage() {
  const { state, dispatch, isDemo } = useApp();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<HealthGoal | null>(null);
  const [form, setForm] = useState({
    name: '', targetValue: '', currentValue: '', unit: '', category: 'sleep', deadline: '',
  });

  const openAdd = () => {
    setEditingGoal(null);
    setForm({ name: '', targetValue: '', currentValue: '', unit: '', category: 'sleep', deadline: '' });
    setModalOpen(true);
  };

  const openEdit = (goal: HealthGoal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name, targetValue: goal.targetValue.toString(), currentValue: goal.currentValue.toString(),
      unit: goal.unit, category: goal.category, deadline: goal.deadline?.split('T')[0] ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.targetValue || !form.unit) {
      showToast('Please fill in goal name, target value, and unit.', 'error');
      return;
    }
    const target = parseFloat(form.targetValue);
    const current = parseFloat(form.currentValue) || 0;
    const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    if (editingGoal) {
      dispatch({ type: 'UPDATE_GOAL', goal: {
        ...editingGoal, name: form.name, targetValue: target, currentValue: current,
        unit: form.unit, category: form.category, progress, deadline: form.deadline || undefined,
        updatedAt: nowISO(),
      }});
      showToast('Goal updated successfully.', 'success');
    } else {
      const goal: HealthGoal = {
        id: uid('goal-'), name: form.name, targetValue: target, currentValue: current,
        unit: form.unit, progress, category: form.category, source: isDemo ? 'demo' : 'user',
        deadline: form.deadline || undefined, createdAt: nowISO(), updatedAt: nowISO(),
      };
      dispatch({ type: 'ADD_GOAL', goal });
      showToast('Goal created successfully.', 'success');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_GOAL', id });
    showToast('Goal deleted.', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Goals"
        subtitle="Set and track your personal health goals"
        icon={<Target className="w-5 h-5" />}
        action={<Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Goal</Button>}
      />

      {state.goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Target className="w-8 h-8" />}
            title="No health goals yet"
            description="Create your first health goal to start tracking your progress. Goals help you stay motivated and monitor improvements over time."
            action={<Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Goal</Button>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.goals.map((goal) => (
            <Card key={goal.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-800 text-sm">{goal.name}</h3>
                    <p className="text-xs text-navy-400 capitalize">{goal.category.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg hover:bg-slate-100 text-navy-400"><Edit2 className="w-4 h-4" /></button>
                  {goal.source !== 'demo' && (
                    <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>

              {goal.source === 'demo' && <div className="mb-3"><Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo Data</Badge></div>}

              <div className="mb-3">
                <div className="flex items-end justify-between mb-1">
                  <div>
                    <p className="text-2xl font-bold text-navy-800">{goal.currentValue}<span className="text-sm font-normal text-navy-400"> / {goal.targetValue} {goal.unit}</span></p>
                  </div>
                  <span className={`text-sm font-semibold ${goal.progress >= 100 ? 'text-teal-600' : goal.progress >= 50 ? 'text-amber-600' : 'text-navy-400'}`}>{goal.progress}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${goal.progress >= 100 ? 'bg-teal-500' : goal.progress >= 50 ? 'bg-amber-500' : 'bg-navy-300'}`} style={{ width: `${goal.progress}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-navy-400">
                {goal.deadline ? (
                  <><Calendar className="w-3.5 h-3.5" /> Deadline: {formatDate(goal.deadline, { month: 'short', day: 'numeric', year: 'numeric' })}</>
                ) : (
                  <span>No deadline set</span>
                )}
                {goal.progress >= 100 && <Badge variant="teal" icon={<TrendingUp className="w-3 h-3" />}>Achieved</Badge>}
              </div>

              {goal.currentValue === 0 && goal.source !== 'demo' && (
                <p className="text-xs text-navy-300 mt-2 pt-2 border-t border-slate-50">Add data to start tracking this goal.</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGoal ? 'Edit Goal' : 'Create Health Goal'}
        subtitle="Set a target and track your progress"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingGoal ? 'Save Changes' : 'Create Goal'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Goal name" placeholder="e.g., Improve Sleep" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Current value" type="number" placeholder="e.g., 7" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} />
            <Input label="Target value" type="number" placeholder="e.g., 8" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit" placeholder="e.g., hours" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={goalCategories} />
          </div>
          <Input label="Deadline (optional)" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
