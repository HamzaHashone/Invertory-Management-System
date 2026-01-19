'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import ProtectedRoute from '@/components/protected-route';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Size {
  id: string;
  size: string;
  quantity: string;
  purchaseCostPerPiece: string;
  sellCostPerPiece: string;
}

interface Color {
  id: string;
  color: string;
  sizes: Size[];
}

export default function CreateLotPage() {
  const [lotNumber, setLotNumber] = useState('');
  const [colors, setColors] = useState<Color[]>([
    {
      id: crypto.randomUUID(),
      color: '',
      sizes: [
        {
          id: crypto.randomUUID(),
          size: '',
          quantity: '',
          purchaseCostPerPiece: '',
          sellCostPerPiece: '',
        },
      ],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAutoGenerate = async () => {
    try {
      const response = await api.post('/lots/generate-number');
      const lotNumber = response.data?.data?.lotNumber;

      if (!lotNumber) {
        throw new Error('Invalid response from server');
      }

      setLotNumber(lotNumber);
      toast.success('Lot number generated');
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.error?.message || 'Failed to generate lot number');
      } else {
        toast.error('Failed to generate lot number');
      }
    }
  };

  const addColor = () => {
    setColors([
      ...colors,
      {
        id: crypto.randomUUID(),
        color: '',
        sizes: [
          {
            id: crypto.randomUUID(),
            size: '',
            quantity: '',
            purchaseCostPerPiece: '',
            sellCostPerPiece: '',
          },
        ],
      },
    ]);
  };

  const removeColor = (colorId: string) => {
    setColors(colors.filter((c) => c.id !== colorId));
  };

  const updateColor = (colorId: string, value: string) => {
    setColors(
      colors.map((c) => (c.id === colorId ? { ...c, color: value } : c))
    );
  };

  const addSize = (colorId: string) => {
    setColors(
      colors.map((c) =>
        c.id === colorId
          ? {
              ...c,
              sizes: [
                ...c.sizes,
                {
                  id: crypto.randomUUID(),
                  size: '',
                  quantity: '',
                  purchaseCostPerPiece: '',
                  sellCostPerPiece: '',
                },
              ],
            }
          : c
      )
    );
  };

  const removeSize = (colorId: string, sizeId: string) => {
    setColors(
      colors.map((c) =>
        c.id === colorId
          ? { ...c, sizes: c.sizes.filter((s) => s.id !== sizeId) }
          : c
      )
    );
  };

  const updateSize = (
    colorId: string,
    sizeId: string,
    field: keyof Size,
    value: string
  ) => {
    setColors(
      colors.map((c) =>
        c.id === colorId
          ? {
              ...c,
              sizes: c.sizes.map((s) =>
                s.id === sizeId ? { ...s, [field]: value } : s
              ),
            }
          : c
      )
    );
  };

  const calculateTotalInvestment = () => {
    return colors.reduce((total, color) => {
      return (
        total +
        color.sizes.reduce((sum, size) => {
          const qty = parseFloat(size.quantity) || 0;
          const cost = parseFloat(size.purchaseCostPerPiece) || 0;
          return sum + qty * cost;
        }, 0)
      );
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        lotNumber,
        items: colors.map((color) => ({
          color: color.color,
          sizes: color.sizes.map((size) => ({
            size: size.size,
            quantity: parseFloat(size.quantity),
            purchaseCostPerPiece: parseFloat(size.purchaseCostPerPiece),
            sellCostPerPiece: parseFloat(size.sellCostPerPiece),
          })),
        })),
      };

      await api.post('/lots', payload);
      toast.success('Lot created successfully');
      router.push('/lots');
    } catch (error) {
      const errorMessage = error instanceof AxiosError
        ? error.response?.data?.error?.message || 'Failed to create lot'
        : 'Failed to create lot';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 animate-fade-in-up">
          <div>
            <h1 className="text-4xl font-bold mb-2">Create New Lot</h1>
            <p className="text-gray-600">Add a new inventory lot with colors and sizes</p>
          </div>
          <button
            onClick={() => router.push('/lots')}
            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-sm hover:bg-gray-50 transition-all"
          >
            ← Back to Lots
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="modern-card mb-8 border-l-4 border-red-500 animate-scale-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error Creating Lot</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Lot Information */}
          <div className="modern-card-lg animate-fade-in-up stagger-1">
            <h2 className="text-2xl font-bold mb-6">Lot Information</h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="lotNumber" className="floating-label">
                  Lot Number
                </Label>
                <Input
                  id="lotNumber"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  required
                  className="modern-input"
                  placeholder="LOT-0001"
                />
              </div>
              <button
                type="button"
                onClick={handleAutoGenerate}
                className="px-6 py-3 rounded-xl border border-gray-200 bg-white font-semibold text-sm hover:bg-gray-50 transition-all mt-8"
              >
                Auto-generate
              </button>
            </div>
          </div>

          {/* Colors */}
          {colors.map((color, colorIndex) => (
            <div key={color.id} className="modern-card-lg animate-fade-in-up" style={{animationDelay: `${(colorIndex + 2) * 0.05}s`}}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Color {colorIndex + 1}</h2>
                {colors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeColor(color.id)}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-all"
                  >
                    Remove Color
                  </button>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="floating-label">Color Name</Label>
                  <Input
                    value={color.color}
                    onChange={(e) => updateColor(color.id, e.target.value)}
                    required
                    className="modern-input"
                    placeholder="e.g., Navy Blue"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-semibold text-gray-700">Sizes</Label>
                    <button
                      type="button"
                      onClick={() => addSize(color.id)}
                      className="px-4 py-2 rounded-xl bg-purple-50 text-purple-600 font-semibold text-sm hover:bg-purple-100 transition-all"
                    >
                      + Add Size
                    </button>
                  </div>
                  <div className="space-y-3">
                    {color.sizes.map((size, sizeIndex) => (
                      <div key={size.id} className="grid grid-cols-5 gap-3">
                        <Input
                          placeholder="Size"
                          value={size.size}
                          onChange={(e) =>
                            updateSize(color.id, size.id, 'size', e.target.value)
                          }
                          required
                          className="modern-input"
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={size.quantity}
                          onChange={(e) =>
                            updateSize(color.id, size.id, 'quantity', e.target.value)
                          }
                          required
                          min="1"
                          className="modern-input"
                        />
                        <Input
                          type="number"
                          placeholder="Purchase $"
                          value={size.purchaseCostPerPiece}
                          onChange={(e) =>
                            updateSize(
                              color.id,
                              size.id,
                              'purchaseCostPerPiece',
                              e.target.value
                            )
                          }
                          required
                          min="0"
                          step="0.01"
                          className="modern-input"
                        />
                        <Input
                          type="number"
                          placeholder="Sell $"
                          value={size.sellCostPerPiece}
                          onChange={(e) =>
                            updateSize(
                              color.id,
                              size.id,
                              'sellCostPerPiece',
                              e.target.value
                            )
                          }
                          required
                          min="0"
                          step="0.01"
                          className="modern-input"
                        />
                        <button
                          type="button"
                          onClick={() => removeSize(color.id, size.id)}
                          disabled={color.sizes.length === 1}
                          className="px-3 py-2 rounded-xl border border-gray-200 bg-white font-semibold text-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addColor}
            className="w-full px-6 py-4 rounded-xl border-2 border-dashed border-gray-300 bg-white font-semibold text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-all"
          >
            + Add Another Color
          </button>

          {/* Summary */}
          <div className="gradient-card-primary animate-fade-in-up">
            <h2 className="text-xl font-bold mb-2">Total Investment</h2>
            <p className="text-5xl font-bold">
              ${calculateTotalInvestment().toFixed(2)}
            </p>
            <p className="text-sm text-white/80 mt-2">
              Combined purchase cost across all items
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="modern-btn-primary flex-1 px-8 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-5 h-5 border-2"></div>
                  Creating lot...
                </span>
              ) : (
                'Create Lot'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/lots')}
              className="px-8 py-4 rounded-xl border border-gray-200 bg-white font-semibold text-base hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
