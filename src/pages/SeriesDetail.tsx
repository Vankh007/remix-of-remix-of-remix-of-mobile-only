import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Play, List, Clock, ThumbsUp, Share2, Star, Download, MoreVertical, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CastMemberDialog from "@/components/cast/CastMemberDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Capacitor } from '@capacitor/core';
import { playWithExoPlayer, isExoPlayerAvailable } from '@/hooks/useExoPlayer';
import { TrailerDialog } from "@/components/TrailerDialog";

interface Content {
  id: string;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  tmdb_id?: number;
  release_date?: string;
  genre?: string;
  view_count?: number;
  popularity?: number;
  cast_members?: string;
  seasons?: number;
}

interface Season {
  id: string;
  show_id: string;
  season_number: number;
  title: string;
  poster_path?: string;
}

interface Episode {
  id: string;
  show_id: string;
  season_id: string;
  title: string;
  episode_number: number;
  still_path?: string;
  overview?: string;
  access_type?: 'free' | 'membership' | 'purchase';
}

interface CastMember {
  id: number;
  name: string;
  role: string;
  image: string;
  profile_path?: string | null;
}

const SeriesDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [content, setContent] = useState<Content | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [castMembers, setCastMembers] = useState<CastMember[]>([]);
  const [selectedCastMember, setSelectedCastMember] = useState<CastMember | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [showTrailerDialog, setShowTrailerDialog] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchContent();
  }, [id]);

  useEffect(() => {
    if (content?.id && user?.id) {
      checkUserInteractions();
    }
  }, [content?.id, user?.id]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      
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
        toast({ title: "Content not found", variant: "destructive" });
        navigate(-1);
        return;
      }

      setContent(contentData);

      const { data: seasonsData } = await supabase
        .from('seasons')
        .select('*')
        .eq('show_id', contentData.id)
        .order('season_number', { ascending: true });

      setSeasons(seasonsData || []);
      if (seasonsData && seasonsData.length > 0) {
        setSelectedSeasonId(seasonsData[0].id);
      }

      const { data: episodesData } = await supabase
        .from('episodes')
        .select('*')
        .eq('show_id', contentData.id)
        .order('episode_number', { ascending: true });

      setEpisodes(episodesData || []);

      const { data: trailerData } = await supabase
        .from('trailers')
        .select('youtube_id, self_hosted_url')
        .eq('content_id', contentData.id)
        .maybeSingle();

      if (trailerData) {
        setTrailerUrl(
          trailerData.youtube_id 
            ? `https://www.youtube.com/watch?v=${trailerData.youtube_id}` 
            : trailerData.self_hosted_url
        );
      }

      if (contentData.cast_members) {
        try {
          const parsed = JSON.parse(contentData.cast_members);
          const formattedCast = parsed.map((c: any) => ({
            id: c.id || Math.random(),
            name: c.name || c.actor_name,
            role: c.character || c.character_name || 'Actor',
            image: c.profile_path 
              ? c.profile_path.startsWith('http') 
                ? c.profile_path 
                : `https://image.tmdb.org/t/p/w185${c.profile_path}`
              : c.profile_url || '',
            profile_path: c.profile_path
          }));
          setCastMembers(formattedCast);
        } catch (e) {
          console.error('Error parsing cast members:', e);
        }
      }

    } catch (error) {
      console.error('Error fetching content:', error);
      toast({ title: "Error loading content", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const checkUserInteractions = async () => {
    if (!content?.id || !user?.id) return;

    const { data: listData } = await supabase
      .from('my_list')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', content.id)
      .maybeSingle();
    
    setIsInList(!!listData);

    const { data: likeData } = await supabase
      .from('content_interactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', content.id)
      .eq('interaction_type', 'like')
      .maybeSingle();

    setIsLiked(!!likeData);
  };

  const handleAddToList = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!content?.id) return;

    try {
      if (isInList) {
        await supabase
          .from('my_list')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', content.id);
        setIsInList(false);
        toast({ title: "Removed from My List" });
      } else {
        await supabase
          .from('my_list')
          .insert({ user_id: user.id, content_id: content.id });
        setIsInList(true);
        toast({ title: "Added to My List" });
      }
    } catch (error) {
      console.error('Error updating list:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!content?.id) return;

    try {
      if (isLiked) {
        await supabase
          .from('content_interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', content.id)
          .eq('interaction_type', 'like');
        setIsLiked(false);
      } else {
        await supabase
          .from('content_interactions')
          .insert({ 
            user_id: user.id, 
            content_id: content.id,
            interaction_type: 'like'
          });
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handlePlayTrailer = () => {
    if (trailerUrl) {
      setShowTrailerDialog(true);
    } else {
      toast({ title: "No trailer available" });
    }
  };

  const handlePlayEpisode = async (episode: Episode) => {
    const seasonNum = seasons.find(s => s.id === episode.season_id)?.season_number || 1;
    
    // For Android native, use ExoPlayer directly in fullscreen landscape
    if (isExoPlayerAvailable()) {
      try {
        // Fetch video source for this episode
        const { data: sources } = await supabase
          .from('video_sources')
          .select('*')
          .eq('episode_id', episode.id)
          .order('is_default', { ascending: false });

        if (sources && sources.length > 0) {
          const source = sources[0];
          let videoUrl = source.url;
          
          // Get best quality URL from quality_urls if available
          if (source.quality_urls && typeof source.quality_urls === 'object') {
            const qualities = ['1080p', '720p', '480p', '360p'];
            for (const q of qualities) {
              if ((source.quality_urls as Record<string, string>)[q]) {
                videoUrl = (source.quality_urls as Record<string, string>)[q];
                break;
              }
            }
          }

          if (videoUrl) {
            // Play with ExoPlayer - opens fullscreen landscape native player
            await playWithExoPlayer(
              videoUrl,
              content?.title || 'Video',
              `S${seasonNum} E${episode.episode_number}: ${episode.title}`
            );
            return;
          }
        }
        
        toast({ title: "No video source available" });
      } catch (error) {
        console.error('Error playing with ExoPlayer:', error);
        navigate(`/watch/series/${id}/${seasonNum}/${episode.episode_number}`);
      }
    } else {
      // Web/iOS: use regular watch page with Shaka player
      navigate(`/watch/series/${id}/${seasonNum}/${episode.episode_number}`);
    }
  };

  const filteredEpisodes = selectedSeasonId 
    ? episodes.filter(ep => ep.season_id === selectedSeasonId)
    : episodes;

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

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

  const releaseYear = content.release_date ? new Date(content.release_date).getFullYear() : null;
  const rating = content.popularity ? Math.min(10, content.popularity / 10).toFixed(1) : '7.0';

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background - portrait poster with 10% blur */}
      {content.poster_path && (
        <div 
          className="fixed inset-0 z-0 animate-fade-in"
          style={{
            backgroundImage: `url(${content.poster_path})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen pb-24">
        {/* Back button */}
        <div 
          className="fixed top-0 left-0 z-50 p-4" 
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <button
            className="h-10 w-10 rounded-full bg-black/30 flex items-center justify-center"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Main Content */}
        <div className="pt-24 px-5">
          {/* Poster - clean with nice shadow and rounded corners */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={content.poster_path || "/placeholder.svg"} 
                alt={content.title}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-center text-white mb-4 uppercase tracking-wide"
          >
            {content.title}
          </motion.h1>

          {/* Rating & Views */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{rating}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-4 w-4 ${star <= Math.round(parseFloat(rating) / 2) ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'}`} 
                  />
                ))}
              </div>
            </div>
            <span className="text-white/50 text-sm">views:{content.view_count || 0}</span>
          </div>

          {/* Year & Genre */}
          <div className="flex items-center justify-center gap-2 text-sm text-white/50 mb-5">
            {releaseYear && <span>{releaseYear}</span>}
            {releaseYear && content.genre && <span>•</span>}
            {content.genre && <span className="uppercase">{content.genre.split(',')[0]}</span>}
          </div>

          {/* Seasons Badge */}
          <div className="flex justify-center mb-6">
            <span className="px-5 py-2 text-sm font-medium text-white bg-white/10 rounded-full">
              SEASONS: {seasons.length || content.seasons || 1}
            </span>
          </div>

          {/* Synopsis */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-wider">Synopsis</h3>
            <p className="text-sm text-white/70 leading-relaxed text-justify">
              {content.overview || 'No synopsis available.'}
            </p>
          </div>

          {/* Play Trailer Button */}
          <button 
            className="w-full h-12 mb-6 flex items-center justify-center gap-2 bg-white/10 border border-white/20 rounded-xl text-white font-medium"
            onClick={handlePlayTrailer}
          >
            <Play className="h-5 w-5" />
            Play Trailer
          </button>

          {/* Action Buttons - clean circular icons */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              className={`h-11 w-11 rounded-full flex items-center justify-center border ${isInList ? 'border-white bg-white/20' : 'border-white/30'}`}
              onClick={handleAddToList}
            >
              <List className="h-5 w-5 text-white" />
            </button>
            <button className="h-11 w-11 rounded-full flex items-center justify-center border border-white/30">
              <Clock className="h-5 w-5 text-white" />
            </button>
            <button
              className={`h-11 w-11 rounded-full flex items-center justify-center border ${isLiked ? 'border-white bg-white/20' : 'border-white/30'}`}
              onClick={handleLike}
            >
              <ThumbsUp className="h-5 w-5 text-white" />
            </button>
            <button
              className="h-11 w-11 rounded-full flex items-center justify-center border border-white/30"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Cast Section - Circular photos without cards */}
          {castMembers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Casts</h3>
              <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
                <div className="flex gap-5">
                  {castMembers.slice(0, 10).map((member) => (
                    <div 
                      key={member.id}
                      className="flex-shrink-0 w-[72px] cursor-pointer"
                      onClick={() => setSelectedCastMember(member)}
                    >
                      {/* Circular photo */}
                      <div className="w-[72px] h-[72px] rounded-full overflow-hidden mb-2">
                        {member.image ? (
                          <img 
                            src={member.image} 
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center">
                            <span className="text-xl font-semibold text-white/50">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Name - smaller text, all caps */}
                      <p className="text-[10px] text-center text-white/80 uppercase tracking-wide truncate">
                        {member.name.split(' ')[0]}
                      </p>
                      <p className="text-[10px] text-center text-white/80 uppercase tracking-wide truncate">
                        {member.name.split(' ').slice(1).join(' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Season Selector - clean dark panel */}
          {seasons.length > 0 && (
            <div className="mb-5 bg-white/5 rounded-xl p-4">
              <p className="text-xs text-white/40 mb-1">Choose a season</p>
              <Select value={selectedSeasonId || ''} onValueChange={setSelectedSeasonId}>
                <SelectTrigger className="w-full h-10 bg-transparent border-0 text-base font-medium text-white p-0">
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10">
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id} className="text-white hover:bg-white/10">
                      Season {season.season_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Episodes List - Clean compact style */}
          <div className="space-y-3">
            {filteredEpisodes.map((episode) => (
              <motion.div
                key={episode.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => handlePlayEpisode(episode)}
              >
                {/* Episode Thumbnail with play button */}
                <div className="relative w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={episode.still_path || content.backdrop_path || "/placeholder.svg"}
                    alt={episode.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Play icon overlay - white with 35% opacity */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-8 w-8 text-white/35 fill-white/35" />
                  </div>
                  {/* Episode number overlay */}
                  <div className="absolute bottom-1 left-1">
                    <span className="text-xs font-bold text-white drop-shadow-lg">
                      {episode.episode_number}
                    </span>
                  </div>
                </div>

                {/* Episode Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {episode.episode_number} - {episode.title}
                  </p>
                  {episode.access_type && episode.access_type !== 'free' && (
                    <div className="flex items-center gap-1 mt-1">
                      <Crown className="h-3 w-3 text-yellow-400" />
                      <span className="text-[10px] text-yellow-400 uppercase">Premium</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
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
        </div>
      </div>

      {/* Cast Member Dialog */}
      {selectedCastMember && (
        <CastMemberDialog
          castMember={{
            id: selectedCastMember.id,
            name: selectedCastMember.name,
            role: selectedCastMember.role,
            image: selectedCastMember.image,
            profile_path: selectedCastMember.profile_path || null
          }}
          isOpen={!!selectedCastMember}
          onClose={() => setSelectedCastMember(null)}
        />
      )}

      {/* Share Dialog */}
      {content && (
        <ShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          contentTitle={content.title}
          contentType="series"
        />
      )}

      {/* Trailer Dialog */}
      <TrailerDialog
        open={showTrailerDialog}
        onOpenChange={setShowTrailerDialog}
        trailerUrl={trailerUrl}
        title={`${content?.title || ''} - Trailer`}
      />
    </div>
  );
};

export default SeriesDetail;
