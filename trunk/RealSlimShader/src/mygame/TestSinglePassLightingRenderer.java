package mygame;

import com.jme3.system.AppSettings;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Tests the SinglePassLightingRenderer.
 * 
 * @author survivor
 */
public class TestSinglePassLightingRenderer extends SimpleTestApplication
{
  private static final int SPHERE_SEGMENTS = 32;
  private static final int NUM_LIGHTS = 4;
  
  public static void main(String[] args)
  {
    Logger.getLogger("").setLevel(Level.SEVERE);    
    SimpleTestApplication app = new TestSinglePassLightingRenderer();
    app.setSettings(new AppSettings(true));
    app.setShowSettings(false);
    app.start();
  }
  
  @Override
  protected void initializeTestParams() {
    sphereMaterial = new MaterialEx("Materials/Rock_SPLR.j3m", assetManager);
    sphereMaterial.setLightingRenderer(new SinglePassLightingRenderer());
    sphereSegments = SPHERE_SEGMENTS;
    numLights = NUM_LIGHTS;
  }
}
