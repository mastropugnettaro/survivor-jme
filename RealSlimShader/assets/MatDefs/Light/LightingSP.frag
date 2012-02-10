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

  varying vec3 v_Position;
  varying vec3 v_View;
  varying vec3 v_Normal;

  #if defined(NORMALMAP)
    varying vec3 v_Tangent;
    varying vec3 v_Bitangent;

    #ifdef PARALLAXMAP
      uniform sampler2D m_ParallaxMap;
      uniform float m_ParallaxHeight;
      uniform float m_ParallaxAO;

      void calculateParallax(const in vec3 E, out vec2 parallaxTexCoord, out float parallaxAO)
      {
        float h = texture2D(m_ParallaxMap, v_TexCoord).r;
        h = (h * m_ParallaxHeight - 0.6 * m_ParallaxHeight) * E.z;
        vec2 parallaxOffset = h * E.xy;
        parallaxTexCoord = v_TexCoord + parallaxOffset;
        parallaxAO = 1 - clamp(m_ParallaxAO * length(parallaxOffset), 0.0, 1.0);
      }
  /*
      void calculateParallaxOffset2(const in vec3 E, const in vec3 N, const in vec3 Nx,
        out vec2 parallaxOffset)
      {
        float factor1 = dot(N, Nx);
        float factor2 = max(dot(N, E), 0.0);
        float parallax = texture2D(m_ParallaxMap, v_TexCoord).r;
        factor1 = 1.0 - factor1 * factor1;
        float offset = -(factor1 * factor2 * m_ParallaxHeight * parallax);
        parallaxOffset = vec2(offset, offset);
      }

      void calculateParallaxOffset3(const in vec3 E, const in vec3 N, const in vec3 Nx,
        out vec2 parallaxOffset)
      {
        float fParallaxLimit = length(E.xy) / E.z;
        fParallaxLimit *= m_ParallaxHeight;

        parallaxOffset = normalize(-E.xy);
        parallaxOffset *= fParallaxLimit;

        //int nNumSamples = (int) lerp(nMinSamples, nMaxSamples, dot(E, N));
        //float fStepSize = 1.0 / (float) nNumSamples;
      }
  */
    #endif
  #endif

  void initializeMaterialColors(
    #if defined(PARALLAXMAP) && defined(NORMALMAP)
      const in vec2 parallaxTexCoord,
      const in float parallaxAO,
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
        ambientColor *= parallaxAO;
      #else
        diffuseMapColor = texture2D(m_DiffuseMap, v_TexCoord);
      #endif

      diffuseColor *= diffuseMapColor.rgb;
      alpha *= diffuseMapColor.a;
    #endif

    #if defined(MATERIAL_COLORS) && defined(SPECULAR)
      specularColor = m_Specular.xyz;
    #else
      specularColor = 0.0;
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
      lightVector = lightPosition.xyz - v_Position;
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

    V = normalize(v_View);
    E = -V;

    #ifdef NORMALMAP
      vec3 tangent = normalize(v_Tangent);
      vec3 bitangent = normalize(v_Bitangent);
      vec3 normal = normalize(v_Normal);

      // view space -> tangent space matrix
      mat4 vsTangentMatrix = transpose(mat4(vec4(tangent,       0.0),
                                            vec4(bitangent,     0.0),
                                            vec4(normal,        0.0),
                                            vec4(0.0, 0.0, 0.0, 1.0)));
      // world space -> tangent space matrix
      mat4 wsViewTangentMatrix = vsTangentMatrix * g_ViewMatrix;

      #ifdef PARALLAXMAP
        vec2 parallaxTexCoord;
        float parallaxAO;
        //N = normalize(texture2D(m_NormalMap, v_TexCoord).xyz * 2.0 - 1.0);
        //vec3 Nx = normalize(vec3(vsTangentMatrix * vec4(normal, 0.0)));
        //calculateParallaxOffset2(E, N, Nx, parallaxOffset);

        calculateParallax(E, parallaxTexCoord, parallaxAO);
        N = normalize(texture2D(m_NormalMap, parallaxTexCoord).xyz * 2.0 - 1.0);
      #endif
    #else
      N = normalize(v_Normal);
      #ifdef PARALLAXMAP
        vec2 parallaxOffset = vec2(0.0);
        vec2 parallaxTexCoord = v_TexCoord;
        float parallaxAO = 1.0;
      #endif
    #endif

    #if defined(PARALLAXMAP) && defined(NORMALMAP)
      initializeMaterialColors(parallaxTexCoord, parallaxAO,
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
        // world space -> tangent space
        L = vec3(wsViewTangentMatrix * vec4(lightVector, 0.0));
      #else        
        // world space -> view space
        L = vec3(g_ViewMatrix * vec4(lightVector, 0.0));
      #endif

      L = normalize(L);

      addLight(N, L, E, lightColor.rgb, attenuation, diffuseLightSum, specularLightSum);
    }

    gl_FragColor.rgb = diffuseColor * (ambientLightSum + diffuseLightSum) + specularColor * specularLightSum;
    gl_FragColor.a = alpha;
  }
#endif

void main (void)
{
  #ifdef VERTEX_LIGHTING
    textureVertexFragment();
  #else
    doPerFragmentLighting();
  #endif
}
