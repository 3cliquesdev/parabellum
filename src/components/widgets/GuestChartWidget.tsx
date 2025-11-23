import { Card } from "@/components/ui/card";
import { useGuestStats } from "@/hooks/useGuestStats";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users } from "lucide-react";

export function GuestChartWidget() {
  const { guestData, isLoading } = useGuestStats();

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
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Entrada de Convidados</h3>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={guestData}>
          <defs>
            <linearGradient id="colorGuests" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="day" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              color: "hsl(var(--foreground))",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Line
            type="monotone"
            dataKey="guests"
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            fill="url(#colorGuests)"
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
