ALTER TABLE public.assembly_release_items DROP CONSTRAINT IF EXISTS assembly_release_items_material_id_fkey;
ALTER TABLE public.assembly_release_items ADD CONSTRAINT assembly_release_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

ALTER TABLE public.homologations DROP CONSTRAINT IF EXISTS homologations_material_id_fkey;
ALTER TABLE public.homologations ADD CONSTRAINT homologations_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

ALTER TABLE public.product_boms DROP CONSTRAINT IF EXISTS product_boms_product_material_id_fkey;
ALTER TABLE public.product_boms ADD CONSTRAINT product_boms_product_material_id_fkey FOREIGN KEY (product_material_id) REFERENCES public.materials(id) ON DELETE CASCADE;
ALTER TABLE public.product_boms DROP CONSTRAINT IF EXISTS product_boms_component_material_id_fkey;
ALTER TABLE public.product_boms ADD CONSTRAINT product_boms_component_material_id_fkey FOREIGN KEY (component_material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_material_id_fkey;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;

ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_material_id_fkey;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL;