package mygame;

import com.jme3.app.SimpleApplication;
import com.jme3.light.AmbientLight;
import com.jme3.light.DirectionalLight;
import com.jme3.material.Material;
import com.jme3.math.ColorRGBA;
import com.jme3.math.FastMath;
import com.jme3.math.Quaternion;
import com.jme3.math.Vector2f;
import com.jme3.math.Vector3f;
import com.jme3.post.FilterPostProcessor;
import com.jme3.post.ssao.SSAOFilter;
import com.jme3.scene.Geometry;
import com.jme3.texture.Texture;
import java.awt.Color;

public class TestSSAO extends SimpleApplication {

  private static final int NUM_LIGHTS_HALF = 1;
  Geometry model;

  public static void main(String[] args) {
    TestSSAO app = new TestSSAO();
    app.start();
  }

  @Override
  public void simpleInitApp() {
    cam.setLocation(new Vector3f(68.45442f, 8.235511f, 7.9676695f));
    cam.setRotation(new Quaternion(0.046916496f, -0.69500375f, 0.045538206f, 0.7160271f));


    DirectionalLight dl;
    
    float ci = 1f / Math.max(NUM_LIGHTS_HALF, 1f) / 2f;
    for (int i = 0; i < NUM_LIGHTS_HALF; i++) {
      float x = 1f + i % 2;
      float y = FastMath.sign(1.5f - i % 4);
      
      dl = new DirectionalLight();
      dl.setDirection(new Vector3f(x, y, -1f).normalizeLocal());
      dl.setColor(new ColorRGBA(ci, ci, ci, 1.0f));
      rootNode.addLight(dl);
      
      dl = new DirectionalLight();
      dl.setDirection(new Vector3f(-x, -y, 1f).normalizeLocal());
      dl.setColor(new ColorRGBA(ci, ci, ci, 1.0f));
      rootNode.addLight(dl);            
    }

    flyCam.setMoveSpeed(50);

    Material mat = new MaterialSP(assetManager, "MatDefs/Light/LightingSP.j3md");
    Texture diff = assetManager.loadTexture("Textures/BrickWall.jpg");
    diff.setWrap(Texture.WrapMode.Repeat);
    //Texture norm = assetManager.loadTexture("Textures/BrickWall_normal.jpg");
    Texture norm = assetManager.loadTexture("Textures/Rock_normal.png");
    norm.setWrap(Texture.WrapMode.Repeat);
    //mat.setTexture("DiffuseMap", diff);
    //mat.setColor("Diffuse", ColorRGBA.White.clone());
    mat.setTexture("NormalMap", norm);
    mat.setFloat("Shininess", 2.0f);

    mat = new MaterialSP("Materials/Rock.j3m", assetManager);    

    AmbientLight al = new AmbientLight();
    al.setColor(new ColorRGBA(1.8f, 1.8f, 1.8f, 1.0f));

    rootNode.addLight(al);

    model = (Geometry) assetManager.loadModel("Models/Sponza.j3o");
    model.getMesh().scaleTextureCoordinates(new Vector2f(2, 2));

    model.setMaterial(mat);

    rootNode.attachChild(model);

//    FilterPostProcessor fpp = new FilterPostProcessor(assetManager);
//    SSAOFilter ssaoFilter = new SSAOFilter(12.940201f, 43.928635f, 0.32999992f, 0.6059958f);
//    fpp.addFilter(ssaoFilter);
//
//    viewPort.addProcessor(fpp);
  }
}
