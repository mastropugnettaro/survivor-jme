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
  private static final int SPHERE_SEGMENTS = 32;
  private static final int NUM_LIGHTS = 8;
  
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
    sphereSegments = SPHERE_SEGMENTS;
    numLights = NUM_LIGHTS;
  }
}
