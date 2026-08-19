ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS is_product boolean NOT NULL DEFAULT false;

UPDATE public.materials SET is_product = true
WHERE lower(regexp_replace(translate(name, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ','aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'), '[^a-zA-Z0-9]', '', 'g')) IN (
 'myio3f','myioswitchhidrometro','myioswitchnormal','myioswitchnormalctemp','myiosw420manivel','myioswreboot','myioswitch24v','myiocentral','myioremote','sensor3dplanoparafusoakvometer','sensor3dverticalhidrometro','sensorsiriusacbmensolarb'
);

UPDATE public.materials SET is_product = true
WHERE id IN (SELECT DISTINCT product_material_id FROM public.product_boms);