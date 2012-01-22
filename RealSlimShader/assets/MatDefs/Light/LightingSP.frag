#import "MatDefs/Light/LightingSP.glsllib"

varying vec3 wvPosition;
varying vec3 wvNormal;

void main (void)
{
  #ifdef VERTEX_LIGHTING
    textureVertexFragment(gl_Color, gl_FragColor);
  #else
    doPerFragmentLighting(wvPosition, wvNormal, gl_FragColor);
  #endif
}
