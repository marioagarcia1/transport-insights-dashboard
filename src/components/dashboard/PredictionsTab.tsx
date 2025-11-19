import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export const PredictionsTab = () => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Carregar dados históricos
    const { data: historical } = await supabase
      .from('transport_data')
      .select('*')
      .gte('year', 2015)
      .order('year', { ascending: true });

    // Carregar previsões
    const { data: predictionsData } = await supabase
      .from('predictions')
      .select('*')
      .order('prediction_year', { ascending: true });

    if (historical) setHistoricalData(historical);
    if (predictionsData) setPredictions(predictionsData);
  };

  const prepareChartData = () => {
    // Combinar dados históricos e previsões
    const combined: Record<number, any> = {};

    // Adicionar dados históricos
    historicalData.forEach(record => {
      if (!combined[record.year]) {
        combined[record.year] = { year: record.year, type: 'historical' };
      }
      combined[record.year][record.transport_type] = parseFloat(record.passengers);
    });

    // Adicionar previsões
    predictions.forEach(pred => {
      if (!combined[pred.prediction_year]) {
        combined[pred.prediction_year] = { year: pred.prediction_year, type: 'prediction' };
      }
      combined[pred.prediction_year][`${pred.transport_type}_pred`] = parseFloat(pred.predicted_passengers);
    });

    return Object.values(combined).sort((a, b) => a.year - b.year);
  };

  const preparePredictionsSummary = () => {
    const byType: Record<string, any[]> = {};
    
    predictions.forEach(pred => {
      if (!byType[pred.transport_type]) {
        byType[pred.transport_type] = [];
      }
      byType[pred.transport_type].push(pred);
    });

    return Object.entries(byType).map(([type, preds]) => {
      const avgConfidence = preds.reduce((sum, p) => sum + (parseFloat(p.confidence_level) || 0), 0) / preds.length;
      const lastYear = Math.max(...preds.map(p => p.prediction_year));
      const lastPrediction = preds.find(p => p.prediction_year === lastYear);
      
      return {
        type: type.replace('_', ' ').toUpperCase(),
        prediction2025: lastPrediction ? (parseFloat(lastPrediction.predicted_passengers) / 1000).toFixed(0) : '0',
        confidence: (avgConfidence * 100).toFixed(1)
      };
    }).sort((a, b) => parseFloat(b.prediction2025.toString()) - parseFloat(a.prediction2025.toString()));
  };

  const chartData = prepareChartData();
  const summaryData = preparePredictionsSummary();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          Análise Preditiva
        </h2>
        <p className="text-muted-foreground mt-1">
          Previsões baseadas em regressão linear dos dados históricos (2021-2025)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryData.slice(0, 4).map((item, idx) => (
          <Card key={idx} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardDescription>{item.type}</CardDescription>
              <CardTitle className="text-2xl">{item.prediction2025}K</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Confiança: {item.confidence}%
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projeção de Passageiros 2015-2025</CardTitle>
          <CardDescription>
            Linhas sólidas: dados históricos | Linhas tracejadas: previsões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={600}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="year" 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              {/* Dados históricos */}
              <Line type="monotone" dataKey="auto_bus" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Ônibus (histórico)" />
              <Line type="monotone" dataKey="railway" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Ferrovia (histórico)" />
              <Line type="monotone" dataKey="subway" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Metrô (histórico)" />
              <Line type="monotone" dataKey="air" stroke="hsl(var(--chart-4))" strokeWidth={2} name="Aéreo (histórico)" />
              
              {/* Previsões */}
              <Line 
                type="monotone" 
                dataKey="auto_bus_pred" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                name="Ônibus (previsão)"
              />
              <Line 
                type="monotone" 
                dataKey="railway_pred" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                name="Ferrovia (previsão)"
              />
              <Line 
                type="monotone" 
                dataKey="subway_pred" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                name="Metrô (previsão)"
              />
              <Line 
                type="monotone" 
                dataKey="air_pred" 
                stroke="hsl(var(--chart-4))" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                name="Aéreo (previsão)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo de Todas as Previsões</CardTitle>
          <CardDescription>Estimativa para 2025 por tipo de transporte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summaryData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-semibold">{item.type}</p>
                  <p className="text-sm text-muted-foreground">Confiança: {item.confidence}%</p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {item.prediction2025}K
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Metodologia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Modelo:</strong> Regressão Linear Simples
          </p>
          <p>
            <strong>Dados:</strong> Séries históricas de 1995 a 2020 (26 anos)
          </p>
          <p>
            <strong>Confiança:</strong> Calculada através do coeficiente de determinação (R²)
          </p>
          <p>
            <strong>Limitações:</strong> As previsões não consideram eventos extraordinários como pandemias, 
            crises econômicas ou mudanças regulatórias significativas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};