package mygame;

import com.jme3.app.SimpleApplication;
import com.jme3.light.AmbientLight;
import com.jme3.light.DirectionalLight;
import com.jme3.light.PointLight;
import com.jme3.material.Material;
import com.jme3.math.ColorRGBA;
import com.jme3.math.FastMath;
import com.jme3.math.Vector3f;
import com.jme3.scene.Geometry;
import com.jme3.scene.shape.Sphere;
import com.jme3.scene.shape.Sphere.TextureMode;
import com.jme3.system.AppSettings;
import com.jme3.util.TangentBinormalGenerator;
import java.util.logging.Level;
import java.util.logging.Logger;

public class TestSinglePassLighting extends SimpleApplication
{
  private static final Logger log = Logger.getLogger(TestSinglePassLighting.class.getName());
  private static final int SPHERE_SEGMENTS = 32; // warning: TangentBinormalGenerator
  private static final int NUM_LIGHTS = 5;
  
  public static void main(String[] args)
  {
    Logger.getLogger("").setLevel(Level.SEVERE);    
    TestSinglePassLighting app = new TestSinglePassLighting();
    app.setSettings(new AppSettings(true));
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

    Sphere sphereMesh = new Sphere(SPHERE_SEGMENTS, SPHERE_SEGMENTS, 0.5f);
    TangentBinormalGenerator.generate(sphereMesh);
    sphereMesh.setTextureMode(TextureMode.Projected);
    Geometry sphere = new Geometry("Sphere", sphereMesh);
    sphere.rotate(FastMath.HALF_PI, 0f, 0f);
    Material sphereMat = new MaterialSP("Materials/Rock.j3m", assetManager);    
    sphere.setMaterial(sphereMat);
    rootNode.attachChild(sphere);

    cam.setLocation(new Vector3f(-1f, 1f, 0f));
    cam.lookAt(Vector3f.ZERO.clone(), Vector3f.UNIT_Y.clone());
    cam.setFrustumPerspective(45, (float) settings.getWidth() / settings.getHeight(), 0.1f, 100.0f);

    AmbientLight al;
    DirectionalLight dl;
            
    al = new AmbientLight();
    al.setColor(new ColorRGBA(0.05f, 0.05f, 0.05f, 1f));
    rootNode.addLight(al);
  
    float ci = 0.9f / Math.max(NUM_LIGHTS, 1f);
    for (int i = 0; i < (NUM_LIGHTS-1); i++)
    { 
      float x = 1f + i % 2;
      float y = FastMath.sign(1.5f - i % 4);
      dl = new DirectionalLight();
      dl.setDirection(new Vector3f(x, y, -1f).normalizeLocal());
      dl.setColor(new ColorRGBA(ci, ci, ci, 1.0f));
      rootNode.addLight(dl);
    }
    
    if (NUM_LIGHTS > 0)
    {
      PointLight pl = new PointLight();
      pl.setPosition(new Vector3f(-1f, -1f, 0f));
      pl.setColor(ColorRGBA.Green);
      pl.setRadius(1.5f);
      rootNode.addLight(pl);
    }
    
    log.log(Level.SEVERE, "*** SPHERE_SEGMENTS: {0}, NUM_LIGHTS: {1} ***",
      new Object[] { SPHERE_SEGMENTS, NUM_LIGHTS });
  }
}
