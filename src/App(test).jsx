import GiraffeAvatar from './GiraffeAvatar';
import giraffeMask from './assets/giraffe-mask.png';
import savannahBg from './assets/savannah-background.png'

// Use the component and "pass" the images into the props
function App() {
  return (
    <GiraffeAvatar 
      maskUrl={giraffeMask} 
      bgUrl={savannahBg} 
    />
  );
}
export default App;

