-- Tabela para armazenar os dados transformados de transporte
CREATE TABLE IF NOT EXISTS public.transport_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  transport_type TEXT NOT NULL,
  passengers NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_transport_data_year ON public.transport_data(year);
CREATE INDEX IF NOT EXISTS idx_transport_data_type ON public.transport_data(transport_type);
CREATE INDEX IF NOT EXISTS idx_transport_data_year_type ON public.transport_data(year, transport_type);

-- Tabela para armazenar análises de empresas
CREATE TABLE IF NOT EXISTS public.company_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transport_type TEXT NOT NULL,
  company_name TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas por tipo de transporte
CREATE INDEX IF NOT EXISTS idx_company_analysis_type ON public.company_analysis(transport_type);

-- Tabela para armazenar previsões
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transport_type TEXT NOT NULL,
  prediction_year INTEGER NOT NULL,
  predicted_passengers NUMERIC NOT NULL,
  confidence_level NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas de previsões
CREATE INDEX IF NOT EXISTS idx_predictions_type_year ON public.predictions(transport_type, prediction_year);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para atualização automática
CREATE TRIGGER update_transport_data_updated_at
BEFORE UPDATE ON public.transport_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_analysis_updated_at
BEFORE UPDATE ON public.company_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies (dados públicos para visualização)
ALTER TABLE public.transport_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública
CREATE POLICY "Permitir leitura pública de transport_data"
ON public.transport_data FOR SELECT
USING (true);

CREATE POLICY "Permitir leitura pública de company_analysis"
ON public.company_analysis FOR SELECT
USING (true);

CREATE POLICY "Permitir leitura pública de predictions"
ON public.predictions FOR SELECT
USING (true);