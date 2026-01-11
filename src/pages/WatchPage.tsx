import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Film, Tv, ThumbsUp, ThumbsDown, Share2, LayoutDashboard, Sparkles, MessageSquare, Info, ChevronDown, Wallet, Crown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VideoPlayer from "@/components/VideoPlayer";
import { useIsTablet } from "@/hooks/use-tablet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTabletLandscape } from "@/hooks/use-tablet-landscape";
import { CommentsSection } from "@/components/CommentsSection";
import { useDeviceSession } from "@/hooks/useDeviceSession";
import { DeviceLimitWarning } from "@/components/DeviceLimitWarning";
import { useSwipeScroll } from "@/hooks/useSwipeScroll";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { CastSkeleton, EpisodesSkeleton, RecommendedSkeleton } from "@/components/watch/ContentSkeleton";
import { ActionButtons } from "@/components/watch/ActionButtons";
import { SocialShareMeta } from "@/components/SocialShareMeta";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WalletSection } from "@/components/wallet/WalletSection";
import { SubscriptionDialog } from "@/components/subscription/SubscriptionDialog";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import CastMemberDialog from "@/components/movie/CastMemberDialog";
import { useProfileImage } from "@/hooks/useProfileImage";
import { useContentData, Content } from "@/hooks/useContentData";
import { useAndroidNative } from "@/hooks/useAndroidNative";
import { NativeBannerAdSlot } from "@/components/ads/NativeBannerAdSlot";
import { useIframeFullscreenHandler, useFullscreenState } from "@/hooks/useFullscreenState";
import { initializeAdMob } from "@/services/admobService";

interface Episode {
  id: string;
  episode_number: number;
  title: string;
  still_path?: string;
  season_id?: string;
  show_id?: string;
  access_type?: 'free' | 'membership' | 'purchase';
  price?: number;
}

// Content type is imported from useContentData hook

// Collapsible Tabs Section Component for Desktop Right Sidebar
interface CollapsibleTabsSectionProps {
  isSeriesContent: boolean;
  seasons: any[];
  selectedSeasonId: string | null;
  setSelectedSeasonId: (id: string) => void;
  episodes: Episode[];
  episodesLoading: boolean;
  content: Content | null;
  currentEpisode: Episode | null;
  fetchVideoSource: (episodeId: string) => void;
  getProgressPercentage: (episodeId: string) => number;
  forYouContent: any[];
  navigate: (path: string) => void;
}

