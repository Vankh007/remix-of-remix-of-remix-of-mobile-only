import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Play,
  Download,
  MoreVertical,
  Crown,
  ThumbsUp,
  Share2,
  Bookmark,
  Home,
  MessageSquare,
  Sparkles,
  List,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VideoPlayer from "@/components/VideoPlayer";
import { VideoSource } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentsSection } from "@/components/CommentsSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { playWithExoPlayer, isExoPlayerAvailable } from "@/hooks/useExoPlayer";
import { NativeBannerAdSlot } from "@/components/ads/NativeBannerAdSlot";
import { MobileVIPPanel } from "@/components/MobileVIPPanel";

interface Episode {
  id: string;
  episode_number: number;
  title: string;
  still_path?: string;
  season_id?: string;
  show_id?: string;
  access_type?: "free" | "membership" | "purchase";
}

interface Content {
  id: string;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  content_type?: string;
  tmdb_id?: number;
  cast_members?: string;
}

interface Season {
  id: string;
  season_number: number;
  title: string;
}

const MobileWatch = () => {
  const { type, id, season, episode } = useParams<{ type: string; id: string; season?: string; episode?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [content, setContent] = useState<Content | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [forYouContent, setForYouContent] = useState<Content[]>([]);
  const [castMembers, setCastMembers] = useState<any[]>([]);
  const [showVIPPanel, setShowVIPPanel] = useState(false);

  const contentType = type || "movie";
  const isSeriesContent = contentType === "series" || contentType === "anime";

  // Banner ad is now handled by the NativeBannerAdSlot component below the player

  useEffect(() => {
    if (id) {
      fetchContent();
    }
  }, [id, type]);

  useEffect(() => {
    if (content?.id && isSeriesContent) {
      fetchSeasons();
      fetchEpisodes();
    }
  }, [content?.id]);

  useEffect(() => {
    if (episodes.length > 0 && season && episode) {
      const targetSeason = seasons.find((s) => s.season_number === parseInt(season));
      if (targetSeason) {
        setSelectedSeasonId(targetSeason.id);
        const targetEpisode = episodes.find(
          (ep) => ep.season_id === targetSeason.id && ep.episode_number === parseInt(episode),
        );
        if (targetEpisode) {
          setCurrentEpisode(targetEpisode);
          fetchVideoSource(targetEpisode.id);
        }
      }
    } else if (content && !isSeriesContent) {
      fetchMovieVideoSource();
    }
  }, [episodes, seasons, season, episode, content]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const isNumeric = /^\d+$/.test(id!);
      let query = supabase.from("content").select("*");

      if (isNumeric) {
        query = query.eq("tmdb_id", id);
      } else {
        query = query.eq("id", id);
      }

      const { data } = await query.maybeSingle();
      if (data) {
        setContent(data);

        // Parse cast members
        if (data.cast_members) {
          try {
            const parsed = JSON.parse(data.cast_members);
            setCastMembers(
              parsed.slice(0, 10).map((c: any) => ({
                name: c.name || c.actor_name,
                image: c.profile_path?.startsWith("http")
                  ? c.profile_path
                  : c.profile_path
                    ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
                    : null,
              })),
            );
          } catch (e) {}
        }

        // Fetch for you content
        const { data: forYou } = await supabase
          .from("content")
          .select("id, title, poster_path, content_type, tmdb_id")
          .neq("id", data.id)
          .limit(8);
        setForYouContent(forYou || []);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasons = async () => {
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .eq("show_id", content!.id)
      .order("season_number", { ascending: true });
    setSeasons(data || []);
    if (data && data.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(data[0].id);
    }
  };

  const fetchEpisodes = async () => {
    const { data } = await supabase
      .from("episodes")
      .select("*")
      .eq("show_id", content!.id)
      .order("episode_number", { ascending: true });
    setEpisodes(data || []);
  };

  const fetchVideoSource = async (episodeId: string) => {
    const { data } = await supabase
      .from("video_sources")
      .select("*")
      .eq("episode_id", episodeId)
      .order("is_default", { ascending: false });

    if (data && data.length > 0) {
      setVideoSources(data as VideoSource[]);
    }
  };

  const fetchMovieVideoSource = async () => {
    if (!content?.id) return;
    const { data } = await supabase
      .from("video_sources")
      .select("*")
      .eq("media_id", content.id)
      .order("is_default", { ascending: false });

    if (data && data.length > 0) {
      setVideoSources(data as VideoSource[]);
    }
  };

  const handleEpisodeClick = async (ep: Episode) => {
    const seasonNum = seasons.find((s) => s.id === ep.season_id)?.season_number || 1;

    // Fetch video sources first
    const { data: sources } = await supabase
      .from("video_sources")
      .select("*")
      .eq("episode_id", ep.id)
      .order("is_default", { ascending: false });

    // Check if source is a direct URL (not embed) - only then use ExoPlayer
    if (isExoPlayerAvailable() && sources && sources.length > 0) {
      const source = sources[0];
      
      // Only use ExoPlayer for direct MP4/HLS URLs, not embed URLs
      const isDirectUrl = source.url && !source.embed_url && 
        (source.url.includes('.mp4') || source.url.includes('.m3u8') || source.source_type !== 'embed');
      
      if (isDirectUrl) {
        let videoUrl = source.url;

        if (source.quality_urls && typeof source.quality_urls === "object") {
          const qualities = ["1080p", "720p", "480p", "360p"];
          for (const q of qualities) {
            if ((source.quality_urls as Record<string, string>)[q]) {
              videoUrl = (source.quality_urls as Record<string, string>)[q];
              break;
            }
          }
        }

        if (videoUrl) {
          await playWithExoPlayer(
            videoUrl,
            content?.title || "Video",
            `S${seasonNum} E${ep.episode_number}: ${ep.title}`,
          );
          return;
        }
      }
    }

    // For embed URLs or web fallback - update inline player
    setCurrentEpisode(ep);
    if (sources && sources.length > 0) {
      setVideoSources(sources as VideoSource[]);
    } else {
      // Fetch video sources if not already fetched
      fetchVideoSource(ep.id);
    }
    navigate(`/watch/${type}/${id}/${seasonNum}/${ep.episode_number}`, { replace: true });
  };

  const displayEpisodes = useMemo(() => {
    if (!selectedSeasonId) return episodes;
    return episodes.filter((ep) => ep.season_id === selectedSeasonId);
  }, [episodes, selectedSeasonId]);

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/60">Content not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative pb-12">
      {/* Background - portrait poster with 10% blur */}
      {content.poster_path && (
        <div
          className="fixed inset-0 z-0 animate-fade-in"
          style={{
            backgroundImage: `url(${content.poster_path})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
        </div>
      )}

      {/* Sticky Video Player on portrait - with 35px top padding for status bar */}
      <div className="sticky top-0 z-30 w-full bg-black" style={{ paddingTop: '35px' }}>
        <div className="w-full aspect-video">
          {videoSources.length > 0 ? (
            <VideoPlayer
              videoSources={videoSources}
              contentId={content.id}
              currentEpisodeId={currentEpisode?.id}
              contentBackdrop={content.backdrop_path || content.poster_path}
              title={content.title}
              episodes={isSeriesContent ? episodes : undefined}
              seasons={isSeriesContent ? seasons : undefined}
              onEpisodeSelect={
                isSeriesContent
                  ? (epId) => {
                      const ep = episodes.find((e) => e.id === epId);
                      if (ep) handleEpisodeClick(ep);
                    }
                  : undefined
              }
              onSeasonSelect={isSeriesContent ? setSelectedSeasonId : undefined}
              accessType="free"
              mediaType={contentType as "movie" | "series" | "anime"}
              mediaId={content.id}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-white/50">No video source available</p>
            </div>
          )}
        </div>
      </div>

      {/* AdMob Banner Ad - Below Player (Portrait only, controlled from Admin) */}
      <NativeBannerAdSlot placement="watch_screen_bottom_banner" className="mb-4" />

      {/* Content Info */}
      <div className="relative z-10 p-4">

        {/* Title & Actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h1 className="text-lg font-bold text-white line-clamp-2">{content.title}</h1>
            {currentEpisode && (
              <p className="text-sm text-primary mt-0.5">
                S{selectedSeason?.season_number || 1} EP{currentEpisode.episode_number}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons - Join VIP on left, other actions on right */}
        <div className="flex items-center justify-between mb-4">
          {/* Join VIP Button - Left side */}
          <button 
            className="flex flex-col items-center gap-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm"
            onClick={() => setShowVIPPanel(true)}
          >
            <Crown className="h-5 w-5 text-yellow-400" />
            <span className="text-[10px] text-yellow-400 font-medium">Join VIP</span>
          </button>
          
          {/* Other Action Buttons - Right side */}
          <div className="flex items-center gap-5">
            <button className="flex flex-col items-center gap-1" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-5 w-5 text-white/70" />
              <span className="text-[10px] text-white/70">Back</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <ThumbsUp className="h-5 w-5 text-white/70" />
              <span className="text-[10px] text-white/70">Like</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <ThumbsUp className="h-5 w-5 text-white/70 rotate-180" />
              <span className="text-[10px] text-white/70">Dislike</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Share2 className="h-5 w-5 text-white/70" />
              <span className="text-[10px] text-white/70">Share</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <Bookmark className="h-5 w-5 text-white/70" />
              <span className="text-[10px] text-white/70">Save</span>
            </button>
          </div>
        </div>

        {/* Cast */}
        {castMembers.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {castMembers.map((member, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10">
                    {member.image ? (
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
                        {member.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-center text-white/60 max-w-[50px] truncate">
                    {member.name?.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs - compact, centered, no margin */}
        <Tabs defaultValue={isSeriesContent ? "episodes" : "foryou"} className="w-full">
          <TabsList className="w-full justify-center bg-transparent border-b border-white/10 rounded-none h-auto p-0 px-0 gap-0">
            {isSeriesContent && (
              <TabsTrigger
                value="episodes"
                className="px-2 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs text-white/70 data-[state=active]:text-white"
              >
                <List className="h-3.5 w-3.5 mr-1" />
                Episodes
              </TabsTrigger>
            )}
            <TabsTrigger
              value="foryou"
              className="px-2 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs text-white/70 data-[state=active]:text-white"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              For You
            </TabsTrigger>
            <TabsTrigger
              value="comments"
              className="px-2 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs text-white/70 data-[state=active]:text-white"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Comments
            </TabsTrigger>
            <TabsTrigger
              value="home"
              className="px-2 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs text-white/70 data-[state=active]:text-white"
            >
              <Home className="h-3.5 w-3.5 mr-1" />
              Home
            </TabsTrigger>
          </TabsList>

          {/* Episodes Tab */}
          {isSeriesContent && (
            <TabsContent value="episodes" className="mt-3">
              {/* Season Selector */}
              {seasons.length > 0 && (
                <div className="mb-3 bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-white/40 mb-1">Choose a season</p>
                  <Select value={selectedSeasonId || ""} onValueChange={setSelectedSeasonId}>
                    <SelectTrigger className="w-full h-9 bg-transparent border-0 text-sm font-medium text-white p-0">
                      <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border-white/10">
                      {seasons.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-white hover:bg-white/10">
                          Season {s.season_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Episodes List */}
              <div className="space-y-2">
                {displayEpisodes.map((ep) => (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      currentEpisode?.id === ep.id ? "bg-primary/10" : "hover:bg-white/5"
                    }`}
                    onClick={() => handleEpisodeClick(ep)}
                  >
                    {/* Thumbnail with play icon - white 35% opacity */}
                    <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={ep.still_path || content.backdrop_path || "/placeholder.svg"}
                        alt={ep.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Play icon overlay - white with 35% opacity */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-7 w-7 text-white/35 fill-white/35" />
                      </div>
                      {/* Access badge */}
                      {ep.access_type === "free" ? (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold bg-green-500 text-white rounded uppercase">
                          Free
                        </span>
                      ) : ep.access_type === "membership" ? (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold bg-red-600 text-white rounded uppercase flex items-center gap-0.5">
                          <Crown className="h-2 w-2" />
                          VIP
                        </span>
                      ) : null}
                    </div>

                    {/* Episode Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {ep.episode_number} - {ep.title}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        className="h-8 w-8 flex items-center justify-center text-white/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast({ title: "Download coming soon" });
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        className="h-8 w-8 flex items-center justify-center text-white/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          )}

          {/* For You Tab */}
          <TabsContent value="foryou" className="mt-3">
            <div className="grid grid-cols-3 gap-2">
              {forYouContent.map((item) => (
                <div
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => {
                    const contentId = item.tmdb_id || item.id;
                    if (item.content_type === "movie") {
                      navigate(`/watch/movie/${contentId}`);
                    } else {
                      navigate(`/watch/series/${contentId}/1/1`);
                    }
                  }}
                >
                  <div className="aspect-[2/3] rounded-lg overflow-hidden">
                    <img
                      src={item.poster_path || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[10px] text-white/70 mt-1 truncate">{item.title}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-3">
            <CommentsSection
              episodeId={currentEpisode?.id}
              movieId={contentType === "movie" ? content.id : undefined}
            />
          </TabsContent>

          {/* Home Tab */}
          <TabsContent value="home" className="mt-3">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-white hover:bg-white/10"
                onClick={() => navigate("/")}
              >
                <Home className="h-5 w-5" />
                Go to Home
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-white hover:bg-white/10"
                onClick={() => navigate("/series")}
              >
                Series
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-white hover:bg-white/10"
                onClick={() => navigate("/movies")}
              >
                Movies
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-white hover:bg-white/10"
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* VIP Membership Panel */}
      <MobileVIPPanel open={showVIPPanel} onOpenChange={setShowVIPPanel} />
    </div>
  );
};

export default MobileWatch;
