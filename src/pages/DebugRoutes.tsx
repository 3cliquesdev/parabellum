import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, AlertTriangle, Search, ExternalLink } from "lucide-react";

// Mapa de rotas declaradas no App.tsx (gerado manualmente para auditoria)
const DECLARED_ROUTES = [
  // Públicas
  { path: "/auth", component: "Auth", type: "public" },
  { path: "/setup-password", component: "SetupPassword", type: "public" },
  { path: "/form/:formId", component: "PublicFormPage", type: "public" },
  { path: "/chat/:channelSlug", component: "PublicChatPage", type: "public" },
  { path: "/tv", component: "TVModePage", type: "public" },
  
  // Protegidas - Inbox
  { path: "/", component: "Index", type: "protected", permission: "inbox.access" },
  { path: "/inbox", component: "Inbox", type: "protected", permission: "inbox.access" },
  
  // Protegidas - Contacts & CRM
  { path: "/contacts", component: "Contacts", type: "protected", permission: "contacts.view" },
  { path: "/deals", component: "Deals", type: "protected", permission: "sales.view_deals" },
  { path: "/tickets", component: "Tickets", type: "protected", permission: "tickets.view" },
  { path: "/quotes", component: "Quotes", type: "protected", permission: "quotes.view" },
  
  // Protegidas - Marketing & Automação
  { path: "/forms", component: "Forms", type: "protected", permission: "forms.view" },
  { path: "/forms/:id/builder", component: "FormBuilder", type: "protected", permission: "forms.edit" },
  { path: "/forms/:id/analytics", component: "FormAnalytics", type: "protected", permission: "forms.view" },
  { path: "/email-templates", component: "EmailTemplates", type: "protected", permission: "email.view_templates" },
  { path: "/automations", component: "Automations", type: "protected", permission: "automations.view" },
  { path: "/automations/:id/builder", component: "AutomationBuilder", type: "protected", permission: "automations.edit" },
  { path: "/playbooks", component: "Playbooks", type: "protected", permission: "playbooks.view" },
  { path: "/playbooks/:id/builder", component: "OnboardingBuilder", type: "protected", permission: "playbooks.edit" },
  { path: "/playbooks/:id/executions", component: "PlaybookExecutions", type: "protected", permission: "playbooks.view_executions" },
  
  // Protegidas - AI
  { path: "/ai-studio", component: "AIStudio", type: "protected", permission: "ai.manage_personas" },
  
  // Protegidas - CS & Sales Management
  { path: "/my-portfolio", component: "MyPortfolio", type: "protected", permission: "cs.view_portfolio" },
  { path: "/cs-management", component: "CSManagement", type: "protected", permission: "cs.manage_consultants" },
  { path: "/cs-management/consultant/:consultantId", component: "ConsultantDetail", type: "protected", permission: "cs.manage_consultants" },
  { path: "/sales-management", component: "SalesManagement", type: "protected", permission: "sales.manage_reps" },
  { path: "/sales-management/rep/:repId", component: "SalesRepDetail", type: "protected", permission: "sales.manage_reps" },
  { path: "/consultants", component: "Consultants", type: "protected", permission: "cs.manage_consultants" },
  
  // Protegidas - Analytics & Reports
  { path: "/analytics", component: "Analytics", type: "protected", permission: "analytics.view" },
  
  // Protegidas - Settings
  { path: "/settings", component: "Settings", type: "protected", permission: "settings.view" },
  { path: "/settings/users", component: "UsersSettings", type: "protected", permission: "settings.manage_users" },
  { path: "/settings/departments", component: "DepartmentsSettings", type: "protected", permission: "settings.manage_departments" },
  { path: "/settings/teams", component: "TeamsSettings", type: "protected", permission: "settings.manage_teams" },
  { path: "/settings/tags", component: "TagManager", type: "protected", permission: "cadastros.manage_tags" },
  { path: "/settings/products", component: "ProductsSettings", type: "protected", permission: "cadastros.manage_products" },
  { path: "/settings/pipelines", component: "PipelinesSettings", type: "protected", permission: "sales.manage_pipelines" },
  { path: "/settings/goals", component: "GoalsSettings", type: "protected", permission: "settings.manage_goals" },
  { path: "/settings/channels", component: "ChannelsSettings", type: "protected", permission: "settings.manage_channels" },
  { path: "/settings/integrations", component: "IntegrationsSettings", type: "protected", permission: "settings.manage_integrations" },
  { path: "/settings/email", component: "EmailSettings", type: "protected", permission: "email.manage_settings" },
  { path: "/settings/permissions", component: "RolePermissionsManager", type: "protected", permission: "settings.manage_permissions" },
  { path: "/settings/ai-trainer", component: "AITrainer", type: "protected", permission: "ai.manage_personas" },
  { path: "/settings/recovery", component: "SalesRecoveryPage", type: "protected", permission: "settings.manage_integrations" },
  
  // Protegidas - Admin
  { path: "/admin-onboarding", component: "AdminOnboarding", type: "protected", permission: null },
  { path: "/audit-logs", component: "AuditLogs", type: "protected", permission: "audit.view" },
  { path: "/import-clients", component: "ImportClients", type: "protected", permission: "contacts.import" },
  
  // Debug (dev only)
  { path: "/debug/routes", component: "DebugRoutes", type: "debug" },
  
  // Catch-all
  { path: "*", component: "NotFound", type: "catch-all" },
];

