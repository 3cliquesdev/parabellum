import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, Save, Loader2, Layout, Undo2, Redo2 } from "lucide-react";
import { BlockSidebar } from "./BlockSidebar";
import { BlockRenderer } from "./BlockRenderer";
import { VariablesPicker } from "./VariablesPicker";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import type { EmailBlock, BlockType, BlockContent, BlockStyles } from "@/types/emailBuilderV2";

interface EmailTemplateBuilderV2Props {
  templateId?: string;
  initialBlocks?: EmailBlock[];
  onSave: (blocks: EmailBlock[]) => void;
  isSaving?: boolean;
}

function generateId() {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createDefaultBlock(type: BlockType, templateId: string): EmailBlock {
  const defaults: Record<BlockType, { content: BlockContent; styles: BlockStyles }> = {
    text: { content: { html: "<p>Digite seu texto aqui...</p>" }, styles: { padding: "16px" } },
    image: { content: {}, styles: { padding: "16px", textAlign: "center" } },
    button: { content: { buttonText: "Clique aqui", url: "" }, styles: { backgroundColor: "#2563eb", color: "#ffffff", padding: "12px 24px", borderRadius: "6px" } },
    spacer: { content: { height: 40 }, styles: {} },
    columns: { content: { columns: 2 }, styles: { padding: "16px" } },
    banner: { content: {}, styles: { backgroundColor: "#2563eb", color: "#ffffff", padding: "40px 20px", textAlign: "center" } },
    signature: { content: { name: "", role: "" }, styles: { padding: "20px" } },
    divider: { content: {}, styles: { padding: "16px 0" } },
    social: { content: { links: [] }, styles: { padding: "20px", textAlign: "center" } },
    html: { content: { html: "" }, styles: { padding: "16px" } },
  };

  return {
    id: generateId(),
    template_id: templateId,
    block_type: type,
    position: 0,
    content: defaults[type].content,
    styles: defaults[type].styles,
    responsive: { mobile: {}, desktop: {} },
  };
}

function DropZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop-zone" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-h-[400px] transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary ring-dashed",
        isEmpty && "flex items-center justify-center"
      )}
    >
      {isEmpty ? (
        <div className="text-center text-slate-400">
          <Layout className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-slate-500">Arraste blocos da barra lateral</p>
          <p className="text-xs mt-1 text-slate-400">para começar a criar seu email</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function EmailTemplateBuilderV2({
  templateId = "new",
  initialBlocks = [],
  onSave,
  isSaving,
}: EmailTemplateBuilderV2Props) {
  const { 
    state: blocks, 
    push: pushBlocks, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useUndoRedo({ initialState: initialBlocks, maxHistory: 50 });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if focus is in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const isEditing = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;
      
      if (isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // New block from sidebar
    if (active.id.toString().startsWith("new-block-")) {
      const blockType = active.data.current?.blockType as BlockType;
      const newBlock = createDefaultBlock(blockType, templateId);
      
      if (over.id === "canvas-drop-zone") {
        pushBlocks([...blocks, newBlock]);
      } else {
        const overIndex = blocks.findIndex((b) => b.id === over.id);
        if (overIndex >= 0) {
          const newBlocks = [...blocks];
          newBlocks.splice(overIndex, 0, newBlock);
          pushBlocks(newBlocks);
        } else {
          pushBlocks([...blocks, newBlock]);
        }
      }
      setSelectedBlockId(newBlock.id);
      return;
    }

    // Reorder existing blocks
    if (active.id !== over.id && over.id !== "canvas-drop-zone") {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        pushBlocks(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  };

  const updateBlock = useCallback((id: string, content: Partial<BlockContent>) => {
    pushBlocks(
      blocks.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, ...content } } : b
      ),
      { merge: true, mergeKey: `content:${id}`, mergeWindowMs: 800 }
    );
  }, [blocks, pushBlocks]);

  const updateBlockStyles = useCallback((id: string, styles: Partial<BlockStyles>) => {
    pushBlocks(
      blocks.map((b) =>
        b.id === id ? { ...b, styles: { ...b.styles, ...styles } } : b
      )
    );
  }, [blocks, pushBlocks]);

  const deleteBlock = useCallback((id: string) => {
    pushBlocks(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [blocks, pushBlocks, selectedBlockId]);

  const handleSave = () => {
    const orderedBlocks = blocks.map((block, index) => ({
      ...block,
      position: index,
    }));
    onSave(orderedBlocks);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        <BlockSidebar />

        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-3 border-b bg-card">
            <div className="flex items-center gap-3">
              {/* Undo/Redo buttons */}
              <div className="flex items-center gap-1 border-r pr-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={undo} 
                  disabled={!canUndo}
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={redo} 
                  disabled={!canRedo}
                  title="Refazer (Ctrl+Shift+Z)"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>

              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "desktop" | "mobile")}>
                <TabsList className="h-8">
                  <TabsTrigger value="desktop" className="text-xs gap-1.5">
                    <Monitor className="h-3.5 w-3.5" />
                    Desktop
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="text-xs gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" />
                    Mobile
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <VariablesPicker />
            </div>

            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Template
            </Button>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-slate-200 p-6">
            <div
              className={cn(
                "mx-auto shadow-lg rounded-lg overflow-hidden transition-all",
                previewMode === "desktop" ? "max-w-2xl" : "max-w-sm"
              )}
              style={{ 
                colorScheme: 'light',
                backgroundColor: '#ffffff',
                color: '#1e293b'
              }}
              data-theme="light"
            >
              <DropZone isEmpty={blocks.length === 0}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y">
                    {blocks.map((block) => (
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onUpdate={(content) => updateBlock(block.id, content)}
                        onStyleUpdate={(styles) => updateBlockStyles(block.id, styles)}
                        onDelete={() => deleteBlock(block.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DropZone>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && activeId.startsWith("new-block-") && (
          <div className="bg-card border rounded-lg p-3 shadow-lg opacity-80">
            Novo bloco
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
