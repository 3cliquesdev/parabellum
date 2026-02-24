import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { X, Tag, Search, Check } from "lucide-react";
import { useUniversalTag } from "@/hooks/useUniversalTag";

interface ConversationTagsSectionProps {
  conversationId: string;
  contactId?: string;
}

export function ConversationTagsSection({ conversationId, contactId }: ConversationTagsSectionProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { currentTag, allTags, selectTag, removeTag } = useUniversalTag(conversationId, contactId);

  const filteredTags = allTags.filter((tag: any) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectTag = (tagId: string) => {
    if (currentTag?.id === tagId) {
      removeTag.mutate();
    } else {
      selectTag.mutate(tagId);
    }
    setOpen(false);
  };

  const handleRemoveTag = () => {
    removeTag.mutate();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {currentTag && (
        <Badge
          variant="secondary"
          className="text-xs flex items-center gap-1 pr-1"
          style={{ backgroundColor: currentTag.color + "20", color: currentTag.color, borderColor: currentTag.color }}
        >
          {currentTag.name}
          <button
            onClick={handleRemoveTag}
            className="hover:bg-black/10 rounded p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearch("");
      }}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs text-foreground border-border">
            <Tag className="h-3 w-3 mr-1" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-popover border border-border z-50" align="start">
          <div className="text-xs font-medium text-foreground mb-2">Selecionar Tag</div>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs pl-7"
            />
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredTags.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                {search ? "Nenhuma tag encontrada" : "Nenhuma tag cadastrada"}
              </p>
            ) : (
              filteredTags.map((tag: any) => {
                const isSelected = currentTag?.id === tag.id;
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleSelectTag(tag.id)}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer w-full text-left"
                  >
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
                      {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: tag.color + "20", color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
