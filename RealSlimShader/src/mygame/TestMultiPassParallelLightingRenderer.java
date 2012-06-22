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
    app.setSettings(new AppSettings(true));
    app.setShowSettings(false);
    app.start();
  }

  @Override
  protected void initializeTestParams() {
    sphereMaterial = new MaterialEx("Materials/Rock_MPPLR.j3m", assetManager);
    MultiPassParallelLightingRenderer mpplr = new MultiPassParallelLightingRenderer();
    
    /* PARAMETERS TO PLAY WITH */
    mpplr.setQuadsPerPass(1); // 1 is safe, > 1 yields more fps
    useAccumulationBuffer = false; // enable for better quality with many lights
    sphereSegments = 32; // increase for more vertex shader load
    numDirectionalLights = 2;
    numPointLights = 2;
    numSpotLights = 4;
    
    // uncomment for more fragment shader load
    // settings.setResolution(1152, 864); 
    // settings.setSamples(8);
    
    sphereMaterial.setLightingRenderer(mpplr);
  }
}
