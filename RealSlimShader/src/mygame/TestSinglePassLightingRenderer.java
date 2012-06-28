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
    AppSettings settings = new AppSettings(true);
    
    // uncomment for more fragment shader load
    // settings.setResolution(1152, 864); 
    // settings.setSamples(8);
  
    app.setSettings(settings);
    app.setShowSettings(false);
    app.start();
  }
  
  @Override
  protected void initializeTestParams() {
    sphereMaterial = new MaterialEx("Materials/Rock_SPLR.j3m", assetManager);
    sphereMaterial.setLightingRenderer(new SinglePassLightingRenderer(), renderManager);
    
    /* PARAMETERS TO PLAY WITH */
    flyCam.setEnabled(false); // true for better debugging
    rotatingLights = true; // false for better debugging
    useAccumulationBuffer = false; // enable for better quality with many lights
    sphereSegments = 32; // increase for more vertex shader load
    numDirectionalLights = 2;
    numPointLights = 2;
    numSpotLights = 4;
  }
}