import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, MessageSquare, CheckCircle, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface CadenceDashboardProps {
  cadences: any[];
}

export function CadenceDashboard({ cadences }: CadenceDashboardProps) {
  // Fetch all enrollments for all cadences
  const { data: allEnrollments } = useQuery({
    queryKey: ["all-cadence-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cadence_enrollments")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalEnrollments = allEnrollments?.length || 0;
  const activeEnrollments = allEnrollments?.filter((e) => e.status === "active").length || 0;
  const repliedEnrollments = allEnrollments?.filter((e) => e.status === "replied").length || 0;
  const completedEnrollments = allEnrollments?.filter((e) => e.status === "completed").length || 0;

  const averageResponseRate = totalEnrollments > 0 
    ? Math.round((repliedEnrollments / totalEnrollments) * 100) 
    : 0;

  // Prepare chart data
  const chartData = cadences?.map((cadence) => {
    const cadenceEnrollments = allEnrollments?.filter((e) => e.cadence_id === cadence.id) || [];
    const replied = cadenceEnrollments.filter((e) => e.status === "replied").length;
    const total = cadenceEnrollments.length;
    const rate = total > 0 ? Math.round((replied / total) * 100) : 0;
    return {
      name: cadence.name.length > 15 ? cadence.name.substring(0, 15) + "..." : cadence.name,
      fullName: cadence.name,
      responseRate: rate,
      enrollments: total,
    };
  }) || [];

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inscritos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">Em todas as cadências</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeEnrollments}</div>
            <Progress value={totalEnrollments > 0 ? (activeEnrollments / totalEnrollments) * 100 : 0} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responderam</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{repliedEnrollments}</div>
            <p className="text-xs text-muted-foreground">{averageResponseRate}% taxa de resposta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedEnrollments}</div>
            <p className="text-xs text-muted-foreground">Completaram a cadência</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{averageResponseRate}%</div>
            <p className="text-xs text-muted-foreground">Resposta geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxa de Resposta por Cadência</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{data.fullName}</p>
                          <p className="text-sm text-muted-foreground">{data.enrollments} inscritos</p>
                          <p className="text-sm font-semibold text-primary">{data.responseRate}% responderam</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="responseRate" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
