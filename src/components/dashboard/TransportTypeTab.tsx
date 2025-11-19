import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface TransportTypeTabProps {
  transportType: string;
  transportName: string;
  icon: string;
}

export const TransportTypeTab = ({ transportType, transportName, icon }: TransportTypeTabProps) => {
  const { toast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [companyAnalysis, setCompanyAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadCompanyAnalysis();
  }, [transportType]);

  const loadData = async () => {
    const { data: transportData } = await supabase
      .from('transport_data')
      .select('*')
      .eq('transport_type', transportType)
      .order('year', { ascending: true });

    if (transportData) {
      setData(transportData);
      calculateStats(transportData);
    }
  };

  const calculateStats = (records: any[]) => {
    if (records.length === 0) return;

    const passengers = records.map(r => parseFloat(r.passengers));
    const years = records.map(r => r.year);

    const max = Math.max(...passengers);
    const min = Math.min(...passengers);
    const avg = passengers.reduce((a, b) => a + b, 0) / passengers.length;
    const maxYear = years[passengers.indexOf(max)];
    const minYear = years[passengers.indexOf(min)];

    // Calcular variações ano a ano
    const variations = [];
    for (let i = 1; i < records.length; i++) {
      const prev = parseFloat(records[i-1].passengers);
      const curr = parseFloat(records[i].passengers);
      const variation = ((curr - prev) / prev) * 100;
      variations.push({
        year: records[i].year,
        variation: variation.toFixed(2),
        passengers: curr
      });
    }

    // Tendência (regressão linear simples)
    const n = years.length;
    const sumX = years.reduce((a, b) => a + b, 0);
    const sumY = passengers.reduce((a, b) => a + b, 0);
    const sumXY = years.reduce((sum, x, i) => sum + x * passengers[i], 0);
    const sumX2 = years.reduce((sum, x) => sum + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    setStats({
      max,
      min,
      avg,
      maxYear,
      minYear,
      variations,
      trend: slope > 0 ? 'crescente' : 'decrescente',
      slope
    });
  };

  const loadCompanyAnalysis = async () => {
    const { data: analysis } = await supabase
      .from('company_analysis')
      .select('*')
      .eq('transport_type', transportType)
      .single();

    if (analysis) {
      setCompanyAnalysis(analysis);
    }
  };

  const analyzeCompanies = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-companies', {
        body: { transportType }
      });

      if (error) throw error;

      toast({
        title: "Análise Concluída",
        description: "Informações sobre empresas carregadas com sucesso!",
      });

      loadCompanyAnalysis();
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Erro na Análise",
        description: "Não foi possível analisar as empresas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!stats) {
    return <div className="text-center p-8">Carregando dados...</div>;
  }

  const chartData = data.map(d => ({
    year: d.year,
    passengers: parseFloat(d.passengers) / 1000,
    variation: stats.variations.find((v: any) => v.year === d.year)?.variation || 0
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-4xl">{icon}</span>
            {transportName}
          </h2>
          <p className="text-muted-foreground mt-1">
            Análise detalhada e comparação com empresas do setor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-3">
            <CardDescription>Pico Histórico</CardDescription>
            <CardTitle className="text-2xl">{stats.maxYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(stats.max / 1000).toFixed(0)}K passageiros
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="pb-3">
            <CardDescription>Média Anual</CardDescription>
            <CardTitle className="text-2xl">{(stats.avg / 1000).toFixed(0)}K</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Período 1995-2020
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendência
            </CardDescription>
            <CardTitle className="text-2xl capitalize">{stats.trend}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.slope > 0 ? '+' : ''}{stats.slope.toFixed(2)} por ano
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução de Passageiros</CardTitle>
          <CardDescription>Dados históricos de 1995 a 2020 (em milhares)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPassengers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
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
                formatter={(value: number) => [`${value.toFixed(0)}K passageiros`, 'Passageiros']}
              />
              <Area 
                type="monotone" 
                dataKey="passengers" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorPassengers)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Análise de Empresas
              </CardTitle>
              <CardDescription>
                Informações sobre empresas reais do setor
              </CardDescription>
            </div>
            <Button 
              onClick={analyzeCompanies} 
              disabled={isAnalyzing}
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                companyAnalysis ? 'Atualizar Análise' : 'Buscar Empresas'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {companyAnalysis ? (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-6">
                <pre className="whitespace-pre-wrap text-sm">
                  {companyAnalysis.analysis_data.raw_analysis || JSON.stringify(companyAnalysis.analysis_data, null, 2)}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                Última atualização: {new Date(companyAnalysis.updated_at).toLocaleString('pt-BR')}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Clique em "Buscar Empresas" para obter informações sobre empresas do setor {transportName}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variações Ano a Ano</CardTitle>
          <CardDescription>Crescimento/decrescimento percentual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.variations.slice(-10).map((v: any) => (
              <div key={v.year} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="font-medium">{v.year}</span>
                <span className={`font-bold ${parseFloat(v.variation) > 0 ? 'text-success' : 'text-destructive'}`}>
                  {parseFloat(v.variation) > 0 ? '+' : ''}{v.variation}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};