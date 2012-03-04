package mygame;

import com.jme3.app.SimpleApplication;
import com.jme3.export.binary.BinaryExporter;
import com.jme3.export.binary.BinaryImporter;
import com.jme3.light.AmbientLight;
import com.jme3.light.DirectionalLight;
import com.jme3.light.PointLight;
import com.jme3.material.Material;
import com.jme3.math.ColorRGBA;
import com.jme3.math.FastMath;
import com.jme3.math.Vector3f;
import com.jme3.scene.Geometry;
import com.jme3.scene.Node;
import com.jme3.scene.debug.Arrow;
import com.jme3.scene.shape.Sphere;
import com.jme3.scene.shape.Sphere.TextureMode;
import com.jme3.system.AppSettings;
import com.jme3.util.TangentBinormalGenerator;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.lwjgl.opengl.GL11;
import org.lwjgl.opengl.GL20;

public class TestSinglePassLighting extends SimpleApplication
{
  private static final Logger log = Logger.getLogger(TestSinglePassLighting.class.getName());
  private static final int SPHERE_SEGMENTS = 32;
  private static final int NUM_LIGHTS = 4;
  
  private ArrayList<DirectionalLight> lightList = new ArrayList<DirectionalLight>();
  private float angle;
  
  public static void main(String[] args)
  {
    Logger.getLogger("").setLevel(Level.SEVERE);    
    TestSinglePassLighting app = new TestSinglePassLighting();
    app.setSettings(new AppSettings(true));
//    app.settings.setResolution(1152, 864);
//    app.settings.setSamples(16);
    app.setShowSettings(false);
    app.start();
  }

  @Override
  public void setSettings(AppSettings settings)
  { 
    settings.setTitle("TestSinglePassLighting");
    //settings.setRenderer(AppSettings.LWJGL_OPENGL1);
    super.setSettings(settings);
  }  
  
  @Override
  public void simpleInitApp()
  {
    this.setPauseOnLostFocus(false);
    //setDisplayStatView(false);
    flyCam.setEnabled(false);
    flyCam.setMoveSpeed(3);
    viewPort.setBackgroundColor(ColorRGBA.DarkGray);

    log.log(Level.SEVERE, "\n" +
      "GL_MAX_LIGHTS: " + GL11.glGetInteger(GL11.GL_MAX_LIGHTS) + "\n" +
      "GL_MAX_TEXTURE_COORDS: " + GL11.glGetInteger(GL20.GL_MAX_TEXTURE_COORDS) + "\n" +
      "GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS: " + GL11.glGetInteger(GL20.GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS) + "\n" +
      "GL_MAX_VERTEX_ATTRIBS: " + GL11.glGetInteger(GL20.GL_MAX_VERTEX_ATTRIBS) + "\n" +
      "GL_MAX_VERTEX_UNIFORM_COMPONENTS: " + GL11.glGetInteger(GL20.GL_MAX_VERTEX_UNIFORM_COMPONENTS) + "\n" +
      "GL_MAX_VARYING_FLOATS: " + GL11.glGetInteger(GL20.GL_MAX_VARYING_FLOATS) + "\n" + 
      "GL_MAX_FRAGMENT_UNIFORM_COMPONENTS: " + GL11.glGetInteger(GL20.GL_MAX_FRAGMENT_UNIFORM_COMPONENTS) + "\n" +
      "");
    
    log.log(Level.SEVERE, "*** SPHERE_SEGMENTS: {0}, NUM_LIGHTS: {1} ***",
      new Object[] { SPHERE_SEGMENTS, NUM_LIGHTS });
    
    Sphere sphereMesh = null;
    if (SPHERE_SEGMENTS > 128)
    {
      sphereMesh = loadSphereMesh();
    }
    
    if (sphereMesh == null)
    {
      log.log(Level.SEVERE, "Generating SphereMesh. This may take some time.");
      sphereMesh = new Sphere(SPHERE_SEGMENTS, SPHERE_SEGMENTS, 0.5f);
      sphereMesh.setTextureMode(TextureMode.Projected);
      TangentBinormalGenerator.generate(sphereMesh);
      
      if (SPHERE_SEGMENTS > 128)
      {
        saveSphereMesh(sphereMesh);
      }
    }
    
    Geometry sphere = new Geometry("Sphere", sphereMesh);
    sphere.rotate(FastMath.HALF_PI, 0f, 0f);
    Material sphereMat = new MaterialSP("Materials/Rock.j3m", assetManager);    
    //sphereMat.getTextureParam("DiffuseMap").getTextureValue().setMinFilter(MinFilter.NearestLinearMipMap);
    //sphereMat.getTextureParam("DiffuseMap").getTextureValue().setMagFilter(MagFilter.Nearest);
    //sphereMat.getTextureParam("DiffuseMap").getTextureValue().setAnisotropicFilter(16);
    sphere.setMaterial(sphereMat);
    

    Node node = new Node();
    node.setLocalTranslation(1f, 1f, 1f);
    node.attachChild(sphere);
    rootNode.attachChild(node);

    cam.setLocation(new Vector3f(0.3f, 2f, 0.3f));
    cam.lookAt(node.getWorldTranslation().clone(), Vector3f.UNIT_Y.clone());
    cam.setFrustumPerspective(45, (float) settings.getWidth() / settings.getHeight(), 0.1f, 100.0f);

    AmbientLight al;
    DirectionalLight dl;
            
    al = new AmbientLight();
    al.setColor(new ColorRGBA(0.05f, 0.05f, 0.05f, 1f));
    rootNode.addLight(al);
    
    float ci = 0.9f / Math.max(NUM_LIGHTS, 1f);
    for (int i = 0; i < NUM_LIGHTS; i++)
    { 
      float x = 0.1f + i % 2;
      float y = FastMath.sign(1.5f - i % 4) + 1 + x;
      float z = NUM_LIGHTS * 0.00001f -0.1f;
      dl = new DirectionalLight();
      dl.setDirection(new Vector3f(x, -y, z).normalizeLocal());
      dl.setColor(new ColorRGBA(ci, ci, ci, 1.0f));
      rootNode.addLight(dl);
      lightList.add(dl);
    }    
    
    PointLight pl = new PointLight();
    pl.setPosition(new Vector3f(0f, 0f, 1f));
    pl.setColor(ColorRGBA.Green);
    pl.setRadius(1.5f);
    //rootNode.addLight(pl);    
  }
  
