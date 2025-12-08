-- Create product_qualities table
CREATE TABLE IF NOT EXISTS public.product_qualities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_qualities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view qualities"
ON public.product_qualities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert qualities"
ON public.product_qualities
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update qualities"
ON public.product_qualities
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete qualities"
ON public.product_qualities
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default qualities
INSERT INTO public.product_qualities (name, description, created_by)
SELECT 
  unnest(ARRAY['Premium', 'Premium Com Aro', 'OLED Premium', 'OLED Premium Com Aro', 'Original Nacional']),
  unnest(ARRAY['Qualidade premium', 'Premium com aro', 'OLED premium', 'OLED premium com aro', 'Original nacional']),
  (SELECT id FROM auth.users WHERE email LIKE '%' LIMIT 1)
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger
CREATE TRIGGER update_product_qualities_updated_at
BEFORE UPDATE ON public.product_qualities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();