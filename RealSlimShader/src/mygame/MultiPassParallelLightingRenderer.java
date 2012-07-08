package mygame;

import com.jme3.light.AmbientLight;
import com.jme3.light.DirectionalLight;
import com.jme3.light.Light;
import com.jme3.light.LightList;
import com.jme3.light.PointLight;
import com.jme3.light.SpotLight;
import com.jme3.material.MatParam;
import com.jme3.material.Material;
import com.jme3.material.RenderState;
import com.jme3.math.ColorRGBA;
import com.jme3.math.Vector3f;
import com.jme3.renderer.RenderManager;
import com.jme3.renderer.Renderer;
import com.jme3.scene.Geometry;
import com.jme3.shader.Shader;
import com.jme3.shader.Uniform;
import com.jme3.shader.VarType;
import com.jme3.texture.Image;
import com.jme3.texture.Texture;
import java.util.ArrayList;
//import org.lwjgl.opengl.GL11;

/**
 * This is a multi pass lighting renderer that renders quads of 4 lights in 
 * parallel. Multiple quads can be rendered per pass.
 * Please note the outcommented glAccum() calls (obsoleted by AccumulationBuffer).
 * 
 * @author survivor
 */
public class MultiPassParallelLightingRenderer implements MaterialExLightingRenderer
{
  private ColorRGBA ambLightColor = new ColorRGBA();
  private float[] lqw = new float[4];
  private float[] sqx = new float[4];
  private float[] sqy = new float[4];
  private float[] sqz = new float[4];
  private float[] sqw = new float[4];  
  
  protected static final RenderState additiveLight = new RenderState()
  {{
    setBlendMode(BlendMode.Additive);
    setDepthWrite(false);
  }};
  
  protected ArrayList<Light> lightList = new ArrayList<Light>(4);
  protected int quadsPerPass = 1;
  protected int parallaxMapSize = 256;
  protected int parallaxMapLod = 8;
  
  public int getQuadsPerPass()
  {
    return this.quadsPerPass;
  }
  
  public void setQuadsPerPass(int quadsPerPass)
  {
    this.quadsPerPass = Math.min(8, Math.max(1, quadsPerPass));
  }

  public void attach(Material mat, RenderManager rm) 
  {
    mat.selectTechnique("MultiPassParallelLighting", rm);
    mat.getMaterialDef().addMaterialParam(VarType.Int, "QuadsPerPass", quadsPerPass, null);
    mat.getMaterialDef().addMaterialParam(VarType.Boolean, "HasSpotLights", true, null);
    mat.getMaterialDef().addMaterialParam(VarType.Int, "ParallaxMapSize", parallaxMapSize, null);
    mat.getMaterialDef().addMaterialParam(VarType.Int, "ParallaxMapLod", parallaxMapLod, null);

    // initialize with safe values (working & good looking)
    // recompiling might take some frames
    mat.setInt("QuadsPerPass", quadsPerPass);
    mat.setBoolean("HasSpotLights", true);
    
    MatParam mp = mat.getParam("SteepParallax");
    if ((mp != null) && (mp.getVarType() == VarType.Boolean)) 
    {
      Boolean steep = (Boolean) mp.getValue();
      if ((steep != null) && steep.booleanValue())
      {
        // for Quadtree Displacement Mapping
        Texture parallaxMap = mat.getTextureParam("ParallaxMap").getTextureValue();
        MipMapGeneratorEx.generateMipMaps(parallaxMap.getImage(), MipMapGeneratorEx.maxScaler);
        //parallaxMap.setAnisotropicFilter(0);
        //parallaxMap.setMagFilter(Texture.MagFilter.Nearest);
        parallaxMap.setMinFilter(Texture.MinFilter.NearestNearestMipMap);
        parallaxMap.setMagFilter(Texture.MagFilter.Bilinear);
        //parallaxMap.setMinFilter(Texture.MinFilter.BilinearNearestMipMap);
        
        Image parallaxMapImage = parallaxMap.getImage();
        if (parallaxMapImage != null)
        {
          parallaxMapSize = parallaxMap.getImage().getWidth();
          parallaxMapLod = (int) (Math.log(parallaxMapSize) / Math.log(2.0));
        }
        
        mat.setInt("ParallaxMapSize", parallaxMapSize);
        mat.setInt("ParallaxMapLod", parallaxMapLod);
      }    
    }    
  }

  public void detach(Material mat, RenderManager rm) 
  {
    MatParam matParam;
    matParam = mat.getMaterialDef().getMaterialParam("QuadsPerPass");
    mat.getMaterialDef().getMaterialParams().remove(matParam);
    matParam = mat.getMaterialDef().getMaterialParam("HasSpotLights");
    mat.getMaterialDef().getMaterialParams().remove(matParam);    
    matParam = mat.getMaterialDef().getMaterialParam("ParallaxMapSize");
    mat.getMaterialDef().getMaterialParams().remove(matParam);    
    matParam = mat.getMaterialDef().getMaterialParam("ParallaxMapLod");
    mat.getMaterialDef().getMaterialParams().remove(matParam);    
    mat.selectTechnique("Default", rm);
  }
  
