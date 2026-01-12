import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import logo from '@/assets/khmerzoon.png';
import { toast } from 'sonner';

interface KHQRCodeImageProps {
  qrCode: string;
  amount: number;
  checking?: boolean;
  onCheckPayment?: () => void;
}

export const KHQRCodeImage = ({ qrCode, amount, checking, onCheckPayment }: KHQRCodeImageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);

  // Generate the QR code image with watermark
  useEffect(() => {
    generateQRImage();
  }, [qrCode, amount]);

  const generateQRImage = async () => {
    setGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = 400;
      canvas.height = 500;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load and draw logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject();
        logoImg.src = logo;
      });

      // Draw logo (centered at top)
      const logoSize = 50;
      ctx.drawImage(logoImg, (canvas.width - logoSize) / 2, 15, logoSize, logoSize);

      // Draw app name (watermark)
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('KHMERZOON', canvas.width / 2, 90);

      // Create a temporary div to render the QR code
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      // Create SVG manually for QR code
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
          <rect width="280" height="280" fill="#ffffff"/>
        </svg>
      `;

      // Wait a bit for React QR to render then capture
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const qrSvg = document.getElementById('khqr-svg-source');
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = () => reject();
          qrImg.src = url;
        });

        // Draw QR code (centered)
        ctx.drawImage(qrImg, 60, 110, 280, 280);
        URL.revokeObjectURL(url);
      }

      // Draw amount text
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Scan to Pay $${amount.toFixed(2)}`, canvas.width / 2, 420);

      // Draw instruction text
      ctx.fillStyle = '#666666';
      ctx.font = '14px Arial';
      ctx.fillText('Open in Banking App', canvas.width / 2, 445);

      // Draw bottom border
      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 470);
      ctx.lineTo(canvas.width - 20, 470);
      ctx.stroke();

      // Draw footer
      ctx.fillStyle = '#999999';
      ctx.font = '11px Arial';
      ctx.fillText('Powered by KHQR', canvas.width / 2, 488);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      setImageDataUrl(dataUrl);
      
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('Error generating QR image:', error);
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRImage = () => {
    if (!imageDataUrl) return;

    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `KHMERZOON-KHQR-${Date.now()}.png`;
    link.click();
    toast.success('QR Code downloaded - Open in your banking app');
  };

  const openInBankApp = async () => {
    if (!imageDataUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      // Try Web Share API for mobile
      const navAny = navigator as any;
      if (navAny?.share) {
        try {
          const file = new File([blob], 'KHMERZOON-KHQR.png', { type: 'image/png' });
          
          if (navAny.canShare && navAny.canShare({ files: [file] })) {
            await navAny.share({
              files: [file],
              title: 'KHMERZOON KHQR Payment',
              text: `Scan to pay $${amount.toFixed(2)}`,
            });
            toast.success('Opening share menu...');
            return;
          }
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') {
            return; // User cancelled
          }
        }
      }

      // Fallback: download the image
      downloadQRImage();
    } catch (error) {
      console.error('Error sharing:', error);
      downloadQRImage(); // Fallback to download
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden QR code for capturing */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <QRCode id="khqr-svg-source" value={qrCode} size={280} />
      </div>
      
      {/* Hidden canvas for generating image */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Display the generated image */}
      <div className="bg-white rounded-xl overflow-hidden shadow-lg">
        {generating ? (
          <div className="flex items-center justify-center h-[500px] bg-white">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : imageDataUrl ? (
          <img 
            src={imageDataUrl} 
            alt="KHQR Payment Code" 
            className="w-full h-auto"
          />
        ) : (
          <div className="p-4 bg-white flex justify-center">
            <QRCode value={qrCode} size={280} />
          </div>
        )}
      </div>

      {/* Recommendation text */}
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-primary">
          Save and open in your Banking App
        </p>
        <p className="text-xs text-muted-foreground">
          ABA, ACLEDA, Wing, True Money, Ly Hour Pay Pro, etc.
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="default"
          onClick={downloadQRImage}
          disabled={generating || !imageDataUrl}
          className="w-full gap-2"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
        <Button
          variant="outline"
          onClick={openInBankApp}
          disabled={generating || !imageDataUrl}
          className="w-full gap-2"
        >
          <Smartphone className="w-4 h-4" />
          Open in App
        </Button>
      </div>

      {/* Waiting indicator */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-2">
        <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
        Waiting for payment...
      </div>

      {/* Check payment button */}
      {onCheckPayment && (
        <Button
          variant="secondary"
          onClick={onCheckPayment}
          disabled={checking}
          className="w-full"
        >
          {checking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            'I have paid'
          )}
        </Button>
      )}
    </div>
  );
};
