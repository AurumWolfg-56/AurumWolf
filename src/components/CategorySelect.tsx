import React, { useState, useRef, useEffect } from 'react';
import { Search, Tag, Check, Plus, ChevronDown } from 'lucide-react';
import { useCategories } from '../contexts/CategoryContext';
import { getIconComponent } from '../lib/iconMapper';
import { CreateCategoryModal } from './CreateCategoryModal';

interface CategorySelectProps {
    value: string;
    onChange: (val: string) => void;
    type?: 'income' | 'expense';
    placeholder?: string;
    compact?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange, type, placeholder = "Select Category...", compact = false }) => {
    const { categories, loading } = useCategories();
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCategories = categories
        .filter(c => type ? c.type === type : true)
        .filter(c => c.category.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 50); // Performance limit

    const selectedCategory = categories.find(c => c.category === value);
    const SelectedIcon = selectedCategory ? getIconComponent(selectedCategory.icon_key) : Tag;

    return (
        <>
            <div className="relative w-full" ref={dropdownRef}>
                {!compact && <label className="block text-xs font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">Category</label>}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between bg-white/5 border ${isOpen ? 'border-emerald-500/50' : 'border-white/10'} ${compact ? 'py-2 px-3 text-xs' : 'py-3 px-4 text-sm'} rounded-xl text-white transition-all hover:bg-white/10`}
                >
                    {selectedCategory ? (
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '' }}
                                className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} rounded-full flex items-center justify-center text-white shadow-[0_0_10px_rgba(255,255,255,0.2)] ${selectedCategory.color} shadow-lg`}
                            >
                                <SelectedIcon size={compact ? 12 : 14} />
                            </div>
                            <span className="font-semibold">{selectedCategory.category}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                            <Tag size={14} />
                            <span>{value || placeholder}</span>
                        </div>
                    )}
                    <ChevronDown size={14} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full mt-2 left-0 right-0 bg-[#0F0F0F] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 backdrop-blur-xl">
                        {/* Search + Action Header */}
                        <div className="p-2 border-b border-white/5 bg-white/5 space-y-2">
                            <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 border border-white/5">
                                <Search size={14} className="text-gray-500" />
                                <input
                                    autoFocus
                                    className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-gray-600"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => { setIsOpen(false); setIsModalOpen(true); }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium border border-emerald-500/20"
                            >
                                <Plus size={12} />
                                Create New Category
                            </button>
                        </div>

                        {/* List */}
                        <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar space-y-1">
                            {loading && <div className="text-center text-gray-500 text-xs py-2">Loading...</div>}

                            {!loading && filteredCategories.map(cat => {
                                const Icon = getIconComponent(cat.icon_key);
                                const isSelected = cat.category === value;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => { onChange(cat.category); setIsOpen(false); setSearch(''); }}
                                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all group ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-110 transition-transform ${cat.color}`}
                                        >
                                            <Icon size={14} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                                {cat.category}
                                            </div>
                                            {cat.limit > 0 && type === 'expense' && (
                                                <div className="text-[10px] text-gray-500">Limit: ${cat.limit.toLocaleString()}</div>
                                            )}
                                        </div>
                                        {isSelected && <Check size={14} className="text-emerald-500" />}
                                    </button>
                                );
                            })}

                            {!loading && filteredCategories.length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-xs">
                                    No matches.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <CreateCategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={(newCatName) => {
                    onChange(newCatName); // Auto-select the new category
                    setIsModalOpen(false);
                }}
                initialType={type}
            />
        </>
    );
};
