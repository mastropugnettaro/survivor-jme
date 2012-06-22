package mygame;

import com.jme3.system.AppSettings;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Tests the default multi pass Lighting shader as a reference.
 * 
 * @author survivor
 */
public class TestMultiPassLighting extends SimpleTestApplication
{
  public static void main(String[] args)
  {
    Logger.getLogger("").setLevel(Level.SEVERE);    
    SimpleTestApplication app = new TestMultiPassLighting();
    app.setSettings(new AppSettings(true));
    app.setShowSettings(false);
    app.start();
  }
  
  @Override
  protected void initializeTestParams() {
    sphereMaterial = new MaterialEx("Materials/Rock_MP.j3m", assetManager);
    
    /* PARAMETERS TO PLAY WITH */
    useAccumulationBuffer = false; // enable for better quality with many lights
    sphereSegments = 32;
    numDirectionalLights = 2;
    numPointLights = 2;
    numSpotLights = 4;

    // uncomment for more fragment shader load
    // settings.setResolution(1152, 864); 
    // settings.setSamples(8);    
  }
}
