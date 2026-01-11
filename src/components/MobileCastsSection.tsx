import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import CastMemberDialog from '@/components/cast/CastMemberDialog';
import { ChevronRight } from 'lucide-react';

interface CastMember {
  id: string;
  tmdb_id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string | null;
  popularity?: number | null;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w185';

const MobileCastsSection = () => {
  const navigate = useNavigate();
  const [castMembers, setCastMembers] = useState<CastMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCastMember, setSelectedCastMember] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchCastMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('cast_members')
          .select('id, tmdb_id, name, profile_path, known_for_department, popularity')
          .not('profile_path', 'is', null)
          .order('popularity', { ascending: false })
          .limit(15);

        if (error) throw error;
        setCastMembers(data || []);
      } catch (error) {
        console.error('Error fetching cast members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCastMembers();
  }, []);

  const handleCastMemberClick = (castMember: CastMember) => {
    setSelectedCastMember({
      id: castMember.tmdb_id,
      name: castMember.name,
      image: castMember.profile_path 
        ? `${TMDB_IMAGE_BASE_URL}${castMember.profile_path}` 
        : null,
      profile_path: castMember.profile_path,
      role: castMember.known_for_department || 'Acting',
    });
    setIsDialogOpen(true);
  };

  if (loading || castMembers.length === 0) return null;

  return (
    <div className="py-4 bg-background">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="text-base font-bold uppercase tracking-wide text-foreground">
            Casts
          </h2>
        </div>
        <button 
          onClick={() => navigate('/casters')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Horizontal Scroll */}
      <div className="overflow-x-auto scrollbar-hide px-4">
        <div className="flex gap-4 pb-2">
          {castMembers.map((castMember) => (
            <button
              key={castMember.id}
              onClick={() => handleCastMemberClick(castMember)}
              className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded-full group"
            >
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-[3px] border-primary/60 group-hover:border-primary group-hover:scale-110 transition-all">
                {castMember.profile_path ? (
                  <img
                    src={`${TMDB_IMAGE_BASE_URL}${castMember.profile_path}`}
                    alt={castMember.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-bold text-muted-foreground">
                      {castMember.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-center mt-1 truncate w-16 text-foreground">
                {castMember.name.split(' ')[0]}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Cast Member Dialog */}
      <CastMemberDialog
        castMember={selectedCastMember}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
};

export default MobileCastsSection;
