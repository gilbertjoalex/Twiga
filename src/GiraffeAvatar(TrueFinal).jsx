import React, { useRef, useEffect, useState } from 'react';

const GiraffeAvatar = ({ maskUrl, backgroundUrl }) => {
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [targetFragments, setTargetFragments] = useState(10);
  const [currentClusterRadius, setCurrentClusterRadius] = useState(18);

  const SHAPE_SIZE = 10.5; 
  const MIN_DISTANCE_BETWEEN_SPOTS = 40.75;
  const BROWN_PALETTE = ['#3d2616', '#4a3221', '#523a28', '#382907'];
  
  const imgRef = useRef(new Image());
  const bgRef = useRef(new Image());

  useEffect(() => {
    let loadedCount = 0;
    const onResourceLoad = () => {
      loadedCount++;
      const totalToLoad = backgroundUrl ? 2 : 1;
      
      if (loadedCount >= totalToLoad) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Shared scaling logic (Cover mode)
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const mctx = maskCanvas.getContext('2d');
        
        const scale = Math.max(canvas.width / imgRef.current.naturalWidth, canvas.height / imgRef.current.naturalHeight);
        const x = (canvas.width / 2) - (imgRef.current.naturalWidth / 2) * scale;
        const y = (canvas.height / 2) - (imgRef.current.naturalHeight / 2) * scale;
        
        mctx.drawImage(imgRef.current, x, y, imgRef.current.naturalWidth * scale, imgRef.current.naturalHeight * scale);
        maskCanvasRef.current = maskCanvas;
        setImageLoaded(true);
      }
    };

    imgRef.current.src = maskUrl;
    imgRef.current.crossOrigin = "Anonymous";
    imgRef.current.onload = onResourceLoad;

    if (backgroundUrl) {
      bgRef.current.src = backgroundUrl;
      bgRef.current.crossOrigin = "Anonymous";
      bgRef.current.onload = onResourceLoad;
    }

    const handleResize = () => onResourceLoad();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const isAreaOnMask = (x, y) => {
    if (!maskCanvasRef.current) return false;
    const mctx = maskCanvasRef.current.getContext('2d');
    const pixel = mctx.getImageData(x, y, 1, 1).data[3];
    return pixel > 0;
  };

  const generateNewDot = (currentFullSpots, currentDots) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const randomRotation = Math.random() * Math.PI * 2;
    const randomColor = BROWN_PALETTE[Math.floor(Math.random() * BROWN_PALETTE.length)];
    const checkOverlap = (nx, ny, spots) => spots.some(s => 
      Math.sqrt(Math.pow(nx - s.center.x, 2) + Math.pow(ny - s.center.y, 2)) < MIN_DISTANCE_BETWEEN_SPOTS
    );

    if (currentDots.length === 0) {
      for (let i = 0; i < 200; i++) {
        const rx = Math.floor(Math.random() * canvas.width);
        const ry = Math.floor(Math.random() * canvas.height);
        if (isAreaOnMask(rx, ry) && !checkOverlap(rx, ry, currentFullSpots)) {
          return { x: rx, y: ry, type: 0, rotation: randomRotation, size: SHAPE_SIZE, color: randomColor };
        }
      }
    } else {
      const anchor = currentDots[0];
      const prevDot = currentDots[currentDots.length - 1];
      for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 4 + Math.random() * 6; 
        const nx = Math.floor(prevDot.x + Math.cos(angle) * dist);
        const ny = Math.floor(prevDot.y + Math.sin(angle) * dist);
        const distFromAnchor = Math.sqrt(Math.pow(nx - anchor.x, 2) + Math.pow(ny - anchor.y, 2));
        if (isAreaOnMask(nx, ny) && distFromAnchor < currentClusterRadius) {
          return { x: nx, y: ny, type: currentDots.length % 2, rotation: randomRotation, size: SHAPE_SIZE, color: randomColor };
        }
      }
    }
    return null;
  };

  const handleSpotClick = () => {
    if (!imageLoaded) return;
    if (dots.length === 0) {
      const weights = [5, 5, 5, 6, 8, 8, 9, 10, 10, 11, 12, 12, 12, 13, 13, 15];
      setTargetFragments(weights[Math.floor(Math.random() * weights.length)]);
      setCurrentClusterRadius(Math.floor(Math.random() * 7) + 25);
    }
    const newDot = generateNewDot(fullSpots, dots);
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

  const handleResetDistribution = () => {
    let newFullSpots = [];
    fullSpots.forEach(oldSpot => {
      let tempDots = [];
      const count = oldSpot.cluster.length;
      let first = generateNewDot(newFullSpots, []);
      if (first) {
        tempDots.push(first);
        for (let i = 1; i < count; i++) {
          let next = generateNewDot(newFullSpots, tempDots);
          if (next) tempDots.push(next);
        }
        newFullSpots.push({ center: tempDots[0], cluster: tempDots });
      }
    });
    setFullSpots(newFullSpots);
  };

  useEffect(() => {
    if (!imageLoaded || !maskCanvasRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background (Cover logic)
    const scale = Math.max(canvas.width / bgRef.current.width, canvas.height / bgRef.current.height);
    const x = (canvas.width / 2) - (bgRef.current.width / 2) * scale;
    const y = (canvas.height / 2) - (bgRef.current.height / 2) * scale;
    ctx.drawImage(bgRef.current, x, y, bgRef.current.width * scale, bgRef.current.height * scale);

    // 2. Render Clipped Mask + Dots using Buffer
    const buffer = document.createElement('canvas');
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    const bctx = buffer.getContext('2d');
    
    bctx.drawImage(maskCanvasRef.current, 0, 0);
    bctx.save();
    bctx.globalCompositeOperation = 'source-atop';
    fullSpots.forEach(s => s.cluster.forEach(d => drawShape(bctx, d, false)));
    dots.forEach(d => drawShape(bctx, d, true));
    bctx.restore();

    ctx.drawImage(buffer, 0, 0);
  }, [dots, fullSpots, imageLoaded]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      <div style={{ 
        position: 'absolute', top: '20px', right: '20px', 
        background: 'rgba(255,255,255,0.85)', padding: '15px', 
        borderRadius: '12px', color: '#3d2616', textAlign: 'right', pointerEvents: 'none'
      }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Spots: {fullSpots.length}</div>
        <div style={{ fontSize: '0.9rem' }}>Total Dots: {fullSpots.reduce((acc, s) => acc + s.cluster.length, 0) + dots.length}</div>
      </div>

      <div style={{ position: 'absolute', bottom: '30px', right: '30px', display: 'flex', gap: '12px' }}>
        <button onClick={handleSpotClick} style={btnStyle('#3d2616')}>Spot</button>
        <button onClick={handleResetDistribution} style={btnStyle('#5c3d2e')}>Reset Distribution</button>
        <button onClick={() => {setFullSpots([]); setDots([]);}} style={btnStyle('#8b0000')}>Clear All</button>
      </div>
    </div>
  );
};

const btnStyle = (bg) => ({
  padding: '14px 22px',
  cursor: 'pointer',
  background: bg,
  color: 'white',
  border: 'none',
  borderRadius: '50px',
  fontWeight: 'bold',
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
});

export default GiraffeAvatar;
