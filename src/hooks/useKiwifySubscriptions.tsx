import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductCategory = 'Associado Premium' | 'Shopee Creation' | 'Híbrido' | 'Uni 3 Cliques' | 'Outros';
export type SubscriptionStatus = 'active' | 'canceled' | 'ended' | 'all';

export interface SubscriptionData {
  id: string;
  orderId: string;
  startDate: string;
  productName: string;
  productCategory: ProductCategory;
  offerName: string;
  customerName: string;
  customerEmail: string;
  status: 'active' | 'canceled' | 'ended';
  grossValue: number;
  netValue: number;
  kiwifyFee: number;
  affiliateCommission: number;
}

export interface SubscriptionMetrics {
  totalAtivas: number;
  totalCanceladas: number;
  faturamentoRecorrente: number;
  subscriptions: SubscriptionData[];
  byCategory: Record<ProductCategory, { ativas: number; canceladas: number; faturamento: number }>;
}

// Categorize product based on name
function categorizeProduct(productName: string): ProductCategory {
  const name = productName?.toLowerCase() || '';
  
  if (name.includes('uni3cliques') || name.includes('uni 3 cliques') || name.includes('uni3')) {
    return 'Uni 3 Cliques';
  }
  if (name.includes('híbrido') || name.includes('hibrido')) {
    return 'Híbrido';
  }
  if (name.includes('shopee creation') || name.includes('creation') || name.includes('shopee')) {
    return 'Shopee Creation';
  }
  if (name.includes('associado premium') || name.includes('sabr') || name.includes('premium')) {
    return 'Associado Premium';
  }
  
  return 'Outros';
}

// Parse subscription status from Kiwify event
function parseSubscriptionStatus(eventType: string, subscriptionStatus?: string): 'active' | 'canceled' | 'ended' {
  if (eventType === 'subscription_canceled' || subscriptionStatus === 'canceled') {
    return 'canceled';
  }
  if (subscriptionStatus === 'ended') {
    return 'ended';
  }
  return 'active';
}

export function useKiwifySubscriptions(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['kiwify-subscriptions', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<SubscriptionMetrics> => {
      console.log('[useKiwifySubscriptions] Fetching subscription data...');
      
      // Fetch all subscription-related events
      let query = supabase
        .from('kiwify_events')
        .select('*')
        .in('event_type', ['paid', 'order_approved', 'subscription_canceled', 'subscription_ended', 'subscription_renewed'])
        .order('created_at', { ascending: false });

      // Apply date filters if provided
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      // Paginate to get all events
      const allEvents: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore && page < 50) {
        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) {
          console.error('[useKiwifySubscriptions] Error fetching events:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allEvents.push(...data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log(`[useKiwifySubscriptions] Total events fetched: ${allEvents.length}`);

      // Process events to build subscription map
      const subscriptionMap = new Map<string, SubscriptionData>();
      const processedOrderIds = new Set<string>();

      for (const event of allEvents) {
        const payload = event.payload as any;
        if (!payload) continue;

        const orderId = payload.order_id || payload.OrderId;
        const subscriptionId = payload.Subscription?.id || payload.subscription_id;
        const uniqueKey = subscriptionId || orderId;
        
        if (!uniqueKey) continue;

        // Check if subscription (has plan or subscription data)
        const isSubscription = payload.Subscription?.plan || payload.subscription_plan || 
          payload.charges_type === 'subscription' || 
          (payload.Product?.name || '').toLowerCase().includes('assinatura');

        if (!isSubscription && !subscriptionId) continue;

        // Skip if already processed with better status
        if (processedOrderIds.has(uniqueKey)) {
          const existing = subscriptionMap.get(uniqueKey);
          // Update status if it's a cancellation event
          if (existing && (event.event_type === 'subscription_canceled' || event.event_type === 'subscription_ended')) {
            existing.status = parseSubscriptionStatus(event.event_type, payload.subscription_status);
          }
          continue;
        }

        processedOrderIds.add(uniqueKey);

        const productName = payload.Product?.name || payload.product_name || 'Produto não identificado';
        const grossValue = (payload.product_base_price || payload.Product?.price || 0) / 100;
        const myCommission = (payload.my_commission || 0) / 100;
        const kiwifyFee = (payload.kiwify_fee || 0) / 100;
        const affiliateCommission = (payload.affiliate_commission || 0) / 100;
        
        const subscription: SubscriptionData = {
          id: uniqueKey,
          orderId: orderId || '',
          startDate: payload.approved_date || payload.created_at || event.created_at,
          productName,
          productCategory: categorizeProduct(productName),
          offerName: payload.Subscription?.plan?.name || payload.offer_name || 'Oferta padrão',
          customerName: payload.Customer?.full_name || payload.customer_name || 'Cliente',
          customerEmail: payload.Customer?.email || payload.customer_email || '',
          status: parseSubscriptionStatus(event.event_type, payload.subscription_status),
          grossValue,
          netValue: myCommission,
          kiwifyFee,
          affiliateCommission,
        };

        subscriptionMap.set(uniqueKey, subscription);
      }

      // Convert to array and calculate metrics
      const subscriptions = Array.from(subscriptionMap.values());
      
      // Initialize category metrics
      const categories: ProductCategory[] = ['Associado Premium', 'Shopee Creation', 'Híbrido', 'Uni 3 Cliques', 'Outros'];
      const byCategory: Record<ProductCategory, { ativas: number; canceladas: number; faturamento: number }> = {} as any;
      
      for (const cat of categories) {
        byCategory[cat] = { ativas: 0, canceladas: 0, faturamento: 0 };
      }

      let totalAtivas = 0;
      let totalCanceladas = 0;
      let faturamentoRecorrente = 0;

      for (const sub of subscriptions) {
        const catMetrics = byCategory[sub.productCategory];
        
        if (sub.status === 'active') {
          totalAtivas++;
          catMetrics.ativas++;
          faturamentoRecorrente += sub.netValue;
          catMetrics.faturamento += sub.netValue;
        } else {
          totalCanceladas++;
          catMetrics.canceladas++;
        }
      }

      console.log(`[useKiwifySubscriptions] Total subscriptions: ${subscriptions.length}, Active: ${totalAtivas}, Canceled: ${totalCanceladas}`);

      return {
        totalAtivas,
        totalCanceladas,
        faturamentoRecorrente,
        subscriptions,
        byCategory,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