  public void renderLighting(Material mat, Shader shader, Geometry g, RenderManager rm) 
  {
    Renderer r = rm.getRenderer();
    LightList worldLightList = g.getWorldLightList();
    boolean hasSpotLights = false;
    ambLightColor.set(0f, 0f, 0f, 1f);
    
    for (int i = 0; i < worldLightList.size(); i++) {
      Light light = worldLightList.get(i);
      if (light instanceof AmbientLight) {
        ambLightColor.addLocal(light.getColor());
      } else {
        if (light instanceof SpotLight) {
          hasSpotLights = true;
        }        
        lightList.add(light);
      }
    }
    
    int numLights = lightList.size();
    int numQuads = 1 + (numLights - 1) / 4;
    int numPasses = 1 + (numQuads - 1) / quadsPerPass;
    int qpp = Math.min(quadsPerPass, numQuads);
    mat.setInt("QuadsPerPass", qpp);
    mat.setBoolean("HasSpotLights", hasSpotLights);    
    mat.setInt("ParallaxMapSize", parallaxMapSize);
    mat.setInt("ParallaxMapLod", parallaxMapLod);

    Uniform lightColor = shader.getUniform("g_LightColor");
    Uniform lightPos = shader.getUniform("g_LightPosition");
    Uniform lightDir = shader.getUniform("g_LightDirection");
    Uniform lightQuadW = shader.getUniform("g_LightQuadW");
    Uniform spotQuadX = shader.getUniform("g_SpotQuadX");
    Uniform spotQuadY = shader.getUniform("g_SpotQuadY");
    Uniform spotQuadZ = shader.getUniform("g_SpotQuadZ");
    Uniform spotQuadW = shader.getUniform("g_SpotQuadW");

    lightColor.setVector4Length(qpp * 4);
    lightPos.setVector4Length(qpp * 4);
    lightDir.setVector4Length(qpp * 4);
    lightQuadW.setVector4Length(qpp);
    spotQuadX.setVector4Length(qpp);
    spotQuadY.setVector4Length(qpp);
    spotQuadZ.setVector4Length(qpp);
    spotQuadW.setVector4Length(qpp);

    Uniform ambientColor = shader.getUniform("g_AmbientLightColor");
    ambLightColor.a = 1.0f;
    ambientColor.setValue(VarType.Vector4, ambLightColor);
    
//    GL11.glClearAccum(0f, 0f, 0f, 0f);
//    GL11.glClear(GL11.GL_ACCUM_BUFFER_BIT);

    for (int pass = 0; pass < numPasses; pass++)
    {
      if (pass == 0)
      {
        ambientColor.setValue(VarType.Vector4, ambLightColor);
      }
      else
      {
        ambientColor.setValue(VarType.Vector4, ColorRGBA.Black);
        r.applyRenderState(additiveLight);
      }
      
      hasSpotLights = false;
      
      for (int quad = 0; quad < qpp; quad++)
      {
        for (int i = 0; i < 4; i++) 
        {
          int qi = 4 * quad + i;
          int li = pass * qpp * 4 + qi;

          if (li < numLights)
          {
            Light l = lightList.get(li);
            ColorRGBA color = l.getColor();
            lightColor.setVector4InArray(
              color.getRed(),
              color.getGreen(),
              color.getBlue(),
              l.getType().getId(),
              qi);

            switch (l.getType()) {
              case Directional:
                DirectionalLight dl = (DirectionalLight) l;
                Vector3f dir = dl.getDirection();
                lightPos.setVector4InArray(dir.getX(), dir.getY(), dir.getZ(), -1, qi);
                lqw[i] = -1f;
                sqx[i] = 0f;
                sqy[i] = 0f;
                sqz[i] = 0f;
                sqw[i] = 100.2f;
                break;
              case Point:
                PointLight pl = (PointLight) l;
                Vector3f pos = pl.getPosition();
                float invRadius = pl.getInvRadius();
                lightPos.setVector4InArray(pos.getX(), pos.getY(), pos.getZ(), invRadius, qi);
                lqw[i] = invRadius;
                sqx[i] = 0f;
                sqy[i] = 0f;
                sqz[i] = 0f;
                sqw[i] = 100.2f;
                break;
              case Spot:
                // hasSpotLights = true;
                SpotLight sl = (SpotLight) l;
                Vector3f pos2 = sl.getPosition();
                Vector3f dir2 = sl.getDirection().negate();
                float invRange = sl.getInvSpotRange();
                float spotAngleCos = sl.getPackedAngleCos();
                lightPos.setVector4InArray(pos2.getX(), pos2.getY(), pos2.getZ(), invRange, qi);
                lqw[i] = invRange;
                sqx[i] = dir2.getX();
                sqy[i] = dir2.getY();
                sqz[i] = dir2.getZ();
                sqw[i] = spotAngleCos;
                break;
              default:
                throw new UnsupportedOperationException("Unknown type of light: " + l.getType());
            }
          }
          else
          {
            lightColor.setVector4InArray(0, 0, 0, 0, qi);
            lightPos.setVector4InArray(0, 1, 0, 0, qi);
            // lightDir.setVector4InArray(0, 0, 0, 100.2f, qi);
            lqw[i] = -1f;
            sqx[i] = 0f;
            sqy[i] = 0f;
            sqz[i] = 0f;
            sqw[i] = 100.2f;
          }
        }
        
        lightQuadW.setVector4InArray(lqw[0], lqw[1], lqw[2], lqw[3], quad);
        spotQuadX.setVector4InArray(sqx[0], sqx[1], sqx[2], sqx[3], quad);
        spotQuadY.setVector4InArray(sqy[0], sqy[1], sqy[2], sqy[3], quad);
        spotQuadZ.setVector4InArray(sqz[0], sqz[1], sqz[2], sqz[3], quad);
        spotQuadW.setVector4InArray(sqw[0], sqw[1], sqw[2], sqw[3], quad);
      }
      
      // mat.setBoolean("HasSpotLights", hasSpotLights);
      r.setShader(shader);
      r.renderMesh(g.getMesh(), g.getLodLevel(), 1);
//      GL11.glAccum(GL11.GL_ACCUM, 1f / ((float)numPasses));
    }
    
//    GL11.glAccum(GL11.GL_RETURN, 1f);
    lightList.clear();
  }  
}
