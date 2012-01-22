#import "MatDefs/Light/LightingSP.glsllib"

attribute vec3 inPosition;
attribute vec3 inNormal;

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  attribute vec2 inTexCoord;
#endif

#ifndef VERTEX_LIGHTING
  varying vec3 wvPosition;
  varying vec3 wvNormal;
#endif

void main(void)
{
  vec4 position = vec4(inPosition, 1.0);

  #ifdef VERTEX_LIGHTING
    doPerVertexLighting(position, inNormal, gl_FrontColor);
  #else
    wvPosition = vec3(g_WorldViewMatrix * position);
    wvNormal = g_NormalMatrix * inNormal;
  #endif

  #if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
    texCoord = inTexCoord;
  #endif

  gl_Position = g_WorldViewProjectionMatrix * position;
}
