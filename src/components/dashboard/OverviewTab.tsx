import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Calendar, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

interface TransportData {
  year: number;
  transport_type: string;
  passengers: number;
}

export const OverviewTab = () => {
  const [data, setData] = useState<TransportData[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: transportData } = await supabase
      .from('transport_data')
      .select('*')
      .order('year', { ascending: true });

    if (transportData) {
      setData(transportData);
      calculateStats(transportData);
    }
  };

  const calculateStats = (data: TransportData[]) => {
    // Agrupar por tipo de transporte
    const byType: Record<string, number> = {};
    const byYear: Record<number, number> = {};
    
    data.forEach(record => {
      byType[record.transport_type] = (byType[record.transport_type] || 0) + parseFloat(record.passengers.toString());
      byYear[record.year] = (byYear[record.year] || 0) + parseFloat(record.passengers.toString());
    });

    // Encontrar mais e menos rentável
    const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const mostProfitable = sorted[0];
    const leastProfitable = sorted[sorted.length - 1];

    // Ano de maior impacto
    const peakYear = Object.entries(byYear).sort((a, b) => b[1] - a[1])[0];

    // Variação ano a ano
    const years = Object.keys(byYear).map(Number).sort();
    const variations = [];
    for (let i = 1; i < years.length; i++) {
      const variation = ((byYear[years[i]] - byYear[years[i-1]]) / byYear[years[i-1]]) * 100;
      variations.push({
        year: years[i],
        variation: variation.toFixed(2)
      });
    }

    setStats({
      mostProfitable,
      leastProfitable,
      peakYear,
      variations
    });
  };

  const prepareChartData = () => {
    const byYear: Record<number, Record<string, number>> = {};
    
    data.forEach(record => {
      if (!byYear[record.year]) {
        byYear[record.year] = { year: record.year };
      }
      byYear[record.year][record.transport_type] = parseFloat(record.passengers.toString());
    });

    return Object.values(byYear);
  };

  const prepareTotalByType = () => {
    const byType: Record<string, number> = {};
    
    data.forEach(record => {
      byType[record.transport_type] = (byType[record.transport_type] || 0) + parseFloat(record.passengers.toString());
    });

    return Object.entries(byType).map(([type, total]) => ({
      type: type.replace('_', ' ').toUpperCase(),
      total: total / 1000000 // Converter para milhões
    })).sort((a, b) => b.total - a.total);
  };

  if (!stats) {
    return <div className="text-center p-8">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Award className="h-4 w-4 text-success" />
              Mais Rentável
            </CardDescription>
            <CardTitle className="text-2xl">{stats.mostProfitable[0]}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(stats.mostProfitable[1] / 1000000).toFixed(2)}M passageiros
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Menos Rentável
            </CardDescription>
            <CardTitle className="text-2xl">{stats.leastProfitable[0]}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(stats.leastProfitable[1] / 1000000).toFixed(2)}M passageiros
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Ano de Pico
            </CardDescription>
            <CardTitle className="text-2xl">{stats.peakYear[0]}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(stats.peakYear[1] / 1000000).toFixed(2)}M passageiros
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-warning" />
              Variação Média
            </CardDescription>
            <CardTitle className="text-2xl">
              {(stats.variations.reduce((sum: number, v: any) => sum + parseFloat(v.variation), 0) / stats.variations.length).toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Período 1995-2020
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total de Passageiros por Tipo de Transporte</CardTitle>
          <CardDescription>Acumulado 1995-2020 (em milhões)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={prepareTotalByType()}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="type" 
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
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução de Passageiros por Ano</CardTitle>
          <CardDescription>Comparação entre todos os tipos de transporte</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={prepareChartData()}>
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
              <Line type="monotone" dataKey="railway" stroke="hsl(var(--chart-1))" strokeWidth={2} />
              <Line type="monotone" dataKey="auto_bus" stroke="hsl(var(--chart-2))" strokeWidth={2} />
              <Line type="monotone" dataKey="subway" stroke="hsl(var(--chart-3))" strokeWidth={2} />
              <Line type="monotone" dataKey="trolley" stroke="hsl(var(--chart-4))" strokeWidth={2} />
              <Line type="monotone" dataKey="tram" stroke="hsl(var(--chart-5))" strokeWidth={2} />
              <Line type="monotone" dataKey="air" stroke="hsl(var(--chart-6))" strokeWidth={2} />
              <Line type="monotone" dataKey="sea" stroke="hsl(var(--chart-7))" strokeWidth={2} />
              <Line type="monotone" dataKey="river" stroke="hsl(var(--chart-8))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};