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
    
    /* PARAMETERS TO PLAY WITH */
    sphereSegments = 32;
    numDirectionalLights = 2;
    numPointLights = 2;
    numSpotLights = 4;

    // uncomment for more fragment shader load
    // settings.setResolution(1152, 864); 
    // settings.setSamples(8);    
  }
}
