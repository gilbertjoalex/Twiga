import React, { useRef, useEffect, useState } from 'react';

const GiraffeAvatar = ({ maskUrl }) => {
  const canvasRef = useRef(null);
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reduced from 7 to 5 (approx 2 "font sizes" smaller)
  const SHAPE_SIZE = 6; 
  const CLUSTER_RADIUS = 15; 
  const MIN_DISTANCE_BETWEEN_SPOTS = 30;
  const imgRef = useRef(new Image());

  useEffect(() => {
    imgRef.current.src = maskUrl;
    imgRef.current.crossOrigin = "Anonymous";
    imgRef.current.onload = () => setImageLoaded(true);
  }, [maskUrl]);

  const addShapePath = (ctx, type, x, y, size) => {
    if (type === 0) { // Circle
      ctx.moveTo(x + size, y);
      ctx.arc(x, y, size, 0, Math.PI * 2);
    } else if (type === 1) { // Square
      ctx.rect(x - size, y - size, size * 2, size * 2);
    }
  };

  // Adjusted sampling offsets for the smaller SHAPE_SIZE
  const isAreaOnMask = (ctx, x, y) => {
    let hits = 0;
    const samples = [
      [x, y], [x-2, y], [x+2, y], [x, y-2], [x, y+2], 
      [x-1.5, y-1.5], [x+1.5, y+1.5], [x-1.5, y+1.5], [x+1.5, y-1.5]
    ];
    samples.forEach(([sx, sy]) => {
      const pixel = ctx.getImageData(sx, sy, 1, 1).data[3];
      if (pixel > 0) hits++;
    });
    return hits >= samples.length * 0.5;
  };

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
      let attempts = 0;
      while (attempts < 100) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        if (isAreaOnMask(ctx, x, y) && !isOverlapping(x, y)) {
          newDot = { x, y, type: 0 };
          break;
        }
        attempts++;
      }
    } else {
      const anchor = dots[0];
      const prevDot = dots[dots.length - 1];
      let attempts = 0;
      while (attempts < 60) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 4 + Math.random() * 6; // Slightly tighter distance for smaller dots
        const x = Math.floor(prevDot.x + Math.cos(angle) * dist);
        const y = Math.floor(prevDot.y + Math.sin(angle) * dist);
        
        const distFromAnchor = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

        if (isAreaOnMask(ctx, x, y) && distFromAnchor < CLUSTER_RADIUS) {
          newDot = { x, y, type: dots.length % 2 };
          break;
        }
        attempts++;
      }
    }

    if (!newDot && dots.length > 0) {
      setFullSpots([...fullSpots, { center: dots[0], cluster: [...dots] }]);
      setDots([]);
      return;
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

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';

    fullSpots.forEach(spot => {
      ctx.beginPath();
      spot.cluster.forEach(d => addShapePath(ctx, d.type, d.x, d.y, SHAPE_SIZE));
      ctx.fillStyle = '#58351c';
      ctx.fill();
    });

    dots.forEach(dot => {
      ctx.beginPath();
      addShapePath(ctx, dot.type, dot.x, dot.y, SHAPE_SIZE);
      ctx.fillStyle = 'rgba(61, 38, 22, 0.5)';
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(26, 15, 8, 0.2)';
    ctx.stroke();
    ctx.restore();

  }, [dots, fullSpots, imageLoaded]);

  return (
    <div className="flex flex-col items-center gap-4 bg-gray-100 p-8 rounded-xl">
      <canvas ref={canvasRef} width={400} height={600} className="bg-white shadow-lg rounded-lg" />
      <button 
        onClick={handleSpotClick} 
        className="px-8 py-3 bg-amber-900 text-amber-50 rounded-full font-bold hover:bg-amber-800 transition-colors"
      >
        Add Fragment ({dots.length}/10)
      </button>
    </div>
  );
};

export default GiraffeAvatar;
