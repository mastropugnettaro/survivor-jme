#if NUM_PROJECTORS > 0
  varying vec4 projCoord0;
  varying float cosAngle0;

  uniform sampler2D m_ProjectiveMap0;
  uniform float m_FallOffDistance0;
  uniform float m_FallOffPower0;
#endif

#if NUM_PROJECTORS > 1
  varying vec4 projCoord1;
  varying float cosAngle1;

  uniform sampler2D m_ProjectiveMap1;
  uniform float m_FallOffDistance1;
  uniform float m_FallOffPower1;
#endif

#if NUM_PROJECTORS > 2
  varying vec4 projCoord2;
  varying float cosAngle2;

  uniform sampler2D m_ProjectiveMap2;
  uniform float m_FallOffDistance2;
  uniform float m_FallOffPower2;
#endif

#if NUM_PROJECTORS > 3
  varying vec4 projCoord3;
  varying float cosAngle3;

  uniform sampler2D m_ProjectiveMap3;
  uniform float m_FallOffDistance3;
  uniform float m_FallOffPower3;
#endif

#if NUM_PROJECTORS > 4
  varying vec4 projCoord4;
  varying float cosAngle4;

  uniform sampler2D m_ProjectiveMap4;
  uniform float m_FallOffDistance4;
  uniform float m_FallOffPower4;
#endif

#if NUM_PROJECTORS > 5
  varying vec4 projCoord5;
  varying float cosAngle5;

  uniform sampler2D m_ProjectiveMap5;
  uniform float m_FallOffDistance5;
  uniform float m_FallOffPower5;
#endif

#if NUM_PROJECTORS > 6
  varying vec4 projCoord6;
  varying float cosAngle6;

  uniform sampler2D m_ProjectiveMap6;
  uniform float m_FallOffDistance6;
  uniform float m_FallOffPower6;
#endif

#if NUM_PROJECTORS > 7
  varying vec4 projCoord7;
  varying float cosAngle7;

  uniform sampler2D m_ProjectiveMap7;
  uniform float m_FallOffDistance7;
  uniform float m_FallOffPower7;
#endif


void main() 
{
  #if NUM_PROJECTORS > 0
    vec4 projColor;
    vec4 blendColor;

    if (projCoord0.w > 0.0)
    {
      if (cosAngle0 > 0.0)
      {   
        projColor = texture2DProj(m_ProjectiveMap0, projCoord0);

        if (cosAngle0 < 0.2)
        {
          projColor.a *= cosAngle0 * 5.0;
        }

        #ifdef FALL_OFF0
          if (projCoord0.w > m_FallOffDistance0)
          {
            float maxDist = m_FallOffDistance0 + 1.0;
            projColor.a *= clamp(pow(maxDist - projCoord0.w, m_FallOffPower0), 0.0, 1.0);
          }        
        #endif

        blendColor = projColor;
      }
    }
  #endif

  #if NUM_PROJECTORS > 1
    if (projCoord1.w > 0.0)
    {
      if (cosAngle1 > 0.0)
      {   
        projColor = texture2DProj(m_ProjectiveMap1, projCoord1);

        if (cosAngle1 < 0.2)
        {
          projColor.a *= cosAngle1 * 5.0;
        }

        #ifdef FALL_OFF1
          if (projCoord1.w > m_FallOffDistance1)
          {
            float maxDist = m_FallOffDistance1 + 1.0;
            projColor.a *= clamp(pow(maxDist - projCoord1.w, m_FallOffPower1), 0.0, 1.0);
          }        
        #endif

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 2
    if (projCoord2.w > 0.0)
    {
      if (cosAngle2 > 0.0)
      {   
        projColor = texture2DProj(m_ProjectiveMap2, projCoord2);

        if (cosAngle2 < 0.2)
        {
          projColor.a *= cosAngle2 * 5.0;
        }

        #ifdef FALL_OFF2
          if (projCoord2.w > m_FallOffDistance2)
          {
            float maxDist = m_FallOffDistance2 + 1.0;
            projColor.a *= clamp(pow(maxDist - projCoord2.w, m_FallOffPower2), 0.0, 1.0);
          }        
        #endif

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 3
    if (projCoord3.w > 0.0)
    {
      if (cosAngle3 > 0.0)
      {   
        projColor = texture2DProj(m_ProjectiveMap3, projCoord3);

        if (cosAngle3 < 0.2)
        {
          projColor.a *= cosAngle3 * 5.0;
        }

        #ifdef FALL_OFF3
          if (projCoord3.w > m_FallOffDistance3)
          {
            float maxDist = m_FallOffDistance3 + 1.0;
            projColor.a *= clamp(pow(maxDist - projCoord3.w, m_FallOffPower3), 0.0, 1.0);
          }        
        #endif

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 4
    if (projCoord4.w > 0.0)
    {
      if (cosAngle4 > 0.0)
      {   
        projColor = texture2DProj(m_ProjectiveMap4, projCoord4);

        if (cosAngle4 < 0.2)
        {
          projColor.a *= cosAngle4 * 5.0;
        }

        #ifdef FALL_OFF4
          if (projCoord0.w > m_FallOffDistance4)
          {
            float maxDist = m_FallOffDistance4 + 1.0;
            projColor.a *= clamp(pow(maxDist - projCoord4.w, m_FallOffPower4), 0.0, 1.0);
          }        
        #endif

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 5
    if (projCoord5.w > 0.0)
    {
      if (cosAngle5 > 0.0)
      {   
        projColor = texture2DProj(m_ProjectiveMap5, projCoord5);

        if (cosAngle5 < 0.2)
        {
          projColor.a *= cosAngle5 * 5.0;
        }

        #ifdef FALL_OFF5
          if (projCoord0.w > m_FallOffDistance5)
          {
            float maxDist = m_FallOffDistance5 + 1.0;
            projColor.a *= clamp(pow(maxDist - projCoord5.w, m_FallOffPower5), 0.0, 1.0);
          }        
        #endif

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 6
    if (projCoord6.w > 0.0)
    {
      if (cosAngle6 > 0.0)
      {   
        projColor = texture2DProj(m_ProjectiveMap6, projCoord6);

        if (cosAngle6 < 0.2)
        {
          projColor.a *= cosAngle6 * 5.0;
        }

        #ifdef FALL_OFF6
          if (projCoord6.w > m_FallOffDistance6)
          {
            float maxDist = m_FallOffDistance6 + 1.0;
            projColor.a *= clamp(pow(maxDist - projCoord6.w, m_FallOffPower6), 0.0, 1.0);
          }        
        #endif

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 7
    if (projCoord7.w > 0.0)
    {
      if (cosAngle7 > 0.0)
      {   
        projColor = texture2DProj(m_ProjectiveMap7, projCoord7);

        if (cosAngle7 < 0.2)
        {
          projColor.a *= cosAngle7 * 5.0;
        }

        #ifdef FALL_OFF7
          if (projCoord7.w > m_FallOffDistance7)
          {
            float maxDist = m_FallOffDistance7 + 1.0;
            projColor.a *= clamp(pow(maxDist - projCoord7.w, m_FallOffPower7), 0.0, 1.0);
          }        
        #endif

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 0
    gl_FragColor = blendColor;
  #endif
}