-- ============================================
-- FASE 6: Sistema de Ofertas Kiwify
-- Criar tabela product_offers para múltiplas ofertas
-- ============================================

-- Tabela para armazenar ofertas individuais vinculadas a produtos
CREATE TABLE IF NOT EXISTS product_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL,                    -- ID da oferta na Kiwify
  offer_name TEXT NOT NULL,                  -- Nome descritivo da oferta
  price NUMERIC DEFAULT 0,                   -- Preço da oferta
  source TEXT DEFAULT 'kiwify',              -- Origem: kiwify, hotmart, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Evitar duplicatas
  UNIQUE(product_id, offer_id)
);

-- Index para busca rápida por offer_id
CREATE INDEX idx_product_offers_offer_id ON product_offers(offer_id);
CREATE INDEX idx_product_offers_product_id ON product_offers(product_id);

-- RLS Policies
ALTER TABLE product_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_view_product_offers"
  ON product_offers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_manager_can_manage_product_offers"
  ON product_offers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_product_offers_updated_at
  BEFORE UPDATE ON product_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE product_offers IS 'Armazena ofertas individuais (offer_id) vinculadas a produtos, permitindo múltiplas ofertas por produto para rastreamento de origem e analytics';