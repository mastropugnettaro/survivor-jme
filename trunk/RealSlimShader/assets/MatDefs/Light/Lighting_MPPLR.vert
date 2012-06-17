#ifndef QUADS_PER_PASS
  #define QUADS_PER_PASS 1
#endif

attribute vec3 inPosition;
attribute vec3 inNormal;

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  attribute vec2 inTexCoord;
  varying vec2 v_TexCoord;
#endif

uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldMatrix;
uniform mat3 g_WorldMatrixInverseTranspose;
uniform mat4 g_ViewMatrixInverse;

uniform vec4 g_LightPosition[QUADS_PER_PASS*4];
//uniform vec4 g_LightDirection[QUADS_PER_PASS*4];
uniform vec4 g_LightColor[QUADS_PER_PASS*4];
uniform vec4 g_AmbientLightColor;

#ifdef MATERIAL_COLORS
  uniform vec4 m_Ambient;
  uniform vec4 m_Diffuse;
  uniform vec4 m_Specular;
#endif
uniform float m_Shininess;

varying vec3 v_View;

varying vec4 v_LightQuadX[QUADS_PER_PASS];
varying vec4 v_LightQuadY[QUADS_PER_PASS];
varying vec4 v_LightQuadZ[QUADS_PER_PASS];

#if defined(NORMALMAP)
  attribute vec4 inTangent;
#else
  varying vec3 v_Normal;
#endif

void calculateLightVector(const in vec4 lightPosition, const in vec4 lightColor, 
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

void transformLightQuad(
  const vec4 LP0, const vec4 LP1, const vec4 LP2, const vec4 LP3, 
  const vec4 LC0, const vec4 LC1, const vec4 LC2, const vec4 LC3, 
  const in vec3 P, const in vec3 T, const in vec3 B, const in vec3 N, 
  out vec4 LX, out vec4 LY, out vec4 LZ)
{
  vec3 L0, L1, L2, L3;

  calculateLightVector(LP0, LC0, P, L0);
  calculateLightVector(LP1, LC1, P, L1);
  calculateLightVector(LP2, LC2, P, L2);
  calculateLightVector(LP3, LC3, P, L3);

  // world space -> tangent space
  L0 = vec3(dot(L0, T), dot(L0, B), dot(L0, N));
  L1 = vec3(dot(L1, T), dot(L1, B), dot(L1, N));
  L2 = vec3(dot(L2, T), dot(L2, B), dot(L2, N));
  L3 = vec3(dot(L3, T), dot(L3, B), dot(L3, N));

  LX = vec4(L0.x, L1.x, L2.x, L3.x);
  LY = vec4(L0.y, L1.y, L2.y, L3.y);
  LZ = vec4(L0.z, L1.z, L2.z, L3.z);
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
    transformLightQuad(
      g_LightPosition[4*QI+0], g_LightPosition[4*QI+1], g_LightPosition[4*QI+2], g_LightPosition[4*QI+3], 
      g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3], 
      wsPosition, wsTangent, wsBitangent, wsNormal,
      v_LightQuadX[QI], v_LightQuadY[QI], v_LightQuadZ[QI]);
  #endif

  #undef QI
  #define QI 1
  #if QUADS_PER_PASS > QI
    transformLightQuad(
      g_LightPosition[4*QI+0], g_LightPosition[4*QI+1], g_LightPosition[4*QI+2], g_LightPosition[4*QI+3], 
      g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3], 
      wsPosition, wsTangent, wsBitangent, wsNormal,
      v_LightQuadX[QI], v_LightQuadY[QI], v_LightQuadZ[QI]);
  #endif

  #undef QI
  #define QI 2
  #if QUADS_PER_PASS > QI
    transformLightQuad(
      g_LightPosition[4*QI+0], g_LightPosition[4*QI+1], g_LightPosition[4*QI+2], g_LightPosition[4*QI+3], 
      g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3], 
      wsPosition, wsTangent, wsBitangent, wsNormal,
      v_LightQuadX[QI], v_LightQuadY[QI], v_LightQuadZ[QI]);
  #endif

  #undef QI
  #define QI 3
  #if QUADS_PER_PASS > QI
    transformLightQuad(
      g_LightPosition[4*QI+0], g_LightPosition[4*QI+1], g_LightPosition[4*QI+2], g_LightPosition[4*QI+3], 
      g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3], 
      wsPosition, wsTangent, wsBitangent, wsNormal,
      v_LightQuadX[QI], v_LightQuadY[QI], v_LightQuadZ[QI]);
  #endif

  #undef QI
  #define QI 4
  #if QUADS_PER_PASS > QI
    transformLightQuad(
      g_LightPosition[4*QI+0], g_LightPosition[4*QI+1], g_LightPosition[4*QI+2], g_LightPosition[4*QI+3], 
      g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3], 
      wsPosition, wsTangent, wsBitangent, wsNormal,
      v_LightQuadX[QI], v_LightQuadY[QI], v_LightQuadZ[QI]);
  #endif

  #undef QI
  #define QI 5
  #if QUADS_PER_PASS > QI
    transformLightQuad(
      g_LightPosition[4*QI+0], g_LightPosition[4*QI+1], g_LightPosition[4*QI+2], g_LightPosition[4*QI+3], 
      g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3], 
      wsPosition, wsTangent, wsBitangent, wsNormal,
      v_LightQuadX[QI], v_LightQuadY[QI], v_LightQuadZ[QI]);
  #endif

  #undef QI
  #define QI 6
  #if QUADS_PER_PASS > QI
    transformLightQuad(
      g_LightPosition[4*QI+0], g_LightPosition[4*QI+1], g_LightPosition[4*QI+2], g_LightPosition[4*QI+3], 
      g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3], 
      wsPosition, wsTangent, wsBitangent, wsNormal,
      v_LightQuadX[QI], v_LightQuadY[QI], v_LightQuadZ[QI]);
  #endif

  #undef QI
  #define QI 7
  #if QUADS_PER_PASS > QI
    transformLightQuad(
      g_LightPosition[4*QI+0], g_LightPosition[4*QI+1], g_LightPosition[4*QI+2], g_LightPosition[4*QI+3], 
      g_LightColor[4*QI+0], g_LightColor[4*QI+1], g_LightColor[4*QI+2], g_LightColor[4*QI+3], 
      wsPosition, wsTangent, wsBitangent, wsNormal,
      v_LightQuadX[QI], v_LightQuadY[QI], v_LightQuadZ[QI]);
  #endif

  #if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
    v_TexCoord = inTexCoord;
  #endif

  gl_Position = g_WorldViewProjectionMatrix * osPosition; // object space -> projection space
}
