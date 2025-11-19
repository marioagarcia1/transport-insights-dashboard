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

    console.log('Starting ETL process...');

    // Ler CSV e transformar dados
    const csvUrl = `${supabaseUrl.replace('https://', 'https://')}/storage/v1/object/public/data/ua_passengers_1995-2020.csv`;
    
    // Dados do CSV já parseados
    const rawData = `year;railway;sea;river;auto_bus;air;tram;trolley;subway
1995;577431.5;7817;3594.1;3483173;1914.9;821652.3;1358736.9;561012.4
1996;538568.7;5044.6;2735.9;3304600;1724;788026.2;1590439.3;536304.1
1997;500838.8;4311.3;2443.1;2512147.2;1484.5;1265349.2;2388087.6;507897
1998;501428.7;3838.3;2356.5;2403424.6;1163.9;1450735.2;2717998.1;668456.4
1999;486810.4;3084.3;2269.4;2501707.5;1087;1456755.4;2735241;724425.5
2000;498683;3760.5;2163.3;2557514.6;1164;1380921.2;2581880;753540.1
2001;467825.3;5270.8;2034.2;2722001.6;1289.9;1333782;2332086.3;793197
2002;464810.4;5417.9;2211.9;3069136.3;1767.5;1196402.6;2140314.9;831040.4
2003;476742.4;6929.4;2194.1;3297504.5;2374.7;1132181.9;1920746.2;872812.5
2004;452225.6;9678.4;2140.2;3720326.4;3228.5;1112394.2;1848843.3;848176.1
2005;445553.1;11341.2;2247.6;3836514.5;3813.1;1110957.5;1902760.9;886597.7
2006;448421.7;10901.3;2021.9;3987982;4350.9;1082818;1788227.2;917699.8
2007;447093.7;7690.8;1851.6;4173033.7;4928.6;1026812;1620966.9;931511.9
2008;445465.7;7361.4;1551.8;4369125.5;6181;962702.5;1580384.2;958693.9
2009;425974.8;6222.5;1511.6;4014035.2;5131.2;787013.6;1283382.3;751988.3
2010;427240.6;6645.6;985.2;3726288.6;6106.5;713809.7;1203551.2;760551.2
2011;429784.9;7064.1;962.8;3611829.9;7504.8;797993.6;1346431.5;778253.4
2012;429115.3;5921;722.7;3450173.1;8106.3;799688.8;1345544.9;774057.6
2013;425216.9;6642;631.1;3343659.5;8107.2;757382.8;1306228.5;774794
2014;389305.5;45776;565.1;2913318.1;6473.3;769911.1;1096884.8;725819.9
2015;389794.1;45802;550.8;2250345.3;6302.7;738603.2;1080772.6;700369.5
2016;389057.6;45746;448.5;2024892.9;8277.9;694009.4;1038746;698367.3
2017;164941.6;45836;562.9;2019324.9;10555.6;675841.4;1058072.1;718886.9
2018;157962.4;71.9;596.2;1906852.1;12529;666271.1;1016241.2;726585.1
2019;154811.8;79.4;589.9;1804929.3;13705.8;627515.1;945694.5;714982.1
2020;68332.5;52.6;256.5;1083872.7;4797.5;422753.2;578999.6;411149.7`;

    const lines = rawData.trim().split('\n');
    const headers = lines[0].split(';');
    const transportTypes = headers.slice(1); // Remove 'year'

    const transformedData: any[] = [];

    // Transformar de wide para long format
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      const year = parseInt(values[0]);

      for (let j = 1; j < values.length; j++) {
        transformedData.push({
          year,
          transport_type: transportTypes[j - 1],
          passengers: parseFloat(values[j]),
        });
      }
    }

    console.log(`Transformed ${transformedData.length} records`);

    // Limpar dados existentes
    const { error: deleteError } = await supabase
      .from('transport_data')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Error deleting old data:', deleteError);
    }

    // Inserir novos dados em lotes
    const batchSize = 100;
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('transport_data')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        throw insertError;
      }
    }

    console.log('ETL process completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ETL process completed',
        records: transformedData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ETL error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});