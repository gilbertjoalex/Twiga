import React, { useRef, useEffect, useState } from 'react';

const GiraffeAvatar = ({ maskUrl }) => {
  const canvasRef = useRef(null);
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const SHAPE_SIZE = 7; 
  const CLUSTER_RADIUS = 18; 
  const MIN_DISTANCE_BETWEEN_SPOTS = 35;
  const imgRef = useRef(new Image());

  useEffect(() => {
    imgRef.current.src = maskUrl;
    imgRef.current.crossOrigin = "Anonymous";
    imgRef.current.onload = () => setImageLoaded(true);
  }, [maskUrl]);

  // Helper to add shape paths to the current context
  const addShapePath = (ctx, type, x, y, size) => {
    if (type === 0) { // Circle
      ctx.moveTo(x + size, y);
      ctx.arc(x, y, size, 0, Math.PI * 2);
    } else if (type === 1) { // Triangle
      const h = size * Math.sqrt(3);
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
          newDot = { x, y, type: 0 };
          break;
        }
        attempts++;
      }
    } else {
      const anchor = dots[0];
      const prevDot = dots[dots.length - 1];
      let attempts = 0;
      while (attempts < 50) {
        const angle = Math.random() * Math.PI * 2;
        // Distance slightly less than diameter to ensure overlap
        const dist = 5 + Math.random() * 8; 
        const x = Math.floor(prevDot.x + Math.cos(angle) * dist);
        const y = Math.floor(prevDot.y + Math.sin(angle) * dist);
        
        const pixel = ctx.getImageData(x, y, 1, 1).data[3];
        const distFromAnchor = Math.sqrt(Math.pow(x - anchor.x, 2) + Math.pow(y - anchor.y, 2));

        if (pixel > 0 && distFromAnchor < CLUSTER_RADIUS) {
          newDot = { x, y, type: dots.length % 3 };
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

    // Render Full Spots as merged polygons
    fullSpots.forEach(spot => {
      ctx.save();
      
      // 1. Create a single combined path for all shapes in the cluster
      ctx.beginPath();
      spot.cluster.forEach(d => {
        addShapePath(ctx, d.type, d.x, d.y, SHAPE_SIZE);
      });

      // 2. Fill the entire combined path (agglomerate)
      ctx.fillStyle = '#3d2616';
      ctx.fill();

      // 3. Draw a smooth thin outline around the entire combined shape
      // GlobalCompositeOperation 'source-over' ensures the stroke stays outside/on top
     // ctx.strokeStyle = '#1a0f08';
      //ctx.lineWidth = 0.5;
      //ctx.lineJoin = 'round'; // Smooths out the polygon corners
      //ctx.stroke();
      
      ctx.restore();
    });

    // Draw active cluster fragments (semi-transparent)
    dots.forEach(dot => {
      ctx.beginPath();
      addShapePath(ctx, dot.type, dot.x, dot.y, SHAPE_SIZE);
      ctx.fillStyle = 'rgba(61, 38, 22, 0.5)';
      ctx.fill();
    });
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
