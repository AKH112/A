"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function InvitationsPage() {
  const { loading } = useRequireAuth();

  if (loading) return <div className="text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Приглашения</h1>
      </div>

      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-purple-100 text-4xl">✉️</div>
        <h3 className="mb-2 text-xl font-bold">Приглашений пока нет</h3>
        <p className="max-w-sm text-gray-500">Здесь будут отображаться приглашения от учителей.</p>
      </div>
    </div>
  );
}

