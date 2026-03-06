DROP POLICY IF EXISTS "admin_manager_can_manage_product_offers" ON public.product_offers;

CREATE POLICY "managers_can_manage_product_offers"
ON public.product_offers
FOR ALL
TO authenticated
USING (public.is_manager_or_admin(auth.uid()))
WITH CHECK (public.is_manager_or_admin(auth.uid()));