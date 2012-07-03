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
  public static void main(String[] args)
  {
    Logger.getLogger("").setLevel(Level.SEVERE);    
    SimpleTestApplication app = new TestMultiPassParallelLightingRenderer();    
    AppSettings settings = new AppSettings(true);
    
    // uncomment for more fragment shader load
    // settings.setResolution(1152, 864); 
    // settings.setSamples(16);
  
    app.setSettings(settings);
    app.setShowSettings(false);
    app.start();
  }

  @Override
  protected void initializeTestParams() {
    sphereMaterial = new MaterialEx("Materials/Rock_MPPLR.j3m", assetManager);
    MultiPassParallelLightingRenderer mpplr = new MultiPassParallelLightingRenderer();

    /* PARAMETERS TO PLAY WITH */
    mpplr.setQuadsPerPass(1); // 1 is safe, > 1 yields more fps
    flyCam.setEnabled(true); // true for better debugging
    rotatingLights = true; // false for better debugging
    useAccumulationBuffer = false; // enable for better quality with many lights
    sphereSegments = 32; // increase for more vertex shader load
    numDirectionalLights = 4;
    numPointLights = 0;
    numSpotLights = 0;
    
    sphereMaterial.setLightingRenderer(mpplr, renderManager);
  }
}
