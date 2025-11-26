import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDepartments } from "@/hooks/useDepartments";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUpsertContact } from "@/hooks/useUpsertContact";
import { PreChatForm } from "@/components/PreChatForm";
import { OTPVerificationModal } from "@/components/OTPVerificationModal";
import { MessageSquare, Loader2 } from "lucide-react";

const IDENTITY_STORAGE_KEY = "public_chat_identity";
const IDENTITY_EXPIRES_DAYS = 30;

interface StoredIdentity {
  email: string;
  first_name: string;
  last_name: string;
  company?: string;
  phone?: string;
  identified_at: string;
  expires_at: string;
  contact_id?: string;
}

export default function PublicChat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const deptParam = searchParams.get("dept");
  const [isCreating, setIsCreating] = useState(false);
  const { data: departments, isLoading } = useDepartments();
  const upsertContact = useUpsertContact();
  const [isIdentified, setIsIdentified] = useState(false);
  const [storedIdentity, setStoredIdentity] = useState<StoredIdentity | null>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingFormData, setPendingFormData] = useState<any>(null);

  const activeDepartments = departments?.filter((d) => d.is_active) || [];

  // Verificar identidade armazenada no localStorage
  useEffect(() => {
    const stored = localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (stored) {
      try {
        const identity: StoredIdentity = JSON.parse(stored);
        const expiresAt = new Date(identity.expires_at);
        const now = new Date();

        if (expiresAt > now) {
          setStoredIdentity(identity);
          setIsIdentified(true);
        } else {
          // Identidade expirada, remover
          localStorage.removeItem(IDENTITY_STORAGE_KEY);
        }
      } catch (error) {
        console.error("Erro ao ler identidade:", error);
        localStorage.removeItem(IDENTITY_STORAGE_KEY);
      }
    }
  }, []);

  // Detectar parâmetro de departamento na URL e iniciar conversa automaticamente
  useEffect(() => {
    if (!isIdentified || !storedIdentity) return;
    
    if (deptParam && activeDepartments.length > 0 && !isCreating) {
      const dept = activeDepartments.find(
        (d) => d.name.toLowerCase() === deptParam.toLowerCase() || d.id === deptParam
      );
      if (dept) {
        handleCreateConversation(dept.id, dept.name);
      }
    }
  }, [deptParam, activeDepartments, isIdentified, storedIdentity]);

  const handlePreChatSubmit = async (formData: any) => {
    try {
      // FASE 3: Verificar se email já existe
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, email')
        .eq('email', formData.email)
        .single();

      if (existingContact) {
        // Email já existe - solicitar OTP
        console.log('[PublicChat] Email existente detectado, iniciando OTP');
        setPendingEmail(formData.email);
        setPendingFormData(formData);
        
        // Enviar código de verificação
        const { error: sendError } = await supabase.functions.invoke('send-verification-code', {
          body: { email: formData.email }
        });

        if (sendError) {
          console.error('[PublicChat] Erro ao enviar código:', sendError);
          toast({
            title: "Erro ao enviar código",
            description: sendError.message,
            variant: "destructive",
          });
          return;
        }

        setShowOTPModal(true);
        return;
      }

      // Email novo - continuar normalmente
      await proceedWithIdentity(formData, null);

    } catch (error: any) {
      console.error('[PublicChat] Erro no pré-chat:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOTPVerified = async (contactId: string) => {
    if (!pendingFormData) return;
    
    setShowOTPModal(false);
    await proceedWithIdentity(pendingFormData, contactId);
  };

  const handleOTPCancel = async () => {
    setShowOTPModal(false);
    
    if (!pendingFormData) return;

    // Criar nova conversa sem histórico (como visitante não verificado)
    await proceedWithIdentity(pendingFormData, null);
  };

  const proceedWithIdentity = async (formData: any, verifiedContactId: string | null) => {
    try {
      setIsCreating(true);

      // Salvar identidade no localStorage
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + IDENTITY_EXPIRES_DAYS);

      const identity: StoredIdentity = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        company: formData.company,
        phone: formData.phone,
        identified_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        contact_id: verifiedContactId || undefined,
      };

      localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
      setStoredIdentity(identity);
      setIsIdentified(true);

      toast({
        title: "Bem-vindo! 👋",
        description: `Olá, ${formData.first_name}! Suas informações foram salvas.`,
      });

    } catch (error: any) {
      console.error('[PublicChat] Erro ao processar identidade:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateConversation = async (departmentId: string, departmentName: string) => {
    if (!storedIdentity) return;

    try {
      setIsCreating(true);

      // Upsert do contato
      let contactId = storedIdentity.contact_id;

      if (!contactId) {
        const result = await upsertContact.mutateAsync({
          email: storedIdentity.email,
          first_name: storedIdentity.first_name,
          last_name: storedIdentity.last_name,
          phone: storedIdentity.phone,
          company: storedIdentity.company,
          source: "form",
        });
        contactId = result.contact_id;

        // Atualizar identidade armazenada com contact_id
        const updatedIdentity = { ...storedIdentity, contact_id: contactId };
        localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(updatedIdentity));
        setStoredIdentity(updatedIdentity);
      }

      // Criar conversa via Edge Function
      const { data, error } = await supabase.functions.invoke("create-public-conversation", {
        body: {
          department_id: departmentId,
          contact_id: contactId,
          customer_data: {
            email: storedIdentity.email,
            first_name: storedIdentity.first_name,
            last_name: storedIdentity.last_name,
            phone: storedIdentity.phone,
            company: storedIdentity.company,
          },
        },
      });

      if (error) throw error;

      if (!data?.success || !data?.conversation_id) {
        throw new Error(data?.error || "Falha ao criar conversa");
      }

      console.log(
        `[PublicChat] Conversa criada/reaberta:`,
        data.conversation_id,
        data.is_existing_conversation ? "(existente)" : "(nova)"
      );

      toast({
        title: data.is_existing_conversation ? "Conversa reaberta!" : "Conversa iniciada!",
        description: `Conectado ao departamento ${departmentName}`,
      });

      navigate(`/public-chat/${data.conversation_id}`);
    } catch (error: any) {
      console.error("[PublicChat] Erro ao criar conversa:", error);
      toast({
        title: "Erro ao iniciar conversa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Mostrar loading enquanto verifica localStorage
  if (!isIdentified && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mostrar PreChat Form se não identificado
  if (!isIdentified) {
    return (
      <>
        <PreChatForm onSubmit={handlePreChatSubmit} isLoading={isCreating} />
        <OTPVerificationModal 
          open={showOTPModal}
          email={pendingEmail}
          onVerified={handleOTPVerified}
          onCancel={handleOTPCancel}
        />
      </>
    );
  }

  // Concierge - Escolha de departamento
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-secondary/10">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Bem-vindo, {storedIdentity?.first_name}!</CardTitle>
          <CardDescription className="text-base">
            Escolha o departamento para iniciar o atendimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : activeDepartments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum departamento disponível no momento
            </p>
          ) : (
            activeDepartments.map((dept) => (
              <Button
                key={dept.id}
                variant="outline"
                size="lg"
                className="w-full h-auto py-4 px-6 text-left justify-start"
                onClick={() => handleCreateConversation(dept.id, dept.name)}
                disabled={isCreating}
              >
                <div className="flex items-center gap-4 w-full">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: dept.color || "#2563EB" }}
                  >
                    {dept.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{dept.name}</div>
                    {dept.description && (
                      <div className="text-sm text-muted-foreground">
                        {dept.description}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
