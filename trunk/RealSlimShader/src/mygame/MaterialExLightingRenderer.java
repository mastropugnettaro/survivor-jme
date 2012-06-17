package mygame;

import com.jme3.material.Material;
import com.jme3.renderer.RenderManager;
import com.jme3.scene.Geometry;
import com.jme3.shader.Shader;

/**
 * A MaterialExLightingRenderer allows to take control of how MaterialEx 
 * renders the light and material parameters.
 * 
 * @author survivor
 */
public interface MaterialExLightingRenderer {

/**
 * Attaching to a material means adding parameters that this renderer needs.
 */
  void attach(Material mat);

/**
 * Remove previously added parameters here.
 */
  void detach(Material mat);

/**
 * Implement your own material lighting renderer here.
 */
  void renderLighting(Material mat, Shader shader, Geometry g, RenderManager rm);
}
