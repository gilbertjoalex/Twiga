import React, { useRef, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Girafforum from './Girafforum';

/**
 * NEW COMPONENT: Girafforum
 * Replicates the background and adds the centered heading and top-left link back home.
 */


const GiraffeAvatar = ({ zoomMaskUrl, maskUrl, backgroundUrl, cursorImgUrl }) => {
  const canvasRef = useRef(null);
  const zoomMaskCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const [dots, setDots] = useState([]);
  const [fullSpots, setFullSpots] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [targetFragments, setTargetFragments] = useState(10);
  const [currentClusterRadius, setCurrentClusterRadius] = useState(18);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  const SHAPE_SIZE = 10.5;
  const MIN_DISTANCE_BETWEEN_SPOTS = 40.75;
  const BROWN_PALETTE = ['#3d2616', '#4a3221', '#523a28', '#382907'];
  const imgRef = useRef(new Image());
  const bgRef = useRef(new Image());
  const zoomMaskImgRef = useRef(new Image());

  useEffect(() => {
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const createMaskCanvas = (img) => {
    const mCanvas = document.createElement('canvas');
    mCanvas.width = canvasRef.current.width;
    mCanvas.height = canvasRef.current.height;
    const ctx = mCanvas.getContext('2d');
    const scale = Math.max(mCanvas.width / img.naturalWidth, mCanvas.height / img.naturalHeight);
    const x = (mCanvas.width / 2) - (img.naturalWidth / 2) * scale;
    const y = (mCanvas.height / 2) - (img.naturalHeight / 2) * scale;
    ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
    return mCanvas;
  };

  useEffect(() => {
    let loadedCount = 0;
    const totalToLoad = backgroundUrl ? 3 : 2;
    const onResourceLoad = () => {
      loadedCount++;
      if (loadedCount >= totalToLoad) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        maskCanvasRef.current = createMaskCanvas(imgRef.current);
        zoomMaskCanvasRef.current = createMaskCanvas(zoomMaskImgRef.current);
        setImageLoaded(true);
      }
    };
    imgRef.current.src = maskUrl;
    imgRef.current.crossOrigin = "Anonymous";
    imgRef.current.onload = onResourceLoad;
    zoomMaskImgRef.current.src = zoomMaskUrl;
    zoomMaskImgRef.current.crossOrigin = "Anonymous";
    zoomMaskImgRef.current.onload = onResourceLoad;
    if (backgroundUrl) {
      bgRef.current.src = backgroundUrl;
      bgRef.current.crossOrigin = "Anonymous";
      bgRef.current.onload = onResourceLoad;
    }
    const handleResize = () => onResourceLoad();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maskUrl, zoomMaskUrl, backgroundUrl]);

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
    return maskCanvasRef.current.getContext('2d').getImageData(x, y, 1, 1).data[3] > 0;
  };

  const isAreaOnZoomMask = (x, y) => {
    if (!zoomMaskCanvasRef.current) return false;
    const ctx = zoomMaskCanvasRef.current.getContext('2d');
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    return pixelData[3] > 0;
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

  const handleBackgroundClick = (e) => {
    if (e.target.tagName !== 'CANVAS') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (isAreaOnZoomMask(x, y)) {
      if (isZoomed) setIsZoomed(false);
      else {
        setZoomPos({ x: e.clientX, y: e.clientY });
        setIsZoomed(true);
      }
    }
  };

  useEffect(() => {
    if (!imageLoaded || !maskCanvasRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(canvas.width / bgRef.current.width, canvas.height / bgRef.current.height);
    const x = (canvas.width / 2) - (bgRef.current.width / 2) * scale;
    const y = (canvas.height / 2) - (bgRef.current.height / 2) * scale;
    ctx.drawImage(bgRef.current, x, y, bgRef.current.width * scale, bgRef.current.height * scale);
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

  const btnStyle = (bg) => ({
    padding: '14px 22px', cursor: 'pointer', background: bg, color: 'white',
    border: 'none', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
  });

  return (
    <div onClick={handleBackgroundClick} style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', cursor: cursorImgUrl ? 'none' : 'auto' }}>
      {cursorImgUrl && (
        <img src={cursorImgUrl} alt="cursor" style={{ position: 'fixed', left: mousePos.x, top: mousePos.y, width: '46px', pointerEvents: 'none', zIndex: 9999, transform: 'translate(-50%, -50%)' }} />
      )}
      <div style={{ width: '150%', height: '70%', transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)', transformOrigin: `${zoomPos.x}px ${zoomPos.y}px`, transform: isZoomed ? 'scale(1.2)' : 'scale(1)' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
        {isZoomed && (
          <div style={{
            position: 'absolute', top: zoomPos.y, left: zoomPos.x, transform: 'scale(0.6) translate(-90%, -90%)', 
            pointerEvents: 'auto', display: 'flex', gap: '275px', padding: '130px', borderRadius: '250px', zIndex: 9999
          }}>
            <button 
  onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
  style={{
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '40px',
    height: '40px',
    background: 'red',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    zIndex: 10000,
    display: 'flex',           // Added
    justifyContent: 'center',  // Added
    alignItems: 'center'       // Added
  }}
>
  <div style={{ position: 'relative', width: '25px', height: '25px' }}>
    <div style={{ position: 'absolute', width: '25px', height: '3px', background: 'white', top: '11px', left: '0px', transform: 'rotate(45deg)' }} />
    <div style={{ position: 'absolute', width: '25px', height: '3px', background: 'white', top: '11px', left: '0px', transform: 'rotate(-45deg)' }} />
  </div>
</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#3d2616' }}>
              <a href="/about" style={{ display: 'block', margin: 0 }}><img src="/title4.png" alt="About" style={{ width: '315px', height: 'auto' }} /></a>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Profile</div>
              <div style={{ marginTop: '40px', background: 'rgba(255,255,255,0.85)', borderRadius: '12px', color: '#552f1a', textAlign: 'center', pointerEvents: 'none'}}>
                <div style={{ fontSize: '1.1rem' }}>Spots: {fullSpots.length}</div>
                <div style={{ fontSize: '0.8rem' }}>Total Dots: {fullSpots.reduce((acc, s) => acc + s.cluster.length, 0) + dots.length}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '50px', justifyContent: 'center', paddingBottom:'15px' }}>
              {/* "Listen" Word Hyperlink [cite: 99] */}
              <Link to="/girafforum" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize:'1.8rem', padding: '15px 25px', borderRadius: '8px', cursor: 'pointer' }}>Listen</div>
              </Link>
              <div style={{ fontSize:'1.8rem', padding: '15px 25px', borderRadius: '8px', cursor: 'pointer' }}>Speak</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: '30px', right: '30px', display: 'flex', gap: '12px', zIndex: 10 }}>
        <button onClick={(e) => { e.stopPropagation(); handleSpotClick(); }} style={btnStyle('#3d2616')}>Spot</button>
        <button onClick={(e) => { e.stopPropagation(); handleResetDistribution(); }} style={btnStyle('#5c3d2e')}>Reset Distribution</button>
        <button onClick={(e) => { e.stopPropagation(); setFullSpots([]); setDots([]); }} style={btnStyle('#8b0000')}>Clear All</button>
      </div>
    </div>
  );
};

// Main Routing Logic [cite: 101]
const AppWrapper = (props) => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<GiraffeAvatar {...props} />} />
      <Route path="/girafforum" element={<Girafforum backgroundUrl={props.backgroundUrl} />} />
      {/* ADD THIS LINE to fix the "No routes matched" error */}
      <Route path="/about" element={<GiraffeAvatar {...props} />} /> 
    </Routes>
  </BrowserRouter>
);

export default AppWrapper;