// Lista de páginas que existem em src/pages (simulado - em produção viria de route-map.json)
const EXISTING_PAGES = [
  "AdminOnboarding", "AIStudio", "Analytics", "AuditLogs", "Auth", "AutomationBuilder",
  "Automations", "Consultants", "ConsultantDetail", "Contacts", "CSManagement", "Deals",
  "DebugRoutes", "EmailSettings", "EmailTemplates", "FormAnalytics", "FormBuilder", "Forms",
  "GoalsSettings", "ImportClients", "Index", "Inbox", "IntegrationsSettings", "MyPortfolio",
  "NotFound", "OnboardingBuilder", "PipelinesSettings", "PlaybookExecutions", "Playbooks",
  "ProductsSettings", "PublicChatPage", "PublicFormPage", "Quotes", "RolePermissionsManager",
  "SalesManagement", "SalesRecoveryPage", "SalesRepDetail", "Settings", "SetupPassword",
  "TagManager", "TeamsSettings", "Tickets", "TVModePage", "UsersSettings", "ChannelsSettings",
  "DepartmentsSettings"
];

export default function DebugRoutes() {
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "public" | "protected" | "orphan">("all");

  // Detectar rotas órfãs (componentes que existem mas não têm rota)
  const routedComponents = new Set(DECLARED_ROUTES.map(r => r.component));
  const orphanPages = EXISTING_PAGES.filter(p => !routedComponents.has(p));

  // Filtrar rotas
  const filteredRoutes = DECLARED_ROUTES.filter(route => {
    const matchesSearch = search === "" || 
      route.path.toLowerCase().includes(search.toLowerCase()) ||
      route.component.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === "all" || route.type === filter;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: DECLARED_ROUTES.length,
    public: DECLARED_ROUTES.filter(r => r.type === "public").length,
    protected: DECLARED_ROUTES.filter(r => r.type === "protected").length,
    orphans: orphanPages.length,
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">🗺️ Auditoria de Rotas</h1>
            <p className="text-muted-foreground mt-1">
              Visualize todas as rotas declaradas, detecte órfãs e valide permissões
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Rota atual: {location.pathname}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total de Rotas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-success">{stats.public}</div>
              <p className="text-xs text-muted-foreground">Rotas Públicas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{stats.protected}</div>
              <p className="text-xs text-muted-foreground">Rotas Protegidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-warning">{stats.orphans}</div>
              <p className="text-xs text-muted-foreground">Páginas Órfãs</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por path ou componente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Todas
            </Button>
            <Button
              variant={filter === "public" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("public")}
            >
              Públicas
            </Button>
            <Button
              variant={filter === "protected" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("protected")}
            >
              Protegidas
            </Button>
          </div>
        </div>

        {/* Routes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rotas Declaradas ({filteredRoutes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Path</th>
                    <th className="py-2 px-2">Componente</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-2">Permissão</th>
                    <th className="py-2 px-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoutes.map((route) => {
                    const exists = EXISTING_PAGES.includes(route.component);
                    return (
                      <tr key={route.path} className="border-b border-border hover:bg-muted/50">
                        <td className="py-2 px-2">
                          {exists ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">{route.path}</td>
                        <td className="py-2 px-2">{route.component}</td>
                        <td className="py-2 px-2">
                          <Badge 
                            variant={route.type === "public" ? "secondary" : "default"}
                            className="text-xs"
                          >
                            {route.type}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 font-mono text-xs text-muted-foreground">
                          {route.permission || "—"}
                        </td>
                        <td className="py-2 px-2">
                          {!route.path.includes(":") && route.path !== "*" && (
                            <Link to={route.path}>
                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Orphan Pages */}
        {orphanPages.length > 0 && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Páginas Órfãs ({orphanPages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Estas páginas existem em <code className="bg-muted px-1 rounded">src/pages/</code> mas não têm rota declarada no App.tsx:
              </p>
              <div className="flex flex-wrap gap-2">
                {orphanPages.map((page) => (
                  <Badge key={page} variant="outline" className="text-warning border-warning">
                    {page}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* How to Read */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📖 Como ler este relatório</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><CheckCircle className="inline h-4 w-4 text-success mr-1" /> <strong>Verde:</strong> Componente existe e está corretamente mapeado</p>
            <p><XCircle className="inline h-4 w-4 text-destructive mr-1" /> <strong>Vermelho:</strong> Rota declarada mas componente não encontrado</p>
            <p><AlertTriangle className="inline h-4 w-4 text-warning mr-1" /> <strong>Amarelo (Órfã):</strong> Página existe mas não tem rota no App.tsx</p>
            <p className="pt-2">
              <strong>Permissões:</strong> Cada rota protegida usa <code className="bg-muted px-1 rounded">requiredPermission</code> para controle de acesso via sistema RBAC.
            </p>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <Link to="/" className="text-primary hover:underline text-sm">
            ← Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
