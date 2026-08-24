ALTER TABLE public.external_product_states DROP CONSTRAINT external_product_states_homologation_unit_id_fkey;
ALTER TABLE public.external_product_states ADD CONSTRAINT external_product_states_homologation_unit_id_fkey FOREIGN KEY (homologation_unit_id) REFERENCES public.homologation_units(id) ON DELETE SET NULL;

ALTER TABLE public.myio_delivery_qrs DROP CONSTRAINT myio_delivery_qrs_homologation_unit_id_fkey;
ALTER TABLE public.myio_delivery_qrs ADD CONSTRAINT myio_delivery_qrs_homologation_unit_id_fkey FOREIGN KEY (homologation_unit_id) REFERENCES public.homologation_units(id) ON DELETE SET NULL;

ALTER TABLE public.stock_movement_qrs DROP CONSTRAINT stock_movement_qrs_homologation_unit_id_fkey;
ALTER TABLE public.stock_movement_qrs ADD CONSTRAINT stock_movement_qrs_homologation_unit_id_fkey FOREIGN KEY (homologation_unit_id) REFERENCES public.homologation_units(id) ON DELETE SET NULL;