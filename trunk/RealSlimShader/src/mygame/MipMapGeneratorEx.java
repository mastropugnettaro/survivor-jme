package mygame;

import com.jme3.math.FastMath;
import com.jme3.texture.Image;
import com.jme3.texture.Image.Format;
import com.jme3.texture.plugins.AWTLoader;
import com.jme3.util.BufferUtils;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import jme3tools.converters.ImageToAwt;

/**
 *
 * @author survivor
 */
public class MipMapGeneratorEx {
  
  public static final MipMapGeneratorExScaler defaultScaler = new MipMapGeneratorExScaler() 
  {
    public BufferedImage scaleDown(BufferedImage sourceImage, int targetWidth, int targetHeight) 
    {
      int sourceWidth = sourceImage.getWidth();
      int sourceHeight = sourceImage.getHeight();

      BufferedImage targetImage = new BufferedImage(targetWidth, targetHeight, sourceImage.getType());
      Graphics2D g = targetImage.createGraphics();
      g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
      g.drawImage(sourceImage, 0, 0, targetWidth, targetHeight, 0, 0, sourceWidth, sourceHeight, null);
      g.dispose();

      return targetImage;
    }
  };
  
  public static final MipMapGeneratorExScaler maxScaler = new MipMapGeneratorExScaler() 
  {
    public BufferedImage scaleDown(BufferedImage sourceImage, int targetWidth, int targetHeight) 
    {
      int sourceWidth = sourceImage.getWidth();
      int sourceHeight = sourceImage.getHeight();      
      BufferedImage targetImage = new BufferedImage(targetWidth, targetHeight, sourceImage.getType());    
      
      for (int y = 0; y < sourceHeight; y += 2)
      {
        for (int x = 0; x < sourceWidth; x += 2)
        {
          int value0 = sourceImage.getRGB(x+0, y+0) & 0x000000FF;
          int value1 = sourceImage.getRGB(x+1, y+0) & 0x000000FF;
          int value2 = sourceImage.getRGB(x+0, y+1) & 0x000000FF;
          int value3 = sourceImage.getRGB(x+1, y+1) & 0x000000FF;
          
          if (value1 > value0) value0 = value1;
          if (value2 > value0) value0 = value2;
          if (value3 > value0) value0 = value3;
          
          value0 = 0xFF000000 | value0 << 16 | value0 << 8 | value0;
          
          targetImage.setRGB(x/2, y/2, value0);
        }
      }
      
      return targetImage;      
    }
  };

  public static void resizeToPowerOf2(Image image) {
    BufferedImage original = ImageToAwt.convert(image, false, true, 0);
    int potWidth = FastMath.nearestPowerOfTwo(image.getWidth());
    int potHeight = FastMath.nearestPowerOfTwo(image.getHeight());
    int potSize = Math.max(potWidth, potHeight);

    BufferedImage scaled = defaultScaler.scaleDown(original, potSize, potSize);

    AWTLoader loader = new AWTLoader();
    Image output = loader.load(scaled, false);

    image.setWidth(potSize);
    image.setHeight(potSize);
    image.setDepth(0);
    image.setData(output.getData(0));
    image.setFormat(output.getFormat());
    image.setMipMapSizes(null);
  }

  public static void generateMipMaps(Image image, MipMapGeneratorExScaler scaler) 
  {
    BufferedImage original = ImageToAwt.convert(image, false, true, 0);
    int width = original.getWidth();
    int height = original.getHeight();
    int level = 0;

    BufferedImage current = original;
    AWTLoader loader = new AWTLoader();
    ArrayList<ByteBuffer> output = new ArrayList<ByteBuffer>();
    int totalSize = 0;
    Format format = null;

    while (height >= 1 || width >= 1) {
      Image converted = loader.load(current, false);
      format = converted.getFormat();
      output.add(converted.getData(0));
      totalSize += converted.getData(0).capacity();

      if (height == 1 || width == 1) {
        break;
      }

      level++;

      height /= 2;
      width /= 2;

      current = scaler.scaleDown(current, width, height);
    }

    ByteBuffer combinedData = BufferUtils.createByteBuffer(totalSize);
    int[] mipSizes = new int[output.size()];
    for (int i = 0; i < output.size(); i++) {
      ByteBuffer data = output.get(i);
      data.clear();
      combinedData.put(data);
      mipSizes[i] = data.capacity();
    }
    combinedData.flip();

    // insert mip data into image
    image.setData(0, combinedData);
    image.setMipMapSizes(mipSizes);
    image.setFormat(format);
  }
  
  public static void generateMipMaps(Image image) 
  {  
    generateMipMaps(image, defaultScaler);
  }
}
