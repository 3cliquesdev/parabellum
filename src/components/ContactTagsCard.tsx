import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, Tag } from "lucide-react";
import { useTags } from "@/hooks/useTags";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ContactTagsCardProps {
  customerId: string;
  customerTags: any[] | undefined;
  addTag: any;
  removeTag: any;
  isLoading?: boolean;
}

export default function ContactTagsCard({ 
  customerId, 
  customerTags, 
  addTag, 
  removeTag,
  isLoading 
}: ContactTagsCardProps) {
  const { data: allTags } = useTags();

  const assignedTagIds = customerTags?.map(ct => ct.tag_id) || [];
  const availableTags = allTags?.filter(t => !assignedTagIds.includes(t.id)) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Tags</CardTitle>
          </div>

          {/* Botão Adicionar Tag */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <p className="text-sm font-medium">Adicionar Tag</p>
                {availableTags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Todas as tags já foram atribuídas
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {availableTags.map(tag => (
                      <Button
                        key={tag.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => addTag.mutate(tag.id)}
                      >
                        <div
                          className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="truncate">{tag.name}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent>
        {/* Tags Ativas */}
        {!customerTags || customerTags.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma tag atribuída
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customerTags.map(ct => (
              <Badge
                key={ct.id}
                variant="secondary"
                className="gap-1 pr-1 border"
                style={{ 
                  backgroundColor: ct.tags.color + "15",
                  borderColor: ct.tags.color + "30",
                  color: ct.tags.color 
                }}
              >
                <span className="truncate max-w-[120px]">{ct.tags.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeTag.mutate(ct.tag_id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
