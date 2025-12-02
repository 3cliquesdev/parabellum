import { useState } from "react";
import { Plus, Pencil, Trash2, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTags, useDeleteTag } from "@/hooks/useTags";
import { TagDialog } from "@/components/tags/TagDialog";

interface Tag {
  id: string;
  name: string;
  color: string | null;
  category: string | null;
  description: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  customer: "Cliente",
  conversation: "Conversa",
  ticket: "Ticket",
  segmento: "Segmento",
  fonte: "Fonte",
  status: "Status",
};

export default function Tags() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null);

  const { data: tags = [], isLoading } = useTags();
  const deleteTagMutation = useDeleteTag();

  const filteredTags =
    selectedCategory === "all"
      ? tags
      : tags.filter((tag) => tag.category === selectedCategory);

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteTag) {
      await deleteTagMutation.mutateAsync(deleteTag.id);
      setDeleteTag(null);
    }
  };

  const handleNewTag = () => {
    setEditingTag(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gerenciador de Tags
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie tags para padronizar a categorização
          </p>
        </div>
        <Button onClick={handleNewTag}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tag
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tags Cadastradas</CardTitle>
          <CardDescription>
            Filtre por categoria para encontrar tags específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="customer">Cliente</TabsTrigger>
              <TabsTrigger value="conversation">Conversa</TabsTrigger>
              <TabsTrigger value="ticket">Ticket</TabsTrigger>
              <TabsTrigger value="segmento">Segmento</TabsTrigger>
              <TabsTrigger value="fonte">Fonte</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando tags...
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-8">
              <TagIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma tag encontrada</p>
              <Button variant="outline" className="mt-4" onClick={handleNewTag}>
                Criar primeira tag
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: tag.color || "#6B7280",
                          color: "#fff",
                        }}
                      >
                        {tag.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {CATEGORY_LABELS[tag.category || ""] || tag.category || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {tag.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(tag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTag(tag)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TagDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tag={editingTag}
      />

      <AlertDialog open={!!deleteTag} onOpenChange={() => setDeleteTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag "{deleteTag?.name}"? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
