import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, LucideIcon } from "lucide-react";

interface ReportCardProps {
  report: {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
  };
  onClick: () => void;
}

export default function ReportCard({ report, onClick }: ReportCardProps) {
  const Icon = report.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <CardTitle className="text-xl mt-4">{report.name}</CardTitle>
        <CardDescription className="text-sm">{report.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" variant="outline" onClick={onClick}>
          Gerar Relatório
        </Button>
      </CardContent>
    </Card>
  );
}