  @Override
  public void simpleUpdate(float tpf)
  {
    angle += tpf;
    float cosAngle = FastMath.cos(angle);
    float sinAngle = FastMath.sin(angle);
    
    for (int i = 0; i < lightList.size(); i++)
    {
      float x = 0.1f + i % 2;
      float y = FastMath.sign(1.5f - i % 4) + 1 + x;
      float z = NUM_LIGHTS * 0.00001f -0.1f;
      lightList.get(i).setDirection(new Vector3f(cosAngle + x, -y, sinAngle + z).normalizeLocal());
    }
    
    //rotatingLight.setDirection(new Vector3f(FastMath.cos(angle), -1f, FastMath.sin(angle)).normalizeLocal());    
  }
  
  private void addDebugArrow(Vector3f pos, Vector3f dir)
  {
    Arrow arrow = new Arrow(dir.clone());
    arrow.setLineWidth(3f);
    Geometry geom = new Geometry("", arrow);
    geom.setLocalTranslation(pos);
    Material mat = new Material(assetManager, "Common/MatDefs/Misc/Unshaded.j3md");
    mat.setColor("Color", ColorRGBA.Yellow);
    geom.setMaterial(mat);
    rootNode.attachChild(geom);
  }
  
  private void saveSphereMesh(Sphere mesh)
  {
    String tmpDir = System.getProperty("java.io.tmpdir");
    BinaryExporter exporter = BinaryExporter.getInstance();
    File file = new File(tmpDir + "/SphereMesh" + SPHERE_SEGMENTS + ".j3o");
    log.log(Level.SEVERE, "Saving SphereMesh: " + file.getAbsoluteFile());
    try {
      exporter.save(mesh, file);
    } catch (IOException ex) {
      log.log(Level.SEVERE, "Failed to save mesh!", ex);
    }
  }
  
  private Sphere loadSphereMesh()
  {
    Sphere mesh = null;
    String tmpDir = System.getProperty("java.io.tmpdir");
    BinaryImporter importer = BinaryImporter.getInstance();
    File file = new File(tmpDir + "/SphereMesh" + SPHERE_SEGMENTS + ".j3o");
    log.log(Level.SEVERE, "Loading SphereMesh: " + file.getAbsoluteFile());
    try {
      mesh = (Sphere) importer.load(file);
    } catch (IOException ex) {}
    
    return mesh;
  }
  
  private void deleteSphereMesh()
  {
    String tmpDir = System.getProperty("java.io.tmpdir");
    File file = new File(tmpDir + "/SphereMesh" + SPHERE_SEGMENTS + ".j3o");
    log.log(Level.SEVERE, "Deleting SphereMesh: " + file.getAbsoluteFile());
    file.delete();
  }
}
