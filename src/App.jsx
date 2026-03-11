import React from 'react';
import GiraffeAvatarApp from './GiraffeAvatar'; // Your Master Copy file

function App() {
  const avatarConfig = {
    zoomMaskUrl: "/maskmouth.png",  
    maskUrl: "/mask.png",          
    backgroundUrl: "/bg.jpg",      
    cursorImgUrl: "/cursor.png"     
  };

  return (
    <div className="App">
      {/* This passes the backgroundUrl down so the new page can replicate it [cite: 52, 101] */}
      <GiraffeAvatarApp {...avatarConfig} />
    </div>
  );
}

export default App;