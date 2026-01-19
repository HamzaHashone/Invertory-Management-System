'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { AxiosError } from 'axios';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    adminName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signup(formData);
      toast.success('Account created successfully');
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.error?.message || 'Signup failed');
      } else {
        toast.error('Signup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 sm:mb-12 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-400 to-green-500 mb-4 sm:mb-6 shadow-lg">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3">
            Get Started
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Create your account to start managing inventory
          </p>
        </div>

        {/* Signup Form */}
        <div className="modern-card-lg animate-scale-in stagger-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="businessName" className="floating-label">
                Business Name
              </Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                required
                className="modern-input"
                placeholder="Acme Inc."
              />
            </div>
            <div>
              <Label htmlFor="adminName" className="floating-label">
                Your Name
              </Label>
              <Input
                id="adminName"
                value={formData.adminName}
                onChange={(e) =>
                  setFormData({ ...formData, adminName: e.target.value })
                }
                required
                className="modern-input"
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="email" className="floating-label">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                onBlur={(e) =>
                  setFormData({ ...formData, email: e.target.value.trim() })
                }
                required
                className="modern-input"
                placeholder="you@business.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="floating-label">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={8}
                className="modern-input"
                placeholder="At least 8 characters"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters long
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="modern-btn-success w-full px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-4 h-4 sm:w-5 sm:h-5 border-2"></div>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="divider"></div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in-up stagger-2">
          <p className="text-xs text-gray-500">
            Secure inventory management for modern businesses
          </p>
        </div>
      </div>
    </div>
  );
}
