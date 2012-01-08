varying vec4 sceneCoord;
varying vec4 projCoord;
varying float cosAngle;

uniform sampler2D m_SceneMap;
uniform sampler2D m_ProjectiveMap;

void main() {
  vec2 sCoord = sceneCoord.xy / sceneCoord.w;
  vec2 pCoord = projCoord.xy / projCoord.w;

  vec4 sceneColor = texture2D(m_SceneMap, sCoord);
  vec4 projColor = texture2D(m_ProjectiveMap, pCoord);

  if (projCoord.w > 0.0)
  {
    if (cosAngle > 0.0)
    {   
      if (cosAngle < 0.2)
      {
        projColor.a *= cosAngle * 5.0;
      }

      gl_FragColor = projColor;
    }
  }
}
