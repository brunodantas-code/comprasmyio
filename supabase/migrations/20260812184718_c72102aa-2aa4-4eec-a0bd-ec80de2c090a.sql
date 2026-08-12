ALTER TABLE public.myio_orders ADD COLUMN IF NOT EXISTS is_replacement boolean NOT NULL DEFAULT false;

CREATE TABLE public.myio_product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product text NOT NULL UNIQUE,
  image_url text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.myio_product_images TO authenticated;
GRANT ALL ON public.myio_product_images TO service_role;

ALTER TABLE public.myio_product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_select_auth" ON public.myio_product_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_images_admin_all" ON public.myio_product_images FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_myio_product_images_updated_at BEFORE UPDATE ON public.myio_product_images FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();