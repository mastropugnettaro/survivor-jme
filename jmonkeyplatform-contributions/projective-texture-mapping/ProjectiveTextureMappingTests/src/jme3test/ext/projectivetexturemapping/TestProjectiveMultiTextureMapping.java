/*
 * Copyright (c) 2009-2010 jMonkeyEngine
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * * Neither the name of 'jMonkeyEngine' nor the names of its contributors
 *   may be used to endorse or promote products derived from this software
 *   without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package jme3test.ext.projectivetexturemapping;

import com.jme3.app.SimpleApplication;
import com.jme3.light.AmbientLight;
import com.jme3.light.DirectionalLight;
import com.jme3.material.Material;
import com.jme3.math.ColorRGBA;
import com.jme3.math.FastMath;
import com.jme3.math.Vector3f;
import com.jme3.ext.projectivetexturemapping.SimpleTextureProjector;
import com.jme3.ext.projectivetexturemapping.MultiTextureProjectorRenderer;
import com.jme3.ext.projectivetexturemapping.MultiTextureProjectorRenderer.CombineMode;
import com.jme3.renderer.Camera;
import com.jme3.renderer.queue.GeometryList;
import com.jme3.renderer.queue.OpaqueComparator;
import com.jme3.renderer.queue.RenderQueue.ShadowMode;
import com.jme3.scene.Geometry;
import com.jme3.scene.Spatial;
import com.jme3.scene.debug.WireFrustum;
import com.jme3.scene.shape.Box;
import com.jme3.scene.shape.Sphere;
import com.jme3.texture.Texture;
import com.jme3.texture.Texture2D;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Test application for Projective Texture Mapping.
 * @author survivor
 */
public class TestProjectiveMultiTextureMapping extends SimpleApplication 
{
  private ProjectorData pd1, pd2;
  private MultiTextureProjectorRenderer ptr1, ptr2;

  public static void main(String[] args) 
  {
    TestProjectiveMultiTextureMapping app = new TestProjectiveMultiTextureMapping();
    app.start();
    Logger.getLogger("").setLevel(Level.SEVERE);
  }

  @Override
  public void simpleInitApp() 
  {
    setPauseOnLostFocus(false);
    flyCam.setMoveSpeed(3f);
    //flyCam.setEnabled(false);
    
    Material mat = new Material(assetManager, "Common/MatDefs/Light/Lighting.j3md");
    mat.setColor("Diffuse", ColorRGBA.LightGray);
    mat.setColor("Ambient", ColorRGBA.LightGray);
    mat.setBoolean("UseMaterialColors", true);
    
    Box box1 = new Box(Vector3f.ZERO.clone(), 2f, 0.1f, 2f);
    Geometry geom1 = new Geometry("Box1", box1);
    geom1.setMaterial(mat);
    rootNode.attachChild(geom1);

    Box box3 = new Box(new Vector3f(0, 3, 0), 2f, 0.1f, 2f);
    Geometry geom3 = new Geometry("Box3", box3);
    geom3.rotate(0f, 0f, -0.7f);
    geom3.setMaterial(mat);
    rootNode.attachChild(geom3);
    
    Box box4 = new Box(new Vector3f(0, -3, 0), 2f, 0.1f, 2f);
    Geometry geom4 = new Geometry("Box4", box4);
    geom4.setMaterial(mat);
    rootNode.attachChild(geom4);

    Material mat2 = new Material(assetManager, "Common/MatDefs/Light/Lighting.j3md");
    mat2.setColor("Diffuse", ColorRGBA.Orange);
    mat.setColor("Ambient", ColorRGBA.LightGray);
    mat2.setBoolean("UseMaterialColors", true);
    
    Sphere sphere1 = new Sphere(32, 32, 0.5f);
    Geometry geom2 = new Geometry("Sphere1", sphere1);
    geom2.setMaterial(mat2);
    rootNode.attachChild(geom2);

    // sunset light
    DirectionalLight dl = new DirectionalLight();
    dl.setDirection(new Vector3f(-0.1f, -0.7f, 1).normalizeLocal());
    dl.setColor(new ColorRGBA(0.44f, 0.30f, 0.20f, 1.0f));
    rootNode.addLight(dl);

    // skylight
    dl = new DirectionalLight();
    dl.setDirection(new Vector3f(-0.6f, -1, -0.6f).normalizeLocal());
    dl.setColor(new ColorRGBA(0.10f, 0.22f, 0.44f, 1.0f));
    rootNode.addLight(dl);    

    // white ambient light
    dl = new DirectionalLight();
    dl.setDirection(new Vector3f(1, -0.5f, -0.1f).normalizeLocal());
    dl.setColor(new ColorRGBA(0.80f, 0.70f, 0.80f, 1.0f));
    rootNode.addLight(dl);
            
    // real ambient light
    AmbientLight al = new AmbientLight();
    al.setColor(new ColorRGBA(0.1f, 0.1f, 0.1f, 1.0f));
    rootNode.addLight(al);
    
    float ar = ((float) settings.getWidth()) / ((float) settings.getHeight());
    cam.setFrustumPerspective(45, ar, 0.1f, 1000.0f);
    cam.setLocation(new Vector3f(-1, 3, -1));
    cam.lookAt(new Vector3f(0, 0, 0), Vector3f.UNIT_Y.clone());
    
    Texture2D texture1 = (Texture2D) assetManager.loadTexture("Textures/Monkey4.png");
    Texture2D texture2 = (Texture2D) assetManager.loadTexture("Textures/rune.png");
    
    pd1 = new ProjectorData();
    pd2 = new ProjectorData();
    initProjectorData(pd1, new Vector3f(1f, 2.1f, 0f), texture1);
    initProjectorData(pd2, new Vector3f(1f, 2.1f, 2f), texture2);
        
    pd1.projector.setFallOffDistance(2.1f);
    pd1.projector.setFallOffPower(4f);    
    pd1.projector.setParameter("CombineMode", CombineMode.BLEND_COLOR_ADD_ALPHA);
        
    GeometryList gl = new GeometryList(new OpaqueComparator());
    gl.add(geom1);
    
    pd2.projector.getProjectorCamera().setFrustumPerspective(90f, 1f, 1f, 5f);
    pd2.projector.getProjectorCamera().setParallelProjection(true);
    pd2.projector.setParameter("CombineMode", CombineMode.BLEND_ALL);
    
    ptr1 = new MultiTextureProjectorRenderer(assetManager);
    ptr1.getTextureProjectors().add(pd1.projector);
//    ptr1.getTextureProjectors().add(pd1.projector);
//    ptr1.getTextureProjectors().add(pd1.projector);
//    ptr1.getTextureProjectors().add(pd1.projector);
//    ptr1.getTextureProjectors().add(pd1.projector);
//    ptr1.getTextureProjectors().add(pd1.projector);
//    ptr1.getTextureProjectors().add(pd1.projector);
//    ptr1.getTextureProjectors().add(pd1.projector);
    
    ptr2 = new MultiTextureProjectorRenderer(assetManager);
    ptr2.setTargetGeometryList(gl);
    ptr2.getTextureProjectors().add(pd2.projector);
//    ptr2.getTextureProjectors().add(pd2.projector);
//    ptr2.getTextureProjectors().add(pd2.projector);
//    ptr2.getTextureProjectors().add(pd2.projector);
//    ptr2.getTextureProjectors().add(pd2.projector);
//    ptr2.getTextureProjectors().add(pd2.projector);
//    ptr2.getTextureProjectors().add(pd2.projector);
//    ptr2.getTextureProjectors().add(pd2.projector);
    
    Logger.getLogger("").severe("NUM_PROJECTORS: " + 
            (ptr1.getTextureProjectors().size() + 
             ptr2.getTextureProjectors().size()) + 
      ", NUM_PASSES: " + 
            (((ptr1.getTextureProjectors().size() + 7) / 8) + 
             ((ptr2.getTextureProjectors().size() + 7) / 8)));
    
    viewPort.addProcessor(ptr1);
    viewPort.addProcessor(ptr2);
  }
  
