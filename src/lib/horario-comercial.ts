const TIMEZONE = "America/Sao_Paulo";
const WEEKDAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface HorarioComercialConfig {
  horario_atendimento_inicio: string | null;
  horario_atendimento_fim: string | null;
  horario_atendimento_dias: number[] | null;
}

/**
 * Sem configuracao (algum campo nulo) mantem o comportamento atual: sempre
 * dentro do horario, nao bloqueia transferencia nenhuma.
 */
export function estaDentroDoHorarioComercial(config: HorarioComercialConfig, agora: Date = new Date()): boolean {
  const { horario_atendimento_inicio, horario_atendimento_fim, horario_atendimento_dias } = config;
  if (!horario_atendimento_inicio || !horario_atendimento_fim || !horario_atendimento_dias) return true;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(agora);
  const diaAtual = WEEKDAY_MAP[parts.find((p) => p.type === "weekday")?.value ?? ""];
  if (diaAtual === undefined || !horario_atendimento_dias.includes(diaAtual)) return false;

  const hora = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minuto = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const minutosAtual = hora * 60 + minuto;

  const [hIni, mIni] = horario_atendimento_inicio.split(":").map(Number);
  const [hFim, mFim] = horario_atendimento_fim.split(":").map(Number);

  return minutosAtual >= hIni * 60 + mIni && minutosAtual < hFim * 60 + mFim;
}
