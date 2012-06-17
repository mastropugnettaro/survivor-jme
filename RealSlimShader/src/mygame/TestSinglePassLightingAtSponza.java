package mygame;

import com.jme3.app.SimpleApplication;
import com.jme3.export.binary.BinaryExporter;
import com.jme3.export.binary.BinaryImporter;
import com.jme3.light.AmbientLight;
import com.jme3.light.DirectionalLight;
import com.jme3.material.Material;
import com.jme3.math.ColorRGBA;
import com.jme3.math.FastMath;
import com.jme3.math.Quaternion;
import com.jme3.math.Vector3f;
import com.jme3.post.FilterPostProcessor;
import com.jme3.post.ssao.SSAOFilter;
import com.jme3.scene.Geometry;
import com.jme3.texture.Texture;
import java.io.File;
import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Tests SinglePassLighting with Parallax Occlusion Mapping enabled at Sponza.
 * 
 * @author survivor
 */
public class TestSinglePassLightingAtSponza extends SimpleApplication {

  private static final Logger log = Logger.getLogger(TestSinglePassLightingAtSponza.class.getName());
  private static final int NUM_LIGHTS_HALF = 1;
  Geometry model;

  public static void main(String[] args) 
  {
    Logger.getLogger("").setLevel(Level.SEVERE);    
    TestSinglePassLightingAtSponza app = new TestSinglePassLightingAtSponza();
    app.start();
  }

  @Override
  public void simpleInitApp() 
  {
    cam.setLocation(new Vector3f(68.45442f, 8.235511f, 7.9676695f));
    cam.setRotation(new Quaternion(0.046916496f, -0.69500375f, 0.045538206f, 0.7160271f));

    DirectionalLight dl;
    AmbientLight al;

    al = new AmbientLight();
    al.setColor(new ColorRGBA(0.1f, 0.1f, 0.1f, 1.0f));
    rootNode.addLight(al);

    float ci = 1.2f / Math.max(NUM_LIGHTS_HALF, 1f);
    for (int i = 0; i < NUM_LIGHTS_HALF; i++) {
      float x = 1f + i % 2;
      float y = FastMath.sign(1.5f - i % 4);

      dl = new DirectionalLight();
      dl.setDirection(new Vector3f(x, y, -1f).normalizeLocal());
      dl.setColor(new ColorRGBA(ci, ci, ci, 1f));
      rootNode.addLight(dl);

      dl = new DirectionalLight();
      dl.setDirection(new Vector3f(-x, -y, 1f).normalizeLocal());
      dl.setColor(new ColorRGBA(ci, ci, ci, 1f));
      rootNode.addLight(dl);
    }

    flyCam.setMoveSpeed(10);

    Material mat = new MaterialEx(assetManager, "MatDefs/Light/Lighting_SP.j3md");
    Texture diff = assetManager.loadTexture("Textures/BrickWall.jpg");
    diff.setWrap(Texture.WrapMode.Repeat);
    diff.setAnisotropicFilter(16);
    Texture norm = assetManager.loadTexture("Textures/BrickWall_normal.jpg");
    norm.setWrap(Texture.WrapMode.Repeat);
    norm.setAnisotropicFilter(16);
    Texture height = assetManager.loadTexture("Textures/BrickWall_height.jpg");
    height.setWrap(Texture.WrapMode.Repeat);
    height.setAnisotropicFilter(16);
    mat.setTexture("DiffuseMap", diff);
    mat.setTexture("NormalMap", norm);
    mat.setTexture("ParallaxMap", height);
    mat.setFloat("ParallaxHeight", 0.1f);
    mat.setBoolean("SteepParallax", true);
    mat.setBoolean("ParallaxShadows", true);
    mat.setBoolean("UseMaterialColors", true);
    mat.setColor("Diffuse", ColorRGBA.White.clone());
    mat.setColor("Specular", ColorRGBA.DarkGray.clone());
    mat.setFloat("Shininess", 100.0f);

    model = (Geometry) assetManager.loadModel("Models/Sponza.j3o");
    //model.getMesh().scaleTextureCoordinates(new Vector2f(2, 2));
    //TangentBinormalGenerator.generate(model);
    //saveSponzaGeometry(model);
    model.setMaterial(mat);
    rootNode.attachChild(model);

    FilterPostProcessor fpp = new FilterPostProcessor(assetManager);
    SSAOFilter ssaoFilter = new SSAOFilter(12.940201f, 43.928635f, 0.32999992f, 0.6059958f);
    fpp.addFilter(ssaoFilter);
    viewPort.addProcessor(fpp);

    log.log(Level.SEVERE, "*** NUM_LIGHTS: {0} ***", NUM_LIGHTS_HALF * 2);
  }
  
  private void saveSponzaGeometry(Geometry geom)
  {
    String tmpDir = System.getProperty("java.io.tmpdir");
    BinaryExporter exporter = BinaryExporter.getInstance();
    File file = new File(tmpDir + "/Sponza.j3o");
    log.log(Level.SEVERE, "Saving Sponza: " + file.getAbsoluteFile());
    try {
      exporter.save(geom, file);
    } catch (IOException ex) {
      log.log(Level.SEVERE, "Failed to save geometry!", ex);
    }
  }
  
  private Geometry loadSponzaGeometry()
  {
    Geometry geom = null;
    String tmpDir = System.getProperty("java.io.tmpdir");
    BinaryImporter importer = BinaryImporter.getInstance();
    File file = new File(tmpDir + "/Sponza.j3o");
    log.log(Level.SEVERE, "Loading Sponza: " + file.getAbsoluteFile());
    try {
      geom = (Geometry) importer.load(file);
    } catch (IOException ex) {}
    
    return geom;
  }
  
  private void deleteSponzaGeometry()
  {
    String tmpDir = System.getProperty("java.io.tmpdir");
    File file = new File(tmpDir + "/Sponza.j3o");
    log.log(Level.SEVERE, "Deleting Sponza: " + file.getAbsoluteFile());
    file.delete();
  }
}