const CollapsibleTabsSection = ({
  isSeriesContent,
  seasons,
  selectedSeasonId,
  setSelectedSeasonId,
  episodes,
  episodesLoading,
  content,
  currentEpisode,
  fetchVideoSource,
  getProgressPercentage,
  forYouContent,
  navigate,
}: CollapsibleTabsSectionProps) => {
  const [episodesExpanded, setEpisodesExpanded] = useState(false);
  
  // Filter episodes by selected season
  const filteredEpisodes = useMemo(() => {
    if (!selectedSeasonId) return episodes;
    return episodes.filter(ep => ep.season_id === selectedSeasonId);
  }, [episodes, selectedSeasonId]);

  return (
    <Tabs defaultValue="episodes" className="w-full">
      {/* Tabs - Text only, no icons as per reference */}
      <TabsList className="w-full justify-around bg-transparent border-b rounded-none h-auto p-0">
        {isSeriesContent && (
          <TabsTrigger 
            value="episodes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-sm"
          >
            Episodes
          </TabsTrigger>
        )}
        <TabsTrigger 
          value="foryou"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-sm"
        >
          For You
        </TabsTrigger>
        <TabsTrigger 
          value="comments"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-sm"
        >
          Comments
        </TabsTrigger>
        <TabsTrigger 
          value="detail"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-sm"
        >
          Detail
        </TabsTrigger>
        <TabsTrigger 
          value="home"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-sm"
        >
          Home
        </TabsTrigger>
      </TabsList>

      {/* Episodes Tab Content */}
      <TabsContent value="episodes" className="mt-0">
        {/* Series Banner - Landscape Backdrop with poster overlay */}
        {isSeriesContent && content && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-lg overflow-hidden cursor-pointer"
            onClick={() => setEpisodesExpanded(!episodesExpanded)}
          >
            <img 
              src={content.backdrop_path || content.poster_path || "/placeholder.svg"} 
              alt={content.title}
              className="w-full aspect-[16/6.75] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
              {/* Series Poster */}
              <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow-lg border border-white/20">
                <img 
                  src={content.poster_path || "/placeholder.svg"} 
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Title and Info */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white truncate">{content.title}</p>
                <p className="text-sm text-primary font-medium">
                  {currentEpisode ? `Watching S${seasons.find(s => s.id === selectedSeasonId)?.season_number || 1} EP${currentEpisode.episode_number}` : 'Watching'}
                </p>
                <p className="text-xs text-white/70">
                  {filteredEpisodes.length} Episodes
                </p>
              </div>
              {/* More Episodes + Expand Icon */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-white/80 font-medium">More Episodes</span>
                <motion.div
                  animate={{ rotate: episodesExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/20 rounded-full p-1.5 backdrop-blur-sm"
                >
                  <ChevronDown className="h-4 w-4 text-white" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Expanded Episodes Grid */}
        <AnimatePresence mode="wait">
          {isSeriesContent && episodesExpanded && (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden mt-3"
            >
              {/* Season Selector */}
              {seasons.length > 1 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {seasons.map((season) => (
                    <Button
                      key={season.id}
                      variant={selectedSeasonId === season.id ? "default" : "outline"}
                      size="sm"
                      className={`h-8 px-4 text-sm ${selectedSeasonId === season.id ? "bg-primary hover:bg-primary/90" : ""}`}
                      onClick={() => setSelectedSeasonId(season.id)}
                    >
                      Season {season.season_number}
                    </Button>
                  ))}
                </div>
              )}

              {/* Episodes Grid - 3 columns */}
              {episodesLoading ? (
                <EpisodesSkeleton />
              ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredEpisodes.map((ep) => {
                    const progressPercent = getProgressPercentage(ep.id);
                    const isActive = currentEpisode?.id === ep.id;
                    const isFreeEpisode = ep.access_type === 'free';
                    const isRentEpisode = ep.access_type === 'purchase';
                    const isMembershipEpisode = ep.access_type === 'membership';
                    return (
                      <motion.div
                        key={ep.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-all hover:scale-[1.02] ${isActive ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => fetchVideoSource(ep.id)}
                      >
                        <img
                          src={ep.still_path || content?.backdrop_path || "/placeholder.svg"}
                          alt={`Episode ${ep.episode_number}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Access Type Badge - Top Right */}
                        <div className="absolute top-1.5 right-1.5">
                          {isFreeEpisode ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded shadow-md uppercase tracking-wide">
                              Free
                            </span>
                          ) : isRentEpisode ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-500 text-black rounded shadow-md uppercase tracking-wide flex items-center gap-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              Rent
                            </span>
                          ) : isMembershipEpisode ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded shadow-md uppercase tracking-wide flex items-center gap-0.5">
                              <Crown className="h-2.5 w-2.5" />
                              VIP+
                            </span>
                          ) : null}
                        </div>
                        {/* Progress Bar */}
                        {progressPercent > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                            <div 
                              className="h-full bg-red-600 transition-all"
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                        )}
                        {/* Large Episode Number - Word Art Style, 2x bigger on Desktop */}
                        <div className="absolute bottom-1 left-2">
                          <span className="text-6xl font-black text-white leading-none" style={{
                            textShadow: '3px 3px 0px rgba(0,0,0,0.9), 6px 6px 10px rgba(0,0,0,0.5)',
                            WebkitTextStroke: '1px rgba(255,255,255,0.3)',
                            letterSpacing: '-0.05em'
                          }}>
                            {ep.episode_number}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </TabsContent>

      {/* For You Tab */}
      <TabsContent value="foryou" className="mt-3">
        <div className="grid grid-cols-4 gap-2">
          {forYouContent && forYouContent.length > 0 ? (
            forYouContent.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => {
                  const contentIdentifier = item.tmdb_id || item.id;
                  if (item.content_type === 'anime') {
                    navigate(`/watch/anime/${contentIdentifier}/1/1`);
                  } else if (item.content_type === 'series') {
                    navigate(`/watch/series/${contentIdentifier}/1/1`);
                  } else {
                    navigate(`/watch/movie/${contentIdentifier}`);
                  }
                }}
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden">
                  <img
                    src={item.poster_path || "/placeholder.svg"}
                    alt={item.title}
                    className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                  />
                </div>
              </div>
            ))
          ) : (
            Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                <img src="/placeholder.svg" alt={`For You ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))
          )}
        </div>
      </TabsContent>

      {/* Comments Tab */}
      <TabsContent value="comments" className="mt-3">
        <CommentsSection 
          episodeId={currentEpisode?.id}
          movieId={content?.content_type === 'movie' ? content.id : undefined}
        />
      </TabsContent>

      {/* Detail Tab */}
      <TabsContent value="detail" className="mt-3">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">Description</h4>
            <p className="text-muted-foreground text-sm">
              {content?.overview || 'No description available.'}
            </p>
          </div>
        </div>
      </TabsContent>

      {/* Home Tab */}
      <TabsContent value="home" className="mt-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate('/')}
          >
            <Home className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Go to Home</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate('/series')}
          >
            <Tv className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Go to Series</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate('/movies')}
          >
            <Film className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Go to Movies</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Go to Dashboard</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </motion.div>
        </motion.div>
      </TabsContent>
    </Tabs>
  );
};

const WatchPage = () => {
  const { type, id, season, episode } = useParams<{ type: string; id: string; season?: string; episode?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasActiveSubscription, remainingDays } = useSubscription();
  const isTablet = useIsTablet();
  const isMobile = useIsMobile();
  const isTabletLandscape = useIsTabletLandscape();
  const isAndroidNative = useAndroidNative();
  const isVideoFullscreen = useFullscreenState();
  
  // Handle iframe fullscreen with orientation lock for Android native
  useIframeFullscreenHandler();

  // iPad: keep the same React tree across rotations so the <video> element isn't unmounted
  // (unmounting stops Shaka playback).
  const isIPadDevice = useMemo(() => {
    return (
      /iPad/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }, []);

  // Detect iPad portrait mode for responsive layout
  const [isIPadPortrait, setIsIPadPortrait] = useState<boolean>(false);
  
  useEffect(() => {
    if (!isIPadDevice) {
      setIsIPadPortrait(false);
      return;
    }
    
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsIPadPortrait(isPortrait);
    };
    
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, [isIPadDevice]);

  const { 
    sessions, 
    currentDeviceId, 
    canStream, 
    maxDevices, 
    loading: deviceSessionLoading,
    signOutDevice,
    signOutAllDevices 
  } = useDeviceSession();

  const contentType = type === 'movie' ? 'movie' : 'series';
  const { content, seasons, episodes: rawEpisodes, videoSources: allVideoSources, loading, error } = useContentData(id, contentType as 'movie' | 'series');

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [videoSources, setVideoSources] = useState<any[]>([]);
  const [mobileActiveTab, setMobileActiveTab] = useState<string>("episodes");

  // Reset state when content changes (navigation to different content)
  useEffect(() => {
    setCurrentEpisode(null);
    setSelectedSeasonId(null);
    setVideoSources([]);
    // Reset mobile tab to episodes for series, foryou for movies
    setMobileActiveTab(type === 'series' ? "episodes" : "foryou");
  }, [id, type]);
  
  const [castMembers, setCastMembers] = useState<any[]>([]);
  const [forYouContent, setForYouContent] = useState<any[]>([]);
  const [relatedContent, setRelatedContent] = useState<any[]>([]);
  const [watchHistory, setWatchHistory] = useState<Record<string, { progress: number; duration: number }>>({});
  const [castLoading, setCastLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string | null; profile_image: string | null } | null>(null);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showDeviceLimitWarning, setShowDeviceLimitWarning] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState<any>(null);
  const [shorts, setShorts] = useState<any[]>([]);

  // Convert episodes to correct format - memoize to prevent infinite loops
  const episodes: Episode[] = useMemo(() => rawEpisodes.map(ep => ({
    id: ep.id,
    episode_number: ep.episode_number || 1,
    title: ep.title,
    still_path: ep.still_path,
    season_id: ep.season_id,
    show_id: ep.show_id,
    access_type: ep.access_type,
    price: ep.price
  })), [rawEpisodes]);

  // Filter episodes by selected season for display
  const displayEpisodes = useMemo(() => {
    console.log('displayEpisodes calculation:', { 
      episodesCount: episodes.length, 
      selectedSeasonId, 
      seasonsCount: seasons.length,
      loading 
    });
    // If no season selected or selected season doesn't exist in current seasons, show all episodes
    if (!selectedSeasonId) return episodes;
    const seasonExists = seasons.some(s => s.id === selectedSeasonId);
    if (!seasonExists) return episodes;
    return episodes.filter(ep => ep.season_id === selectedSeasonId);
  }, [episodes, selectedSeasonId, seasons, loading]);

  const { signedUrl: profileImageUrl } = useProfileImage({ 
    imagePath: userProfile?.profile_image,
    userId: user?.id 
  });

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, profile_image')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user?.id]);

  // Initialize video sources and current episode
  useEffect(() => {
    if (contentType === 'movie' && allVideoSources.length > 0) {
      setVideoSources(allVideoSources);
    } else if (contentType === 'series' && content?.id) {
      // Verify seasons belong to current content before initializing
      const seasonsMatchContent = seasons.length > 0 && seasons[0]?.show_id === content.id;
      if (!seasonsMatchContent) return; // Wait for correct seasons to load
      
      // Verify episodes belong to current content
      const episodesMatchContent = episodes.length > 0 && episodes[0]?.show_id === content.id;
      if (!episodesMatchContent) return; // Wait for correct episodes to load
      
      // Set season from URL or use first season
      if (seasons.length > 0) {
        let targetSeasonId = selectedSeasonId;
        
        // Check if current selectedSeasonId belongs to this content
        const selectedSeasonBelongsToContent = selectedSeasonId && seasons.some(s => s.id === selectedSeasonId);
        
        // If season param in URL, find that season
        if (season && (!selectedSeasonId || !selectedSeasonBelongsToContent)) {
          const seasonNum = parseInt(season);
          const targetSeason = seasons.find(s => s.season_number === seasonNum);
          if (targetSeason) {
            targetSeasonId = targetSeason.id;
            setSelectedSeasonId(targetSeason.id);
          } else {
            targetSeasonId = seasons[0].id;
            setSelectedSeasonId(seasons[0].id);
          }
        } else if (!selectedSeasonId || !selectedSeasonBelongsToContent) {
          targetSeasonId = seasons[0].id;
          setSelectedSeasonId(seasons[0].id);
        }
      }
      
      // Find episode from URL or use first episode
      if (episodes.length > 0 && allVideoSources.length > 0) {
        let targetEp: Episode | undefined;
        
        if (episode) {
          const episodeNum = parseInt(episode);
          // If we have season param, filter episodes by season first
          if (season && seasons.length > 0) {
            const seasonNum = parseInt(season);
            const targetSeason = seasons.find(s => s.season_number === seasonNum);
            if (targetSeason) {
              const seasonEpisodes = episodes.filter(ep => ep.season_id === targetSeason.id);
              targetEp = seasonEpisodes.find(ep => ep.episode_number === episodeNum) || seasonEpisodes[0];
            }
          }
          
          // Fallback: find by episode number in all episodes
          if (!targetEp) {
            targetEp = episodes.find(ep => ep.episode_number === episodeNum);
          }
        }
        
        // Default to first episode if not found
        if (!targetEp) {
          targetEp = episodes[0];
        }
        
        if (targetEp) {
          setCurrentEpisode(targetEp);
          const sources = allVideoSources.filter(s => s.episode_id === targetEp!.id);
          setVideoSources(sources);
        }
      }
    }
  }, [content?.id, allVideoSources.length, episodes, seasons, season, episode, contentType, selectedSeasonId]);

  // Fetch related content - use actual type from URL for proper filtering
  useEffect(() => {
    const fetchRelated = async () => {
      if (!content?.id) return;
      
      // Use the actual type from URL (anime, series, movie) for recommendations
      const recommendationType = type === 'anime' ? 'anime' : contentType;
      
      const { data } = await supabase
        .from('content')
        .select('id, title, poster_path, tmdb_id, content_type')
        .eq('content_type', recommendationType)
        .neq('id', content.id)
        .limit(12);
      
      if (data) {
        setRelatedContent(data);
        setForYouContent(data);
      }
    };
    fetchRelated();
  }, [content?.id, contentType, type]);

  // Fetch cast from cast_credits and cast_members tables
  useEffect(() => {
    const fetchCast = async () => {
      if (!content?.tmdb_id) {
        // Fallback: parse from content's cast_members text field
        if (content && (content as any).cast_members) {
          const castString = (content as any).cast_members as string;
          const parsed = castString.split(',').map((item, index) => {
            const trimmed = item.trim();
            const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
            if (match) {
              return { id: `cast-${index}`, actor_name: match[1].trim(), character_name: match[2].trim(), profile_url: null };
            }
            return { id: `cast-${index}`, actor_name: trimmed, character_name: null, profile_url: null };
          }).filter(c => c.actor_name);
          setCastMembers(parsed);
        }
        setCastLoading(false);
        return;
      }

      const tmdbId = content.tmdb_id;
      const mediaType = contentType === 'movie' ? 'movie' : 'tv';
      
      try {
        // First try local database
        const { data: castCredits } = await supabase
          .from('cast_credits')
          .select(`
            id,
            character_name,
            cast_member_id,
            cast_members!cast_credits_cast_member_id_fkey (
              id,
              name,
              profile_path
            )
          `)
          .eq('tmdb_content_id', tmdbId)
          .limit(15);

        if (castCredits && castCredits.length > 0) {
          const formattedCast = castCredits.map((credit: any) => ({
            id: credit.id,
            actor_name: credit.cast_members?.name || 'Unknown',
            character_name: credit.character_name,
            profile_url: credit.cast_members?.profile_path?.startsWith('http') 
              ? credit.cast_members.profile_path 
              : credit.cast_members?.profile_path 
                ? `https://image.tmdb.org/t/p/w185${credit.cast_members.profile_path}`
                : null
          })).filter((c: any) => c.actor_name !== 'Unknown');
          
          if (formattedCast.length > 0) {
            setCastMembers(formattedCast);
            setCastLoading(false);
            return;
          }
        }

        // Fallback: Fetch directly from TMDB API
        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/credits?api_key=5cfa727c2f549c594772a50e10e3f272`
        );
        
        if (tmdbResponse.ok) {
          const tmdbData = await tmdbResponse.json();
          if (tmdbData.cast && tmdbData.cast.length > 0) {
            const formattedCast = tmdbData.cast.slice(0, 15).map((member: any) => ({
              id: member.id.toString(),
              actor_name: member.name || member.original_name,
              character_name: member.character,
              profile_url: member.profile_path 
                ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
                : null
            }));
            setCastMembers(formattedCast);
          }
        }
      } catch (err) {
        console.error('Error fetching cast:', err);
      }
      setCastLoading(false);
    };

    fetchCast();
  }, [content, contentType]);

  // Fetch shorts
  useEffect(() => {
    const fetchShorts = async () => {
      const { data } = await supabase
        .from('shorts')
        .select('*')
        .eq('status', 'active')
        .order('views', { ascending: false })
        .limit(8);
      if (data) setShorts(data);
    };
    fetchShorts();
  }, []);

  // State for episode interstitial ad from app_ads
  const [episodeInterstitialAd, setEpisodeInterstitialAd] = useState<{
    ad_unit_id: string;
    is_test_mode: boolean;
  } | null>(null);

  // Fetch episode interstitial ad config from app_ads table
  useEffect(() => {
    const fetchEpisodeInterstitialAd = async () => {
      if (!isAndroidNative) return;
      
      try {
        const { data, error } = await supabase
          .from('app_ads')
          .select('ad_unit_id, is_test_mode')
          .eq('placement', 'episode_interstitial')
          .eq('ad_type', 'rewarded')
          .eq('is_active', true)
          .or('platform.eq.android,platform.eq.both')
          .order('priority', { ascending: false })
          .limit(1)
          .single();
        
        if (data && !error) {
          setEpisodeInterstitialAd({
            ad_unit_id: data.ad_unit_id,
            is_test_mode: data.is_test_mode
          });
          console.log('[WatchPage] Episode interstitial ad loaded:', data.ad_unit_id);
        }
      } catch (err) {
        console.error('[WatchPage] Error fetching episode interstitial ad:', err);
      }
    };
    
    fetchEpisodeInterstitialAd();
  }, [isAndroidNative]);

  const fetchVideoSource = async (episodeId: string) => {
    // Check if this is a different episode (user switching episodes)
    const isChangingEpisode = currentEpisode && currentEpisode.id !== episodeId;
    
    // Show rewarded interstitial ad when changing episodes on native (from app_ads config)
    if (isChangingEpisode && isAndroidNative && episodeInterstitialAd) {
      try {
        console.log('[WatchPage] Showing rewarded ad before episode change:', episodeInterstitialAd.ad_unit_id);
        
        // Import and use AdMob functions directly
        const { loadRewardedAd, showRewardedAd } = await import('@/services/admobService');
        
        // Load the ad
        const loaded = await loadRewardedAd(episodeInterstitialAd.ad_unit_id);
        if (loaded) {
          // Show the ad
          await showRewardedAd();
          console.log('[WatchPage] Rewarded ad shown successfully');
        }
      } catch (error) {
        console.error('[WatchPage] Error showing rewarded ad:', error);
      }
    }
    
    const sources = allVideoSources.filter(s => s.episode_id === episodeId);
    setVideoSources(sources);
    const ep = episodes.find(e => e.id === episodeId);
    if (ep) setCurrentEpisode(ep);
  };

  // Setup smooth scroll refs
  const mobileCastScrollRef = useSwipeScroll({ enabled: true });
  const mobileEpisodesScrollRef = useSwipeScroll({ enabled: true });
  const mobileForYouScrollRef = useSwipeScroll({ enabled: true });
  const tabletCastScrollRef = useSwipeScroll({ enabled: true });
  const tabletEpisodesScrollRef = useSwipeScroll({ enabled: true });
  const desktopCastScrollRef = useSwipeScroll({ enabled: true });

  const getProgressPercentage = (episodeId: string) => {
    const history = watchHistory[episodeId];
    if (!history || !history.duration || history.duration === 0) return 0;
    return (history.progress / history.duration) * 100;
  };

  const isSeriesContent = type === 'series' || Boolean(season && episode);

  // Memoize VideoPlayer props to prevent unnecessary re-renders
  const videoPlayerAccessType = useMemo(() => {
    const effectiveAccessType = isSeriesContent 
      ? (currentEpisode?.access_type || episodes[0]?.access_type || content?.access_type)
      : content?.access_type;
    return effectiveAccessType === 'purchase' ? 'rent' : effectiveAccessType === 'membership' ? 'vip' : 'free';
  }, [isSeriesContent, currentEpisode?.access_type, episodes, content?.access_type]);

  // Create a stable VideoPlayer component that won't remount on orientation change
  const videoPlayerElement = useMemo(() => {
    // Use episode still_path for series, fallback to content backdrop_path
    const videoBackdrop = isSeriesContent && currentEpisode?.still_path 
      ? currentEpisode.still_path 
      : content?.backdrop_path;
    
    return (
      <VideoPlayer 
        videoSources={videoSources}
        contentBackdrop={videoBackdrop}
        contentId={content?.id}
        accessType={videoPlayerAccessType as 'free' | 'rent' | 'vip'}
        excludeFromPlan={content?.exclude_from_plan}
        rentalPrice={isSeriesContent && currentEpisode?.price ? currentEpisode.price : content?.price}
        rentalPeriodDays={content?.purchase_period || 7}
        mediaId={content?.id}
        mediaType={contentType}
        title={content?.title}
        movieId={id}
        currentEpisodeId={currentEpisode?.id}
        episodes={isSeriesContent ? displayEpisodes : []}
        onEpisodeSelect={isSeriesContent ? fetchVideoSource : undefined}
      />
    );
  }, [videoSources, content?.backdrop_path, content?.id, videoPlayerAccessType, content?.exclude_from_plan, content?.price, content?.purchase_period, content?.title, isSeriesContent, currentEpisode?.price, currentEpisode?.id, currentEpisode?.still_path, contentType, id, displayEpisodes, fetchVideoSource]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Content Not Found</h2>
          <p className="text-muted-foreground">
            The {type} you're looking for doesn't exist or has been removed.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/')}>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            <Button variant="outline" onClick={() => navigate(type === 'movie' ? '/movies' : '/series')}>
              <Film className="mr-2 h-4 w-4" />
              Browse {type === 'movie' ? 'Movies' : 'Series'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile && !isTablet) {
    return (
      <>
      <div className="min-h-screen bg-background text-foreground pb-20">
        <SocialShareMeta
          title={content.title}
          description={content.overview || ''}
          image={content.backdrop_path || content.poster_path}
          type={contentType === 'movie' ? 'video.movie' : 'video.tv_show'}
        />
        
        {/* Video player section - Android native: status bar padding + edge-to-edge 16:9 video */}
        <div className="sticky top-0 z-40">
          {/* Native Banner Ad - Top of Player (Android only) - no padding between banner and player */}
          {isAndroidNative && !isVideoFullscreen && (
            <NativeBannerAdSlot placement="watch_top_banner" className="!p-0 !m-0 !mb-0" />
          )}
          
          {/* Video container - Android native: no padding, exactly 16:9 */}
          <div 
            className={isAndroidNative ? "w-full aspect-video bg-black !p-0 !m-0" : "bg-black"}
            style={!isAndroidNative ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : undefined}
          >
            {videoPlayerElement}
          </div>
        </div>
        
        {/* Native Banner Ad - Below Player (Android only) - uses watch_bottom_banner from DB */}
        {isAndroidNative && !isVideoFullscreen && (
          <NativeBannerAdSlot placement="watch_bottom_banner" className="!p-0 !m-0" />
        )}

        {/* Fallback watch_banner for non-Android - auto-hides in fullscreen */}
        {!isAndroidNative && !isVideoFullscreen && (
          <NativeBannerAdSlot placement="watch_banner" className="!p-0 !m-0" />
        )}

        {/* Action Buttons - Below Ad Banner, aligned right */}
        <div className="px-4 pt-2 pb-1 border-b border-border/30 flex justify-end">
          <ActionButtons 
            contentId={content?.id}
            contentType={contentType as 'movie' | 'series'}
            episodeId={currentEpisode?.id}
            userId={user?.id}
            contentTitle={content?.title}
            tmdbId={id}
            seasonNumber={season ? parseInt(season) : undefined}
            episodeNumber={episode ? parseInt(episode) : undefined}
          />
        </div>

        <div className="px-4 py-3">
          {/* User Profile Section */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-12 h-12 border-2 border-primary flex-shrink-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <AvatarImage src={profileImageUrl || undefined} alt={userProfile?.username || user?.email || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                {(userProfile?.username || user?.email || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold truncate">{userProfile?.username || user?.email?.split('@')[0] || 'Guest'}</h1>
              <WalletSection iconClassName="h-3 w-3" textClassName="text-xs" />
            </div>
          </div>

          {/* Content Info with VIP Button */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/40">
            <div className="w-12 h-16 rounded-lg overflow-hidden border-2 border-muted flex-shrink-0">
              <img src={content?.poster_path || "/placeholder.svg"} alt={content?.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">{content?.title}</h2>
              <p className="text-xs text-primary">
                  {isSeriesContent && currentEpisode 
                    ? `Watching S${seasons.find(s => s.id === selectedSeasonId)?.season_number || 1} EP${currentEpisode.episode_number}` 
                    : isSeriesContent 
                      ? `${displayEpisodes.length} Episodes`
                      : 'Watching Movie'}
              </p>
            </div>
            {/* VIP Button moved here */}
            <Button 
              size="sm" 
              variant="outline" 
              className={`h-8 px-2 gap-1 text-xs flex-shrink-0 ${hasActiveSubscription ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600' : 'border-primary/50 text-primary hover:bg-primary/10'}`}
              onClick={() => setShowSubscriptionDialog(true)}
            >
              <Crown className="h-3.5 w-3.5" />
              {hasActiveSubscription ? (
                <span className="flex items-center gap-1">
                  VIP
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-yellow-500/20 text-yellow-600">
                    {remainingDays}d
                  </Badge>
                </span>
              ) : 'VIP'}
            </Button>
          </div>

          {/* Cast Scroll */}
          {castMembers.length > 0 && (
            <div className="mb-4">
              <div ref={mobileCastScrollRef} className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide scroll-smooth px-1">
                {castMembers.slice(0, 10).map((member, idx) => (
                  <button 
                    key={idx} 
                    type="button" 
                    className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer bg-transparent border-none p-0"
                    onClick={() => setSelectedCastMember(member)}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-muted ring-2 ring-border/50">
                      <img src={member.profile_url || "/placeholder.svg"} alt={member.actor_name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] text-center max-w-[64px] truncate font-medium">{member.actor_name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={mobileActiveTab} onValueChange={setMobileActiveTab} className="w-full">
            <TabsList className="w-full justify-around border-b rounded-none h-auto p-0 bg-transparent">
              {isSeriesContent && (
                <TabsTrigger value="episodes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 text-xs gap-1">
                  <Film className="h-3.5 w-3.5" />Episodes
                </TabsTrigger>
              )}
              <TabsTrigger value="foryou" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 text-xs gap-1">
                <Sparkles className="h-3.5 w-3.5" />For You
              </TabsTrigger>
              <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 text-xs gap-1">
                <MessageSquare className="h-3.5 w-3.5" />Comments
              </TabsTrigger>
              <TabsTrigger value="home" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 text-xs gap-1">
                <Home className="h-3.5 w-3.5" />Home
              </TabsTrigger>
            </TabsList>

            {isSeriesContent && (
              <TabsContent value="episodes" className="mt-0">
                {/* Season Selector for Mobile */}
                {seasons.length > 1 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
                    {seasons.map((season) => (
                      <Button
                        key={season.id}
                        variant={selectedSeasonId === season.id ? "default" : "outline"}
                        size="sm"
                        className={`h-7 px-3 text-xs flex-shrink-0 ${selectedSeasonId === season.id ? "bg-primary hover:bg-primary/90" : ""}`}
                        onClick={() => setSelectedSeasonId(season.id)}
                      >
                        Season {season.season_number}
                      </Button>
                    ))}
                  </div>
                )}
                {loading ? (
                  <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="flex-shrink-0 w-32">
                        <div className="aspect-video rounded-md bg-muted animate-pulse mb-1.5" />
                      </div>
                    ))}
                  </div>
                ) : displayEpisodes.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    No episodes available
                  </div>
                ) : (
                  <div ref={mobileEpisodesScrollRef} className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide scroll-smooth">
                    {displayEpisodes.map((ep) => {
                      const isFreeEpisode = ep.access_type === 'free';
                      const isRentEpisode = ep.access_type === 'purchase';
                      const isMembershipEpisode = ep.access_type === 'membership';
                      return (
                        <div key={ep.id} onClick={() => fetchVideoSource(ep.id)} className="flex-shrink-0 w-32 cursor-pointer">
                          <div className={`relative aspect-video rounded-md overflow-hidden mb-1.5 ${currentEpisode?.id === ep.id ? 'ring-2 ring-primary' : ''}`}>
                            <img src={ep.still_path || content?.backdrop_path || "/placeholder.svg"} alt={ep.title} className="w-full h-full object-cover" />
                            {/* Access Type Badge - Top Right */}
                            <div className="absolute top-1 right-1">
                              {isFreeEpisode ? (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold bg-green-500 text-white rounded shadow-md uppercase">Free</span>
                              ) : isRentEpisode ? (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold bg-yellow-500 text-black rounded shadow-md uppercase flex items-center gap-0.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  Rent
                                </span>
                              ) : isMembershipEpisode ? (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold bg-red-600 text-white rounded shadow-md uppercase flex items-center gap-0.5">
                                  <Crown className="h-2 w-2" />
                                  VIP+
                                </span>
                              ) : null}
                            </div>
                            {/* Episode Number - Word Art */}
                            <div className="absolute bottom-1 left-1">
                              <span className="text-4xl font-black text-white leading-none" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.9), 4px 4px 8px rgba(0,0,0,0.5)', WebkitTextStroke: '0.5px rgba(255,255,255,0.2)' }}>{ep.episode_number}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="foryou" className="mt-0">
              <div ref={mobileForYouScrollRef} className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide scroll-smooth">
                {forYouContent?.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex-shrink-0 w-28 cursor-pointer" onClick={() => {
                    const contentIdentifier = item.tmdb_id || item.id;
                    if (item.content_type === 'anime') {
                      navigate(`/watch/anime/${contentIdentifier}/1/1`);
                    } else if (item.content_type === 'series') {
                      navigate(`/watch/series/${contentIdentifier}/1/1`);
                    } else {
                      navigate(`/watch/movie/${contentIdentifier}`);
                    }
                  }}>
                    <div className="aspect-[2/3] rounded-md overflow-hidden">
                      <img src={item.poster_path || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <CommentsSection episodeId={currentEpisode?.id} movieId={contentType === 'movie' ? content.id : undefined} />
            </TabsContent>

            <TabsContent value="home" className="mt-0">
              <div className="space-y-1">
                <Button variant="ghost" onClick={() => navigate('/')} className="w-full justify-start gap-3 h-11"><Home className="h-5 w-5" /><span>Go Home</span></Button>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-full justify-start gap-3 h-11"><LayoutDashboard className="h-5 w-5" /><span>Dashboard</span></Button>
                <Button variant="ghost" onClick={() => navigate('/series')} className="w-full justify-start gap-3 h-11"><Tv className="h-5 w-5" /><span>Series</span></Button>
                <Button variant="ghost" onClick={() => navigate('/movies')} className="w-full justify-start gap-3 h-11"><Film className="h-5 w-5" /><span>Movies</span></Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Recommended */}
          <div className="mt-6">
            <h3 className="text-base font-semibold mb-3">Recommended</h3>
            <div className="grid grid-cols-3 gap-2">
              {relatedContent.slice(0, 6).map((item) => (
                <div key={item.id} className="cursor-pointer" onClick={() => {
                  const contentIdentifier = item.tmdb_id || item.id;
                  if (item.content_type === 'anime') {
                    navigate(`/watch/anime/${contentIdentifier}/1/1`);
                  } else if (item.content_type === 'series') {
                    navigate(`/watch/series/${contentIdentifier}/1/1`);
                  } else {
                    navigate(`/watch/movie/${contentIdentifier}`);
                  }
                }}>
                  <div className="aspect-[2/3] rounded-md overflow-hidden">
                    <img src={item.poster_path || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <SubscriptionDialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog} />
      <CastMemberDialog castMember={selectedCastMember} isOpen={!!selectedCastMember} onClose={() => setSelectedCastMember(null)} castType={contentType === 'movie' ? 'movie' : 'series'} />
      <DeviceLimitWarning open={showDeviceLimitWarning} onOpenChange={setShowDeviceLimitWarning} maxDevices={maxDevices} activeSessions={sessions} currentDeviceId={currentDeviceId} onSignOutDevice={signOutDevice} onSignOutAllDevices={signOutAllDevices} />
      </>
    );
  }

  // Tablet Layout - only for Android tablets / non‑iPad tablets in portrait
  // iPad uses the Desktop layout in BOTH portrait + landscape so the VideoPlayer
  // stays mounted and Shaka playback won’t stop during rotation.
  if (isTablet && !isTabletLandscape && !isIPadDevice) {
    return (
      <>
      <div className="min-h-screen bg-background text-foreground">
        <SocialShareMeta title={content.title} description={content.overview || ''} image={content.backdrop_path || content.poster_path} type={contentType === 'movie' ? 'video.movie' : 'video.tv_show'} />
        
        {/* Video player - positioned below status bar with safe area */}
        <div className="sticky top-0 z-40 bg-black" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {videoPlayerElement}
        </div>

        {/* Native Banner Ad - Below Player */}
        <NativeBannerAdSlot placement="watch_banner" />

        <div className="pb-6">
          {/* User Profile */}
          <div className="flex items-center gap-3 py-4 px-4">
            <Avatar className="w-14 h-14 border-2 border-primary flex-shrink-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <AvatarImage src={profileImageUrl || undefined} alt={userProfile?.username || user?.email || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {(userProfile?.username || user?.email || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{userProfile?.username || user?.email?.split('@')[0] || 'Guest'}</h1>
              <WalletSection iconClassName="h-4 w-4" textClassName="text-sm" />
            </div>
            <Button size="sm" variant="outline" className={`h-9 px-3 gap-1.5 ${hasActiveSubscription ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600' : 'border-primary/50 text-primary hover:bg-primary/10'}`} onClick={() => setShowSubscriptionDialog(true)}>
              <Crown className="h-4 w-4" />
              {hasActiveSubscription ? (<span className="flex items-center gap-1">VIP<Badge variant="secondary" className="h-5 px-1.5 text-xs bg-yellow-500/20 text-yellow-600">{remainingDays}d</Badge></span>) : 'VIP'}
            </Button>
          </div>

          {/* Content Info with Actions */}
          <div className="flex items-center gap-3 px-4 pb-3 border-b border-border/40">
            <div className="w-14 h-20 rounded-lg overflow-hidden border-2 border-muted flex-shrink-0">
              <img src={content?.poster_path || "/placeholder.svg"} alt={content?.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold truncate">{content?.title}</h2>
              <p className="text-sm text-primary">
                {isSeriesContent && currentEpisode ? `Watching S${seasons.find(s => s.id === selectedSeasonId)?.season_number || 1} EP${currentEpisode.episode_number}` : isSeriesContent ? `${displayEpisodes.length} Episodes` : 'Watching Movie'}
              </p>
            </div>
            <div className="flex-shrink-0">
              <ActionButtons contentId={content?.id} contentType={contentType as 'movie' | 'series'} episodeId={currentEpisode?.id} userId={user?.id} contentTitle={content?.title} tmdbId={id} seasonNumber={season ? parseInt(season) : undefined} episodeNumber={episode ? parseInt(episode) : undefined} />
            </div>
          </div>

          {/* Cast */}
          {castMembers.length > 0 && (
            <div className="px-4 pt-4">
              <h3 className="text-base font-semibold mb-3">Cast</h3>
              <div ref={tabletCastScrollRef} className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide scroll-smooth px-1">
                {castMembers.slice(0, 10).map((member, idx) => (
                  <button 
                    key={idx} 
                    type="button" 
                    className="flex flex-col items-center gap-2 flex-shrink-0 bg-transparent border-none p-0 cursor-pointer"
                    onClick={() => setSelectedCastMember(member)}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-muted ring-2 ring-border/50">
                      <img src={member.profile_url || "/placeholder.svg"} alt={member.actor_name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-center max-w-[64px] truncate font-medium">{member.actor_name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue={isSeriesContent ? "episodes" : "foryou"} className="w-full mt-4">
            <TabsList className="w-full justify-around border-b rounded-none h-auto p-0 bg-transparent px-4">
              {isSeriesContent && (<TabsTrigger value="episodes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Episodes</TabsTrigger>)}
              <TabsTrigger value="foryou" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">For You</TabsTrigger>
              <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"><MessageSquare className="w-4 h-4 mr-1" />Comments</TabsTrigger>
              <TabsTrigger value="home" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"><Home className="w-4 h-4 mr-1" />Home</TabsTrigger>
            </TabsList>

            {isSeriesContent && (
              <TabsContent value="episodes" className="mt-4 px-4">
                {/* Season Selector for Tablet */}
                {seasons.length > 1 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
                    {seasons.map((season) => (
                      <Button
                        key={season.id}
                        variant={selectedSeasonId === season.id ? "default" : "outline"}
                        size="sm"
                        className={`h-8 px-4 text-sm flex-shrink-0 ${selectedSeasonId === season.id ? "bg-primary hover:bg-primary/90" : ""}`}
                        onClick={() => setSelectedSeasonId(season.id)}
                      >
                        Season {season.season_number}
                      </Button>
                    ))}
                  </div>
                )}
                <div ref={tabletEpisodesScrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
                  {displayEpisodes.map((ep) => {
                    const isFreeEpisode = ep.access_type === 'free';
                    const isRentEpisode = ep.access_type === 'purchase';
                    const isMembershipEpisode = ep.access_type === 'membership';
                    return (
                      <div key={ep.id} onClick={() => fetchVideoSource(ep.id)} className="flex-shrink-0 w-40 cursor-pointer">
                        <div className={`relative aspect-video rounded-lg overflow-hidden mb-2 border-2 transition-all ${currentEpisode?.id === ep.id ? 'border-primary' : 'border-transparent'}`}>
                          <img src={ep.still_path || content?.backdrop_path || "/placeholder.svg"} alt={ep.title} className="w-full h-full object-cover" />
                          {/* Access Type Badge - Top Right */}
                          <div className="absolute top-1.5 right-1.5">
                            {isFreeEpisode ? (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-green-500 text-white rounded shadow-md uppercase">Free</span>
                            ) : isRentEpisode ? (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-yellow-500 text-black rounded shadow-md uppercase flex items-center gap-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                Rent
                              </span>
                            ) : isMembershipEpisode ? (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-red-600 text-white rounded shadow-md uppercase flex items-center gap-0.5">
                                <Crown className="h-2.5 w-2.5" />
                                VIP+
                              </span>
                            ) : null}
                          </div>
                          {/* Episode Number - Word Art */}
                          <div className="absolute bottom-1 left-1">
                            <span className="text-5xl font-black text-white leading-none" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.9), 5px 5px 10px rgba(0,0,0,0.5)', WebkitTextStroke: '0.5px rgba(255,255,255,0.2)' }}>{ep.episode_number}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            )}

            <TabsContent value="foryou" className="mt-4 px-4">
              <div className="grid grid-cols-4 gap-3">
                {forYouContent.slice(0, 8).map((item) => (
                  <div key={item.id} className="cursor-pointer" onClick={() => {
                    const contentIdentifier = item.tmdb_id || item.id;
                    if (item.content_type === 'anime') {
                      navigate(`/watch/anime/${contentIdentifier}/1/1`);
                    } else if (item.content_type === 'series') {
                      navigate(`/watch/series/${contentIdentifier}/1/1`);
                    } else {
                      navigate(`/watch/movie/${contentIdentifier}`);
                    }
                  }}>
                    <div className="aspect-[2/3] rounded-lg overflow-hidden">
                      <img src={item.poster_path || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-4 px-4">
              <CommentsSection episodeId={currentEpisode?.id} movieId={contentType === 'movie' ? content.id : undefined} />
            </TabsContent>

            <TabsContent value="home" className="mt-4 px-4">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => navigate('/')} className="h-14 justify-start gap-3"><Home className="h-5 w-5" /><span>Go Home</span></Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-14 justify-start gap-3"><LayoutDashboard className="h-5 w-5" /><span>Dashboard</span></Button>
                <Button variant="outline" onClick={() => navigate('/series')} className="h-14 justify-start gap-3"><Tv className="h-5 w-5" /><span>Series</span></Button>
                <Button variant="outline" onClick={() => navigate('/movies')} className="h-14 justify-start gap-3"><Film className="h-5 w-5" /><span>Movies</span></Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Recommended */}
          <div className="mt-6 px-4">
            <h3 className="text-lg font-semibold mb-4">Recommended</h3>
            <div className="grid grid-cols-4 gap-3">
              {relatedContent.slice(0, 8).map((item) => (
                <div key={item.id} className="cursor-pointer" onClick={() => {
                  const contentIdentifier = item.tmdb_id || item.id;
                  if (item.content_type === 'anime') {
                    navigate(`/watch/anime/${contentIdentifier}/1/1`);
                  } else if (item.content_type === 'series') {
                    navigate(`/watch/series/${contentIdentifier}/1/1`);
                  } else {
                    navigate(`/watch/movie/${contentIdentifier}`);
                  }
                }}>
                  <div className="aspect-[2/3] rounded-lg overflow-hidden">
                    <img src={item.poster_path || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <SubscriptionDialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog} />
      <CastMemberDialog castMember={selectedCastMember} isOpen={!!selectedCastMember} onClose={() => setSelectedCastMember(null)} castType={contentType === 'movie' ? 'movie' : 'series'} />
      <DeviceLimitWarning open={showDeviceLimitWarning} onOpenChange={setShowDeviceLimitWarning} maxDevices={maxDevices} activeSessions={sessions} currentDeviceId={currentDeviceId} onSignOutDevice={signOutDevice} onSignOutAllDevices={signOutAllDevices} />
      </>
    );
  }

  // Desktop Layout - Two Column (flexible Left + flexible Right with Tabs)
  return (
    <>
    <div className={`min-h-screen bg-background text-foreground transition-all duration-300 ease-in-out ${isIPadPortrait ? '' : ''}`}>
      <SocialShareMeta title={content.title} description={content.overview || ''} image={content.backdrop_path || content.poster_path} type={contentType === 'movie' ? 'video.movie' : 'video.tv_show'} />
      <div className={`${isIPadPortrait ? 'flex flex-col h-screen' : 'flex h-screen overflow-hidden'}`}>
        {/* Left Column: flexible width (min 55%, max 65%), independently scrollable - Full width on iPad portrait */}
        <div 
          className={`flex-1 min-w-0 flex flex-col ${isIPadPortrait ? 'h-full' : 'overflow-hidden'}`} 
          style={isIPadPortrait ? {} : { flex: '1 1 60%', maxWidth: '65%', minWidth: '55%' }}
        >
          {/* Video Player - Below status bar with safe area on iPad portrait, 0 padding in landscape */}
          <div 
            className={isIPadPortrait ? 'sticky top-0 z-50 bg-black' : 'bg-black ipad-landscape-video'}
            style={isIPadPortrait ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : { padding: 0, margin: 0 }}
          >
            {videoPlayerElement}
          </div>
            
          {/* Scrollable Content Below Player */}
          <div className={isIPadPortrait ? 'flex-1 overflow-y-auto' : 'flex-1 overflow-y-auto'}>
            {/* Native Banner Ad - Below Player on Desktop/iPad */}
            <NativeBannerAdSlot placement="watch_banner" />
            
            {/* User Profile with Wallet Balance */}
            <div className="px-4 flex items-center gap-3 py-2">
              <Avatar className="w-12 h-12 border-2 border-primary flex-shrink-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <AvatarImage src={profileImageUrl || undefined} alt={userProfile?.username || user?.email || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                  {(userProfile?.username || user?.email || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold truncate">{userProfile?.username || user?.email?.split('@')[0] || 'Guest'}</h1>
                <WalletSection iconClassName="h-3.5 w-3.5" textClassName="text-sm" />
              </div>

              <Button size="sm" variant="outline" className={`h-8 px-2.5 gap-1 text-sm ${hasActiveSubscription ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600' : 'border-primary/50 text-primary hover:bg-primary/10'}`} onClick={() => setShowSubscriptionDialog(true)}>
                <Crown className="h-3.5 w-3.5" />
                {hasActiveSubscription ? (<span className="flex items-center gap-1">VIP<Badge variant="secondary" className="h-4 px-1 text-xs bg-yellow-500/20 text-yellow-600">{remainingDays}d</Badge></span>) : 'VIP'}
              </Button>

              <ActionButtons contentId={content?.id} contentType={contentType as 'movie' | 'series'} episodeId={currentEpisode?.id} userId={user?.id} contentTitle={content?.title} tmdbId={id} seasonNumber={season ? parseInt(season) : undefined} episodeNumber={episode ? parseInt(episode) : undefined} />
            </div>

            {/* Cast Section - Portrait cards with actor name + character */}
            <div className="px-4 py-2">
              {castLoading ? (
                <CastSkeleton />
              ) : castMembers.length > 0 ? (
                <div ref={desktopCastScrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth px-1">
                  {castMembers.slice(0, 10).map((member, idx) => (
                    <div key={idx} className="flex-shrink-0 cursor-pointer" onClick={() => setSelectedCastMember(member)}>
                      <div className="w-20 h-28 rounded-md overflow-hidden bg-muted ring-1 ring-border/30">
                        <img src={member.profile_url || "/placeholder.svg"} alt={member.actor_name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs text-center mt-1.5 w-20 truncate font-medium">{member.actor_name}</p>
                      {member.character_name && (
                        <p className="text-[10px] text-center text-muted-foreground w-20 truncate">{member.character_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* iPad Portrait: Right sidebar content moves here below Cast */}
            {isIPadPortrait && (
              <div className="px-4 py-3 space-y-4">
                {/* Content Poster, Title - Only for Movies */}
                {!isSeriesContent && (
                  <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
                      <img src={content?.poster_path || "/placeholder.svg"} alt={content?.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold truncate">{content?.title}</h2>
                      <p className="text-sm text-primary font-medium">Watching Movie</p>
                    </div>
                  </div>
                )}

                {/* Collapsible Tabs Section */}
                <CollapsibleTabsSection
                  key={`ipad-portrait-${content?.id || id}`}
                  isSeriesContent={isSeriesContent}
                  seasons={seasons}
                  selectedSeasonId={selectedSeasonId}
                  setSelectedSeasonId={setSelectedSeasonId}
                  episodes={episodes}
                  episodesLoading={episodesLoading}
                  content={content}
                  currentEpisode={currentEpisode}
                  fetchVideoSource={fetchVideoSource}
                  getProgressPercentage={getProgressPercentage}
                  forYouContent={forYouContent}
                  navigate={navigate}
                />

                {/* Subscription Banner */}
                <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">Subscribe to Membership, Enjoy watching our Premium videos</p>
                    <Button size="sm" variant="outline" className="h-6 px-2" onClick={() => setShowSubscriptionDialog(true)}>
                      <Crown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Recommended Section */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Recommended</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {relatedContent && relatedContent.length > 0 ? (
                      relatedContent.slice(0, 8).map((item) => (
                        <div key={item.id} className="cursor-pointer transition-transform hover:scale-105" onClick={() => {
                          const contentIdentifier = item.tmdb_id || item.id;
                          if (item.content_type === 'anime') {
                            navigate(`/watch/anime/${contentIdentifier}/1/1`);
                          } else if (item.content_type === 'series') {
                            navigate(`/watch/series/${contentIdentifier}/1/1`);
                          } else {
                            navigate(`/watch/movie/${contentIdentifier}`);
                          }
                        }}>
                          <div className="aspect-[2/3] rounded-md overflow-hidden">
                            <img src={item.poster_path || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                          </div>
                        </div>
                      ))
                    ) : (
                      Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="aspect-[2/3] rounded-md overflow-hidden bg-muted">
                          <img src="/placeholder.svg" alt={`Recommended ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))
                    )}
                  </div>
                  <button className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-2">... More</button>
                </div>

                {/* Shorts Section */}
                <div className="pb-6">
                  <h3 className="text-base font-semibold mb-3">Shorts</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {shorts.length > 0 ? (
                      shorts.map((short) => (
                        <div 
                          key={short.id} 
                          className="aspect-[9/16] rounded-md overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-all hover:scale-105"
                          onClick={() => navigate(`/short?id=${short.id}`)}
                        >
                          <img src={short.thumbnail_url || "/placeholder.svg"} alt={short.title} className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="aspect-[9/16] rounded-md overflow-hidden bg-muted animate-pulse" />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: flexible width (min 35%, max 45%), independently scrollable - Hidden on iPad portrait */}
        {!isIPadPortrait && (
        <div className="overflow-y-auto border-l border-border/40 transition-all duration-300 ease-in-out" style={{ flex: '0 0 40%', maxWidth: '45%', minWidth: '35%' }}>
          <div className="p-3 space-y-3">
            {/* Content Poster, Title - Only for Movies */}
            {!isSeriesContent && (
              <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
                  <img src={content?.poster_path || "/placeholder.svg"} alt={content?.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold truncate">{content?.title}</h2>
                  <p className="text-sm text-primary font-medium">Watching Movie</p>
                </div>
              </div>
            )}

            {/* Collapsible Tabs Section - key forces remount when content changes */}
            <CollapsibleTabsSection
              key={content?.id || id}
              isSeriesContent={isSeriesContent}
              seasons={seasons}
              selectedSeasonId={selectedSeasonId}
              setSelectedSeasonId={setSelectedSeasonId}
              episodes={episodes}
              episodesLoading={episodesLoading}
              content={content}
              currentEpisode={currentEpisode}
              fetchVideoSource={fetchVideoSource}
              getProgressPercentage={getProgressPercentage}
              forYouContent={forYouContent}
              navigate={navigate}
            />

            {/* Subscription Banner */}
            <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Subscribe to Membership, Enjoy watching our Premium videos</p>
                <Button size="sm" variant="outline" className="h-6 px-2" onClick={() => setShowSubscriptionDialog(true)}>
                  <Crown className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Recommended Section */}
            <div>
              <h3 className="text-base font-semibold mb-3">Recommended</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {relatedContent && relatedContent.length > 0 ? (
                  relatedContent.slice(0, 8).map((item) => (
                    <div key={item.id} className="cursor-pointer transition-transform hover:scale-105" onClick={() => {
                      const contentIdentifier = item.tmdb_id || item.id;
                      if (item.content_type === 'anime') {
                        navigate(`/watch/anime/${contentIdentifier}/1/1`);
                      } else if (item.content_type === 'series') {
                        navigate(`/watch/series/${contentIdentifier}/1/1`);
                      } else {
                        navigate(`/watch/movie/${contentIdentifier}`);
                      }
                    }}>
                      <div className="aspect-[2/3] rounded-md overflow-hidden">
                        <img src={item.poster_path || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                      </div>
                    </div>
                  ))
                ) : (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="aspect-[2/3] rounded-md overflow-hidden bg-muted">
                      <img src="/placeholder.svg" alt={`Recommended ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))
                )}
              </div>
              <button className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-2">... More</button>
            </div>

            {/* Shorts Section */}
            <div>
              <h3 className="text-base font-semibold mb-3">Shorts</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {shorts.length > 0 ? (
                  shorts.map((short) => (
                    <div 
                      key={short.id} 
                      className="aspect-[9/16] rounded-md overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-all hover:scale-105"
                      onClick={() => navigate(`/short?id=${short.id}`)}
                    >
                      <img src={short.thumbnail_url || "/placeholder.svg"} alt={short.title} className="w-full h-full object-cover" />
                    </div>
                  ))
                ) : (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="aspect-[9/16] rounded-md overflow-hidden bg-muted animate-pulse" />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>

    {/* Dialogs */}
    
    <SubscriptionDialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog} />
    <CastMemberDialog castMember={selectedCastMember} isOpen={!!selectedCastMember} onClose={() => setSelectedCastMember(null)} castType={contentType === 'movie' ? 'movie' : 'series'} />
    <DeviceLimitWarning open={showDeviceLimitWarning} onOpenChange={setShowDeviceLimitWarning} maxDevices={maxDevices} activeSessions={sessions} currentDeviceId={currentDeviceId} onSignOutDevice={signOutDevice} onSignOutAllDevices={signOutAllDevices} />
    </>
  );
};

export default WatchPage;
