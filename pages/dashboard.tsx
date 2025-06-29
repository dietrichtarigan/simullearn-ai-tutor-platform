import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser, useSupabase, useSubscription } from '@/lib/supabase-provider';
import toast from 'react-hot-toast';
import { User } from '@supabase/supabase-js';

interface Topic {
  id: string;
  title: string;
  subject: 'mathematics' | 'physics';
  slug: string;
  is_premium: boolean;
}

interface Progress {
  topic_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const user = useUser();
  const { supabase } = useSupabase();
  const subscription = useSubscription();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchTopicsAndProgress(user);
  }, [user]);

  const fetchTopicsAndProgress = async (currentUser: User) => {
    try {
      // Fetch topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .order('order_index', { ascending: true });

      if (topicsError) throw topicsError;

      // Fetch user's progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', currentUser.id);

      if (progressError) throw progressError;

      // Convert progress array to record for easier lookup
      const progressRecord = (progressData || []).reduce<Record<string, Progress>>((acc, curr) => {
        acc[curr.topic_id] = curr;
        return acc;
      }, {});

      setTopics(topicsData || []);
      setProgress(progressRecord);
    } catch (error) {
      toast.error('Gagal memuat data. Silakan coba lagi.');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTopicClick = (topic: Topic) => {
    if (topic.is_premium && subscription === 'free') {
      toast.error('Fitur ini hanya tersedia untuk pengguna premium');
      return;
    }
    router.push(`/materi/${topic.slug}`);
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Selamat datang, {user.user_metadata?.full_name || 'Siswa'}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {subscription === 'free'
                ? 'Anda menggunakan versi gratis. Upgrade ke premium untuk akses penuh.'
                : 'Anda adalah pengguna premium. Nikmati akses ke semua materi.'}
            </p>
          </div>

          {/* Progress Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Progress Belajar</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-2xl font-bold text-primary">
                  {Object.values(progress).filter(p => p.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-500">Materi Selesai</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {Object.values(progress).filter(p => p.status === 'in_progress').length}
                </div>
                <div className="text-sm text-gray-500">Sedang Dipelajari</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-600">
                  {topics.length - Object.keys(progress).length}
                </div>
                <div className="text-sm text-gray-500">Belum Dimulai</div>
              </div>
            </div>
          </div>

          {/* Topics Grid */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Materi Pembelajaran</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => handleTopicClick(topic)}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-gray-900">
                        {topic.title}
                      </h3>
                      {topic.is_premium && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 capitalize">
                      {topic.subject}
                    </p>
                    <div className="mt-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProgressColor(
                          progress[topic.id]?.status
                        )}`}
                      >
                        {progress[topic.id]?.status === 'completed'
                          ? 'Selesai'
                          : progress[topic.id]?.status === 'in_progress'
                          ? 'Sedang Dipelajari'
                          : 'Belum Dimulai'}
                      </span>
                      {progress[topic.id]?.score && (
                        <span className="ml-2 text-sm text-gray-500">
                          Skor: {progress[topic.id].score}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
