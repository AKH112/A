"use client";

import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
      <h1 className="text-2xl font-bold">Тарифы</h1>
      <p className="text-sm text-gray-600">Страница-заглушка. Здесь можно разместить выбор тарифа и оплату.</p>
      <Link href="/notifications" className="text-sm font-semibold text-purple-600 hover:underline">
        Назад к уведомлениям
      </Link>
    </div>
  );
}

