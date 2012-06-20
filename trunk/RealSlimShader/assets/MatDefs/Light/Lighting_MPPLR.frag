#ifndef QUADS_PER_PASS
  #define QUADS_PER_PASS 1
#endif

#define DEF // just to fix syntax highlighting a bit

#if defined(MATERIAL_COLORS) && defined(DIFFUSE)
  #define NEED_DIFFUSE
#endif

#if defined(MATERIAL_COLORS) && defined(SPECULAR)
  #define NEED_SPECULAR
#endif

#ifdef MATERIAL_COLORS
  uniform vec4 m_Ambient;
  uniform vec4 m_Diffuse;
  uniform vec4 m_Specular;
#endif
uniform float m_Shininess;

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  varying vec2 v_TexCoord;
#endif

#ifdef DIFFUSEMAP
  uniform sampler2D m_DiffuseMap;
#endif

uniform vec4 g_LightPosition[QUADS_PER_PASS*4];
#ifdef HAS_SPOTLIGHTS
  uniform vec4 g_LightDirection[QUADS_PER_PASS*4];
#endif
uniform vec4 g_LightColor[QUADS_PER_PASS*4];
uniform vec4 g_AmbientLightColor;

varying vec3 v_View;

#define ALQ_FP_LC const in vec4 LC0, const in vec4 LC1, const in vec4 LC2, const in vec4 LC3
#define ALQ_AP_LC g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3]

#define ALQ_FP_WVN , const in vec4 LW, const in vec3 V, const in vec3 N
#define ALQ_AP_WVN , g_LightQuadW[QI], V, N

#ifdef NORMALMAP
  uniform sampler2D m_NormalMap;

  varying vec4 v_tsLightQuadX[QUADS_PER_PASS];
  varying vec4 v_tsLightQuadY[QUADS_PER_PASS];
  varying vec4 v_tsLightQuadZ[QUADS_PER_PASS];

  #define ALQ_FP_TS , const in vec4 tsLX, const in vec4 tsLY, const in vec4 tsLZ
  #define ALQ_AP_TS , v_tsLightQuadX[QI], v_tsLightQuadY[QI], v_tsLightQuadZ[QI]
#else
  varying vec3 v_Normal;

  #define ALQ_FP_TS
  #define ALQ_AP_TS
#endif

uniform vec4 g_LightQuadW[QUADS_PER_PASS];

#if !defined(NORMALMAP) || defined(HAS_SPOTLIGHTS)
  varying vec4 v_wsLightQuadX[QUADS_PER_PASS];
  varying vec4 v_wsLightQuadY[QUADS_PER_PASS];
  varying vec4 v_wsLightQuadZ[QUADS_PER_PASS];

  #define ALQ_FP_WS , const in vec4 wsLX, const in vec4 wsLY, const in vec4 wsLZ
  #define ALQ_AP_WS , v_wsLightQuadX[QI], v_wsLightQuadY[QI], v_wsLightQuadZ[QI]
#else
  #define ALQ_FP_WS
  #define ALQ_AP_WS
#endif

#ifdef HAS_SPOTLIGHTS
  #define ALQ_FP_LD , const in vec4 LD0, const in vec4 LD1, const in vec4 LD2, const in vec4 LD3
  #define ALQ_AP_LD , g_LightDirection[4*QI+0], g_LightDirection[4*QI+1], g_LightDirection[4*QI+2], g_LightDirection[4*QI+3]
#else
  #define ALQ_FP_LD
  #define ALQ_AP_LD
#endif

#define ALQ_FP_OUT , inout vec4 diffuseSum, inout vec4 specularSum
#define ALQ_AP_OUT , diffuseSum, specularSum

#define ALQ_FP ALQ_FP_LC ALQ_FP_WVN ALQ_FP_WS ALQ_FP_TS ALQ_FP_LD ALQ_FP_OUT
#define ALQ_AP ALQ_AP_LC ALQ_AP_WVN ALQ_AP_WS ALQ_AP_TS ALQ_AP_LD ALQ_AP_OUT

const vec2 specular_ab = vec2(6.645, -5.645);
//vec2 specular_ab = vec2(m_Shininess, m_Shininess * -0.985);

#if defined(PARALLAXMAP)
  uniform sampler2D m_ParallaxMap;
#endif

#if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
  uniform float m_ParallaxHeight;
  uniform float m_ParallaxShadowSoftening;

  float getHeightSample(const in vec2 texCoord)
  {
    #if defined(PARALLAXMAP)
      return texture2D(m_ParallaxMap, texCoord).r;
    #elif defined(NORMALMAP_PARALLAX)
      return texture2D(m_NormalMap, texCoord).a;
    #endif
  }

  void calculateParallaxTexCoord(const in vec3 V, inout vec2 parallaxTexCoord)
  {
    float h = getHeightSample(parallaxTexCoord);
    float heightBias = m_ParallaxHeight * -0.6;
    h = (h * m_ParallaxHeight + heightBias) * V.z;
    parallaxTexCoord = parallaxTexCoord + (h * V.xy);
  }
#endif

