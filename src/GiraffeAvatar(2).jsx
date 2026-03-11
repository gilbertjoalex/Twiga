import React, { useRef, useEffect, useState } from 'react';

const GiraffeAvatar = ({ maskUrl }) => {
  const canvasRef = useRef(null);
  const [dots, setDots] = useState([]); // Currently forming cluster
  const [fullSpots, setFullSpots] = useState([]); // Completed clusters
  const [imageLoaded, setImageLoaded] = useState(false);

  const SHAPE_SIZE = 8; // Smaller size as requested
  const CLUSTER_RADIUS = 20; 
  const MIN_DISTANCE_BETWEEN_SPOTS = 60;
  const imgRef = useRef(new Image());

  useEffect(() => {
    imgRef.current.src = maskUrl;
    imgRef.current.crossOrigin = "Anonymous";
    imgRef.current.onload = () => setImageLoaded(true);
  }, [maskUrl]);

  // Helper to draw specific shapes
  const drawShape = (ctx, type, x, y, size) => {
    ctx.beginPath();
    if (type === 0) { // Circle
      ctx.arc(x, y, size, 0, Math.PI * 2);
    } else if (type === 1) { // Triangle
      const h = size * (Math.sqrt(3));
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x - size, y + h / 2);
      ctx.lineTo(x + size, y + h / 2);
      ctx.closePath();
    } else if (type === 2) { // Square
      ctx.rect(x - size, y - size, size * 2, size * 2);
    }
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
        const pixel = ctx.getImageData(x, y, 1, 1).data[3];
        if (pixel > 0 && !isOverlapping(x, y)) {
          newDot = { x, y, type: 0 }; // First dot is always circle (index 0)
          break;
        }
        attempts++;
      }
    } else {
      const anchor = dots[0];
      const prevDot = dots[dots.length - 1];
      let attempts = 0;
      
      while (attempts < 50) {
        // Calculate position slightly overlapping the PREVIOUS dot
        // Distance is small (SHAPE_SIZE * 0.8) to ensure overlap
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (SHAPE_SIZE * 1.5); 
        const x = Math.floor(prevDot.x + Math.cos(angle) * dist);
        const y = Math.floor(prevDot.y + Math.sin(angle) * dist);
        
        const pixel = ctx.getImageData(x, y, 1, 1).data[3];
        // Ensure it stays within general cluster radius of anchor
        const distFromAnchor = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

        if (pixel > 0 && distFromAnchor < CLUSTER_RADIUS) {
          newDot = { x, y, type: dots.length % 3 }; // Cycle: 0, 1, 2
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

    // Draw Completed Spots with smooth outline
    fullSpots.forEach(spot => {
      ctx.save();
      ctx.fillStyle = '#3d2616';
      ctx.strokeStyle = '#1a0f08';
      ctx.lineWidth = 1;

      // Draw all shapes in cluster to fill
      spot.cluster.forEach(d => drawShape(ctx, d.type, d.x, d.y, SHAPE_SIZE));
      ctx.fill();
      
      // Draw all shapes again to create the combined outline
      spot.cluster.forEach(d => drawShape(ctx, d.type, d.x, d.y, SHAPE_SIZE));
      ctx.stroke();
      ctx.restore();
    });

    // Draw Current Progressing Dots
    dots.forEach(dot => {
      ctx.fillStyle = 'rgba(61, 38, 22, 0.6)';
      drawShape(ctx, dot.type, dot.x, dot.y, SHAPE_SIZE);
      ctx.fill();
    });
  }, [dots, fullSpots, imageLoaded]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={400} height={600} className="border border-gray-200" />
      <button onClick={handleSpotClick} className="px-6 py-2 bg-amber-800 text-white rounded">
        Grow Spot ({dots.length}/10)
      </button>
    </div>
  );
};

export default GiraffeAvatar;
