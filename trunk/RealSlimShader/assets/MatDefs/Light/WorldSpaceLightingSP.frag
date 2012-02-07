#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
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
    #define HQ_NORMALMAPPING
    #ifdef HQ_NORMALMAPPING
      varying vec3 v_Tangent;
      varying vec3 v_Bitangent;
    #else
      varying mat4 v_NormalMapMatrix;
    #endif
  #endif

  void calculateFragmentColor(const in vec3 N, const in vec3 L, const in vec3 E, 
    const in vec4 lightColor, const in float attenuation, inout vec4 fragColor)
  {
    vec4 fragColorSum = vec4(0.0);

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
        Idiff *= texture2D(m_DiffuseMap, v_TexCoord);
      #endif
      fragColorSum += Idiff;
    #endif

    // calculate Specular Term:
    #if defined(MATERIAL_COLORS) && defined(SPECULAR)
      #define NEED_SPECULAR
    #endif
    #if defined(NEED_SPECULAR) || defined(SPECULARMAP)
      vec3 R = reflect(-L, N);
      vec4 Ispec = lightColor * pow(max(dot(R, E), 0.0), m_Shininess);
      #ifdef NEED_SPECULAR
        Ispec *= m_Specular;
      #endif
      #ifdef SPECULARMAP
        Idiff *= texture2D(m_SpecularMap, v_TexCoord);
      #endif
      fragColorSum += Ispec;
    #endif

    fragColor += fragColorSum * attenuation;
  }

  void doPerFragmentLighting()
  {
    vec3 V; // view vector
    vec3 N; // normal vector
    vec3 E; // eye vector
    vec3 L; // light vector
    float attenuation;

    V = normalize(v_View);
    E = -V;

    #ifdef NORMALMAP
      #ifdef HQ_NORMALMAPPING
        vec3 tangent = normalize(v_Tangent);
        vec3 bitangent = normalize(v_Bitangent);
        vec3 normal = normalize(v_Normal);
        mat3 normalMapMatrix = mat3(tangent, bitangent, normal);
        N = vec3(texture2D(m_NormalMap, v_TexCoord) * 2.0 - 1.0);
        N = normalize(normalMapMatrix * N);
      #else
        N = vec3(texture2D(m_NormalMap, v_TexCoord) * v_NormalMapMatrix);
      #endif
    #else
      N = normalize(v_Normal);
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

      // positional or directional light?
      if (lightColor.w == 0.0)
      {
        L = -lightPosition.xyz;
        attenuation = 1.0;
      }
      else
      {
        L = lightPosition.xyz - v_Position;
        float dist = length(L);
        L /= vec3(dist);
        attenuation = clamp(1.0 - lightPosition.w * dist, 0.0, 1.0);
      }

      calculateFragmentColor(N, L, E, lightColor, attenuation, gl_FragColor);
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
