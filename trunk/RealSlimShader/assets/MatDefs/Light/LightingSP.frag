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
  vec3 normal = normalize(v_Normal);

  #if defined(NORMALMAP)
    varying vec3 v_Tangent;
    varying vec3 v_Bitangent;
  #endif

  #ifdef PARALLAXMAP
    uniform sampler2D m_ParallaxMap;
    uniform float m_ParallaxHeight;
    uniform float m_ParallaxAO;
  #endif

  vec3 ambientColor;
  vec3 diffuseColor;
  vec3 specularColor;

  void calculateColors(const in vec3 E, const in vec3 N, const in vec3 normal,
    out vec3 ambientColor, out vec3 diffuseColor, out vec3 specularColor, out float alpha)
  {
    #if defined(MATERIAL_COLORS) && defined(AMBIENT)
      ambientColor = m_Ambient.xyz * g_AmbientLightColor;
    #else
      ambientColor = 0.2 * g_AmbientLightColor;
    #endif
    
    #if defined(MATERIAL_COLORS) && defined(DIFFUSE)
      diffuseColor = m_Diffuse.xyz;
      alpha = m_Diffuse.a;
    #else
      diffuseColor = 1.0;
      alpha = 1.0;
    #endif

    #ifdef DIFFUSEMAP
      #ifdef PARALLAXMAP
        float factor1 = dot(N, normal);
        float factor2 = max(dot(N, E), 0.0);
        float parallax = texture2D(m_ParallaxMap, v_TexCoord).r;
        factor1 = 1.0 - factor1 * factor1;
        float deltaTex = factor1 * factor2 * m_ParallaxHeight * parallax;
        diffuseColor *= texture2D(m_DiffuseMap, v_TexCoord - vec2(deltaTex, deltaTex));
        float ambientOcclusion = 1.0 - clamp(m_ParallaxAO * deltaTex, 0.0, 1.0);
        ambientColor *= ambientOcclusion;
      #else
        diffuseColor *= texture2D(m_DiffuseMap, v_TexCoord);
      #endif
    #endif

    #if defined(MATERIAL_COLORS) && defined(SPECULAR)
      specularColor = m_Specular.xyz;
    #else
      specularColor = 0.0;
    #endif

    #ifdef SPECULARMAP
      specularColor *= texture2D(m_SpecularMap, v_TexCoord);
    #endif
  }

//  void addLight(const in vec3 N, const in vec3 L, const in vec3 E, 
//    const in vec4 lightColor, const in float attenuation, inout vec4 fragColor)
//  {
//  }

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
      vec3 ambient = ambientColor;
      #ifdef NEED_DIFFUSE
        vec4 diffuse = m_Diffuse;
      #else
        vec4 diffuse = vec4(1.0);
      #endif
      #ifdef DIFFUSEMAP
        #ifdef PARALLAXMAP
          float Factor2 = max(dot(N, E), 0.0);
          float Factor1 = dot(N, normal);
          float parallax = texture2D(m_ParallaxMap, v_TexCoord).r;
          Factor1 = 1.0 - Factor1 * Factor1;
          float DeltaTex = Factor2 * Factor1 * m_ParallaxHeight * parallax;
          float AmbientOcclusionValue = (1.0 - clamp(m_ParallaxAO * DeltaTex, 0.0, 1.0));
          ambient *= AmbientOcclusionValue;
          diffuse *= texture2D(m_DiffuseMap, v_TexCoord - vec2(DeltaTex, DeltaTex));
        #else
          diffuse *= texture2D(m_DiffuseMap, v_TexCoord);
        #endif
      #endif
      fragColorSum += diffuse * (Idiff + vec4(ambient, 1.0));
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
        Ispec *= texture2D(m_SpecularMap, v_TexCoord);
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
      N = normalize(texture2D(m_NormalMap, v_TexCoord).xyz * 2.0 - 1.0);
      
      vec3 tangent = normalize(v_Tangent);
      vec3 bitangent = normalize(v_Bitangent);
      vec3 normal = normalize(v_Normal);

      // view space -> tangent space matrix
      mat4 vsTangentMatrix = mat4(vec4(tangent,       0.0),
                                  vec4(bitangent,     0.0),
                                  vec4(normal,        0.0),
                                  vec4(0.0, 0.0, 0.0, 1.0));
      // world space -> tangent space matrix
      mat4 wsViewTangentMatrix = transpose(vsTangentMatrix) * g_ViewMatrix;
    #else
      N = normalize(v_Normal);
    #endif

    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

    //calculate Ambient Term:
    #if defined(MATERIAL_COLORS)
      ambientColor = vec3(m_Ambient * g_AmbientLightColor);
    #else
      ambientColor = vec3(vec4(0.2, 0.2, 0.2, 1.0) * g_AmbientLightColor);
    #endif

    for (int i = 0; i < NUM_LIGHTS; i++)
    {
      vec4 lightPosition = g_LightPosition[i];
      vec4 lightColor = g_LightColor[i];
      vec3 lightVector;

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

      #ifdef NORMALMAP
        // world space -> tangent space
        L = vec3(wsViewTangentMatrix * vec4(lightVector, 0.0));
      #else        
        // world space -> view space
        L = vec3(g_ViewMatrix * vec4(lightVector, 0.0));
      #endif

      L = normalize(L);
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
