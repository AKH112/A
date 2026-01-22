"use client";

import { useEffect, useState } from "react";
import { getWallets, createWallet, Wallet } from "@/services/wallets.api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Plus, Star, ArrowRightLeft } from "lucide-react";

export function WalletsTab() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getWallets();
      setWallets(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createWallet({ name: newName.trim() });
      setIsModalOpen(false);
      setNewName("");
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const formatMoney = (val: number) => (val / 100).toFixed(2).replace('.', ',') + ' ₽';

  return (
    <div>
      <div className="flex justify-end mb-6 gap-2">
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm hover:bg-gray-50 border border-gray-100">
           <ArrowRightLeft size={18} className="text-gray-600" />
        </button>
        <Button 
          onClick={() => setIsModalOpen(true)} 
          className="w-auto rounded-full px-6 bg-indigo-500 hover:bg-indigo-600"
        >
          Добавить кошелёк <Plus size={18} className="ml-2" />
        </Button>
      </div>

      {loading ? (
        <div className="text-gray-500">Загрузка...</div>
      ) : wallets.length === 0 ? (
        <div className="text-center text-gray-500 py-10">Кошельков нет</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <div key={w.id} className="relative rounded-2xl bg-[#e5e3d5] p-6 shadow-sm min-h-[160px] flex flex-col justify-between">
              {w.isFavorite && (
                <div className="absolute top-4 right-4">
                  <Star size={16} fill="black" stroke="none" />
                </div>
              )}
              
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatMoney(w.balance)}</div>
                <div className="text-sm text-gray-700 font-medium mt-1">{w.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Новый кошелёк">
        <div className="space-y-4">
          <Input label="Название" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Например, Мой счёт" />
          <Button onClick={handleCreate} disabled={creating} className="bg-indigo-500 hover:bg-indigo-600">
            {creating ? "Создаём..." : "Создать"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
