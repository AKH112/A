"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parse, set } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getStudents } from "@/services/students.api";

type Student = { id: string; name: string };

type CreateLessonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
  initialDate: Date | null;
};

export const CreateLessonModal = ({ isOpen, onClose, onCreate, initialDate }: CreateLessonModalProps) => {
  const init = useMemo(() => initialDate ?? new Date(), [initialDate]);
  const [type, setType] = useState<"LESSON" | "PERSONAL">("LESSON");
  const [studentId, setStudentId] = useState<string>("");
  const [durationMin, setDurationMin] = useState<number>(60);
  const [priceRub, setPriceRub] = useState<number>(1000);
  const [time, setTime] = useState<string>(() => format(init, "HH:mm"));
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setPending(false);
    setType("LESSON");
    setStudentId("");
    setDurationMin(60);
    setPriceRub(1000);
    setTime(format(init, "HH:mm"));

    setLoadingStudents(true);
    getStudents()
      .then((res) => setStudents((res.data ?? []).map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [isOpen, init]);

  const submit = async () => {
    setError("");
    setPending(true);
    try {
      const parsedTime = parse(time, "HH:mm", init);
      const startTime = set(init, { hours: parsedTime.getHours(), minutes: parsedTime.getMinutes(), seconds: 0, milliseconds: 0 });
      const duration = Math.max(15, Math.round(Number(durationMin)));
      const price = type === "LESSON" ? Math.max(0, Math.round(Number(priceRub)) * 100) : null;

      if (type === "LESSON" && !studentId) {
        setError("Выберите ученика");
        setPending(false);
        return;
      }

      await onCreate({
        type,
        studentId: type === "LESSON" ? studentId : null,
        duration,
        startTime: startTime.toISOString(),
        price,
      });
    } catch {
      setError("Не удалось создать занятие");
      setPending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новое занятие">
      <div className="space-y-4">
        {error && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-2">
          <div className="text-xs font-semibold text-gray-500">Тип</div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === "LESSON" ? "primary" : "secondary"}
              className="w-auto rounded-full px-4"
              onClick={() => setType("LESSON")}
            >
              Урок
            </Button>
            <Button
              type="button"
              variant={type === "PERSONAL" ? "primary" : "secondary"}
              className="w-auto rounded-full px-4"
              onClick={() => setType("PERSONAL")}
            >
              Личное
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold text-gray-500">Дата</div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {format(init, "dd.MM.yyyy")}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-semibold text-gray-500">Время начала</div>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
          />
        </div>

        {type === "LESSON" && (
          <div className="grid gap-2">
            <div className="text-xs font-semibold text-gray-500">Ученик</div>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
              disabled={loadingStudents}
            >
              <option value="">{loadingStudents ? "Загрузка..." : "Выберите ученика"}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Длительность (мин)"
          type="number"
          min={15}
          value={String(durationMin)}
          onChange={(e) => setDurationMin(Number(e.target.value))}
        />

        {type === "LESSON" && (
          <Input
            label="Цена (₽)"
            type="number"
            min={0}
            value={String(priceRub)}
            onChange={(e) => setPriceRub(Number(e.target.value))}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" className="w-auto rounded-full px-5" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" className="w-auto rounded-full px-6" onClick={submit} disabled={pending}>
            {pending ? "Создаём..." : "Создать"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

