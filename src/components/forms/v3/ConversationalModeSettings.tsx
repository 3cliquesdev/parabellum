import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Sparkles, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ConversationalModeSettingsProps {
  settings: {
    conversational_enabled?: boolean;
    ai_suggestions_enabled?: boolean;
    ai_persona_id?: string;
    ai_custom_prompt?: string;
    animation_style?: 'fade' | 'slide' | 'scale';
    auto_advance?: boolean;
    progress_style?: 'bar' | 'steps' | 'percentage' | 'none';
  };
  onUpdate: (settings: any) => void;
}

export default function ConversationalModeSettings({ settings, onUpdate }: ConversationalModeSettingsProps) {
  const { data: personas = [] } = useQuery({
    queryKey: ['ai-personas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_personas')
        .select('id, name, role')
        .eq('is_active', true);
      return data || [];
    },
  });
  
  return (
    <div className="space-y-4">
      {/* Conversational Mode Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Modo Conversacional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar Modo Conversacional</Label>
              <p className="text-xs text-muted-foreground">
                Exibe um campo por vez, estilo Typeform
              </p>
            </div>
            <Switch
              checked={settings.conversational_enabled || false}
              onCheckedChange={(checked) => onUpdate({ ...settings, conversational_enabled: checked })}
            />
          </div>
          
          {settings.conversational_enabled && (
            <>
              <div>
                <Label>Estilo de Animação</Label>
                <Select
                  value={settings.animation_style || 'fade'}
                  onValueChange={(value: any) => onUpdate({ ...settings, animation_style: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">Fade (suave)</SelectItem>
                    <SelectItem value="slide">Slide (deslizar)</SelectItem>
                    <SelectItem value="scale">Scale (zoom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Avançar Automaticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Avança para próxima pergunta ao responder
                  </p>
                </div>
                <Switch
                  checked={settings.auto_advance !== false}
                  onCheckedChange={(checked) => onUpdate({ ...settings, auto_advance: checked })}
                />
              </div>
              
              <div>
                <Label>Estilo de Progresso</Label>
                <Select
                  value={settings.progress_style || 'bar'}
                  onValueChange={(value: any) => onUpdate({ ...settings, progress_style: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Barra de Progresso</SelectItem>
                    <SelectItem value="steps">Passos (1/5)</SelectItem>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="none">Sem indicador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* AI Suggestions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Sugestões com IA
            <Badge variant="secondary" className="ml-2">Beta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar IA para Sugestões</Label>
              <p className="text-xs text-muted-foreground">
                IA sugere próxima pergunta baseada nas respostas
              </p>
            </div>
            <Switch
              checked={settings.ai_suggestions_enabled || false}
              onCheckedChange={(checked) => onUpdate({ ...settings, ai_suggestions_enabled: checked })}
            />
          </div>
          
          {settings.ai_suggestions_enabled && (
            <>
              <div>
                <Label>Persona da IA</Label>
                <Select
                  value={settings.ai_persona_id || ''}
                  onValueChange={(value) => onUpdate({ ...settings, ai_persona_id: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Usar padrão do sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Padrão do Sistema</SelectItem>
                    {personas.map((persona: any) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.name} ({persona.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Prompt Personalizado (opcional)</Label>
                <Textarea
                  value={settings.ai_custom_prompt || ''}
                  onChange={(e) => onUpdate({ ...settings, ai_custom_prompt: e.target.value })}
                  placeholder="Instruções adicionais para a IA ao sugerir perguntas..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe vazio para usar comportamento padrão
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Preview Info */}
      {settings.conversational_enabled && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Preview do Modo Conversacional</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  No modo conversacional, cada pergunta aparece sozinha na tela com transições suaves.
                  O usuário responde e avança para a próxima pergunta automaticamente (ou clicando em "Próximo").
                  {settings.ai_suggestions_enabled && ' A IA pode sugerir pular perguntas irrelevantes baseado nas respostas anteriores.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
