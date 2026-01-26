
import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Target, Calendar, DollarSign, Palette, Car, Home, Plane, Gift, Shield, Briefcase, GraduationCap, Trophy, Smartphone } from 'lucide-react';
import { SavingsGoal } from '../types';

interface GoalFormProps {
  initialData?: SavingsGoal | null;
  onSave: (goal: SavingsGoal) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

const ICONS = [
  { id: 'trophy', icon: Trophy, label: 'General' },
  { id: 'home', icon: Home, label: 'Property' },
  { id: 'car', icon: Car, label: 'Vehicle' },
  { id: 'plane', icon: Plane, label: 'Travel' },
  { id: 'shield', icon: Shield, label: 'Emergency' },
  { id: 'briefcase', icon: Briefcase, label: 'Business' },
  { id: 'grad', icon: GraduationCap, label: 'Education' },
  { id: 'tech', icon: Smartphone, label: 'Tech' },
];

const COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
  'bg-orange-500', 'bg-red-500', 'bg-gold-500', 'bg-neutral-500'
];

export const GoalForm: React.FC<GoalFormProps> = ({ initialData, onSave, onDelete, onCancel }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [selectedIconIdx, setSelectedIconIdx] = useState(0);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTargetAmount(initialData.targetAmount.toString());
      setSavedAmount(initialData.savedAmount.toString());
      setDeadline(initialData.deadline || '');
      setColor(initialData.color);
      // Try to match icon or default to 0
      // In a real app we'd save icon ID, for now we just default since icons are components
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    const newGoal: SavingsGoal = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      name,
      targetAmount: parseFloat(targetAmount),
      savedAmount: parseFloat(savedAmount) || 0,
      deadline: deadline || undefined,
      color,
      icon: ICONS[selectedIconIdx].icon
    };

    onSave(newGoal);
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      if (window.confirm("Are you sure you want to delete this savings goal?")) {
        onDelete(initialData.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl animate-fade-in relative">

        <button onClick={onCancel} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
          <Target size={24} className="text-gold-500" />
          {initialData ? 'Edit Goal' : 'New Goal'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dream Home"
              className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 outline-none focus:border-gold-500 transition-colors"
              autoFocus={!initialData}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Target Amount</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-3.5 text-neutral-500" />
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 pl-8 outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Current Saved</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-3.5 text-neutral-500" />
                <input
                  type="number"
                  value={savedAmount}
                  onChange={(e) => setSavedAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 pl-8 outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Target Date</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-3.5 text-neutral-500" />
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl p-3 pl-8 outline-none focus:border-gold-500 [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>

          {/* Visuals */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Icon</label>
              <div className="grid grid-cols-4 gap-2">
                {ICONS.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIconIdx(idx)}
                    className={`p-2 rounded-lg flex items-center justify-center border transition-all ${selectedIconIdx === idx
                        ? 'bg-gold-500 text-neutral-950 border-gold-500'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-white'
                      }`}
                  >
                    <item.icon size={16} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Color Tag</label>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${c.replace('bg-', 'bg-')} ${color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-neutral-800">
            {initialData && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                title="Delete Goal"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 font-bold hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gold-500 text-neutral-950 font-bold hover:bg-gold-400 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Check size={18} /> Save Goal
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
