#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  varying vec2 texCoord;
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
        Idiff *= texture2D(m_DiffuseMap, texCoord);
        Idiff = clamp(Idiff, 0.0, 1.0);
      #endif
    #else
      vec4 Idiff = vec4(0.0);
    #endif

    // calculate Specular Term:
    #ifdef SPECULARMAP
      vec4 Ispec = gl_Color;
      Idiff *= texture2D(m_SpecularMap, texCoord);
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

  varying vec3 wvPosition;
  varying vec3 wvNormal;

  #if defined(NORMALMAP) && !defined(NORMALMAP_PERTURB)
    varying vec3 vViewDir;
    varying vec3 wvTangent;
    varying vec3 wvBitangent;
  #endif

  void calculateLightVector(const in vec4 lightPosition, const in vec4 lightColor, const in vec3 V, out vec3 L)
  {
    // positional or directional light?
    float isPosLight = step(0.5, lightColor.w);
    vec4 wvLightPos = (g_ViewMatrix * vec4(lightPosition.xyz, clamp(lightColor.w, 0.0, 1.0)));
    L = wvLightPos.xyz * sign(isPosLight - 0.5) - V * isPosLight;

    #if defined(NORMALMAP) && !defined(NORMALMAP_PERTURB)
       mat3 tbnMat = mat3(wvTangent, wvBitangent, wvNormal);
       L.xyz = (L.xyz * tbnMat).xyz;
    #endif
  }

  void calculateFragmentColor(const in vec3 N, const in vec3 L, const in vec3 E, const in vec4 lightColor, inout vec4 fragColor)
  {
    // calculate Diffuse Term:
    #if defined(MATERIAL_COLORS) && defined(DIFFUSE)
      #define NEED_DIFFUSE
    #endif
    #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP)
      vec4 Idiff = lightColor * max(dot(N, L), 0.0);
      #ifdef NEED_DIFFUSE
        Idiff *= m_Diffuse;
      #endif
      #ifdef DIFFUSEMAP
        Idiff *= texture2D(m_DiffuseMap, texCoord);
      #endif
      fragColor += Idiff;
    #endif

    // calculate Specular Term:
    #if defined(MATERIAL_COLORS) && defined(SPECULAR)
      #define NEED_SPECULAR
    #endif
    #if defined(NEED_SPECULAR) || defined(SPECULARMAP)
      vec3 R = normalize(-reflect(L, N));
      vec4 Ispec = lightColor * pow(max(dot(R, E), 0.0), m_Shininess);
      #ifdef NEED_SPECULAR
        Ispec *= m_Specular;
      #endif
      #ifdef SPECULARMAP
        Idiff *= texture2D(m_SpecularMap, texCoord);
      #endif
      fragColor += Ispec;
    #endif
  }

  void doPerFragmentLighting()
  {
    vec3 V; // view vector
    vec3 N; // normal vector
    vec3 E; // eye vector
    vec3 L; // light vector

    V = normalize(wvPosition);

    #ifdef NORMALMAP
      #ifdef NORMALMAP_PERTURB
        N = normalize(wvNormal + texture2D(m_NormalMap, texCoord).xyz * vec3(2.0) - vec3(1.0));
        E = -V;
      #else
        E = normalize(vViewDir);
      #endif
    #else
      N = normalize(wvNormal);
      E = -V;
    #endif

    //calculate Ambient Term:
    #if defined(MATERIAL_COLORS)
      gl_FragColor = m_Ambient * g_AmbientLightColor;
    #else
      gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0) * g_AmbientLightColor;
    #endif

    for (int i = 0; i < NUM_LIGHTS; i++)
    {
      vec4 lightPosition = g_LightPosition[i];
      vec4 lightColor = g_LightColor[i];
      calculateLightVector(lightPosition, lightColor, V, L);
      calculateFragmentColor(N, L, E, lightColor, gl_FragColor);
    }
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
