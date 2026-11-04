ALTER TABLE public.mytosis_settings ADD COLUMN IF NOT EXISTS box_format jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.mytosis_nodes ADD COLUMN IF NOT EXISTS custom_format boolean NOT NULL DEFAULT false;
UPDATE public.mytosis_nodes SET custom_format = true
WHERE coalesce(shape,'process') <> 'process' OR coalesce(fill_color,'none') <> 'none' OR coalesce(border_color,'green-mid') <> 'green-mid'
   OR coalesce(title_font_size,18) <> 18 OR coalesce(description_font_size,11) <> 11 OR coalesce(text_align,'left') <> 'left'
   OR coalesce(text_vertical_align,'center') <> 'center' OR title_color IS NOT NULL OR control_color IS NOT NULL;