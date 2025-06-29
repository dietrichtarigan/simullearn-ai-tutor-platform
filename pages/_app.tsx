import { AppProps } from 'next/app';
import { SupabaseProvider } from '@/lib/supabase-provider';
import MainLayout from '@/components/layout/main-layout';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

// Initialize Inter font
const inter = Inter({ subsets: ['latin'] });

// Import global styles
import '../styles/globals.css';

// Pages that don't use the main layout
const noLayoutPages = ['/login', '/register', '/404', '/500'];

function MyApp({ Component, pageProps, router }: AppProps) {
  // Check if the current page should use the layout
  const useLayout = !noLayoutPages.includes(router.pathname);

  const content = useLayout ? (
    <MainLayout>
      <Component {...pageProps} />
    </MainLayout>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <SupabaseProvider>
      <div className={inter.className}>
        {content}
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 5000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </SupabaseProvider>
  );
}

export default MyApp;
