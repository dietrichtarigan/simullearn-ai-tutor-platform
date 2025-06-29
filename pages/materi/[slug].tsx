import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser, useSupabase, useSubscription } from '@/lib/supabase-provider';
import toast from 'react-hot-toast';

interface Topic {
  id: string;
  title: string;
  subject: 'mathematics' | 'physics';
  content: string;
  is_premium: boolean;
}

export default function TopicPage() {
  const router = useRouter();
  const { slug } = router.query;
  const user = useUser();
  const { supabase } = useSupabase();
  const subscription = useSubscription();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setCharHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (slug) {
      fetchTopic();
    }
  }, [slug, user]);

  const fetchTopic = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;

      if (data.is_premium && subscription === 'free') {
        toast.error('Materi ini hanya tersedia untuk pengguna premium');
        router.push('/pricing');
        return;
      }

      setTopic(data);

      // Update or create progress record
      const { error: progressError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user?.id,
          topic_id: data.id,
          status: 'in_progress',
          last_activity: new Date().toISOString(),
        });

      if (progressError) throw progressError;
    } catch (error) {
      toast.error('Gagal memuat materi. Silakan coba lagi.');
      console.error('Error fetching topic:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    const message = chatMessage;
    setChatMessage('');

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          topic_id: topic?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setCharHistory(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: data.response },
      ]);
    } catch (error) {
      toast.error('Gagal mengirim pesan. Silakan coba lagi.');
      setChatMessage(message); // Restore message if failed
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Materi tidak ditemukan
            </h1>
            <p className="mt-2 text-gray-600">
              Materi yang Anda cari tidak tersedia.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-900">{topic.title}</h1>
              <p className="mt-1 text-sm text-gray-500 capitalize">{topic.subject}</p>
              <div className="prose prose-primary mt-6 max-w-none">
                {topic.content}
              </div>
            </div>

            {/* Simulation Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Simulasi Visual
              </h2>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                {/* Simulation component will be added here */}
                <p className="text-gray-500">Simulasi sedang dimuat...</p>
              </div>
            </div>
          </div>

          {/* AI Tutor Chat */}
          <div className="bg-white rounded-lg shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
            <h2 className="text-lg font-medium text-gray-900 mb-4">AI Tutor</h2>
            
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {sendingMessage && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="animate-pulse">Mengetik...</div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="mt-auto">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Tanyakan sesuatu..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={sendingMessage}
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim() || sendingMessage}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
