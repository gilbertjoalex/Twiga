import GiraffeAvatar from './GiraffeAvatar';


function App() {
  return (
    <div className="App">
     
      <GiraffeAvatar 
        cursorImgUrl="/leafcursor.png"
        backgroundUrl="/background.jpg"
        maskUrl="/mask.png" 
      />
    </div>
  );
}

export default App;