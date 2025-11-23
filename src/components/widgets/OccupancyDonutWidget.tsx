import { Card } from "@/components/ui/card";
import { useContacts } from "@/hooks/useContacts";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Target } from "lucide-react";

export function OccupancyDonutWidget() {
  const { data: contacts, isLoading } = useContacts();

  // Meta de ocupação: 200 convidados
  const targetGuests = 200;
  const confirmedGuests = contacts?.length || 0;
  const occupancyPercentage = Math.min(Math.round((confirmedGuests / targetGuests) * 100), 100);
  const remainingPercentage = 100 - occupancyPercentage;

  const data = [
    { name: "Confirmados", value: occupancyPercentage },
    { name: "Disponível", value: remainingPercentage },
  ];

  const COLORS = ["hsl(var(--success))", "hsl(var(--border))"];

  if (isLoading) {
    return (
      <Card className="bg-card border-border rounded-3xl p-6 animate-pulse">
        <div className="h-64 bg-muted rounded-2xl" />
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border rounded-3xl p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Meta de Ocupação</h3>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-5xl font-bold text-foreground">{occupancyPercentage}%</p>
          <p className="text-sm text-muted-foreground mt-2">{confirmedGuests} / {targetGuests}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">Confirmados</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-border" />
          <span className="text-sm text-muted-foreground">Disponível</span>
        </div>
      </div>
    </Card>
  );
}
