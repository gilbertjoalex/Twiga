import React, { useRef, useEffect, useState } from 'react';

const GiraffeAvatar = ({ maskUrl }) => {
  const canvasRef = useRef(null);
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const SPOT_RADIUS = 30; // Radius for clustering dots
  const MIN_DISTANCE_BETWEEN_SPOTS = 70; // Clearance for new spots
  const imgRef = useRef(new Image());

  useEffect(() => {
    imgRef.current.src = maskUrl;
    imgRef.current.crossOrigin = "Anonymous";
    imgRef.current.onload = () => setImageLoaded(true);
  }, [maskUrl]);

  const isOverlapping = (x, y) => {
    return fullSpots.some(spot => {
      const distance = Math.sqrt(Math.pow(x - spot.center.x, 2) + Math.pow(y - spot.center.y, 2));
      return distance < MIN_DISTANCE_BETWEEN_SPOTS;
    });
  };

  const handleSpotClick = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let newDot = null;

    if (dots.length === 0) {
      // Find a brand new location for the first dot of a cluster
      let attempts = 0;
      while (attempts < 100) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        const pixel = ctx.getImageData(x, y, 1, 1).data[3];
        if (pixel > 0 && !isOverlapping(x, y)) {
          newDot = { x, y };
          break;
        }
        attempts++;
      }
    } else {
      // Cluster near the existing first dot
      const anchor = dots[0];
      let attempts = 0;
      while (attempts < 50) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * SPOT_RADIUS;
        const x = Math.floor(anchor.x + Math.cos(angle) * dist);
        const y = Math.floor(anchor.y + Math.sin(angle) * dist);
        
        const pixel = ctx.getImageData(x, y, 1, 1).data[3];
        if (pixel > 0) {
          newDot = { x, y };
          break;
        }
        attempts++;
      }
    }

    if (!newDot) return;

    if (dots.length === 9) {
      setFullSpots([...fullSpots, { center: dots[0], cluster: [...dots, newDot] }]);
      setDots([]);
    } else {
      setDots([...dots, newDot]);
    }
  };

  useEffect(() => {
    if (!imageLoaded) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(imgRef.current, 0, 0);

    // Draw Full Spots
    fullSpots.forEach(spot => {
      ctx.save();
      // Create a smooth outline effect using shadow + composite
      ctx.shadowBlur = 2;
      ctx.shadowColor = '#1a0f08'; 
      ctx.fillStyle = '#3d2616';
      
      ctx.beginPath();
      spot.cluster.forEach(d => {
        ctx.moveTo(d.x + 12, d.y);
        ctx.arc(d.x, d.y, 12, 0, Math.PI * 2);
      });
      ctx.fill();
      
      // Thin smooth outline
      ctx.strokeStyle = '#1a0f08';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });

    // Draw active cluster dots
    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(61, 38, 22, 0.7)';
      ctx.fill();
    });
  }, [dots, fullSpots, imageLoaded]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={400} height={600} className="max-w-full h-auto" />
      <button onClick={handleSpotClick} className="px-8 py-3 bg-amber-900 text-white rounded-lg">
        Add Spot Fragment ({dots.length}/10)
      </button>
    </div>
  );
};

export default GiraffeAvatar;
