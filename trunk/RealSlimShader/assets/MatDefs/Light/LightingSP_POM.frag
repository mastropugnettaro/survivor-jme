#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

#if defined(MATERIAL_COLORS) && defined(DIFFUSE)
  #define NEED_DIFFUSE
#endif
#if defined(MATERIAL_COLORS) && defined(SPECULAR)
  #define NEED_SPECULAR
#endif

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP) || defined(PARALLAXMAP)
  varying vec2 v_TexCoord;
#endif

#ifdef DIFFUSEMAP
  uniform sampler2D m_DiffuseMap;
#endif

#ifdef NORMALMAP
  uniform sampler2D m_NormalMap;
#endif

#ifdef VERTEX_LIGHTING

  void textureVertexFragment()
  {
    // calculate Diffuse Term:
    #if defined(MATERIAL_COLORS) || defined(DIFFUSEMAP)
      vec4 Idiff = gl_Color;
      #ifdef DIFFUSEMAP
        Idiff *= texture2D(m_DiffuseMap, v_TexCoord);
        Idiff = clamp(Idiff, 0.0, 1.0);
      #endif
    #else
      vec4 Idiff = vec4(0.0);
    #endif

    // calculate Specular Term:
    #ifdef SPECULARMAP
      vec4 Ispec = gl_Color;
      Idiff *= texture2D(m_SpecularMap, v_TexCoord);
      Ispec = clamp(Ispec, 0.0, 1.0);
    #else
      vec4 Ispec = vec4(0.0);
    #endif

    gl_FragColor = Idiff + Ispec;
  }

