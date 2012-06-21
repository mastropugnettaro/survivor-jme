package mygame;

import com.jme3.system.AppSettings;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Tests SinglePassLighting.
 * 
 * @author survivor
 */
public class TestSinglePassLighting extends SimpleTestApplication
{
  private static final int SPHERE_SEGMENTS = 32;
  private static final int NUM_LIGHTS = 4;
  
  public static void main(String[] args)
  {
    Logger.getLogger("").setLevel(Level.SEVERE);    
    SimpleTestApplication app = new TestSinglePassLighting();
    app.setSettings(new AppSettings(true));
    app.setShowSettings(false);
    app.start();
  }
  
  @Override
  protected void initializeTestParams() {
    sphereMaterial = new MaterialEx("Materials/Rock_SP.j3m", assetManager);
    
    /* PARAMETERS TO PLAY WITH */
    sphereSegments = 32;
    numDirectionalLights = 4;
    // numPointLights = 2; // FixMe: crash with point lights
    // numSpotLights = 2; // not yet supported
  }
}
