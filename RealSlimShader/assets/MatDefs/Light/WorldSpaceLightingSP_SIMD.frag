#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

#define NUM_QUADS (1+(NUM_LIGHTS-1)/4)
#define NUM_LIGHTZ (NUM_QUADS*4)

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

  uniform vec4 g_LightPosition[NUM_LIGHTZ];
  uniform vec4 g_LightColor[NUM_LIGHTZ];
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
    varying mat4 v_NormalMapMatrix;
  #endif

  #if defined(MATERIAL_COLORS) && defined(DIFFUSE)
    #define NEED_DIFFUSE
  #endif

  #if defined(MATERIAL_COLORS) && defined(SPECULAR)
    #define NEED_SPECULAR
  #endif

  const vec2 specular_ab = vec2(6.645, -5.645);
  //vec2 specular_ab = vec2(m_Shininess, m_Shininess * -0.985);

  vec4 computeSpecularPower(const in vec4 v)
  {
    // originally: pow(v, N)
    // x^N is roughly equal to (max(Ax+B, 0))^2
    // A,B depend on N
    vec4 t = clamp(specular_ab.x * v + specular_ab.y, 0.0, 1.0);
    return t * t;
  }

  void calculateLightVector(const in vec4 lightPosition, const in vec4 lightColor, const in vec3 P, out vec4 L)
  {
    // positional or directional light?
    //float isPosLight = step(0.5, lightColor.w);
    //L = vec4(lightPosition.xyz * sign(isPosLight - 0.5) - P * isPosLight, lightPosition.w);
    if (lightColor.w == 0.0)
    {
      L = vec4(-lightPosition.xyz, 0.0);
    }
    else
    {
      L = vec4(normalize(lightPosition.xyz - P), lightPosition.w);
    }
  }

  void computeLighting4(
    const in vec4 LX, const in vec4 LY, const in vec4 LZ, const in vec4 LW, 
    const in vec3 V, const in vec3 N, out vec4 diffuse, out vec4 specular)
  {
    #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP) || defined(NEED_SPECULAR) || defined(SPECULARMAP)
      // compute squared lengths in parallel
      vec4 squaredLengths = LX * LX + LY * LY + LZ * LZ;
      vec4 len = sqrt(squaredLengths) + vec4(0.00000001); // prevent div by zero

      // attenuation
      // 1 - d^2 / r^2 for diffuse
      //vec4 attenuation = clamp(squaredLengths * LW, 0.0, 1.0);
      vec4 attenuation = clamp(1.0 - squaredLengths * LW, 0.0, 1.0);
    #endif

    #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP)
      // compute NdotL in parallel
      vec4 NdotL = LX * N.x + LY * N.y + LZ * N.z;

      // normalize NdotL
      diffuse = clamp(NdotL / len, 0.0, 1.0);

      // modulate diffuse by attenuation
      //diffuse = diffuse - clamp(diffuse * attenuation, 0.0, 1.0);
      diffuse *= attenuation;
    #endif

    #if defined(NEED_SPECULAR) || defined(SPECULARMAP)
      // dot(reflect(L, N), V) == dot(reflect(V, N), L)
      // compute RdotL in parallel
      vec3 R = reflect(V, N);
      vec4 RdotL = LX * R.x + LY * R.y + LZ * R.z;

      // normalize RdotL
      specular = clamp(RdotL / len, 0.0, 1.0);
      //specular = RdotL / len;
    
      // specular
      //specular = computeSpecularPower(RdotL); // cheap, low quality
      specular[0] = pow(max(RdotL[0], 0.0), m_Shininess);
      specular[1] = pow(max(RdotL[1], 0.0), m_Shininess);
      specular[2] = pow(max(RdotL[2], 0.0), m_Shininess);
      specular[3] = pow(max(RdotL[3], 0.0), m_Shininess);

      // modulate specular by attenuation
      //specular = specular - clamp(specular * attenuation, 0.0, 1.0);
      specular *= attenuation;
    #endif
  }

  void doPerFragmentLighting()
  {
    vec3 V; // view vector
    vec3 N; // normal vector

    V = v_View;

    #ifdef NORMALMAP
      N = vec3(normalize(texture2D(m_NormalMap, v_TexCoord) * v_NormalMapMatrix));
    #else
      N = normalize(v_Normal);
    #endif

    //calculate Ambient Term:
    #if defined(MATERIAL_COLORS)
      gl_FragColor = m_Ambient * g_AmbientLightColor;
    #else
      gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0) * g_AmbientLightColor;
    #endif
 
    vec4 diffuseSum = vec4(0.0);
    vec4 specularSum = vec4(0.0);
  
    for (int i = 0; i < NUM_LIGHTZ; i += 4)
    {
      vec4 L0, L1, L2, L3;
      vec4 diffuseQuad, specularQuad;

      calculateLightVector(g_LightPosition[i+0], g_LightColor[i+0], v_Position, L0);
      calculateLightVector(g_LightPosition[i+1], g_LightColor[i+1], v_Position, L1);
      calculateLightVector(g_LightPosition[i+2], g_LightColor[i+2], v_Position, L2);
      calculateLightVector(g_LightPosition[i+3], g_LightColor[i+3], v_Position, L3);

      vec4 LX = vec4(L0.x, L1.x, L2.x, L3.x);
      vec4 LY = vec4(L0.y, L1.y, L2.y, L3.y);
      vec4 LZ = vec4(L0.z, L1.z, L2.z, L3.z);
      vec4 LW = vec4(L0.w, L1.w, L2.w, L3.w);

      computeLighting4(LX, LY, LZ, LW, V, N, diffuseQuad, specularQuad);

      diffuseSum += diffuseQuad[0] * g_LightColor[i+0];
      diffuseSum += diffuseQuad[1] * g_LightColor[i+1];
      diffuseSum += diffuseQuad[2] * g_LightColor[i+2];
      diffuseSum += diffuseQuad[3] * g_LightColor[i+3];

      specularSum += specularQuad[0] * g_LightColor[i+0];
      specularSum += specularQuad[1] * g_LightColor[i+1];
      specularSum += specularQuad[2] * g_LightColor[i+2];
      specularSum += specularQuad[3] * g_LightColor[i+3];
    }

    #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP)
      #ifdef NEED_DIFFUSE
        diffuseSum *= m_Diffuse;
      #endif
      #ifdef DIFFUSEMAP
        diffuseSum *= texture2D(m_DiffuseMap, v_TexCoord);
      #endif
      gl_FragColor += diffuseSum;
    #endif

    #if defined(NEED_SPECULAR) || defined(SPECULARMAP)
      #ifdef NEED_SPECULAR
        specularSum *= m_Specular;
      #endif
      #ifdef SPECULARMAP
        specularSum *= texture2D(m_SpecularMap, v_TexCoord);
      #endif
      gl_FragColor += specularSum;
    #endif
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
