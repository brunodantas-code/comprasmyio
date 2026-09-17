ALTER TABLE public.delivery_points
ADD COLUMN is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX delivery_points_single_default
ON public.delivery_points (is_default)
WHERE is_default = true;