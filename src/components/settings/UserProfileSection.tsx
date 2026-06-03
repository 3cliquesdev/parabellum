"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, Lock, Mail, MapPinHouse, Save, UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/types/database";

type UserProfileForm = Omit<UserProfile, "created_at" | "updated_at">;

const EMPTY_PROFILE: UserProfileForm = {
  user_id: "",
  full_name: null,
  first_name: null,
  last_name: null,
  cpf: null,
  avatar_url: null,
  address_zip: null,
  address_street: null,
  address_number: null,
  address_complement: null,
  address_neighborhood: null,
  address_city: null,
  address_state: null,
  address_country: "Brasil",
};

function cleanText(value: string) {
  const next = value.trim();
  return next ? next : null;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatZip(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function buildFullName(profile: UserProfileForm) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
}

function toFormValue(value: string | null | undefined) {
  return value ?? "";
}

export function UserProfileSection() {
  const [supabase] = useState(() => createClient());
  const [profile, setProfile] = useState<UserProfileForm>(EMPTY_PROFILE);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardStyle = {
    background: "var(--surface-gradient)",
    border: "1px solid var(--border-subtle)",
  };

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (!cancelled) {
          setError("Nao foi possivel carregar seu usuario.");
          setLoading(false);
        }
        return;
      }

      const metadataName = String(
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        ""
      );
      const { firstName, lastName } = splitName(metadataName);

      const { data: row, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle() as { data: UserProfile | null; error: Error | null };

      if (cancelled) return;

      if (profileError) {
        setError("Nao foi possivel carregar seu perfil.");
      }

      setUserEmail(user.email ?? "");
      setProfile({
        ...EMPTY_PROFILE,
        user_id: user.id,
        full_name: row?.full_name ?? (metadataName || null),
        first_name: row?.first_name ?? (firstName || null),
        last_name: row?.last_name ?? (lastName || null),
        cpf: row?.cpf ?? null,
        avatar_url: row?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
        address_zip: row?.address_zip ?? null,
        address_street: row?.address_street ?? null,
        address_number: row?.address_number ?? null,
        address_complement: row?.address_complement ?? null,
        address_neighborhood: row?.address_neighborhood ?? null,
        address_city: row?.address_city ?? null,
        address_state: row?.address_state ?? null,
        address_country: row?.address_country ?? "Brasil",
      });
      setLoading(false);
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function persistProfile(nextProfile: UserProfileForm, showSavedState = true) {
    if (!nextProfile.user_id) return false;

    const normalizedProfile: UserProfileForm = {
      ...nextProfile,
      full_name: cleanText(buildFullName(nextProfile)),
      first_name: cleanText(toFormValue(nextProfile.first_name)),
      last_name: cleanText(toFormValue(nextProfile.last_name)),
      cpf: cleanText(toFormValue(nextProfile.cpf)),
      avatar_url: cleanText(toFormValue(nextProfile.avatar_url)),
      address_zip: cleanText(toFormValue(nextProfile.address_zip)),
      address_street: cleanText(toFormValue(nextProfile.address_street)),
      address_number: cleanText(toFormValue(nextProfile.address_number)),
      address_complement: cleanText(toFormValue(nextProfile.address_complement)),
      address_neighborhood: cleanText(toFormValue(nextProfile.address_neighborhood)),
      address_city: cleanText(toFormValue(nextProfile.address_city)),
      address_state: cleanText(toFormValue(nextProfile.address_state)),
      address_country: cleanText(toFormValue(nextProfile.address_country)) ?? "Brasil",
    };

    const { error: saveError } = await supabase
      .from("user_profiles")
      .upsert(normalizedProfile, { onConflict: "user_id" });

    if (saveError) {
      setError(saveError.message);
      return false;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: normalizedProfile.full_name ?? undefined,
        first_name: normalizedProfile.first_name ?? undefined,
        last_name: normalizedProfile.last_name ?? undefined,
        avatar_url: normalizedProfile.avatar_url ?? undefined,
      },
    });

    if (authError) {
      setError(authError.message);
      return false;
    }

    setProfile(normalizedProfile);
    setError(null);

    if (showSavedState) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }

    return true;
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    await persistProfile(profile);
    setSavingProfile(false);
  }

  async function handleAvatarUpload(file: File) {
    if (!profile.user_id) return;
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem valida para a foto.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A foto deve ter no maximo 5MB.");
      return;
    }

    setUploadingAvatar(true);
    setError(null);

    const path = `${profile.user_id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from("user-avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploadingAvatar(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("user-avatars").getPublicUrl(path);
    const nextProfile = {
      ...profile,
      avatar_url: `${data.publicUrl}?t=${Date.now()}`,
    };

    const saved = await persistProfile(nextProfile, false);
    if (saved) setProfile(nextProfile);
    setUploadingAvatar(false);
  }

  async function handleRemoveAvatar() {
    if (!profile.user_id) return;
    setUploadingAvatar(true);
    setError(null);

    await supabase.storage.from("user-avatars").remove([`${profile.user_id}/avatar`]);
    const nextProfile = { ...profile, avatar_url: null };
    const saved = await persistProfile(nextProfile, false);
    if (saved) setProfile(nextProfile);
    setUploadingAvatar(false);
  }

  async function handlePasswordChange() {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("Preencha a nova senha e a confirmacao.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("A confirmacao da senha nao confere.");
      return;
    }

    setSavingPassword(true);
    const { error: passwordError } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    setSavingPassword(false);

    if (passwordError) {
      setError(passwordError.message);
      return;
    }

    setError(null);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2500);
  }

  function updateField<K extends keyof UserProfileForm>(field: K, value: UserProfileForm[K]) {
    setProfile(current => ({ ...current, [field]: value }));
  }

  const initials = `${toFormValue(profile.first_name).charAt(0)}${toFormValue(profile.last_name).charAt(0)}`.trim()
    || userEmail.charAt(0)
    || "U";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--status-ganho)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-[-0.03em]">Meu perfil</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Complete seus dados para agilizar cadastros, contratos e futuras vendas com preenchimento automatico.
        </p>
      </div>

      {error && (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", color: "#fca5a5" }}
        >
          {error}
        </div>
      )}

      <div className="grid gap-7 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl p-7 space-y-6" style={cardStyle}>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "rgba(154,234,98,0.12)", color: "var(--status-ganho)" }}
              >
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Foto e identidade</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Essa foto pode ser usada em areas de conta e relacionamento.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-5">
              <Avatar size="lg" className="h-32 w-32">
                {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="Foto do usuario" /> : null}
                <AvatarFallback className="bg-white/5 text-2xl font-bold text-white">
                  {initials.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="w-full space-y-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition-opacity"
                  style={{ background: "rgba(154,234,98,0.12)", color: "var(--status-ganho)", border: "1px solid rgba(154,234,98,0.2)" }}
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {profile.avatar_url ? "Trocar foto" : "Enviar foto"}
                </button>

                {profile.avatar_url && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-medium transition-opacity"
                    style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                  >
                    <X className="h-4 w-4" />
                    Remover foto
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                  event.target.value = "";
                }}
              />
            </div>

            <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                <Mail className="h-3.5 w-3.5" style={{ color: "var(--text-faint)" }} />
                Email de acesso
              </div>
              <p className="text-base text-white">{userEmail || "Nao identificado"}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                O email continua sendo gerenciado pela autenticacao do sistema.
              </p>
            </div>
          </div>

          <div className="rounded-3xl p-7 space-y-5" style={cardStyle}>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "rgba(154,234,98,0.12)", color: "var(--status-ganho)" }}
              >
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Seguranca</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Atualize sua senha sempre que precisar.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Nova senha
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={event => setPasswordForm(current => ({ ...current, newPassword: event.target.value }))}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="Minimo de 6 caracteres"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Confirmar nova senha
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={event => setPasswordForm(current => ({ ...current, confirmPassword: event.target.value }))}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>

            <button
              onClick={handlePasswordChange}
              disabled={savingPassword}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition-opacity"
              style={{ background: passwordSaved ? "rgba(154,234,98,0.12)" : "#9aea62", color: passwordSaved ? "#9aea62" : "#0a0a0a" }}
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : passwordSaved ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {savingPassword ? "Atualizando..." : passwordSaved ? "Senha atualizada" : "Trocar senha"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl p-7 space-y-6" style={cardStyle}>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "rgba(154,234,98,0.12)", color: "var(--status-ganho)" }}
              >
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Dados pessoais</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Nome e CPF para documentos, vendas e automacoes futuras.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="first-name" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Nome
                </Label>
                <Input
                  id="first-name"
                  value={toFormValue(profile.first_name)}
                  onChange={event => updateField("first_name", event.target.value || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last-name" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Sobrenome
                </Label>
                <Input
                  id="last-name"
                  value={toFormValue(profile.last_name)}
                  onChange={event => updateField("last_name", event.target.value || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="Seu sobrenome"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="cpf" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  CPF
                </Label>
                <Input
                  id="cpf"
                  value={toFormValue(profile.cpf)}
                  onChange={event => updateField("cpf", formatCpf(event.target.value) || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-7 space-y-6" style={cardStyle}>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "rgba(154,234,98,0.12)", color: "var(--status-ganho)" }}
              >
                <MapPinHouse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Endereco</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Esses dados ficam prontos para preencher vendas, contratos e faturamento.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-6">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="zip" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  CEP
                </Label>
                <Input
                  id="zip"
                  value={toFormValue(profile.address_zip)}
                  onChange={event => updateField("address_zip", formatZip(event.target.value) || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label htmlFor="street" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Rua
                </Label>
                <Input
                  id="street"
                  value={toFormValue(profile.address_street)}
                  onChange={event => updateField("address_street", event.target.value || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="Rua, avenida ou alameda"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="number" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Numero
                </Label>
                <Input
                  id="number"
                  value={toFormValue(profile.address_number)}
                  onChange={event => updateField("address_number", event.target.value || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="123"
                />
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label htmlFor="complement" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Complemento
                </Label>
                <Input
                  id="complement"
                  value={toFormValue(profile.address_complement)}
                  onChange={event => updateField("address_complement", event.target.value || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="Apto, bloco, sala..."
                />
              </div>

              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="neighborhood" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Bairro
                </Label>
                <Input
                  id="neighborhood"
                  value={toFormValue(profile.address_neighborhood)}
                  onChange={event => updateField("address_neighborhood", event.target.value || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="Seu bairro"
                />
              </div>

              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="city" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Cidade
                </Label>
                <Input
                  id="city"
                  value={toFormValue(profile.address_city)}
                  onChange={event => updateField("address_city", event.target.value || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="Sua cidade"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="state" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Estado
                </Label>
                <Input
                  id="state"
                  value={toFormValue(profile.address_state)}
                  onChange={event => updateField("address_state", event.target.value.toUpperCase() || null)}
                  className="h-12 rounded-2xl border-white/10 bg-white/5 text-white text-base"
                  placeholder="SP"
                  maxLength={2}
                />
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label htmlFor="country" className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                  Pais
                </Label>
                <Input
                  id="country"
                  value={toFormValue(profile.address_country)}
                  onChange={event => updateField("address_country", event.target.value || null)}
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  placeholder="Brasil"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
              className="flex h-12 items-center gap-2 rounded-2xl px-6 text-base font-bold transition-opacity"
              style={{ background: profileSaved ? "rgba(154,234,98,0.12)" : "#9aea62", color: profileSaved ? "#9aea62" : "#0a0a0a" }}
            >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : profileSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {savingProfile ? "Salvando..." : profileSaved ? "Perfil salvo" : "Salvar perfil"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
