"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import {
  agencyBadgeStyle,
  agencyCardStyle,
  agencyGhostButtonStyle,
  agencyInputClass,
  agencyInputStyle,
  agencyOutlineButtonStyle,
  agencyPageStyle,
  agencyPrimaryButtonStyle,
  agencySoftPanelStyle,
} from "@/app/agency/theme";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  staff: "Staff",
  viewer: "Viewer",
};

const ROLE_COLOR: Record<string, string> = {
  owner: "#9aea62",
  admin: "#60a5fa",
  staff: "#a78bfa",
  viewer: "#939da4",
};

interface AgencyMembershipRow {
  agency_id: string;
}

interface AgencyMemberRow {
  id: string;
  role: string;
  user_id: string;
  invited_at: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<AgencyMemberRow[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from("agency_users")
        .select("agency_id")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          const membership = data as unknown as AgencyMembershipRow | null;
          if (!membership) return;

          supabase
            .from("agency_users")
            .select("id, role, user_id, invited_at")
            .eq("agency_id", membership.agency_id)
            .then(({ data: agencyMembers }) => setMembers((agencyMembers ?? []) as unknown as AgencyMemberRow[]));
        });
    });
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-2xl" style={agencyPageStyle}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>Equipe</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Membros da sua agência com acesso ao painel</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold"
          style={agencyOutlineButtonStyle("#9aea62")}
        >
          <Plus className="w-4 h-4" />
          Convidar
        </button>
      </div>

      {showInvite && (
        <div className="rounded-2xl p-5 space-y-3" style={agencyCardStyle}>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Convidar membro</h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="email@agencia.com"
              className={`${agencyInputClass} flex-1`}
              style={agencyInputStyle}
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              className={agencyInputClass}
              style={agencyInputStyle}
            >
              <option value="admin" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>Admin</option>
              <option value="staff" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>Staff</option>
              <option value="viewer" style={{ background: "var(--surface-solid)", color: "var(--text-primary)" }}>Viewer</option>
            </select>
            <button disabled={!inviteEmail} className="px-4 h-9 rounded-xl text-xs font-bold" style={{ ...agencyPrimaryButtonStyle, opacity: !inviteEmail ? 0.5 : 1 }}>
              Convidar
            </button>
          </div>
          <p className="text-[10px]" style={{ color: "var(--text-faint)" }}>Em breve: envio de email de convite</p>
        </div>
      )}

      <div className="rounded-2xl p-6 space-y-3" style={agencyCardStyle}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{members.length} membro(s)</h2>
        {members.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-secondary)" }}>Nenhum membro além de você</p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={agencySoftPanelStyle}>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--primary-bg)", border: "1px solid var(--primary-border)", color: "var(--status-ganho)" }}
                >
                  {member.user_id.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{member.user_id.slice(0, 8)}...</p>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    Desde {new Date(member.invited_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={agencyBadgeStyle(ROLE_COLOR[member.role])}>
                  {ROLE_LABEL[member.role]}
                </span>
                {member.role !== "owner" && (
                  <button style={agencyGhostButtonStyle}>
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
