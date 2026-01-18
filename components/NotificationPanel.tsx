
import React from 'react';
import { X, Bell, AlertTriangle, CheckCircle, Info, Clock, ArrowRight } from 'lucide-react';
import { AppNotification, NavTab } from '../types';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onAction: (tab: NavTab, payload?: any) => void;
  onClearAll: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  isOpen, 
  onClose, 
  notifications,
  onAction,
  onClearAll
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm animate-fade-in" 
            onClick={onClose}
        ></div>

        {/* Panel */}
        <div className="relative w-full max-w-sm bg-neutral-900 h-full shadow-2xl border-l border-neutral-800 flex flex-col animate-fade-in">
            
            {/* Header */}
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Bell size={20} className="text-gold-500" />
                        {notifications.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-neutral-900"></span>
                        )}
                    </div>
                    <h3 className="text-lg font-display font-bold text-white tracking-wide">Pulse</h3>
                </div>
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                            <Bell size={24} className="text-neutral-600" />
                        </div>
                        <p className="text-sm text-neutral-400 font-bold">All caught up</p>
                        <p className="text-xs text-neutral-600 mt-1">No new alerts at this time.</p>
                    </div>
                ) : (
                    notifications.map((note) => (
                        <div 
                            key={note.id} 
                            className={`p-4 rounded-xl border relative overflow-hidden group transition-all hover:scale-[1.02] cursor-default ${
                                note.type === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                                note.type === 'warning' ? 'bg-orange-500/5 border-orange-500/20' :
                                note.type === 'success' ? 'bg-green-500/5 border-green-500/20' :
                                'bg-neutral-800/50 border-neutral-700/50'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`mt-0.5 min-w-[20px] ${
                                    note.type === 'critical' ? 'text-red-500' :
                                    note.type === 'warning' ? 'text-orange-500' :
                                    note.type === 'success' ? 'text-green-500' :
                                    'text-blue-500'
                                }`}>
                                    {note.type === 'critical' ? <AlertTriangle size={16} /> :
                                     note.type === 'warning' ? <Clock size={16} /> :
                                     note.type === 'success' ? <CheckCircle size={16} /> :
                                     <Info size={16} />}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-xs font-bold mb-1 ${
                                        note.type === 'critical' ? 'text-red-400' :
                                        note.type === 'warning' ? 'text-orange-400' :
                                        note.type === 'success' ? 'text-green-400' :
                                        'text-white'
                                    }`}>
                                        {note.title}
                                    </h4>
                                    <p className="text-[11px] text-neutral-400 leading-relaxed mb-2">
                                        {note.message}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-neutral-600">
                                            {note.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {note.actionLabel && note.actionTab && (
                                            <button 
                                                onClick={() => {
                                                    onAction(note.actionTab!, note.payload);
                                                    onClose();
                                                }}
                                                className="flex items-center gap-1 text-[10px] font-bold text-gold-500 hover:text-white transition-colors"
                                            >
                                                {note.actionLabel} <ArrowRight size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="p-4 border-t border-neutral-800 bg-neutral-950">
                    <button 
                        onClick={onClearAll}
                        className="w-full py-3 rounded-xl border border-neutral-800 text-neutral-500 text-xs font-bold hover:bg-neutral-800 hover:text-white transition-all"
                    >
                        Clear All Notifications
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
