ALTER TABLE public.mytosis_nodes ADD COLUMN title_color text DEFAULT NULL;
ALTER TABLE public.mytosis_nodes ADD CONSTRAINT mytosis_nodes_title_color_check CHECK (title_color IS NULL OR title_color IN ('black', 'white', 'green', 'purple', 'dark', 'gray'));
COMMENT ON COLUMN public.mytosis_nodes.title_color IS 'Optional title color override; NULL follows the selected fill contrast.';