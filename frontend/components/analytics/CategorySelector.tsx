"use client";

import { Category } from "@/services/categories.api";
import { Plus, X, Pencil } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

type CategorySelectorProps = {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd?: () => void; // Opens settings
  type: 'INCOME' | 'EXPENSE';
};

export function CategorySelector({ categories, selectedId, onSelect, onAdd, type }: CategorySelectorProps) {
  const filtered = categories.filter(c => c.type === type);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Категории</label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            selectedId === null
              ? (type === 'INCOME' ? "bg-[#d4fc46] text-black" : "bg-[#ff5bf6] text-white")
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
        >
          Не выбрано
        </button>

        {filtered.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1",
              selectedId === cat.id
                ? (type === 'INCOME' ? "bg-[#d4fc46] text-black" : "bg-[#ff5bf6] text-white")
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {cat.name}
          </button>
        ))}

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
