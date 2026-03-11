import React, { useRef, useEffect, useState } from 'react';

const GiraffeAvatar = ({ maskUrl }) => {
  const canvasRef = useRef(null);
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const SHAPE_SIZE = 7; 
  const CLUSTER_RADIUS = 18; 
  const MIN_DISTANCE_BETWEEN_SPOTS = 37;
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

  // Checks if at least 50% of the shape area is on the mask
  const isAreaOnMask = (ctx, x, y) => {
    let hits = 0;
    const samples = [
      [x, y], [x-3, y], [x+3, y], [x, y-3], [x, y+3], // Cross pattern
      [x-2, y-2], [x+2, y+2], [x-2, y+2], [x+2, y-2] // Diagonal pattern
    ];
    samples.forEach(([sx, sy]) => {
      if (ctx.getImageData(sx, sy, 1, 1).data[3] > 0) hits++;
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
        const dist = 5 + Math.random() * 8; 
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

    // EXCEPTION: If no spot found, finalize current cluster early and start new
    if (!newDot && dots.length > 0) {
      setFullSpots([...fullSpots, { center: dots[0], cluster: [...dots] }]);
      setDots([]);
      return;
    }

    if (!newDot) return; // Completely stuck

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
      ctx.fillStyle = '#3d2616';
      ctx.fill();
    });

    dots.forEach(dot => {
      ctx.beginPath();
      addShapePath(ctx, dot.type, dot.x, dot.y, SHAPE_SIZE);
      ctx.fillStyle = 'rgba(61, 38, 22, 0.5)';
      ctx.fill();
    });
    ctx.restore();

    // Visual edge clean-up
    ctx.globalCompositeOperation = 'destination-over';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(26, 15, 8, 0.2)';
    ctx.stroke();

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
