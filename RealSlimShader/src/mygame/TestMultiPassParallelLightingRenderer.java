package mygame;

import com.jme3.system.AppSettings;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Tests the MultiPassParallelLightingRenderer.
 * 
 * @author survivor
 */
public class TestMultiPassParallelLightingRenderer extends SimpleTestApplication
{
  private static final int SPHERE_SEGMENTS = 32;
  private static final int NUM_LIGHTS = 8;
  
  public static void main(String[] args)
  {
    Logger.getLogger("").setLevel(Level.SEVERE);    
    SimpleTestApplication app = new TestMultiPassParallelLightingRenderer();
    app.setSettings(new AppSettings(true));
    app.setShowSettings(false);
    app.start();
  }

  @Override
  protected void initializeTestParams() {
    sphereMaterial = new MaterialEx("Materials/Rock_MPPLR.j3m", assetManager);
    MultiPassParallelLightingRenderer mpplr = new MultiPassParallelLightingRenderer();
    mpplr.setQuadsPerPass(2);
    sphereMaterial.setLightingRenderer(mpplr);
    sphereSegments = SPHERE_SEGMENTS;
    numLights = NUM_LIGHTS;
  }
}