//#define LOW_QUALITY_SPECULAR
#ifdef LOW_QUALITY_SPECULAR
  vec4 computeSpecularPower(const in vec4 v)
  {
    // originally: pow(v, N)
    // x^N is roughly equal to (max(Ax+B, 0))^2
    // A,B depend on N
    vec4 t = clamp(specular_ab.x * v + specular_ab.y, 0.0, 1.0);
    return t * t;
  }
#endif

void addLightQuad(DEF ALQ_FP)
{
  vec4 diffuseQuad, specularQuad;

  #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP) || defined(NEED_SPECULAR) || defined(SPECULARMAP)

    #if !defined(NORMALMAP) || defined(HAS_SPOTLIGHTS)
      vec4 wsLengths = sqrt(wsLX * wsLX + wsLY * wsLY + wsLZ * wsLZ);
    #endif

    // compute lengths and scale in parallel
    #ifdef NORMALMAP
      vec4 lightLengths = sqrt(tsLX * tsLX + tsLY * tsLY + tsLZ * tsLZ);
    #else
      vec4 lightLengths = wsLengths;
    #endif

    vec4 intensity = vec4(1.0) - LW * lightLengths;

    #ifdef HAS_SPOTLIGHTS
      vec4 LDX = vec4(LD0.x, LD1.x, LD2.x, LD3.x);
      vec4 LDY = vec4(LD0.y, LD1.y, LD2.y, LD3.y);
      vec4 LDZ = vec4(LD0.z, LD1.z, LD2.z, LD3.z);
      vec4 LDW = vec4(LD0.w, LD1.w, LD2.w, LD3.w);

      vec4 curAngleCos = -(wsLX * LDX + wsLY * LDY + wsLZ * LDZ) / wsLengths;
      vec4 innerAngleCos = floor(LDW) * vec4(0.001);
      vec4 outerAngleCos = fract(LDW);
      vec4 innerMinusOuter = innerAngleCos - outerAngleCos;
      vec4 spotFallOff = clamp((curAngleCos - outerAngleCos) / innerMinusOuter, 0.0, 1.0);
      intensity *= spotFallOff;
    #endif

    intensity = clamp(intensity, vec4(0.0), vec4(1.0));
    vec4 scale = lightLengths / intensity;
  #endif

  #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP)
    // compute NdotL in parallel
    vec4 NdotL = tsLX * N.x + tsLY * N.y + tsLZ * N.z;

    // normalize NdotL and scale by intensity
    diffuseQuad = NdotL / scale;
  #endif

  #if defined(NEED_SPECULAR) || defined(SPECULARMAP)
    // dot(reflect(L, N), V) == dot(reflect(V, N), L)
    // compute RdotL in parallel
    vec3 R = reflect(V, N);
    vec4 RdotL = tsLX * R.x + tsLY * R.y + tsLZ * R.z;

    // normalize RdotL and scale by intensity
    RdotL = RdotL / scale;

    // specular
    #ifdef LOW_QUALITY_SPECULAR
      specularQuad = computeSpecularPower(RdotL); // cheap, low quality
    #else
      specularQuad[0] = pow(max(RdotL[0], 0.0), m_Shininess);
      specularQuad[1] = pow(max(RdotL[1], 0.0), m_Shininess);
      specularQuad[2] = pow(max(RdotL[2], 0.0), m_Shininess);
      specularQuad[3] = pow(max(RdotL[3], 0.0), m_Shininess);
    #endif
  #endif

  diffuseSum += diffuseQuad[0] * LC0;
  diffuseSum += diffuseQuad[1] * LC1;
  diffuseSum += diffuseQuad[2] * LC2;
  diffuseSum += diffuseQuad[3] * LC3;

  specularSum += specularQuad[0] * LC0;
  specularSum += specularQuad[1] * LC1;
  specularSum += specularQuad[2] * LC2;
  specularSum += specularQuad[3] * LC3;
}

void doPerFragmentLighting()
{
  vec3 V; // view vector
  vec3 N; // normal vector

  V = normalize(v_View);

  #ifdef NORMALMAP
    vec2 texCoord = v_TexCoord;
    #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
      calculateParallaxTexCoord(V, texCoord);
    #endif
    N = normalize(vec3(texture2D(m_NormalMap, texCoord)) * 2.0 - 1.0);
  #else
    N = normalize(v_Normal);
  #endif

  #if defined(MATERIAL_COLORS)
    gl_FragColor = m_Ambient * g_AmbientLightColor;
  #else
    gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0) * g_AmbientLightColor;
  #endif

  vec4 diffuseSum = vec4(0.0);
  vec4 specularSum = vec4(0.0);

  #undef QI
  #define QI 0
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 1
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 2
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 3
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 4
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 5
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 6
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #undef QI
  #define QI 7
  #if QUADS_PER_PASS > QI
    addLightQuad(ALQ_AP);
  #endif

  #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP)
    #ifdef NEED_DIFFUSE
      diffuseSum *= m_Diffuse;
    #endif
    #ifdef DIFFUSEMAP
      diffuseSum *= texture2D(m_DiffuseMap, texCoord);
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

void main (void)
{
  doPerFragmentLighting();
}
