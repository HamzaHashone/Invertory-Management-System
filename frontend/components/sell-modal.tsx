'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lot } from '@/types';
import api from '@/lib/api';
import { toast } from 'sonner';

interface SellItem {
  id: string;
  color: string;
  size: string;
  quantity: number;
  sellPricePerPiece: number;
}

interface SellModalProps {
  lot: Lot;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SellModal({ lot, open, onClose, onSuccess }: SellModalProps) {
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [sellItems, setSellItems] = useState<SellItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const availableSizes = selectedColor
    ? lot.items
        .find((item) => item.color === selectedColor)
        ?.sizes.filter((size) => size.remainingQuantity > 0) || []
    : [];

  const selectedSizeData = availableSizes.find((s) => s.size === selectedSize);
  const maxQuantity = selectedSizeData?.remainingQuantity || 0;

  useEffect(() => {
    if (!availableSizes.find((s) => s.size === selectedSize)) {
      setSelectedSize('');
    }
  }, [selectedColor, availableSizes, selectedSize]);

  const handleAddItem = () => {
    if (!selectedColor || !selectedSize || !quantity) {
      toast.error('Please select color, size, and quantity');
      return;
    }

    const qty = parseInt(quantity);
    if (qty > maxQuantity) {
      toast.error(`Only ${maxQuantity} items available`);
      return;
    }

    const sizeData = selectedSizeData!;

    setSellItems([
      ...sellItems,
      {
        id: crypto.randomUUID(),
        color: selectedColor,
        size: selectedSize,
        quantity: qty,
        sellPricePerPiece: sizeData.sellCostPerPiece,
      },
    ]);

    setSelectedColor('');
    setSelectedSize('');
    setQuantity('1');
  };

  const handleRemoveItem = (id: string) => {
    setSellItems(sellItems.filter((item) => item.id !== id));
  };

  const getTotalRevenue = () => {
    return sellItems.reduce(
      (total, item) => total + item.quantity * item.sellPricePerPiece,
      0
    );
  };

  const handleSubmit = async () => {
    if (sellItems.length === 0) {
      toast.error('Add at least one item to sell');
      return;
    }

    setLoading(true);

    try {
      await api.post(`/lots/${lot._id}/sell`, {
        lotId: lot._id,
        soldItems: sellItems.map((item) => ({
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          sellPricePerPiece: item.sellPricePerPiece,
        })),
        customerName: customerName || undefined,
        invoiceNumber: invoiceNumber || undefined,
      });

      toast.success('Sale completed successfully');
      setSellItems([]);
      setCustomerName('');
      setInvoiceNumber('');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="border-b pb-4 sm:pb-6 flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold">Sell Items from {lot.lotNumber}</DialogTitle>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Select items to add to this sale</p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 py-4 sm:py-6 overflow-y-auto flex-1 min-h-0">
          {/* Left Column - Item Selection */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Add Items</h3>
            </div>

            <div>
              <Label className="floating-label text-xs sm:text-sm">Color</Label>
              <Select value={selectedColor} onValueChange={setSelectedColor}>
                <SelectTrigger className="modern-input">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {lot.items
                    .filter((item) =>
                      item.sizes.some((size) => size.remainingQuantity > 0)
                    )
                    .map((item) => (
                      <SelectItem key={item.color} value={item.color}>
                        {item.color}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedColor && (
              <div>
                <Label className="floating-label text-xs sm:text-sm">Size</Label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="modern-input text-sm">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSizes.map((size) => (
                      <SelectItem key={size.size} value={size.size}>
                        {size.size} (Available: {size.remainingQuantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSize && (
              <div>
                <Label className="floating-label text-xs sm:text-sm">Quantity (Max: {maxQuantity})</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  max={maxQuantity}
                  className="modern-input text-sm"
                />
              </div>
            )}

            <button onClick={handleAddItem} className="modern-btn-primary w-full px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm">
              Add to Sale
            </button>
          </div>

          {/* Right Column - Cart */}
          <div className="flex flex-col space-y-4 lg:space-y-6 min-h-0">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Cart</h3>
            </div>

            {sellItems.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-gray-600 text-xs sm:text-sm">No items added yet</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1 min-h-0 max-h-[300px] lg:max-h-[400px] pr-2 -mr-2">
                {sellItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-gray-100 bg-white hover:border-purple-200 transition-all"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs sm:text-sm flex-shrink-0">
                        {item.size}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-sm sm:text-base truncate">
                          {item.color} - {item.size}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {item.quantity} × ${item.sellPricePerPiece.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <p className="font-bold text-green-600 text-sm sm:text-base">
                        ${(item.quantity * item.sellPricePerPiece).toFixed(2)}
                      </p>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-red-50 text-red-600 transition-all flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="gradient-card-success !p-4 sm:!p-6 flex-shrink-0">
              <p className="text-xs sm:text-sm text-white/80 mb-2">Total Revenue</p>
              <p className="text-2xl sm:text-4xl font-bold">
                ${getTotalRevenue().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 border-t pt-4 sm:pt-6 flex-shrink-0">
          <div>
            <Label className="floating-label text-xs sm:text-sm">Customer Name (Optional)</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="modern-input text-sm"
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <Label className="floating-label text-xs sm:text-sm">Invoice Number (Optional)</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="modern-input text-sm"
              placeholder="Enter invoice number"
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-4 sm:pt-6 flex-shrink-0 gap-3 sm:gap-0">
          <button onClick={onClose} className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-gray-200 bg-white font-semibold text-xs sm:text-sm hover:bg-gray-50 transition-all flex-1 sm:flex-none">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || sellItems.length === 0}
            className="modern-btn-success px-6 sm:px-8 py-2.5 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex-1 sm:flex-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner w-4 h-4 border-2"></div>
                Processing...
              </span>
            ) : (
              'Complete Sale'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
