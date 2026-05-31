"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, ArrowRight, Search, Users } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    fetch("/api/agency/customers").then(r => r.json()).then(d => {
      setCustomers(d.customers ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Clientes</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>{customers.length} cliente(s) ativo(s)</p>
        </div>
        <Link href="/agency/customers/new"
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "#9aea62", color: "#0a0a0a" }}>
          <Plus className="w-4 h-4" /> Novo cliente
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#939da4" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
          className="w-full h-9 pl-9 pr-4 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(147,157,164,0.3)" }} />
          <p className="text-sm font-medium text-white mb-1">Nenhum cliente encontrado</p>
          <p className="text-xs mb-4" style={{ color: "#939da4" }}>Crie seu primeiro cliente para começar</p>
          <Link href="/agency/customers/new" className="px-4 h-9 rounded-xl text-sm font-bold inline-flex items-center gap-2"
            style={{ background: "#9aea62", color: "#0a0a0a" }}>
            <Plus className="w-4 h-4" /> Criar cliente
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Link key={c.id} href={`/agency/customers/${c.id}`}
              className="flex items-center justify-between p-4 rounded-2xl transition-all hover:border-white/12"
              style={cardStyle}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0"
                  style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{c.name}</p>
                  <p className="text-xs" style={{ color: "#939da4" }}>
                    {c.slug} · {c.member_count} membro(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                  Ativo
                </span>
                <ArrowRight className="w-4 h-4" style={{ color: "#939da4" }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
