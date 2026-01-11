import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailerUrl: string | null;
  title?: string;
}

export const TrailerDialog = ({ open, onOpenChange, trailerUrl, title }: TrailerDialogProps) => {
  if (!trailerUrl) return null;

  // Convert YouTube URL to embed format
  const getEmbedUrl = (url: string) => {
    // Handle YouTube URLs
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`;
    }
    // Return as-is for self-hosted URLs
    return url;
  };

  const embedUrl = getEmbedUrl(trailerUrl);
  const isYouTube = embedUrl.includes('youtube.com');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] p-0 bg-black border-white/10 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{title || 'Trailer'}</DialogTitle>
        </DialogHeader>
        
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 z-50 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="aspect-video w-full bg-black">
          {isYouTube ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title || 'Trailer'}
            />
          ) : (
            <video
              src={trailerUrl}
              className="w-full h-full"
              controls
              autoPlay
              playsInline
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
