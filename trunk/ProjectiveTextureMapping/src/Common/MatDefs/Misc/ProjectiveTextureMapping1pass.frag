#if NUM_PROJECTORS > 0
  varying vec4 projCoord0;
  varying float cosAngle0;

  uniform sampler2D m_ProjectiveMap0;
#endif

#if NUM_PROJECTORS > 1
  varying vec4 projCoord1;
  varying float cosAngle1;

  uniform sampler2D m_ProjectiveMap1;
#endif

#if NUM_PROJECTORS > 2
  varying vec4 projCoord2;
  varying float cosAngle2;

  uniform sampler2D m_ProjectiveMap2;
#endif

#if NUM_PROJECTORS > 3
  varying vec4 projCoord3;
  varying float cosAngle3;

  uniform sampler2D m_ProjectiveMap3;
#endif

#if NUM_PROJECTORS > 4
  varying vec4 projCoord4;
  varying float cosAngle4;

  uniform sampler2D m_ProjectiveMap4;
#endif

#if NUM_PROJECTORS > 5
  varying vec4 projCoord5;
  varying float cosAngle5;

  uniform sampler2D m_ProjectiveMap5;
#endif

#if NUM_PROJECTORS > 6
  varying vec4 projCoord6;
  varying float cosAngle6;

  uniform sampler2D m_ProjectiveMap6;
#endif

#if NUM_PROJECTORS > 7
  varying vec4 projCoord7;
  varying float cosAngle7;

  uniform sampler2D m_ProjectiveMap7;
#endif


void main() 
{
  #if NUM_PROJECTORS > 0
    vec2 pCoord;
    vec4 projColor;
    vec4 blendColor;

    pCoord = projCoord0.xy / projCoord0.w;
    projColor = texture2D(m_ProjectiveMap0, pCoord);

    if (projCoord0.w > 0.0)
    {
      if (cosAngle0 > 0.0)
      {   
        if (cosAngle0 < 0.2)
        {
          projColor.a *= cosAngle0 * 5.0;
        }

        blendColor = projColor;
      }
    }
  #endif

  #if NUM_PROJECTORS > 1
    pCoord = projCoord1.xy / projCoord1.w;
    projColor = texture2D(m_ProjectiveMap1, pCoord);

    if (projCoord1.w > 0.0)
    {
      if (cosAngle1 > 0.0)
      {   
        if (cosAngle1 < 0.2)
        {
          projColor.a *= cosAngle1 * 5.0;
        }

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 2
    pCoord = projCoord2.xy / projCoord2.w;
    projColor = texture2D(m_ProjectiveMap2, pCoord);

    if (projCoord2.w > 0.0)
    {
      if (cosAngle2 > 0.0)
      {   
        if (cosAngle2 < 0.2)
        {
          projColor.a *= cosAngle2 * 5.0;
        }

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 3
    pCoord = projCoord3.xy / projCoord3.w;
    projColor = texture2D(m_ProjectiveMap3, pCoord);

    if (projCoord3.w > 0.0)
    {
      if (cosAngle3 > 0.0)
      {   
        if (cosAngle3 < 0.2)
        {
          projColor.a *= cosAngle3 * 5.0;
        }

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 4
    pCoord = projCoord4.xy / projCoord4.w;
    projColor = texture2D(m_ProjectiveMap4, pCoord);

    if (projCoord4.w > 0.0)
    {
      if (cosAngle4 > 0.0)
      {   
        if (cosAngle4 < 0.2)
        {
          projColor.a *= cosAngle4 * 5.0;
        }

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 5
    pCoord = projCoord5.xy / projCoord5.w;
    projColor = texture2D(m_ProjectiveMap5, pCoord);

    if (projCoord5.w > 0.0)
    {
      if (cosAngle5 > 0.0)
      {   
        if (cosAngle5 < 0.2)
        {
          projColor.a *= cosAngle5 * 5.0;
        }

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 6
    pCoord = projCoord6.xy / projCoord6.w;
    projColor = texture2D(m_ProjectiveMap6, pCoord);

    if (projCoord6.w > 0.0)
    {
      if (cosAngle6 > 0.0)
      {   
        if (cosAngle6 < 0.2)
        {
          projColor.a *= cosAngle6 * 5.0;
        }

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 7
    pCoord = projCoord7.xy / projCoord7.w;
    projColor = texture2D(m_ProjectiveMap7, pCoord);

    if (projCoord7.w > 0.0)
    {
      if (cosAngle7 > 0.0)
      {   
        if (cosAngle7 < 0.2)
        {
          projColor.a *= cosAngle7 * 5.0;
        }

        blendColor = mix(blendColor, projColor, projColor.a);
      }
    }
  #endif

  #if NUM_PROJECTORS > 0
    gl_FragColor = blendColor;
  #endif
}
