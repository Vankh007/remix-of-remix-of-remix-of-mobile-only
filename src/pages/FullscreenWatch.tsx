import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { isExoPlayerAvailable, playWithExoPlayer } from "@/hooks/useExoPlayer";
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Capacitor } from '@capacitor/core';
import { enterImmersiveMode, exitImmersiveMode } from "@/hooks/useImmersiveMode";

interface VideoSource {
  id: string;
  url: string;
  source_type: string;
  quality?: string;
  quality_urls?: Record<string, string>;
  server_name?: string;
  is_default?: boolean;
}

const FullscreenWatch = () => {
  const { type, id, season, episode } = useParams<{ 
    type: string; 
    id: string; 
    season?: string; 
    episode?: string 
  }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchVideoSource();
    
    // Enter immersive mode and lock to landscape on Android
    if (Capacitor.isNativePlatform()) {
      enterImmersiveMode();
      ScreenOrientation.lock({ orientation: 'landscape' }).catch(console.error);
    }

    return () => {
      // Cleanup: exit immersive mode and unlock orientation
      if (Capacitor.isNativePlatform()) {
        exitImmersiveMode();
        ScreenOrientation.unlock().catch(console.error);
      }
    };
  }, [id, type, season, episode]);

  const fetchVideoSource = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get content by tmdb_id or UUID
      const isNumeric = /^\d+$/.test(id!);
      let contentData = null;

      if (isNumeric) {
        const { data } = await supabase
          .from('content')
          .select('*')
          .eq('tmdb_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        contentData = data;
      } else {
        const { data } = await supabase
          .from('content')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        contentData = data;
      }

      if (!contentData) {
        setError('Content not found');
        setLoading(false);
        return;
      }

      setTitle(contentData.title);

      if (type === 'movie') {
        // Fetch movie video sources from video_sources table
        const { data: sources } = await supabase
          .from('video_sources')
          .select('*')
          .eq('media_id', contentData.id)
          .order('is_default', { ascending: false });

        if (sources && sources.length > 0) {
          const source = sources[0];
          // Get best quality URL
          const url = getBestQualityUrl(source);
          if (url) {
            await playVideo(url, contentData.title);
          } else {
            setError('No video source available');
          }
        } else {
          setError('No video source available');
        }
      } else {
        // Series/Anime - fetch episode
        const seasonNum = parseInt(season || '1');
        const episodeNum = parseInt(episode || '1');

        // Get season
        const { data: seasonData } = await supabase
          .from('seasons')
          .select('id')
          .eq('show_id', contentData.id)
          .eq('season_number', seasonNum)
          .maybeSingle();

        if (!seasonData) {
          setError('Season not found');
          setLoading(false);
          return;
        }

        // Get episode
        const { data: episodeData } = await supabase
          .from('episodes')
          .select('*')
          .eq('season_id', seasonData.id)
          .eq('episode_number', episodeNum)
          .maybeSingle();

        if (!episodeData) {
          setError('Episode not found');
          setLoading(false);
          return;
        }

        setSubtitle(`S${seasonNum} E${episodeNum}: ${episodeData.title}`);

        // Get episode video sources from video_sources table
        const { data: sources } = await supabase
          .from('video_sources')
          .select('*')
          .eq('episode_id', episodeData.id)
          .order('is_default', { ascending: false });

        if (sources && sources.length > 0) {
          const source = sources[0];
          // Get best quality URL
          const url = getBestQualityUrl(source);
          if (url) {
            await playVideo(url, contentData.title, `S${seasonNum} E${episodeNum}`);
          } else {
            setError('No video source available');
          }
        } else {
          setError('No video source available');
        }
      }
    } catch (err) {
      console.error('Error fetching video:', err);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  // Get best quality URL from video source
  const getBestQualityUrl = (source: VideoSource): string | null => {
    // If quality_urls exists, get the best quality
    if (source.quality_urls && typeof source.quality_urls === 'object') {
      const qualities = ['1080p', '720p', '480p', '360p'];
      for (const q of qualities) {
        if (source.quality_urls[q]) {
          return source.quality_urls[q];
        }
      }
    }
    // Fallback to main url
    return source.url || null;
  };

  const playVideo = async (url: string, videoTitle: string, videoSubtitle?: string) => {
    // On Android native, use ExoPlayer
    if (isExoPlayerAvailable()) {
      try {
        const result = await playWithExoPlayer(url, videoTitle, videoSubtitle, 0);
        // When ExoPlayer returns, go back
        if (result) {
          console.log('Playback completed at position:', result.position);
        }
        navigate(-1);
      } catch (err) {
        console.error('ExoPlayer error:', err);
        // Fallback to web player
        setVideoUrl(url);
      }
    } else {
      // Web fallback - use HTML5 video
      setVideoUrl(url);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleVideoClick = () => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Web fallback player UI
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999] text-white">
        <p className="text-lg mb-4">{error}</p>
        <button 
          onClick={handleBack}
          className="px-6 py-2 bg-primary rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  // If using ExoPlayer, this won't render (navigates back after playback)
  if (!videoUrl) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Web fallback player
  return (
    <div 
      className="fixed inset-0 bg-black z-[9999]"
      onClick={handleVideoClick}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        autoPlay
        controls={showControls}
        playsInline
        onEnded={handleBack}
      />
      
      {/* Custom back button overlay */}
      {showControls && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleBack();
          }}
          className="absolute top-4 left-4 p-2 bg-black/50 rounded-full z-10"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
      )}

      {/* Title overlay */}
      {showControls && title && (
        <div 
          className="absolute top-4 left-14 right-4 z-10"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <p className="text-white font-medium truncate">{title}</p>
          {subtitle && <p className="text-white/70 text-sm truncate">{subtitle}</p>}
        </div>
      )}
    </div>
  );
};

export default FullscreenWatch;
