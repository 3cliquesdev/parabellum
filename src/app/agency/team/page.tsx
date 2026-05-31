"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", staff: "Staff", viewer: "Viewer" };
const ROLE_COLOR: Record<string, string> = { owner: "#9aea62", admin: "#60a5fa", staff: "#a78bfa", viewer: "#939da4" };

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviting, setInviting] = useState(false);

  const cardStyle = { background: "linear-gradient(180deg, rgba(23,23,23,0.88) 0%, rgba(13,13,13,0.92) 100%)", border: "1px solid rgba(255,255,255,0.07)" };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("agency_users").select("agency_id").eq("user_id", user.id).single()
        .then(({ data }: { data: any }) => {
          if (!data) return;
          setAgencyId(data.agency_id);
          // Buscar membros — join via RPC ou query separada
          supabase.from("agency_users").select("id, role, user_id, invited_at").eq("agency_id", data.agency_id)
            .then(({ data: m }: { data: any }) => setMembers(m ?? []));
        });
    });
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-2xl" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Equipe</h1>
          <p className="text-sm mt-1" style={{ color: "#939da4" }}>Membros da sua agência com acesso ao painel</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62", border: "1px solid rgba(154,234,98,0.2)" }}>
          <Plus className="w-4 h-4" /> Convidar
        </button>
      </div>

      {showInvite && (
        <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
          <h2 className="text-sm font-bold text-white">Convidar membro</h2>
          <div className="flex gap-2">
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@agencia.com"
              className="flex-1 h-9 px-3 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="h-9 px-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
              <option value="admin" style={{ background: "#111" }}>Admin</option>
              <option value="staff" style={{ background: "#111" }}>Staff</option>
              <option value="viewer" style={{ background: "#111" }}>Viewer</option>
            </select>
            <button disabled={inviting || !inviteEmail}
              className="px-4 h-9 rounded-xl text-xs font-bold"
              style={{ background: "#9aea62", color: "#0a0a0a", opacity: !inviteEmail ? 0.5 : 1 }}>
              {inviting ? "..." : "Convidar"}
            </button>
          </div>
          <p className="text-[10px]" style={{ color: "rgba(147,157,164,0.5)" }}>Em breve: envio de email de convite</p>
        </div>
      )}

      <div className="rounded-2xl p-6 space-y-3" style={cardStyle}>
        <h2 className="text-sm font-bold text-white">{members.length} membro(s)</h2>
        {members.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "#939da4" }}>Nenhum membro além de você</p>
        ) : (
          members.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(154,234,98,0.1)", color: "#9aea62" }}>
                  {m.user_id.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{m.user_id.slice(0, 8)}...</p>
                  <p className="text-[10px]" style={{ color: "#939da4" }}>
                    Desde {new Date(m.invited_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: ROLE_COLOR[m.role], background: `${ROLE_COLOR[m.role]}15` }}>
                  {ROLE_LABEL[m.role]}
                </span>
                {m.role !== "owner" && (
                  <button><Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.4)" }} /></button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
