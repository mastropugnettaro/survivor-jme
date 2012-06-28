package mygame;

import java.awt.image.BufferedImage;

/**
 *
 * @author survivor
 */
public interface MipMapGeneratorExScaler 
{
  public BufferedImage scaleDown(BufferedImage sourceImage, int targetWidth, int targetHeight);
}
