import { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlashCommandMenu } from "@/components/SlashCommandMenu";
import { MacrosPopover } from "@/components/MacrosPopover";
import { ChannelSelector } from "@/components/ChannelSelector";
import { FileDropZone } from "./FileDropZone";
import { MediaPreview } from "./MediaPreview";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import {
  Send,
  StickyNote,
  MessageCircle,
  AlertTriangle,
  Paperclip,
  Smile,
  Mic,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChannelType, ChannelOption } from "@/hooks/useReplyChannel";

export type MessageMode = "public" | "internal";

interface PendingAttachment {
  file: File;
  preview?: string;
  uploadedMedia?: {
    id: string;
    url: string;
    mimeType: string;
    filename: string;
  };
}

interface SuperComposerProps {
  conversationId: string;
  message: string;
  setMessage: (value: string) => void;
  onSendMessage: (
    isInternal: boolean,
    channel?: ChannelType,
    attachmentIds?: string[]
  ) => void;
  isSending: boolean;
  isDisabled: boolean;
  placeholder?: string;
  selectedChannel?: ChannelType;
  onChannelChange?: (channel: ChannelType) => void;
  availableChannels?: ChannelOption[];
  showChannelSelector?: boolean;
}

export function SuperComposer({
  conversationId,
  message,
  setMessage,
  onSendMessage,
  isSending,
  isDisabled,
  placeholder = "Digite sua mensagem ou / para macros...",
  selectedChannel = "web_chat",
  onChannelChange,
  availableChannels = [],
  showChannelSelector = false,
}: SuperComposerProps) {
  const [messageMode, setMessageMode] = useState<MessageMode>("public");
  const [localChannel, setLocalChannel] = useState<ChannelType>(selectedChannel);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { upload, isUploading, progress } = useMediaUpload({
    conversationId,
    onSuccess: (media) => {
      setPendingAttachments((prev) =>
        prev.map((att) =>
          att.file.name === media.filename
            ? {
                ...att,
                uploadedMedia: {
                  id: media.id,
                  url: media.url || "",
                  mimeType: media.mimeType,
                  filename: media.filename,
                },
              }
            : att
        )
      );
    },
  });

  useEffect(() => {
    setLocalChannel(selectedChannel);
  }, [selectedChannel]);

  const handleChannelChange = (channel: ChannelType) => {
    setLocalChannel(channel);
    onChannelChange?.(channel);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMacroSelect = (content: string) => {
    setMessage(content);
    textareaRef.current?.focus();
  };

  const handleFileSelect = async (file: File) => {
    // Add to pending with preview
    let preview: string | undefined;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }

    setPendingAttachments((prev) => [...prev, { file, preview }]);
    setShowAttachmentPicker(false);

    // Upload immediately
    await upload(file);
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments((prev) => {
      const attachment = prev[index];
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = () => {
    const hasContent = message.trim() || pendingAttachments.some((a) => a.uploadedMedia);

    if (!hasContent) return;

    const attachmentIds = pendingAttachments
      .filter((a) => a.uploadedMedia)
      .map((a) => a.uploadedMedia!.id);

    onSendMessage(messageMode === "internal", localChannel, attachmentIds);

    // Clear attachments
    pendingAttachments.forEach((att) => {
      if (att.preview) URL.revokeObjectURL(att.preview);
    });
    setPendingAttachments([]);
  };

  const isInternal = messageMode === "internal";
  const hasAttachments = pendingAttachments.length > 0;
  const allUploaded = pendingAttachments.every((a) => a.uploadedMedia);
  const canSend =
    (message.trim() || (hasAttachments && allUploaded)) && !isUploading;

  return (
    <div className="flex-none bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-t border-slate-200 dark:border-zinc-800">
      {/* Tabs + Channel Selector */}
      <div className="px-4 pt-3 flex items-center justify-between gap-3">
        <Tabs
          value={messageMode}
          onValueChange={(v) => setMessageMode(v as MessageMode)}
        >
          <TabsList className="h-8 p-0.5 bg-slate-100 dark:bg-zinc-800">
            <TabsTrigger
              value="public"
              className="h-7 px-3 gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Mensagem
            </TabsTrigger>
            <TabsTrigger
              value="internal"
              className={cn(
                "h-7 px-3 gap-1.5 text-xs",
                "data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-800",
                "dark:data-[state=active]:bg-yellow-900/50 dark:data-[state=active]:text-yellow-200"
              )}
            >
              <StickyNote className="h-3.5 w-3.5" />
              Nota Interna
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {showChannelSelector && !isInternal && availableChannels.length > 0 && (
          <ChannelSelector
            selectedChannel={localChannel}
            onChannelChange={handleChannelChange}
            availableChannels={availableChannels}
            disabled={isDisabled || isSending}
          />
        )}
      </div>

      {/* Internal Note Warning */}
      {isInternal && (
        <div className="mx-4 mt-2 flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1.5 rounded-md">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Esta mensagem é visível apenas para a equipe interna</span>
        </div>
      )}

      {/* Pending Attachments Preview */}
      {hasAttachments && (
        <div className="px-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {pendingAttachments.map((att, index) => (
              <div
                key={index}
                className="relative group rounded-lg border border-border overflow-hidden"
              >
                {att.preview ? (
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className="h-16 w-16 object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 flex items-center justify-center bg-muted">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                
                {/* Upload Progress Overlay */}
                {!att.uploadedMedia && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-xs font-medium">
                      {Math.round(progress?.percentage || 0)}%
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 pt-3">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          {/* Macros Button */}
          <MacrosPopover
            onSelectMacro={handleMacroSelect}
            disabled={isDisabled || isSending}
          />

          {/* Attachment Button */}
          <Popover open={showAttachmentPicker} onOpenChange={setShowAttachmentPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={isDisabled || isSending}
              >
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <FileDropZone
                onFileSelect={handleFileSelect}
                disabled={isUploading}
              />
            </PopoverContent>
          </Popover>

          {/* Textarea with Slash Commands */}
          <SlashCommandMenu value={message} onChange={setMessage}>
            <Textarea
              ref={textareaRef}
              placeholder={isDisabled ? "Conversa encerrada" : placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isSending || isDisabled}
              rows={1}
              className={cn(
                "flex-1 min-h-[44px] max-h-32 resize-none py-3 px-4 rounded-2xl transition-colors",
                isInternal
                  ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 focus-visible:ring-yellow-500"
                  : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
              )}
            />
          </SlashCommandMenu>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!canSend || isSending || isDisabled}
            size="icon"
            className={cn(
              "rounded-full h-11 w-11 shrink-0 shadow-md transition-colors",
              isInternal && "bg-yellow-500 hover:bg-yellow-600"
            )}
          >
            {isInternal ? (
              <StickyNote className="h-5 w-5" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
