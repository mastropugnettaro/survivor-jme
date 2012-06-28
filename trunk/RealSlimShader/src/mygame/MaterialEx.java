package mygame;

import com.jme3.asset.AssetManager;
import com.jme3.light.AmbientLight;
import com.jme3.light.DirectionalLight;
import com.jme3.light.Light;
import com.jme3.light.LightList;
import com.jme3.light.PointLight;
import com.jme3.light.SpotLight;
import com.jme3.material.MatParam;
import com.jme3.material.MatParamTexture;
import com.jme3.material.Material;
import com.jme3.material.MaterialDef;
import com.jme3.math.ColorRGBA;
import com.jme3.math.Vector3f;
import com.jme3.renderer.RenderManager;
import com.jme3.scene.Geometry;
import com.jme3.shader.Shader;
import com.jme3.shader.Uniform;
import com.jme3.shader.VarType;
import com.jme3.texture.Texture;
import java.util.ArrayList;

/**
 * MaterialEx is an extended Material class with improved single pass lighting 
 * support. It also allows the use of custom MaterialExLightingRenderers to 
 * completely control the material and lighting rendering.
 * 
 * @author survivor
 */
public class MaterialEx extends Material implements MaterialExLightingRenderer 
{
  protected ArrayList<Light> lightList = new ArrayList<Light>(4);
  protected MaterialExLightingRenderer lightingRenderer = this;
  
  public MaterialEx(MaterialDef def) {
    super(def);
  }

  public MaterialEx(AssetManager assetManager, String defName) {
    super(assetManager, defName);
  }

  public MaterialEx(Material mat) {
    super(mat.getMaterialDef());

    for (MatParam param : mat.getParams()) {
      if (param instanceof MatParamTexture) {
        this.setTextureParam(param.getName(), param.getVarType(), (Texture) param.getValue());
      } else {
        this.setParam(param.getName(), param.getVarType(), param.getValue());
      }
    }
  }

  public MaterialEx(String matName, AssetManager assetManager) {
    this(assetManager.loadMaterial(matName));
  }

  /**
   * Do not use this constructor. Serialization purposes only.
   */
  public MaterialEx() {
  }

  /**
   * Improved single pass lighting support. 
   * Obsoleted by SinglePassLightingRenderer.
   */
  @Override
  protected void updateLightListUniforms(Shader shader, Geometry g, int numLights) {
    if (numLights == 0) { // this shader does not do lighting, ignore.
      return;
    }

    LightList worldLightList = g.getWorldLightList();
    ColorRGBA ambLightColor = new ColorRGBA(0f, 0f, 0f, 1f);

    for (int i = 0; i < worldLightList.size(); i++) {
      Light light = worldLightList.get(i);
      if (light instanceof AmbientLight) {
        ambLightColor.addLocal(light.getColor());
      } else {
        lightList.add(light);
      }
    }

    numLights = lightList.size();
    //final int arraySize = Math.max(numLights, 4); // Intel GMA bug
    final int arraySize = numLights;
    this.getMaterialDef().addMaterialParam(VarType.Int, "NumLights", arraySize, null);
    this.setInt("NumLights", arraySize);

    Uniform lightColor = shader.getUniform("g_LightColor");
    Uniform lightPos = shader.getUniform("g_LightPosition");
    Uniform lightDir = shader.getUniform("g_LightDirection");

    lightColor.setVector4Length(numLights);
    lightPos.setVector4Length(numLights);
    lightDir.setVector4Length(numLights);

    Uniform ambientColor = shader.getUniform("g_AmbientLightColor");
    ambLightColor.a = 1.0f;
    ambientColor.setValue(VarType.Vector4, ambLightColor);

    for (int i = 0; i < numLights; i++) {
      Light l = lightList.get(i);
      ColorRGBA color = l.getColor();
      lightColor.setVector4InArray(color.getRed(),
        color.getGreen(),
        color.getBlue(),
        l.getType().getId(),
        i);

      switch (l.getType()) {
        case Directional:
          DirectionalLight dl = (DirectionalLight) l;
          Vector3f dir = dl.getDirection();
          lightPos.setVector4InArray(dir.getX(), dir.getY(), dir.getZ(), -1, i);
          lightDir.setVector4InArray(0f, 0f, 0f, 0f, i);
          break;
        case Point:
          PointLight pl = (PointLight) l;
          Vector3f pos = pl.getPosition();
          float invRadius = pl.getInvRadius();
          lightPos.setVector4InArray(pos.getX(), pos.getY(), pos.getZ(), invRadius, i);
          lightDir.setVector4InArray(0f, 0f, 0f, 0f, i);
          break;
        case Spot:
          SpotLight sl = (SpotLight) l;
          Vector3f pos2 = sl.getPosition();
          Vector3f dir2 = sl.getDirection();
          float invRange = sl.getInvSpotRange();
          float spotAngleCos = sl.getPackedAngleCos();

          lightPos.setVector4InArray(pos2.getX(), pos2.getY(), pos2.getZ(), invRange, i);
          lightDir.setVector4InArray(dir2.getX(), dir2.getY(), dir2.getZ(), spotAngleCos, i);
          break;
        default:
          throw new UnsupportedOperationException("Unknown type of light: " + l.getType());
      }
    }

    lightList.clear();
  }

  /**
   * Calls the current MaterialExLightingRenderer.
   */
  @Override
  protected void renderMultipassLighting(Shader shader, Geometry g, RenderManager rm) 
  {
    lightingRenderer.renderLighting(this, shader, g, rm);
  }
  
  public MaterialExLightingRenderer getLightingRenderer()
  {
    return this.lightingRenderer;
  }
  
  public void setLightingRenderer(MaterialExLightingRenderer lr, RenderManager rm)  
  {
    if (lr == null)
    {
      lr = this;
    }
    
    if (lr != this.lightingRenderer)
    {
      this.lightingRenderer.detach(this, rm);
      this.lightingRenderer = lr;
      this.lightingRenderer.attach(this, rm);
    }
  }

  public void attach(Material mat, RenderManager rm) {}

  public void detach(Material mat, RenderManager rm) {}
  
  /**
   * Default implemetation of MaterialExLightingRenderer calls 
   * Material.renderMultipassLighting().
   */
  public void renderLighting(Material mat, Shader shader, Geometry g, RenderManager rm) 
  {
    super.renderMultipassLighting(shader, g, rm);
  }
}
