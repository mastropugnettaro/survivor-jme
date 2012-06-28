package mygame;

import com.jme3.material.MatParam;
import com.jme3.shader.VarType;
import com.jme3.system.AppSettings;
import com.jme3.texture.Texture;
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
    // settings.setSamples(8);
  
    app.setSettings(settings);
    app.setShowSettings(false);
    app.start();
  }

  @Override
  protected void initializeTestParams() {
    sphereMaterial = new MaterialEx("Materials/Rock_MPPLR.j3m", assetManager);
    MultiPassParallelLightingRenderer mpplr = new MultiPassParallelLightingRenderer();

    MatParam mp = sphereMaterial.getParam("SteepParallax");
    Boolean steep = null;
    if ((mp != null) && (mp.getVarType() == VarType.Boolean)) 
      steep = (Boolean) mp.getValue();
    
    if ((steep != null) && steep.booleanValue())
    {
      // for Quadtree Displacement Mapping
      Texture hmap = sphereMaterial.getTextureParam("ParallaxMap").getTextureValue();
      MipMapGeneratorEx.generateMipMaps(hmap.getImage(), MipMapGeneratorEx.maxScaler);
      hmap.setAnisotropicFilter(0);
      hmap.setMagFilter(Texture.MagFilter.Nearest);
      hmap.setMinFilter(Texture.MinFilter.NearestNearestMipMap);
      //hmap.setMinFilter(Texture.MinFilter.BilinearNearestMipMap);
    }

    /* PARAMETERS TO PLAY WITH */
    mpplr.setQuadsPerPass(1); // 1 is safe, > 1 yields more fps
    flyCam.setEnabled(false); // true for better debugging
    rotatingLights = true; // false for better debugging
    useAccumulationBuffer = false; // enable for better quality with many lights
    sphereSegments = 32; // increase for more vertex shader load
    numDirectionalLights = 2;
    numPointLights = 2;
    numSpotLights = 4;
    
    sphereMaterial.setLightingRenderer(mpplr, renderManager);
  }
}
