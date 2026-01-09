import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ArrowRight, Loader2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useMoveProductOffer } from "@/hooks/useProductOffers";

interface Offer {
  id: string;
  offer_id: string;
  offer_name: string;
  price: number;
}

interface MoveOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer | null;
  currentProductId: string;
  currentProductName: string;
}

export function MoveOfferDialog({
  open,
  onOpenChange,
  offer,
  currentProductId,
  currentProductName,
}: MoveOfferDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  const { data: products, isLoading: loadingProducts } = useProducts();
  const moveOffer = useMoveProductOffer();

  // Filter products excluding current product
  const filteredProducts = products?.filter(
    (p) =>
      p.id !== currentProductId &&
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProduct = products?.find((p) => p.id === selectedProductId);

  const handleMove = async () => {
    if (!offer || !selectedProductId) return;

    await moveOffer.mutateAsync({
      offerId: offer.id,
      newProductId: selectedProductId,
      offerExternalId: offer.offer_id,
    });

    onOpenChange(false);
    setSearchTerm("");
    setSelectedProductId(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchTerm("");
    setSelectedProductId(null);
  };

  if (!offer) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Mover Oferta
          </DialogTitle>
          <DialogDescription>
            Selecione o produto de destino para mover esta oferta.
          </DialogDescription>
        </DialogHeader>

        {/* Offer Info */}
        <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate flex-1">{offer.offer_name}</span>
            <Badge variant="outline" className="ml-2 shrink-0">
              R$ {offer.price.toFixed(2).replace(".", ",")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Produto atual: <span className="font-medium">{currentProductName}</span>
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto de destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Products List */}
        <ScrollArea className="h-48 border rounded-lg">
          {loadingProducts ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="p-2 space-y-1">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                    selectedProductId === product.id
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    {product.external_id && (
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {product.external_id}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
            </div>
          )}
        </ScrollArea>

        {/* Selected Product Preview */}
        {selectedProduct && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              <span className="font-medium">Destino:</span> {selectedProduct.name}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedProductId || moveOffer.isPending}
          >
            {moveOffer.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Movendo...
              </>
            ) : (
              "Mover Oferta"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
