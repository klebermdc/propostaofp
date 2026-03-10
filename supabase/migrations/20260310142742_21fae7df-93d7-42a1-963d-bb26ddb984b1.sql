
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');

-- Create enum for quote status
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'accepted', 'expired');

-- Create enum for quote item type
CREATE TYPE public.quote_item_type AS ENUM ('hotel', 'flight', 'transfer', 'tour', 'insurance', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Orçamento',
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  status quote_status NOT NULL DEFAULT 'draft',
  share_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  notes TEXT,
  valid_until DATE,
  currency TEXT NOT NULL DEFAULT 'BRL',
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote_items table
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  item_type quote_item_type NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  observations TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  -- Auto-assign agent role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quotes
CREATE POLICY "Agents can view own quotes" ON public.quotes FOR SELECT TO authenticated USING (auth.uid() = agent_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can create quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "Agents can update own quotes" ON public.quotes FOR UPDATE TO authenticated USING (auth.uid() = agent_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents can delete own quotes" ON public.quotes FOR DELETE TO authenticated USING (auth.uid() = agent_id OR public.has_role(auth.uid(), 'admin'));
-- Public access via share_token (for anonymous users)
CREATE POLICY "Public can view shared quotes" ON public.quotes FOR SELECT TO anon USING (status = 'sent' OR status = 'accepted');

-- RLS Policies for quote_items
CREATE POLICY "Agents can view items of own quotes" ON public.quote_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND (quotes.agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Agents can create items" ON public.quote_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.agent_id = auth.uid())
);
CREATE POLICY "Agents can update items" ON public.quote_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND (quotes.agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Agents can delete items" ON public.quote_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND (quotes.agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
-- Public access to items via quote share
CREATE POLICY "Public can view items of shared quotes" ON public.quote_items FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND (quotes.status = 'sent' OR quotes.status = 'accepted'))
);

-- Storage bucket for AI uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-uploads', 'quote-uploads', false);
CREATE POLICY "Agents can upload files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'quote-uploads');
CREATE POLICY "Agents can view own files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'quote-uploads');
