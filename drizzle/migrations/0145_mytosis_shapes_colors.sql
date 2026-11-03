ALTER TABLE public.mytosis_nodes
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'process' CHECK (shape IN ('process','terminal','document','decision','connector','io','multidoc','manual','preparation','or','delay')),
  ADD COLUMN IF NOT EXISTS fill_color text NOT NULL DEFAULT 'none' CHECK (fill_color IN ('none','green-soft','green-mid','green','purple-soft','purple-mid','purple','dark','gray')),
  ADD COLUMN IF NOT EXISTS border_color text NOT NULL DEFAULT 'green-mid' CHECK (border_color IN ('green-mid','green','purple-mid','purple','dark','gray'));
ALTER TABLE public.mytosis_links
  ADD COLUMN IF NOT EXISTS style text NOT NULL DEFAULT 'arrow' CHECK (style IN ('arrow','line','dashed','double'));
GRANT UPDATE ON public.mytosis_links TO authenticated;
DROP POLICY IF EXISTS "mytosis links editor update" ON public.mytosis_links;
CREATE POLICY "mytosis links editor update" ON public.mytosis_links FOR UPDATE TO authenticated USING (public.mytosis_can_edit(auth.uid())) WITH CHECK (public.mytosis_can_edit(auth.uid()));