"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getStudent } from "@/services/students.api";

type Student = {
  id: string;
  name: string;
  contact?: string | null;
  notes?: string | null;
  balance: number;
  createdAt: string;
};

export default function StudentPage() {
  const { loading: authLoading, user } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    getStudent(params.id)
      .then((res) => setStudent(res.data))
      .catch(() => setError("Ученик не найден"))
      .finally(() => setLoading(false));
  }, [params.id, user]);

  if (authLoading) return <div className="text-gray-500">Загрузка...</div>;
  if (loading) return <div className="text-gray-500">Загрузка...</div>;

  if (error || !student) {
    return (
      <div className="space-y-4">
        <div className="rounded bg-red-100 p-3 text-red-700">{error || "Ошибка"}</div>
        <Link href="/students" className="text-blue-600 hover:underline">
          Назад к ученикам
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <div className="mt-1 text-sm text-gray-500">{student.contact || "Нет контактов"}</div>
        </div>
        <Link href="/students" className="text-sm text-blue-600 hover:underline">
          Назад
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <div className="text-sm text-gray-500">Баланс</div>
          <div className={`mt-2 text-3xl font-semibold ${student.balance < 0 ? "text-red-600" : "text-green-600"}`}>
            {student.balance.toFixed(0)} ₽
          </div>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <div className="text-sm text-gray-500">Заметки</div>
          <div className="mt-2 whitespace-pre-wrap text-sm">{student.notes || "—"}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5 text-sm text-gray-500">
        Профиль ученика (MVP). Историю уроков и оплат добавим следующим шагом.
      </div>
    </div>
  );
}
