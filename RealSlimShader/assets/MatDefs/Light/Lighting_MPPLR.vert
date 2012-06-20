#ifndef QUADS_PER_PASS
  #define QUADS_PER_PASS 1
#endif

#define DEF // just to fix syntax highlighting a bit

attribute vec3 DEF inPosition;
attribute vec3 DEF inNormal;

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  attribute vec2 DEF inTexCoord;
  varying vec2 v_TexCoord;
#endif

uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldMatrix;
uniform mat3 g_WorldMatrixInverseTranspose;
uniform mat4 g_ViewMatrixInverse;

uniform vec4 g_LightPosition[QUADS_PER_PASS*4];
#ifdef HAS_SPOTLIGHTS
uniform vec4 g_LightDirection[QUADS_PER_PASS*4];
#endif
uniform vec4 g_LightColor[QUADS_PER_PASS*4];
uniform vec4 g_AmbientLightColor;

#ifdef MATERIAL_COLORS
  uniform vec4 m_Ambient;
  uniform vec4 m_Diffuse;
  uniform vec4 m_Specular;
#endif
uniform float m_Shininess;

varying vec3 v_View;

#define TLQ_FP_LP const vec4 LP0, const vec4 LP1, const vec4 LP2, const vec4 LP3
#define TLQ_AP_LP g_LightPosition[4*QI+0], g_LightPosition[4*QI+1], g_LightPosition[4*QI+2], g_LightPosition[4*QI+3]

#define TLQ_FP_LC , const vec4 LC0, const vec4 LC1, const vec4 LC2, const vec4 LC3
#define TLQ_AP_LC , g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3]

#define TLQ_FP_P , const in vec3 P
#define TLQ_AP_P , wsPosition

#ifdef NORMALMAP
  attribute vec4 inTangent;

  varying vec4 v_tsLightQuadX[QUADS_PER_PASS];
  varying vec4 v_tsLightQuadY[QUADS_PER_PASS];
  varying vec4 v_tsLightQuadZ[QUADS_PER_PASS];

  #define TLQ_FP_TBN , const in vec3 T, const in vec3 B, const in vec3 N
  #define TLQ_AP_TBN , wsTangent, wsBitangent, wsNormal

  #define TLQ_FP_TS , out vec4 tsLX, out vec4 tsLY, out vec4 tsLZ
  #define TLQ_AP_TS , v_tsLightQuadX[QI], v_tsLightQuadY[QI], v_tsLightQuadZ[QI]
#else
  varying vec3 v_Normal;

  #define TLQ_FP_TBN
  #define TLQ_AP_TBN

  #define TLQ_FP_TS
  #define TLQ_AP_TS
#endif

#if !defined(NORMALMAP) || defined(HAS_SPOTLIGHTS)
  varying vec4 v_wsLightQuadX[QUADS_PER_PASS];
  varying vec4 v_wsLightQuadY[QUADS_PER_PASS];
  varying vec4 v_wsLightQuadZ[QUADS_PER_PASS];

  #define TLQ_FP_WS , out vec4 wsLX, out vec4 wsLY, out vec4 wsLZ
  #define TLQ_AP_WS , v_wsLightQuadX[QI], v_wsLightQuadY[QI], v_wsLightQuadZ[QI]
#else
  #define TLQ_FP_WS
  #define TLQ_AP_WS
#endif

#define TLQ_FP TLQ_FP_LP TLQ_FP_LC TLQ_FP_P TLQ_FP_TBN TLQ_FP_WS TLQ_FP_TS
#define TLQ_AP TLQ_AP_LP TLQ_AP_LC TLQ_AP_P TLQ_AP_TBN TLQ_AP_WS TLQ_AP_TS

void calculateLightVector(
  const in vec4 lightPosition, const in vec4 lightColor, 
  const in vec3 wsPosition, out vec3 lightVector)
{
  // directional light?
  if (lightColor.w == 0.0)
  {
    lightVector = -lightPosition.xyz;
  }
  else // no, positional
  {
    lightVector = lightPosition.xyz - wsPosition;
  }
}

void transformLightQuad(DEF TLQ_FP)
{
  vec3 L0, L1, L2, L3;  

  calculateLightVector(LP0, LC0, P, L0);
  calculateLightVector(LP1, LC1, P, L1);
  calculateLightVector(LP2, LC2, P, L2);
  calculateLightVector(LP3, LC3, P, L3);

  #if !defined(NORMALMAP) || defined(HAS_SPOTLIGHTS)
    wsLX = vec4(L0.x, L1.x, L2.x, L3.x);
    wsLY = vec4(L0.y, L1.y, L2.y, L3.y);
    wsLZ = vec4(L0.z, L1.z, L2.z, L3.z);
  #endif

  #ifdef NORMALMAP
    // world space -> tangent space
    L0 = vec3(dot(L0, T), dot(L0, B), dot(L0, N));
    L1 = vec3(dot(L1, T), dot(L1, B), dot(L1, N));
    L2 = vec3(dot(L2, T), dot(L2, B), dot(L2, N));
    L3 = vec3(dot(L3, T), dot(L3, B), dot(L3, N));

    tsLX = vec4(L0.x, L1.x, L2.x, L3.x);
    tsLY = vec4(L0.y, L1.y, L2.y, L3.y);
    tsLZ = vec4(L0.z, L1.z, L2.z, L3.z);
  #endif
}

void main(void)
{
  vec4 osPosition = vec4(inPosition, 1.0);
  vec3 wsEyePosition = vec3(g_ViewMatrixInverse * vec4(0.0, 0.0, 0.0, 1.0));
  vec3 wsPosition = vec3(g_WorldMatrix * osPosition); // object space -> world space
  vec3 wsNormal = normalize(g_WorldMatrixInverseTranspose * inNormal);  // object space -> world space
  vec3 wsView = wsPosition - wsEyePosition;

  #ifdef NORMALMAP
    vec3 wsTangent = normalize(g_WorldMatrixInverseTranspose * inTangent.xyz); // object space -> world space
    vec3 wsBitangent = cross(wsNormal, wsTangent) * -inTangent.w;
    mat3 wsTangentMatrix = mat3(wsTangent, wsBitangent, wsNormal);
    v_View = wsView * wsTangentMatrix; // world space -> tangent space
  #else
    v_View = wsView;
    v_Normal = wsNormal;
  #endif

  vec3 L0, L1, L2, L3;

  #undef QI
  #define QI 0
  #if QUADS_PER_PASS > QI
    transformLightQuad(TLQ_AP);
  #endif

  #undef QI
  #define QI 1
  #if QUADS_PER_PASS > QI
    transformLightQuad(TLQ_AP);
  #endif

  #undef QI
  #define QI 2
  #if QUADS_PER_PASS > QI
    transformLightQuad(TLQ_AP);
  #endif

  #undef QI
  #define QI 3
  #if QUADS_PER_PASS > QI
    transformLightQuad(TLQ_AP);
  #endif

  #undef QI
  #define QI 4
  #if QUADS_PER_PASS > QI
    transformLightQuad(TLQ_AP);
  #endif

  #undef QI
  #define QI 5
  #if QUADS_PER_PASS > QI
    transformLightQuad(TLQ_AP);
  #endif

  #undef QI
  #define QI 6
  #if QUADS_PER_PASS > QI
    transformLightQuad(TLQ_AP);
  #endif

  #undef QI
  #define QI 7
  #if QUADS_PER_PASS > QI
    transformLightQuad(TLQ_AP);
  #endif

  #if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
    v_TexCoord = inTexCoord;
  #endif

  gl_Position = g_WorldViewProjectionMatrix * osPosition; // object space -> projection space
}
