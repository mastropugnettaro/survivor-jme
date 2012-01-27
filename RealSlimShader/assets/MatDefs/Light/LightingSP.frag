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

  varying vec3 position;
  varying vec3 vsNormal;

  #if defined(NORMALMAP)
    varying vec3 vsTangent;
    varying vec3 vsBitangent;
  #endif

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

    V = normalize(position);
    E = -V;

    #ifdef NORMALMAP
      N = (texture2D(m_NormalMap, texCoord).xyz * vec3(2.0) - vec3(1.0));

      // view space -> tangent space matrix
      mat4 vsTangentMatrix = mat4(vec4(vsTangent,     0.0),
                                  vec4(vsBitangent,   0.0),
                                  vec4(vsNormal,      0.0),
                                  vec4(0.0, 0.0, 0.0, 1.0));
      // world space -> tangent space matrix
      mat4 wsViewTangentMatrix = vsTangentMatrix * g_ViewMatrix;
    #else
      N = vsNormal;
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
      vec4 lightVector;

      // positional or directional light?
      float isPosLight = step(0.5, lightColor.w);
      lightVector = vec4(lightPosition.xyz * sign(isPosLight - 0.5) - V * isPosLight,
        clamp(lightColor.w, 0.0, 1.0));

      #ifdef NORMALMAP
        // view space -> tangent space
        L = vec3(wsViewTangentMatrix * lightVector);
      #else
        L = vec3(g_ViewMatrix * lightVector);
      #endif

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
