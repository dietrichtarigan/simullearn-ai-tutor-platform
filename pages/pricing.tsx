import { useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@supabase/auth-helpers-react';

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  tier: 'free' | 'premium_basic' | 'premium_plus' | 'b2b';
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free Plan',
    price: 'Rp 0',
    description: 'Mulai belajar tanpa biaya',
    tier: 'free',
    features: [
      'Akses 2 bab/bulan',
      'Simulasi terbatas',
      'Tanpa AI tutor',
      'Latihan soal dasar'
    ]
  },
  {
    name: 'Premium Basic',
    price: 'Rp 29.000',
    description: 'Akses penuh dengan AI tutor',
    tier: 'premium_basic',
    popular: true,
    features: [
      'Akses semua bab',
      'AI tutor harian',
      'Latihan & pembahasan',
      'Simulasi visual lengkap',
      'Progress tracking'
    ]
  },
  {
    name: 'Premium Plus',
    price: 'Rp 59.000',
    description: 'Pengalaman belajar maksimal',
    tier: 'premium_plus',
    features: [
      'Semua fitur Premium Basic',
      'Simpan progress',
      'Rekomendasi AI',
      'Custom playlist belajar',
      'Prioritas dukungan',
      'Akses konten eksklusif'
    ]
  }
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const user = useUser();

  const handleSubscribe = async (tier: string) => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push(`/login?redirect=${encodeURIComponent('/pricing')}`);
      return;
    }

    try {
      setLoading(tier);
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          email: user.email,
        }),
      });

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Pilih Paket Belajarmu
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Mulai dengan gratis atau upgrade ke premium untuk akses penuh
          </p>
        </div>

        <div className="mt-16 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-x-8">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative p-8 bg-white border rounded-2xl shadow-sm flex flex-col ${
                tier.popular
                  ? 'border-primary ring-2 ring-primary'
                  : 'border-gray-200'
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                  Popular
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  {tier.name}
                </h3>
                <p className="mt-4 flex items-baseline text-gray-900">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {tier.price}
                  </span>
                  <span className="ml-1 text-xl font-semibold">/bulan</span>
                </p>
                <p className="mt-6 text-gray-500">{tier.description}</p>

                <ul role="list" className="mt-6 space-y-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex">
                      <svg
                        className="flex-shrink-0 w-6 h-6 text-green-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="ml-3 text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe(tier.tier)}
                disabled={loading === tier.tier || tier.tier === 'free'}
                className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-center font-medium ${
                  tier.tier === 'free'
                    ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                    : tier.popular
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {loading === tier.tier
                  ? 'Memproses...'
                  : tier.tier === 'free'
                  ? 'Paket Saat Ini'
                  : 'Pilih Paket'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Butuh solusi untuk sekolah atau bimbel?{' '}
            <a href="/contact" className="text-primary hover:text-primary/90">
              Hubungi kami
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
