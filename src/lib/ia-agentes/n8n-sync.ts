interface AgenteParaSincronizar {
  persona: string;
  modelo: string;
  temperatura: number;
  n8n_workflow_id: string | null;
  n8n_node_agente: string | null;
  n8n_node_modelo: string | null;
}

interface N8nNode {
  name: string;
  parameters: Record<string, unknown>;
  [key: string]: unknown;
}

interface N8nWorkflow {
  id: string;
  name: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: unknown;
  [key: string]: unknown;
}

const CONTEXTO_INTERNO_SUFFIXO =
  '\n\nCONTEXTO INTERNO (uso interno, NUNCA mostrar ao cliente): tenant_id="${$json.tenant_id}", lead_id="${$json.lead_id}", conversa_id="${$json.conversa_id}". Copie esses 3 valores EXATAMENTE como estao aqui em todo JSON de input de ferramenta que pedir esses campos. Se uma ferramenta retornar um erro claro (ex: "tenant_id invalido"), corrija o campo usando o CONTEXTO INTERNO acima e chame a ferramenta de novo imediatamente - nao pergunte ao cliente, nao desista na primeira tentativa.';

// A persona editavel pela tela nunca inclui o rodape tecnico acima (e o
// que injeta tenant_id/lead_id/conversa_id via interpolacao do n8n) - ele
// e sempre re-anexado aqui na hora de montar a expressao final, protegido
// de edicao acidental. Escapa backtick e "${" pra nunca quebrar o template
// literal do n8n.
function montarSystemMessage(persona: string): string {
  const seguro = persona.replace(/`/g, "'").replace(/\$\{/g, "$\\{");
  return "=`" + seguro + CONTEXTO_INTERNO_SUFFIXO + "`";
}

export async function syncAgenteToN8n(
  agente: AgenteParaSincronizar,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiUrl = process.env.N8N_API_URL;
  const apiKey = process.env.N8N_API_KEY;
  if (!apiUrl || !apiKey) {
    return { ok: false, error: "N8N_API_URL/N8N_API_KEY nao configurados - agente salvo no CRM, mas nao sincronizado com o n8n." };
  }
  if (!agente.n8n_workflow_id || !agente.n8n_node_agente) {
    return { ok: false, error: "Este agente nao esta mapeado a um workflow do n8n." };
  }

  const headers = { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" };

  const getRes = await fetch(`${apiUrl}/workflows/${agente.n8n_workflow_id}`, { headers });
  if (!getRes.ok) {
    return { ok: false, error: `Falha ao buscar workflow no n8n (HTTP ${getRes.status})` };
  }
  const workflow = (await getRes.json()) as N8nWorkflow;

  const noAgente = workflow.nodes.find((n) => n.name === agente.n8n_node_agente);
  if (!noAgente) {
    return { ok: false, error: `No "${agente.n8n_node_agente}" nao encontrado no workflow` };
  }
  const options = (noAgente.parameters.options ?? {}) as Record<string, unknown>;
  noAgente.parameters = { ...noAgente.parameters, options: { ...options, systemMessage: montarSystemMessage(agente.persona) } };

  if (agente.n8n_node_modelo) {
    const noModelo = workflow.nodes.find((n) => n.name === agente.n8n_node_modelo);
    if (noModelo) {
      const modeloAtual = (noModelo.parameters.model ?? {}) as Record<string, unknown>;
      const optionsModelo = (noModelo.parameters.options ?? {}) as Record<string, unknown>;
      noModelo.parameters = {
        ...noModelo.parameters,
        model: { ...modeloAtual, __rl: true, mode: "list", value: agente.modelo, cachedResultName: agente.modelo },
        options: { ...optionsModelo, temperature: agente.temperatura },
      };
    }
  }

  // A API de update do n8n so aceita name/nodes/connections/settings -
  // campos somente-leitura (id, active, createdAt, etc.) tem que ser
  // removidos antes de reenviar o workflow inteiro.
  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings ?? {},
  };

  const putRes = await fetch(`${apiUrl}/workflows/${agente.n8n_workflow_id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!putRes.ok) {
    const body = await putRes.text().catch(() => "");
    return { ok: false, error: `Falha ao salvar workflow no n8n (HTTP ${putRes.status}): ${body.slice(0, 300)}` };
  }

  return { ok: true };
}
