import React, { useRef, useEffect, useState } from 'react';

const GiraffeAvatar = ({ maskUrl, backgroundUrl }) => {
  const canvasRef = useRef(null);
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [targetFragments, setTargetFragments] = useState(10);
  const [currentClusterRadius, setCurrentClusterRadius] = useState(18);

  const SHAPE_SIZE = 7; 
  const MIN_DISTANCE_BETWEEN_SPOTS = 28;
  
  const imgRef = useRef(new Image());
  const bgRef = useRef(new Image());

  // Mosaic color palette
  const BROWN_PALETTE = ['#3d2616', '#4a3221', '#523a28'];

  useEffect(() => {
    let loadedCount = 0;
    const onResourceLoad = () => {
      loadedCount++;
      if (imgRef.current.complete) {
        const canvas = canvasRef.current;
        canvas.width = imgRef.current.naturalWidth;
        canvas.height = imgRef.current.naturalHeight;
      }
      if (loadedCount >= (backgroundUrl ? 2 : 1)) setImageLoaded(true);
    };
    imgRef.current.src = maskUrl;
    imgRef.current.crossOrigin = "Anonymous";
    imgRef.current.onload = onResourceLoad;
    if (backgroundUrl) {
      bgRef.current.src = backgroundUrl;
      bgRef.current.crossOrigin = "Anonymous";
      bgRef.current.onload = onResourceLoad;
    }
  }, [maskUrl, backgroundUrl]);

  const drawShape = (ctx, dot, isActive = false) => {
    const { x, y, type, rotation, size, color } = dot;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    // Apply alpha only to active/preview dots
    ctx.fillStyle = isActive ? `${color}80` : color;
    
    ctx.beginPath();
    if (type === 0) {
      ctx.arc(0, 0, size, 0, Math.PI * 2);
    } else if (type === 1) {
      ctx.rect(-size, -size, size * 2, size * 2);
    }
    ctx.fill();
    ctx.restore();
  };

  const isAreaOnMask = (ctx, x, y) => {
    let hits = 0;
    const samples = [[x, y], [x-2, y], [x+2, y], [x, y-2], [x, y+2]];
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
    const randomRotation = Math.random() * Math.PI * 2;
    const randomColor = BROWN_PALETTE[Math.floor(Math.random() * BROWN_PALETTE.length)];

    if (dots.length === 0) {
      // Probability Weighting for Larger Spots (6-12)
      // We use a weighted array to make 10, 11, 12 more common than 6, 7
      const weights = [6, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 12];
      const newTarget = weights[Math.floor(Math.random() * weights.length)];
      const newRadius = Math.floor(Math.random() * (20 - 15 + 1)) + 15;
      
      setTargetFragments(newTarget);
      setCurrentClusterRadius(newRadius);

      let attempts = 0;
      while (attempts < 100) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        if (isAreaOnMask(ctx, x, y) && !isOverlapping(x, y)) {
          newDot = { x, y, type: 0, rotation: randomRotation, size: SHAPE_SIZE, color: randomColor };
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
        const dist = 4 + Math.random() * 6; 
        const x = Math.floor(prevDot.x + Math.cos(angle) * dist);
        const y = Math.floor(prevDot.y + Math.sin(angle) * dist);
        const distFromAnchor = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

        if (isAreaOnMask(ctx, x, y) && distFromAnchor < currentClusterRadius) {
          newDot = { x, y, type: dots.length % 2, rotation: randomRotation, size: SHAPE_SIZE, color: randomColor };
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

    if (dots.length === targetFragments - 1) {
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

    if (bgRef.current.complete && backgroundUrl) {
      const scale = Math.min(canvas.width / bgRef.current.width, canvas.height / bgRef.current.height);
      const x = (canvas.width / 2) - (bgRef.current.width / 2) * scale;
      const y = (canvas.height / 2) - (bgRef.current.height / 2) * scale;
      ctx.drawImage(bgRef.current, x, y, bgRef.current.width * scale, bgRef.current.height * scale);
    }

    ctx.drawImage(imgRef.current, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    fullSpots.forEach(spot => {
      spot.cluster.forEach(d => drawShape(ctx, d, false));
    });
    dots.forEach(dot => {
      drawShape(ctx, dot, true);
    });
    ctx.restore();

    ctx.globalCompositeOperation = 'destination-over';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(26, 15, 8, 0.1)';
    ctx.stroke();
  }, [dots, fullSpots, imageLoaded, backgroundUrl]);

  return (
    <div className="flex flex-col items-center gap-4 bg-gray-100 p-8 rounded-xl">
      <canvas ref={canvasRef} className="bg-white shadow-lg rounded-lg max-w-full h-auto" />
      <button 
        onClick={handleSpotClick} 
        className="px-8 py-3 bg-amber-900 text-amber-50 rounded-full font-bold hover:bg-amber-800 transition-colors"
      >
        Add Fragment
      </button>
    </div>
  );
};

export default GiraffeAvatar;
