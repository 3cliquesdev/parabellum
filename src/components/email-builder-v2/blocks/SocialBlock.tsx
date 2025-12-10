import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings, Facebook, Twitter, Instagram, Linkedin, Youtube, Globe } from "lucide-react";
import type { EmailBlock } from "@/types/emailBuilderV2";

interface SocialLink {
  platform: string;
  url: string;
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-5 w-5" />,
  twitter: <Twitter className="h-5 w-5" />,
  instagram: <Instagram className="h-5 w-5" />,
  linkedin: <Linkedin className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5" />,
  website: <Globe className="h-5 w-5" />,
};

const SOCIAL_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  twitter: "#1DA1F2",
  instagram: "#E4405F",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
  website: "#6B7280",
};

interface SocialBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onUpdate: (content: { links: SocialLink[] }) => void;
  readOnly?: boolean;
}

export function SocialBlock({ block, isSelected, onUpdate, readOnly }: SocialBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const links: SocialLink[] = block.content.links || [];

  const updateLink = (index: number, field: keyof SocialLink, value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onUpdate({ links: newLinks });
  };

  const addLink = (platform: string) => {
    onUpdate({ links: [...links, { platform, url: "" }] });
  };

  const removeLink = (index: number) => {
    onUpdate({ links: links.filter((_, i) => i !== index) });
  };

  return (
    <div
      className={cn(
        "relative group transition-all py-4",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        backgroundColor: block.styles.backgroundColor,
        padding: block.styles.padding || "20px",
        textAlign: block.styles.textAlign || "center",
      }}
    >
      <div className="flex items-center justify-center gap-4">
        {links.length > 0 ? (
          links.map((link, index) => (
            <a
              key={index}
              href={link.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ backgroundColor: SOCIAL_COLORS[link.platform] || "#6B7280", color: "#fff" }}
              onClick={(e) => readOnly || e.preventDefault()}
            >
              {SOCIAL_ICONS[link.platform] || <Globe className="h-5 w-5" />}
            </a>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Clique para adicionar redes sociais</p>
        )}
      </div>

      {!readOnly && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <Label>Redes Sociais</Label>
              
              {links.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="p-1.5 rounded"
                    style={{ backgroundColor: SOCIAL_COLORS[link.platform] || "#6B7280", color: "#fff" }}
                  >
                    {SOCIAL_ICONS[link.platform]}
                  </div>
                  <Input
                    value={link.url}
                    onChange={(e) => updateLink(index, "url", e.target.value)}
                    placeholder={`URL do ${link.platform}`}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeLink(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {Object.keys(SOCIAL_ICONS).map((platform) => (
                  <Button
                    key={platform}
                    size="sm"
                    variant="outline"
                    onClick={() => addLink(platform)}
                    disabled={links.some((l) => l.platform === platform)}
                  >
                    {SOCIAL_ICONS[platform]}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
