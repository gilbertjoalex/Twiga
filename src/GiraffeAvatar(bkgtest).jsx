import React, { useRef, useEffect, useState, useMemo } from 'react';

const GiraffeAvatar = ({ maskUrl, bgUrl }) => {
  const canvasRef = useRef(null);
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState({ mask: false, bg: false });

  const maskImgRef = useRef(new Image());
  const bgImgRef = useRef(new Image());

  // Calculate centering offsets once images are loaded
  const offsets = useMemo(() => {
    if (!imagesLoaded.mask) return { x: 0, y: 0 };
    return {
      x: (400 - maskImgRef.current.width) / 2,
      y: (600 - maskImgRef.current.height) / 2
    };
  }, [imagesLoaded.mask]);

  useEffect(() => {
    maskImgRef.current.src = maskUrl;
    maskImgRef.current.crossOrigin = "Anonymous";
    maskImgRef.current.onload = () => setImagesLoaded(prev => ({ ...prev, mask: true }));

    bgImgRef.current.src = bgUrl;
    bgImgRef.current.crossOrigin = "Anonymous";
    bgImgRef.current.onload = () => setImagesLoaded(prev => ({ ...prev, bg: true }));
  }, [maskUrl, bgUrl]);

  const addShapePath = (ctx, type, x, y, size) => {
    ctx.beginPath();
    if (type === 0) ctx.arc(x, y, size, 0, Math.PI * 2);
    else if (type === 1) {
      const h = size * Math.sqrt(3);
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x - size, y + h / 2);
      ctx.lineTo(x + size, y + h / 2);
      ctx.closePath();
    } else if (type === 2) ctx.rect(x - size, y - size, size * 2, size * 2);
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
        const pixel = ctx.getImageData(x, y, 1, 1).data[3];
        
        // Ensure the random start point is actually on the giraffe mask
        if (pixel > 0) {
          newDot = { x, y, type: 0 };
          break;
        }
        attempts++;
      }
    } else {
      const prevDot = dots[dots.length - 1];
      let attempts = 0;
      while (attempts < 50) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 8; 
        const x = Math.floor(prevDot.x + Math.cos(angle) * dist);
        const y = Math.floor(prevDot.y + Math.sin(angle) * dist);
        
        const pixel = ctx.getImageData(x, y, 1, 1).data[3];
        if (pixel > 0) {
          newDot = { x, y, type: dots.length % 3 };
          break;
        }
        attempts++;
      }
    }

    if (newDot) {
      if (dots.length === 9) {
        setFullSpots([...fullSpots, { cluster: [...dots, newDot] }]);
        setDots([]);
      } else {
        setDots([...dots, newDot]);
      }
    }
  };

  useEffect(() => {
    if (!imagesLoaded.mask) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background (scaled to fill canvas)
    if (imagesLoaded.bg) {
      ctx.drawImage(bgImgRef.current, 0, 0, 400, 600);
    }

    // 2. Draw Giraffe Mask (centered)
    ctx.drawImage(maskImgRef.current, offsets.x, offsets.y);

    // 3. Draw Spots
    ctx.lineJoin = 'round';
    fullSpots.forEach(spot => {
      ctx.save();
      ctx.beginPath();
      spot.cluster.forEach(d => addShapePath(ctx, d.type, d.x, d.y, 7));
      ctx.fillStyle = '#3d2616';
      ctx.fill();
      ctx.strokeStyle = '#1a0f08';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });

    dots.forEach(dot => {
      addShapePath(ctx, dot.type, dot.x, dot.y, 7);
      ctx.fillStyle = 'rgba(61, 38, 22, 0.5)';
      ctx.fill();
    });
  }, [dots, fullSpots, imagesLoaded, offsets]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={400} height={600} className="border" />
      <button onClick={handleSpotClick} className="p-2 bg-amber-900 text-white rounded">
        Add Fragment
      </button>
    </div>
  );
};

export default GiraffeAvatar;
