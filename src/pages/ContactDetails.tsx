import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerTimeline } from "@/hooks/useCustomerTimeline";
import { useCustomerTags } from "@/hooks/useCustomerTags";
import { useDeals } from "@/hooks/useDeals";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import CustomerTimeline from "@/components/CustomerTimeline";
import ContactInfoCard from "@/components/ContactInfoCard";
import ContactLTVCard from "@/components/ContactLTVCard";
import ContactTagsCard from "@/components/ContactTagsCard";
import ActivityDialog from "@/components/ActivityDialog";
import ActivitiesList from "@/components/ActivitiesList";
import OnboardingJourneyCard from "@/components/OnboardingJourneyCard";
import OnboardingSummaryCard from "@/components/OnboardingSummaryCard";

export default function ContactDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: contact, isLoading: isLoadingContact } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      if (!id) throw new Error("ID não fornecido");
      const { data, error } = await supabase
        .from("contacts")
        .select("*, organizations(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: timeline, isLoading: isLoadingTimeline } = useCustomerTimeline(id || null);
  const { data: tags, isLoading: isLoadingTags, addTag, removeTag } = useCustomerTags(id || null);
  const { data: allDeals } = useDeals();
  
  const contactDeals = allDeals?.filter(d => d.contact_id === id) || [];

  if (isLoadingContact) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Contato não encontrado</p>
          <Button onClick={() => navigate("/contacts")} className="mt-4">
            Voltar para Contatos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/contacts")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Contatos
        </Button>

        <div className="flex gap-6 h-[calc(100vh-180px)]">
          {/* COLUNA ESQUERDA: 30% */}
          <div className="w-[30%] space-y-6 overflow-auto">
            <ContactInfoCard contact={contact} />
            <ContactLTVCard contact={contact} deals={contactDeals} />
            <OnboardingSummaryCard contactId={id || ""} />
            <ContactTagsCard 
              customerId={id || ""} 
              customerTags={tags} 
              addTag={addTag}
              removeTag={removeTag}
              isLoading={isLoadingTags}
            />
            
            {/* Botão Nova Atividade */}
            <ActivityDialog
              trigger={
                <Button className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Atividade
                </Button>
              }
              contactId={id}
            />
          </div>

          {/* COLUNA DIREITA: 70% */}
          <div className="flex-1 space-y-6 overflow-auto">
            <ActivitiesList contactId={id || ""} />
            
            <OnboardingJourneyCard contactId={id || ""} />
            
            <CustomerTimeline 
              timeline={timeline || []} 
              customerName={`${contact.first_name} ${contact.last_name}`}
              isLoading={isLoadingTimeline}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
