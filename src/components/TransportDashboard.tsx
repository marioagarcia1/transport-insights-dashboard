import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { OverviewTab } from "./dashboard/OverviewTab";
import { TransportTypeTab } from "./dashboard/TransportTypeTab";
import { PredictionsTab } from "./dashboard/PredictionsTab";

export const TransportDashboard = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const transportTypes = [
    { id: "railway", name: "Ferrovia", icon: "🚂" },
    { id: "sea", name: "Marítimo", icon: "🚢" },
    { id: "river", name: "Fluvial", icon: "🛥️" },
    { id: "auto_bus", name: "Ônibus", icon: "🚌" },
    { id: "air", name: "Aéreo", icon: "✈️" },
    { id: "tram", name: "Bonde", icon: "🚊" },
    { id: "trolley", name: "Trólebus", icon: "🚎" },
    { id: "subway", name: "Metrô", icon: "🚇" },
  ];

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    const { data, error } = await supabase
      .from('transport_data')
      .select('id')
      .limit(1);
    
    if (!error && data && data.length > 0) {
      setHasData(true);
    }
  };

  const runETL = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('etl-transport-data');
      
      if (error) throw error;

      toast({
        title: "ETL Concluído",
        description: `${data.records} registros processados com sucesso!`,
      });
      
      setHasData(true);
      
      // Gerar previsões automaticamente
      await generatePredictions();
    } catch (error) {
      console.error('ETL error:', error);
      toast({
        title: "Erro no ETL",
        description: "Falha ao processar dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePredictions = async () => {
    try {
      const { error } = await supabase.functions.invoke('generate-predictions');
      
      if (error) throw error;

      toast({
        title: "Previsões Geradas",
        description: "Análise preditiva concluída com sucesso!",
      });
    } catch (error) {
      console.error('Prediction error:', error);
    }
  };

  if (!hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl">Dashboard de Transporte</CardTitle>
            <CardDescription className="text-base">
              Análise de dados de passageiros de transporte da Ucrânia (1995-2020)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              Execute o processo ETL para carregar e transformar os dados.
            </p>
            <Button 
              onClick={runETL} 
              disabled={isLoading}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando dados...
                </>
              ) : (
                'Iniciar ETL'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Dashboard de Transporte
            </h1>
            <p className="text-muted-foreground mt-2">
              Análise descritiva e preditiva de dados de passageiros (1995-2020)
            </p>
          </div>
          <Button onClick={runETL} disabled={isLoading} variant="outline">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              'Atualizar Dados'
            )}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 lg:grid-cols-10 gap-2 h-auto p-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="predictions" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              Previsões
            </TabsTrigger>
            {transportTypes.map(type => (
              <TabsTrigger 
                key={type.id} 
                value={type.id}
                className="data-[state=active]:bg-secondary"
              >
                {type.icon} {type.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <PredictionsTab />
          </TabsContent>

          {transportTypes.map(type => (
            <TabsContent key={type.id} value={type.id} className="space-y-6">
              <TransportTypeTab 
                transportType={type.id} 
                transportName={type.name}
                icon={type.icon}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};