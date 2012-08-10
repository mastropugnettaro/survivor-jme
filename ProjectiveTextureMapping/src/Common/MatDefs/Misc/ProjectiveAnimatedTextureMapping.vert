attribute vec3 inPosition;
attribute vec3 inNormal;
 
uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldMatrix;
uniform mat4 m_ProjectorViewProjectionMatrix;
 
#ifdef IS_PARALLEL_PROJECTION
  uniform vec3 m_ProjectorDirection;
#else
  uniform vec3 m_ProjectorLocation;
#endif
 
// simple sprite
uniform int m_NumTilesU;
uniform int m_NumTilesV;
uniform int m_SelectedTileU;
uniform int m_SelectedTileV;
 
varying vec4 projCoord;
varying float cosAngle; 
 
const mat4 biasMat = mat4(0.5, 0.0, 0.0, 0.0,
                          0.0, 0.5, 0.0, 0.0,
                          0.0, 0.0, 0.5, 0.0,
                          0.5, 0.5, 0.5, 1.0);
 
void main()
{
  gl_Position = g_WorldViewProjectionMatrix * vec4(inPosition, 1.0);
  vec4 worldPos = g_WorldMatrix * vec4(inPosition, 1.0);
 
  projCoord = biasMat * m_ProjectorViewProjectionMatrix * worldPos;
 
  #ifdef IS_PARALLEL_PROJECTION
    cosAngle = dot(inNormal, -m_ProjectorDirection);
  #else
    cosAngle = dot(inNormal, normalize(m_ProjectorLocation - inPosition));
  #endif
 
  projCoord.x = (((projCoord.x + float(m_SelectedTileU)) / float(m_NumTilesU)));
  projCoord.y = (((projCoord.y + float(m_SelectedTileV)) / float(m_NumTilesV)));
}
