import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductOffer {
  id: string;
  product_id: string;
  offer_id: string;
  offer_name: string;
  price: number;
  source: string;
  is_active: boolean;
  created_at: string;
}

// Hook para buscar ofertas de um produto
export const useProductOffers = (productId: string | null) => {
  return useQuery({
    queryKey: ["product-offers", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_offers")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ProductOffer[];
    },
    enabled: !!productId,
  });
};

// Hook para criar oferta
export const useCreateProductOffer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (offer: {
      product_id: string;
      offer_id: string;
      offer_name: string;
      price: number;
      source?: string;
    }) => {
      const { data, error } = await supabase
        .from("product_offers")
        .insert({
          ...offer,
          source: offer.source || "kiwify",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-offers", variables.product_id] });
      toast({
        title: "Oferta adicionada",
        description: "A oferta foi vinculada ao produto com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar oferta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook para deletar oferta
export const useDeleteProductOffer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase
        .from("product_offers")
        .delete()
        .eq("id", offerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-offers"] });
      toast({
        title: "Oferta removida",
        description: "A oferta foi removida do produto.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover oferta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Hook para mover oferta para outro produto
export const useMoveProductOffer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ offerId, newProductId }: { offerId: string; newProductId: string }) => {
      const { error } = await supabase
        .from("product_offers")
        .update({ product_id: newProductId })
        .eq("id", offerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-offers"] });
      toast({
        title: "Oferta movida",
        description: "A oferta foi movida para o novo produto com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao mover oferta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
