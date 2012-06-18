package mygame;

import com.jme3.post.SceneProcessor;
import com.jme3.renderer.RenderManager;
import com.jme3.renderer.ViewPort;
import com.jme3.renderer.queue.RenderQueue;
import com.jme3.texture.FrameBuffer;
import com.jme3.texture.Image.Format;

/**
 * AccumulationBuffer is a SceneProcessor that provides a floating point 
 * frame buffer for accumulating a high number of blend operations without 
 * too much precision loss. It's like glAccum(), but faster, more flexible 
 * and supported by most drivers.
 * 
 * @author survivor
 */
public class AccumulationBuffer implements SceneProcessor 
{
  private int numSamples;
  private Format colorBufferFormat; 
  private Format depthBufferFormat;
  private FrameBuffer accumulationBuffer;
  private RenderManager rm;
  private ViewPort vp;
  
  public AccumulationBuffer()
  {
    this(1);
  }
  
  public AccumulationBuffer(int numSamples)
  {
    this(1, Format.RGBA16F, Format.Depth);
  }
  
  public AccumulationBuffer(int numSamples, Format colorBufferFormat, Format depthBufferFormat)
  {
    this.checkAndSetNumSamples(numSamples);
    this.colorBufferFormat = colorBufferFormat;
    this.depthBufferFormat = depthBufferFormat;
    this.accumulationBuffer = null;
    this.rm = null;
    this.vp = null;
  }
  
  public int getNumSamples() {
    return this.numSamples;
  }

  public void setNumSamples(int numSamples) 
  {
    this.checkAndSetNumSamples(numSamples);
    if (this.accumulationBuffer != null)
    {
      this.createbuffer();
    }
  }
  
  private void checkAndSetNumSamples(int numSamples)
  {
    if (numSamples <= 0)
    {
      this.numSamples = 1;
    }
    else
    {
      this.numSamples = numSamples;
    }
  }
    
  private void createbuffer()
  {
    this.accumulationBuffer = new FrameBuffer(
      this.vp.getCamera().getWidth(), 
      this.vp.getCamera().getHeight(), 
      this.numSamples);
    this.accumulationBuffer.setColorBuffer(colorBufferFormat);
    if (depthBufferFormat != null)
    {
      this.accumulationBuffer.setDepthBuffer(depthBufferFormat);
    }
  }

  public void initialize(RenderManager rm, ViewPort vp) 
  {
    this.rm = rm;
    this.vp = vp;
    this.createbuffer();
  }

  public void reshape(ViewPort vp, int w, int h) 
  {
    this.vp = vp;
    this.createbuffer();
  }

  public boolean isInitialized() 
  {
    return this.accumulationBuffer != null;
  }

  public void preFrame(float tpf) 
  {
    this.vp.setOutputFrameBuffer(this.accumulationBuffer);
  }

  public void postQueue(RenderQueue rq) { }

  public void postFrame(FrameBuffer out) 
  {
    this.rm.getRenderer().copyFrameBuffer(this.accumulationBuffer, null, true);
  }

  public void cleanup() { }  
}
