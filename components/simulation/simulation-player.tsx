import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSupabase } from '@/lib/supabase-provider';
import type p5 from 'p5';

// Dynamically import P5Wrapper to avoid SSR issues
const P5Wrapper = dynamic(() => import('./p5-wrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

interface SimulationPlayerProps {
  topicId: string;
  type: 'interactive' | 'video';
  config?: {
    initialValues?: Record<string, number>;
    controls?: Array<{
      name: string;
      min: number;
      max: number;
      step: number;
      default: number;
    }>;
  };
}

export default function SimulationPlayer({
  topicId,
  type,
  config,
}: SimulationPlayerProps) {
  const { supabase } = useSupabase();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controlValues = useRef<Record<string, number>>({});

  useEffect(() => {
    if (type === 'video') {
      fetchSimulationVideo();
    }
  }, [topicId, type]);

  const fetchSimulationVideo = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from('simulations')
        .createSignedUrl(`${topicId}/simulation.mp4`, 3600); // 1 hour expiry

      if (error) throw error;
      setVideoUrl(data.signedUrl);
    } catch (err) {
      console.error('Error fetching simulation video:', err);
      setError('Gagal memuat video simulasi');
    } finally {
      setLoading(false);
    }
  };

  const handleControlChange = (name: string, value: number) => {
    controlValues.current[name] = value;
  };

  // Simple p5.js sketch for physics simulation
  const sketch = (p: p5) => {
    const particles: { x: number; y: number; vx: number; vy: number }[] = [];
    const particleCount = 50;

    p.setup = () => {
      // Initialize particles
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: p.random(0, p.width),
          y: p.random(0, p.height),
          vx: p.random(-2, 2),
          vy: p.random(-2, 2),
        });
      }
    };

    p.draw = () => {
      p.background(240);

      // Get current control values
      const gravity = controlValues.current.gravity || 0.1;
      const friction = controlValues.current.friction || 0.99;

      // Update and draw particles
      particles.forEach(particle => {
        // Apply gravity
        particle.vy += gravity;

        // Apply friction
        particle.vx *= friction;
        particle.vy *= friction;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off walls
        if (particle.x < 0 || particle.x > p.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > p.height) particle.vy *= -1;

        // Keep particles in bounds
        particle.x = p.constrain(particle.x, 0, p.width);
        particle.y = p.constrain(particle.y, 0, p.height);

        // Draw particle
        p.fill(66, 99, 235);
        p.noStroke();
        p.ellipse(particle.x, particle.y, 6, 6);
      });
    };

    return p;
  };

  if (loading) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
        {type === 'video' ? (
          videoUrl && (
            <video
              controls
              className="w-full h-full object-contain"
              poster={`/api/simulations/${topicId}/thumbnail.jpg`}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )
        ) : (
          <div id="simulation-canvas" className="w-full h-full">
            <P5Wrapper sketch={sketch} />
          </div>
        )}
      </div>

      {type === 'interactive' && config?.controls && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Pengaturan Simulasi
          </h3>
          <div className="space-y-3">
            {config.controls.map((control) => (
              <div key={control.name}>
                <label
                  htmlFor={control.name}
                  className="block text-sm font-medium text-gray-700"
                >
                  {control.name}
                </label>
                <div className="mt-1 flex items-center space-x-4">
                  <input
                    type="range"
                    id={control.name}
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    defaultValue={control.default}
                    onChange={(e) =>
                      handleControlChange(control.name, parseFloat(e.target.value))
                    }
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 w-12 text-right">
                    {controlValues.current[control.name] ?? control.default}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
