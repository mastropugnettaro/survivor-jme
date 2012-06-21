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
import com.jme3.material.Technique;
import com.jme3.material.TechniqueDef;
import com.jme3.math.ColorRGBA;
import com.jme3.math.Vector3f;
import com.jme3.renderer.RenderManager;
import com.jme3.renderer.Renderer;
import com.jme3.scene.Geometry;
import com.jme3.shader.Shader;
import com.jme3.shader.Uniform;
import com.jme3.shader.VarType;
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
  protected static final RenderState additiveLight = new RenderState()
  {{
    setBlendMode(BlendMode.Additive);
    setDepthWrite(false);
  }};
  
  protected ArrayList<Light> lightList = new ArrayList<Light>(4);
  protected int quadsPerPass = 1;
  
  public int getQuadsPerPass()
  {
    return this.quadsPerPass;
  }
  
  public void setQuadsPerPass(int quadsPerPass)
  {
    this.quadsPerPass = Math.min(8, Math.max(1, quadsPerPass));
  }

  public void attach(Material mat) {
    mat.getMaterialDef().addMaterialParam(VarType.Int, "QuadsPerPass", quadsPerPass, null);
    mat.getMaterialDef().addMaterialParam(VarType.Vector4Array, "g_LightQuadW", 0, null);
    mat.getMaterialDef().addMaterialParam(VarType.Boolean, "HasSpotLights", true, null);

    // initialize with safe values (working & good looking)
    // recompiling might take some frames
    mat.setInt("QuadsPerPass", quadsPerPass);
    mat.setBoolean("HasSpotLights", true);
  }

  public void detach(Material mat) {
    MatParam matParam;
    matParam = mat.getMaterialDef().getMaterialParam("QuadsPerPass");
    mat.getMaterialDef().getMaterialParams().remove(matParam);
    matParam = mat.getMaterialDef().getMaterialParam("g_LightQuadW");
    mat.getMaterialDef().getMaterialParams().remove(matParam);
    matParam = mat.getMaterialDef().getMaterialParam("HasSpotLights");
    mat.getMaterialDef().getMaterialParams().remove(matParam);
  }

  public void renderLighting(Material mat, Shader shader, Geometry g, RenderManager rm) 
  {
    Renderer r = rm.getRenderer();
    LightList worldLightList = g.getWorldLightList();
    ColorRGBA ambLightColor = new ColorRGBA(0f, 0f, 0f, 1f);
    float[] lqw = new float[4];
    boolean hasSpotLights = false;
    
    Technique technique = mat.getActiveTechnique();
    if (technique != null) 
    {
      technique.makeCurrent(mat.getMaterialDef().getAssetManager());
    }

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

    Uniform lightColor = shader.getUniform("g_LightColor");
    Uniform lightPos = shader.getUniform("g_LightPosition");
    Uniform lightDir = shader.getUniform("g_LightDirection");
    Uniform lightQuadW = shader.getUniform("g_LightQuadW");

    lightColor.setVector4Length(qpp * 4);
    lightPos.setVector4Length(qpp * 4);
    lightDir.setVector4Length(qpp * 4);
    lightQuadW.setVector4Length(qpp);

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
                lqw[i] = -1f;
                lightPos.setVector4InArray(dir.getX(), dir.getY(), dir.getZ(), -1, qi);
                lightDir.setVector4InArray(0f, 0f, 0f, 100.2f, qi);
                break;
              case Point:
                PointLight pl = (PointLight) l;
                Vector3f pos = pl.getPosition();
                float invRadius = pl.getInvRadius();
                lqw[i] = invRadius;
                lightPos.setVector4InArray(pos.getX(), pos.getY(), pos.getZ(), invRadius, qi);
                lightDir.setVector4InArray(0f, 0f, 0f, 100.2f, qi);
                break;
              case Spot:
                SpotLight sl = (SpotLight) l;
                Vector3f pos2 = sl.getPosition();
                Vector3f dir2 = sl.getDirection();
                float invRange = sl.getInvSpotRange();
                float spotAngleCos = sl.getPackedAngleCos();
                lqw[i] = invRange;
                lightPos.setVector4InArray(pos2.getX(), pos2.getY(), pos2.getZ(), invRange, qi);
                lightDir.setVector4InArray(dir2.getX(), dir2.getY(), dir2.getZ(), spotAngleCos, qi);
                //hasSpotLights = true;
                break;
              default:
                throw new UnsupportedOperationException("Unknown type of light: " + l.getType());
            }
          }
          else
          {
            lightColor.setVector4InArray(0, 0, 0, 0, qi);
            lightPos.setVector4InArray(0, 1, 0, 0, qi);
            lightDir.setVector4InArray(0, 0, 0, 0, qi);
            lqw[i] = -1f;
          }
        }
        
        lightQuadW.setVector4InArray(lqw[0], lqw[1], lqw[2], lqw[3], quad);
      }
      
      //mat.setBoolean("HasSpotLights", hasSpotLights);
      r.setShader(shader);
      r.renderMesh(g.getMesh(), g.getLodLevel(), 1);
//      GL11.glAccum(GL11.GL_ACCUM, 1f / ((float)numPasses));
    }
    
//    GL11.glAccum(GL11.GL_RETURN, 1f);
    lightList.clear();
  }  
}