  private void initProjectorData(ProjectorData pd, Vector3f location, Texture2D texture)
  {
    texture.setMinFilter(Texture.MinFilter.Trilinear);
    texture.setMagFilter(Texture.MagFilter.Bilinear);
    texture.setAnisotropicFilter(16);
    //texture.setWrap(Texture.WrapMode.EdgeClamp);
    texture.setWrap(Texture.WrapMode.BorderClamp);
    
    int textureWidth = texture.getImage().getWidth();
    int textureHeight = texture.getImage().getHeight();
    float textureAspectRatio = ((float) textureWidth) / ((float) textureHeight);
    
    pd.projector = new SimpleTextureProjector(texture);
    Camera projectorCamera = pd.projector.getProjectorCamera();
    projectorCamera.setLocation(location);
    projectorCamera.lookAt(Vector3f.ZERO.clone(), Vector3f.UNIT_X.clone());
    projectorCamera.setFrustumPerspective(45, textureAspectRatio, 1f, 5f);
    projectorCamera.setParallelProjection(false);
        
    pd.frustumPoints = new Vector3f[8];
    for (int i = 0; i < 8; i++)
    {
      pd.frustumPoints[i] = new Vector3f();
    }
    
    pd.frustum = new WireFrustum(pd.frustumPoints);
    Geometry frustumMdl = new Geometry("f", pd.frustum);
    frustumMdl.setCullHint(Spatial.CullHint.Never);
    frustumMdl.setShadowMode(ShadowMode.Off);
    frustumMdl.setMaterial(new Material(assetManager, "Common/MatDefs/Misc/Unshaded.j3md"));
    frustumMdl.getMaterial().setColor("Color", ColorRGBA.White);    
    rootNode.attachChild(frustumMdl);    
  }

  @Override
  public void simpleUpdate(float tpf) 
  {
    float s = FastMath.sin(timer.getTimeInSeconds() * 0.8f - FastMath.PI) * 
      (FastMath.sin( timer.getTimeInSeconds() * 0.5f - FastMath.PI));
    float t = FastMath.cos(timer.getTimeInSeconds() * 0.6f - FastMath.PI) * 
      (FastMath.sin( timer.getTimeInSeconds() * 0.3f - FastMath.PI));
    
    pd1.projector.getProjectorCamera().lookAt(new Vector3f(s * 0.5f, 0f, t * 3f), Vector3f.UNIT_X.clone());    
    pd2.projector.getProjectorCamera().lookAtDirection(Vector3f.UNIT_Y.negate(), Vector3f.UNIT_X.clone());
    pd2.projector.getProjectorCamera().setLocation(new Vector3f(t * 2f, 2.1f, s * 2f));
    
    pd1.projector.updateFrustumPoints(pd1.frustumPoints);
    pd1.frustum.update(pd1.frustumPoints);
    pd2.projector.updateFrustumPoints(pd2.frustumPoints);
    pd2.frustum.update(pd2.frustumPoints);
  }
  
  private class ProjectorData
  {
    SimpleTextureProjector projector;
    WireFrustum frustum;
    Vector3f[] frustumPoints;
  }
}
