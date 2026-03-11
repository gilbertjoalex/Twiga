import React, { useRef, useEffect, useState } from 'react';

const GiraffeAvatar = ({ maskUrl, backgroundUrl }) => {
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null); // Hidden canvas for pixel checking
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [targetFragments, setTargetFragments] = useState(10);
  const [currentClusterRadius, setCurrentClusterRadius] = useState(18);

  const SHAPE_SIZE = 6; 
  const MIN_DISTANCE_BETWEEN_SPOTS = 31;
  const BROWN_PALETTE = ['#4a3221', '#5c3d2e'];
  
  const imgRef = useRef(new Image());
  const bgRef = useRef(new Image());

  useEffect(() => {
    let loadedCount = 0;
    const onResourceLoad = () => {
      loadedCount++;
      if (imgRef.current.complete) {
        const canvas = canvasRef.current;
        const maskCanvas = document.createElement('canvas'); // Create hidden mask
        maskCanvas.width = imgRef.current.naturalWidth;
        maskCanvas.height = imgRef.current.naturalHeight;
        
        // Draw just the mask to the hidden canvas
        const mctx = maskCanvas.getContext('2d');
        mctx.drawImage(imgRef.current, 0, 0);
        maskCanvasRef.current = maskCanvas;

        // Set visible canvas size
        canvas.width = imgRef.current.naturalWidth;
        canvas.height = imgRef.current.naturalHeight;
      }
      const totalToLoad = backgroundUrl ? 2 : 1;
      if (loadedCount >= totalToLoad) setImageLoaded(true);
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
    ctx.fillStyle = isActive ? `${color}80` : color;
    ctx.beginPath();
    if (type === 0) ctx.arc(0, 0, size, 0, Math.PI * 2);
    else if (type === 1) ctx.rect(-size, -size, size * 2, size * 2);
    ctx.fill();
    ctx.restore();
  };

  // FIX: This now checks the hidden maskCanvas instead of the main visible canvas
  const isAreaOnMask = (x, y) => {
    if (!maskCanvasRef.current) return false;
    const mctx = maskCanvasRef.current.getContext('2d', { willReadFrequently: true });
    // Check alpha channel (index 3) of the pixel
    const pixelAlpha = mctx.getImageData(x, y, 1, 1).data[3];
    return pixelAlpha > 0;
  };

  const isOverlapping = (x, y) => {
    return fullSpots.some(spot => {
      const distance = Math.sqrt(Math.pow(x - spot.center.x, 2) + Math.pow(y - spot.center.y, 2));
      return distance < MIN_DISTANCE_BETWEEN_SPOTS;
    });
  };

  const handleSpotClick = () => {
    const canvas = canvasRef.current;
    let newDot = null;
    const randomRotation = Math.random() * Math.PI * 2;
    const randomColor = BROWN_PALETTE[Math.floor(Math.random() * BROWN_PALETTE.length)];

    if (dots.length === 0) {
      const weights = [6, 7, 8, 10, 10, 11, 12, 12, 12, 13, 14, 14, 15];
      const newTarget = weights[Math.floor(Math.random() * weights.length)];
      const newRadius = Math.floor(Math.random() * (25 - 15 + 1)) + 15;
      setTargetFragments(newTarget);
      setCurrentClusterRadius(newRadius);

      let attempts = 0;
      while (attempts < 150) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        if (isAreaOnMask(x, y) && !isOverlapping(x, y)) {
          newDot = { x, y, type: 0, rotation: randomRotation, size: SHAPE_SIZE, color: randomColor };
          break;
        }
        attempts++;
      }
    } else {
      const anchor = dots[0];
      const prevDot = dots[dots.length - 1];
      let attempts = 0;
      while (attempts < 80) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 4 + Math.random() * 6; 
        const x = Math.floor(prevDot.x + Math.cos(angle) * dist);
        const y = Math.floor(prevDot.y + Math.sin(angle) * dist);
        const distFromAnchor = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

        if (isAreaOnMask(x, y) && distFromAnchor < currentClusterRadius) {
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
    
    // Create an off-screen buffer for the clipped result
    const buffer = document.createElement('canvas');
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    const bctx = buffer.getContext('2d');

    // Draw silhouette to buffer
    bctx.drawImage(imgRef.current, 0, 0);

    // Clip spots to silhouette
    bctx.save();
    bctx.globalCompositeOperation = 'source-atop';
    fullSpots.forEach(spot => {
      spot.cluster.forEach(d => drawShape(bctx, d, false));
    });
    dots.forEach(dot => {
      drawShape(bctx, dot, true);
    });
    bctx.restore();

    // Final Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background first
    if (bgRef.current.complete && backgroundUrl) {
      const scale = Math.min(canvas.width / bgRef.current.width, canvas.height / bgRef.current.height);
      const x = (canvas.width / 2) - (bgRef.current.width / 2) * scale;
      const y = (canvas.height / 2) - (bgRef.current.height / 2) * scale;
      ctx.drawImage(bgRef.current, x, y, bgRef.current.width * scale, bgRef.current.height * scale);
    }

    // 2. Draw Giraffe + Spots layer on top
    ctx.drawImage(buffer, 0, 0);

  }, [dots, fullSpots, imageLoaded, backgroundUrl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <canvas ref={canvasRef} style={{ border: '1px solid #ccc', maxWidth: '100%', height: 'auto' }} />
      <button 
        onClick={handleSpotClick} 
        style={{ padding: '12px 24px', cursor: 'pointer', background: '#3d2616', color: '#fdf5e6', border: 'none', borderRadius: '30px', fontWeight: 'bold' }}
      >
        Add Fragment
      </button>
    </div>
  );
};

export default GiraffeAvatar;
