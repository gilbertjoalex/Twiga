import React, { useRef, useEffect, useState } from 'react';

const GiraffeAvatar = ({ maskUrl }) => {
  const canvasRef = useRef(null);
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const SPOT_RADIUS = 25; // Minimum distance between spot centers
  const imgRef = useRef(new Image());

  useEffect(() => {
    imgRef.current.src = maskUrl;
    imgRef.current.crossOrigin = "Anonymous"; // Prevents CORS issues with getImageData
    imgRef.current.onload = () => setImageLoaded(true);
  }, [maskUrl]);

  // Helper to check if a point is too close to any existing spot
  const isOverlapping = (x, y) => {
    return fullSpots.some(spot => {
      const distance = Math.sqrt(Math.pow(x - spot.center.x, 2) + Math.pow(y - spot.center.y, 2));
      return distance < SPOT_RADIUS * 2; // Diameter check
    });
  };

  const handleSpotClick = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    let found = false;
    let newDot = null;
    let attempts = 0;

    while (!found && attempts < 100) {
      attempts++;
      const x = Math.floor(Math.random() * canvas.width);
      const y = Math.floor(Math.random() * canvas.height);
      
      // 1. Check if inside the giraffe mask (alpha channel > 0)
      const pixel = ctx.getImageData(x, y, 1, 1).data[3]; 
      
      // 2. Check if the coordinate overlaps with existing full spots
      if (pixel > 0 && !isOverlapping(x, y)) {
        newDot = { x, y };
        found = true;
      }
    }

    if (!newDot) {
      alert("No more room for spots!");
      return;
    }

    if (dots.length === 9) {
      // 10th dot completes the cluster
      const newFullSpot = { 
        center: dots[0], // Use first dot as anchor
        cluster: [...dots, newDot] 
      };
      setFullSpots([...fullSpots, newFullSpot]);
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

    // Draw Mask
    ctx.drawImage(imgRef.current, 0, 0);

    // Draw Completed Spots (with outlines)
    fullSpots.forEach(spot => {
      ctx.beginPath();
      spot.cluster.forEach(d => {
        ctx.moveTo(d.x, d.y);
        ctx.arc(d.x, d.y, 8, 0, Math.PI * 2);
      });
      ctx.fillStyle = '#3d2616';
      ctx.fill();
      
      // Add the outline requested
      ctx.strokeStyle = '#1a0f08';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw Current Accumulating Dots
    ctx.fillStyle = 'rgba(61, 38, 22, 0.6)';
    dots.forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [dots, fullSpots, imageLoaded]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={400} height={600} className="border border-gray-200" />
      <button 
        onClick={handleSpotClick}
        className="px-6 py-2 bg-yellow-600 text-white rounded-full hover:bg-yellow-700 transition"
      >
        Spot!
      </button>
    </div>
  );
};

export default GiraffeAvatar;
