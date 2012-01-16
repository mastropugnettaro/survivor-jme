varying vec4 projCoord;
varying float cosAngle;

uniform sampler2D m_ProjectiveMap;

#ifdef FALL_OFF
  uniform float m_FallOffDistance;
  uniform float m_FallOffPower;
#endif

void main() 
{
  vec2 pCoord = projCoord.xy / projCoord.w;
  vec4 projColor = texture2D(m_ProjectiveMap, pCoord);

  if (projCoord.w > 0.0)
  {
    if (cosAngle > 0.0)
    {   
      if (cosAngle < 0.2)
      {
        projColor.a *= cosAngle * 5.0;
      }
      
      #ifdef FALL_OFF
        if (projCoord.w > m_FallOffDistance)
        {
          float maxDist = m_FallOffDistance + 1.0;
          projColor.a *= clamp(pow(maxDist - projCoord.w, m_FallOffPower), 0.0, 1.0);
        }        
      #endif

      gl_FragColor = projColor;
    }
  }
}
