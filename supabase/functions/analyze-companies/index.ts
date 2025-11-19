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
    const { transportType } = await req.json();
    
    if (!transportType) {
      throw new Error('Transport type is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Analyzing companies for transport type: ${transportType}`);

    // Usar Lovable AI para pesquisar empresas
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um analista especializado em empresas de transporte. Forneça análises detalhadas e dados reais sobre empresas do setor.'
          },
          {
            role: 'user',
            content: `Pesquise e forneça informações sobre as 3 principais empresas de ${transportType} na Ucrânia ou região. 
            Para cada empresa, inclua:
            1. Nome da empresa
            2. Ano de fundação
            3. Tamanho da frota ou capacidade
            4. Receita aproximada (se disponível)
            5. Market share aproximado
            6. Principais rotas ou áreas de atuação
            7. Situação atual da empresa
            
            Forneça dados reais e atualizados. Retorne em formato JSON estruturado.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const analysisText = aiData.choices[0]?.message?.content || '';

    console.log('AI Analysis received:', analysisText.substring(0, 200));

    // Extrair informações estruturadas
    let structuredData;
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0]);
      } else {
        structuredData = {
          raw_analysis: analysisText,
          companies: []
        };
      }
    } catch (e) {
      structuredData = {
        raw_analysis: analysisText,
        companies: []
      };
    }

    // Salvar análise no banco
    const { data: existingAnalysis } = await supabase
      .from('company_analysis')
      .select('id')
      .eq('transport_type', transportType)
      .single();

    if (existingAnalysis) {
      await supabase
        .from('company_analysis')
        .update({
          company_name: 'Multiple Companies',
          analysis_data: structuredData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAnalysis.id);
    } else {
      await supabase
        .from('company_analysis')
        .insert({
          transport_type: transportType,
          company_name: 'Multiple Companies',
          analysis_data: structuredData
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: structuredData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});