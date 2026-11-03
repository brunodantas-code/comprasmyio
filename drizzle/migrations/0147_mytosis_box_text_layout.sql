ALTER TABLE public.mytosis_nodes
  ADD COLUMN title_font_size integer NOT NULL DEFAULT 18 CHECK (title_font_size BETWEEN 10 AND 32),
  ADD COLUMN description_font_size integer NOT NULL DEFAULT 11 CHECK (description_font_size BETWEEN 10 AND 32),
  ADD COLUMN text_align text NOT NULL DEFAULT 'left' CHECK (text_align IN ('left', 'center', 'right')),
  ADD COLUMN text_vertical_align text NOT NULL DEFAULT 'center' CHECK (text_vertical_align IN ('top', 'center', 'bottom'));