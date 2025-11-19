import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating predictions...');

    // Buscar dados históricos
    const { data: historicalData, error: fetchError } = await supabase
      .from('transport_data')
      .select('*')
      .order('year', { ascending: true });

    if (fetchError) throw fetchError;

    // Agrupar por tipo de transporte
    const dataByType: Record<string, any[]> = {};
    
    historicalData?.forEach(record => {
      if (!dataByType[record.transport_type]) {
        dataByType[record.transport_type] = [];
      }
      dataByType[record.transport_type].push(record);
    });

    const predictions = [];

    // Gerar previsões para cada tipo de transporte (regressão linear simples)
    for (const [transportType, records] of Object.entries(dataByType)) {
      const years = records.map(r => r.year);
      const passengers = records.map(r => parseFloat(r.passengers));

      // Calcular regressão linear
      const n = years.length;
      const sumX = years.reduce((a, b) => a + b, 0);
      const sumY = passengers.reduce((a, b) => a + b, 0);
      const sumXY = years.reduce((sum, x, i) => sum + x * passengers[i], 0);
      const sumX2 = years.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Calcular R² para confidence level
      const yMean = sumY / n;
      const ssTotal = passengers.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
      const ssResidual = passengers.reduce((sum, y, i) => {
        const yPred = slope * years[i] + intercept;
        return sum + Math.pow(y - yPred, 2);
      }, 0);
      const r2 = 1 - (ssResidual / ssTotal);

      // Prever próximos 5 anos
      const lastYear = Math.max(...years);
      for (let i = 1; i <= 5; i++) {
        const predYear = lastYear + i;
        const predValue = Math.max(0, slope * predYear + intercept); // Não permitir valores negativos

        predictions.push({
          transport_type: transportType,
          prediction_year: predYear,
          predicted_passengers: predValue,
          confidence_level: Math.max(0, Math.min(1, r2)) // Entre 0 e 1
        });
      }
    }

    // Limpar previsões antigas
    await supabase
      .from('predictions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Inserir novas previsões
    const { error: insertError } = await supabase
      .from('predictions')
      .insert(predictions);

    if (insertError) throw insertError;

    console.log(`Generated ${predictions.length} predictions`);

    return new Response(
      JSON.stringify({ 
        success: true,
        predictions: predictions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Prediction error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});