#else // per fragment lighting

  uniform mat4 g_WorldViewProjectionMatrix;
  uniform mat4 g_WorldViewMatrix;
  uniform mat4 g_ViewMatrix;
  uniform mat3 g_NormalMatrix;

  uniform vec4 g_LightPosition[NUM_LIGHTS];
  uniform vec4 g_LightColor[NUM_LIGHTS];
  uniform vec4 g_AmbientLightColor;

  #ifdef MATERIAL_COLORS
    uniform vec4 m_Ambient;
    uniform vec4 m_Diffuse;
    uniform vec4 m_Specular;
  #endif
  uniform float m_Shininess;

  varying vec3 v_wsPosition;
  varying vec3 v_wsView;
  varying vec3 v_wsNormal;

  #if defined(NORMALMAP)
    varying vec3 v_wsTangent;
    varying vec3 v_wsBitangent;
    varying vec3 v_tsView;

    #ifdef PARALLAXMAP
      uniform sampler2D m_ParallaxMap;
      uniform float m_ParallaxHeight;
      uniform float m_ParallaxAO;

      void calculateParallax(const in vec3 E, out vec2 parallaxTexCoord)
      {
        float h = texture2D(m_ParallaxMap, v_TexCoord).r;
        h = (h - 0.6) * m_ParallaxHeight * E.z;
        vec2 parallaxOffset = h * E.xy;
        parallaxTexCoord = v_TexCoord + parallaxOffset;
      }

      float MipmapLevel(vec2 UV, vec2 TextureSize)
      {
        vec2 ddx = dFdx(UV * TextureSize.x);
        vec2 ddy = dFdy(UV * TextureSize.y);
        vec2 dist = sqrt(ddx * ddx + ddy * ddy);
        return log2(max(dist.x,dist.y));
        //return log2(sqrt(max(dot(ddx,ddx),dot(ddy,ddy))));
      }

      const int nMinSamples = 4;
      const int	nMaxSamples = 500;
      const float fTexelsPerSide = sqrt(512.0 * 512.0 * 2.0);

      void calculateParallax2(const in vec3 E, const in vec3 N, out vec2 parallaxTexCoord)
      {
        float fParallaxLimit = length(E.xy) / E.z;
        fParallaxLimit *= m_ParallaxHeight;

        vec2 parallaxOffset = normalize(-E.xy);
        parallaxOffset *= fParallaxLimit;

        int nNumSamples = int(mix(nMinSamples, nMaxSamples, dot(E, N))); // calculate dynamic number of samples (Tatarchuk's method)
        //int nNumSamples = int(fParallaxLimit * fTexelsPerSide); // calculate dynamic number of samples (Zink's method)
        //int nNumSamples = 50;
        float fStepSize = 1.0 / nNumSamples;

        vec2 ddx = dFdx(v_TexCoord * vec2(512.0));
        vec2 ddy = dFdy(v_TexCoord * vec2(512.0));
        vec2 dist = sqrt(ddx * ddx + ddy * ddy);
        float lod = log2(max(dist.x, dist.y));

        vec2 vOffsetStep = fStepSize * parallaxOffset;
        vec2 vCurrOffset = vec2(0.0, 0.0);
        vec2 vLastOffset = vec2(0.0, 0.0);
        vec2 vFinalOffset = vec2(0.0, 0.0);

        vec4 vCurrSample;
	      vec4 vLastSample;

	      float stepHeight = 1.0;	
	      int nCurrSample = 0;

        while (nCurrSample < nNumSamples)
        {
          parallaxTexCoord = v_TexCoord + vCurrOffset;
          //vCurrSample = texture2D(m_ParallaxMap, parallaxTexCoord);
          vCurrSample = texture2DLod(m_ParallaxMap, parallaxTexCoord, lod); // sample the current texcoord offset
          //vCurrSample = texture2DGrad(m_ParallaxMap, parallaxTexCoord, ddx, ddy); // sample the current texcoord offset
          if (vCurrSample.r > stepHeight)
          {
            // calculate the linear intersection point
            float Ua = (vLastSample.r - (stepHeight + fStepSize)) / (fStepSize + (vCurrSample.r - vLastSample.r));
            vFinalOffset = vLastOffset + Ua * vOffsetStep;

            parallaxTexCoord = v_TexCoord + vCurrOffset;
            //vCurrSample = texture2D(m_ParallaxMap, parallaxTexCoord);
            vCurrSample = texture2DLod(m_ParallaxMap, parallaxTexCoord, lod); // sample the corrected tex coords
            //vCurrSample = texture2DGrad(m_ParallaxMap, parallaxTexCoord, ddx, ddy); // sample the corrected tex coords
            nCurrSample = nNumSamples + 1; // exit the while loop
          }
          else
          {
            nCurrSample++;              // increment to the next sample
            stepHeight -= fStepSize;    // change the required height-map height
            vLastOffset = vCurrOffset;  // remember this texcoord offset for next time
            vCurrOffset += vOffsetStep; // increment to the next texcoord offset
            vLastSample = vCurrSample;
          }
        }
      }
  
    #endif
  #endif

  void initializeMaterialColors(
    #if defined(PARALLAXMAP) && defined(NORMALMAP)
      const in vec2 parallaxTexCoord,
    #endif
      out vec3 ambientColor, 
      out vec3 diffuseColor, 
      out vec3 specularColor, 
      out float alpha)
  {
    #if defined(MATERIAL_COLORS) && defined(AMBIENT)
      ambientColor = m_Ambient.rgb;
    #else
      ambientColor = vec3(0.2);
    #endif
    
    #if defined(MATERIAL_COLORS) && defined(DIFFUSE)
      diffuseColor = m_Diffuse.rgb;
      alpha = m_Diffuse.a;
    #else
      diffuseColor = 1.0;
      alpha = 1.0;
    #endif

    #ifdef DIFFUSEMAP
      vec4 diffuseMapColor;
      #ifdef PARALLAXMAP
        diffuseMapColor = texture2D(m_DiffuseMap, parallaxTexCoord);
      #else
        diffuseMapColor = texture2D(m_DiffuseMap, v_TexCoord);
      #endif

      diffuseColor *= diffuseMapColor.rgb;
      alpha *= diffuseMapColor.a;
    #endif

    #if defined(MATERIAL_COLORS) && defined(SPECULAR)
      specularColor = m_Specular.xyz;
    #else
      specularColor = vec3(0.0);
    #endif

    #ifdef SPECULARMAP
      specularColor *= texture2D(m_SpecularMap, v_TexCoord);
    #endif

    // ToDo: light map, alpha map
  }

  void calculateLightVector(const in vec4 lightPosition, const in vec4 lightColor, 
    out vec3 lightVector, out float attenuation)
  {
    // positional or directional light?
    if (lightColor.w == 0.0)
    {
      lightVector = -lightPosition.xyz;
      attenuation = 1.0;
    }
    else
    {
      lightVector = lightPosition.xyz - v_wsPosition;
      float dist = length(lightVector);
      lightVector /= vec3(dist);
      attenuation = clamp(1.0 - lightPosition.w * dist, 0.0, 1.0);
    }  
  }

  void addLight(const in vec3 N, const in vec3 L, const in vec3 E, 
    const in vec3 lightColor, const in float attenuation, 
    inout vec3 diffuseLightSum, inout vec3 specularLightSum)
  {
    diffuseLightSum += lightColor * max(dot(N, L), 0.0) * attenuation;

    vec3 R = reflect(-L, N);
    specularLightSum += lightColor * pow(max(dot(R, E), 0.0), m_Shininess) * attenuation;
  }

  void doPerFragmentLighting()
  {
    vec3 V; // view vector
    vec3 N; // normal vector
    vec3 E; // eye vector
    vec3 L; // light vector

    vec3 ambientColor;
    vec3 diffuseColor;
    vec3 specularColor;
    float alpha;
    float attenuation;

    #ifdef NORMALMAP
      V = normalize(v_tsView);
      E = -V;
      vec3 wsTangent = normalize(v_wsTangent);
      vec3 wsBitangent = normalize(v_wsBitangent);
      vec3 wsNormal = normalize(v_wsNormal);

      // world space -> tangent space matrix
      mat3 wsTangentMatrix = mat3(wsTangent, wsBitangent, wsNormal);

      #ifdef PARALLAXMAP
        vec2 parallaxTexCoord;
        //calculateParallax(E, parallaxTexCoord);
        vec3 Nx = normalize(texture2D(m_NormalMap, v_TexCoord).xyz * 2.0 - 1.0);        
        calculateParallax2(E, Nx, parallaxTexCoord);
        N = normalize(texture2D(m_NormalMap, parallaxTexCoord).xyz * 2.0 - 1.0);
      #else
        N = normalize(texture2D(m_NormalMap, v_TexCoord).xyz * 2.0 - 1.0);
      #endif
    #else
      V = normalize(v_wsView);
      E = -V;
      N = normalize(v_wsNormal);
    #endif

    #if defined(PARALLAXMAP) && defined(NORMALMAP)
      initializeMaterialColors(parallaxTexCoord,
        ambientColor, diffuseColor, specularColor, alpha);
    #else
      initializeMaterialColors(
        ambientColor, diffuseColor, specularColor, alpha);
    #endif

    vec3 ambientLightSum = ambientColor * g_AmbientLightColor.rgb;
    vec3 diffuseLightSum = vec3(0.0);
    vec3 specularLightSum = vec3(0.0);

    for (int i = 0; i < NUM_LIGHTS; i++)
    {
      vec4 lightPosition = g_LightPosition[i];
      vec4 lightColor = g_LightColor[i];
      vec3 lightVector;

      calculateLightVector(lightPosition, lightColor, lightVector, attenuation);

      #ifdef NORMALMAP        
        L = lightVector * wsTangentMatrix; // world space -> tangent space
      #else
        L = lightVector; // world space
      #endif

      L = normalize(L);

      addLight(N, L, E, lightColor.rgb, attenuation, diffuseLightSum, specularLightSum);
    }

    gl_FragColor.rgb = diffuseColor * (ambientLightSum + diffuseLightSum) + specularColor * specularLightSum;
    gl_FragColor.a = alpha;
  }
#endif

void main(void)
{
  #ifdef VERTEX_LIGHTING
    textureVertexFragment();
  #else
    doPerFragmentLighting();
  #endif
}
