#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

#define NUM_QUADS (1+(NUM_LIGHTS-1)/4)
#define NUM_LIGHTZ (NUM_QUADS*4)

attribute vec3 inPosition;
attribute vec3 inNormal;
attribute vec2 inTexCoord;
attribute vec4 inTangent;

uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldViewMatrix;
uniform mat4 g_ViewMatrix;
uniform mat3 g_NormalMatrix;

uniform vec4 g_LightPosition[NUM_LIGHTZ];
uniform vec4 g_LightColor[NUM_LIGHTZ];
uniform vec4 g_AmbientLightColor;

varying vec2 texCoord;
varying vec3 tsViewVector;
varying vec4 tsLightVectorQuadX[NUM_QUADS];
varying vec4 tsLightVectorQuadY[NUM_QUADS];
varying vec4 tsLightVectorQuadZ[NUM_QUADS];

void calculateLightVector(const in vec4 lightPosition, const in vec4 lightColor, const in vec3 V, out vec3 L)
{
  // positional or directional light?
  float isPosLight = step(0.5, lightColor.w);
  vec4 wvLightPos = (g_ViewMatrix * vec4(lightPosition.xyz, clamp(lightColor.w, 0.0, 1.0)));
  L = wvLightPos.xyz * sign(isPosLight - 0.5) - V * isPosLight;
}

void main(void)
{
  vec4 position = vec4(inPosition, 1.0);
  gl_Position = g_WorldViewProjectionMatrix * position;
  texCoord = inTexCoord;

  vec3 V = normalize(vec3(g_WorldViewMatrix * position));
  vec3 N = normalize(g_NormalMatrix * inNormal);
  vec3 T = normalize(g_NormalMatrix * inTangent.xyz);
  vec3 B = cross(N, T);

  tsViewVector.x = dot(V, T);
  tsViewVector.y = dot(V, B);
  tsViewVector.z = dot(V, N);

  vec3 L0, L1, L2, L3;

  #if NUM_QUADS > 0
    #undef QI
    #define QI 0
    calculateLightVector(g_LightPosition[4*QI+0], g_LightColor[4*QI+0], V, L0);
    calculateLightVector(g_LightPosition[4*QI+1], g_LightColor[4*QI+1], V, L1);
    calculateLightVector(g_LightPosition[4*QI+2], g_LightColor[4*QI+2], V, L2);
    calculateLightVector(g_LightPosition[4*QI+3], g_LightColor[4*QI+3], V, L3);

    L0 = vec3(dot(L0, T), dot(L0, B), dot(L0, N));
    L1 = vec3(dot(L1, T), dot(L1, B), dot(L1, N));
    L2 = vec3(dot(L2, T), dot(L2, B), dot(L2, N));
    L3 = vec3(dot(L3, T), dot(L3, B), dot(L3, N));

    tsLightVectorQuadX[QI] = vec4(L0.x, L1.x, L2.x, L3.x);
    tsLightVectorQuadY[QI] = vec4(L0.y, L1.y, L2.y, L3.y);
    tsLightVectorQuadZ[QI] = vec4(L0.z, L1.z, L2.z, L3.z);
  #endif

  #if NUM_QUADS > 1
    #define QI 1
    calculateLightVector(g_LightPosition[4*QI+0], g_LightColor[4*QI+0], V, L0);
    calculateLightVector(g_LightPosition[4*QI+1], g_LightColor[4*QI+1], V, L1);
    calculateLightVector(g_LightPosition[4*QI+2], g_LightColor[4*QI+2], V, L2);
    calculateLightVector(g_LightPosition[4*QI+3], g_LightColor[4*QI+3], V, L3);

    L0 = vec3(dot(L0, T), dot(L0, B), dot(L0, N));
    L1 = vec3(dot(L1, T), dot(L1, B), dot(L1, N));
    L2 = vec3(dot(L2, T), dot(L2, B), dot(L2, N));
    L3 = vec3(dot(L3, T), dot(L3, B), dot(L3, N));

    tsLightVectorQuadX[QI] = vec4(L0.x, L1.x, L2.x, L3.x);
    tsLightVectorQuadY[QI] = vec4(L0.y, L1.y, L2.y, L3.y);
    tsLightVectorQuadZ[QI] = vec4(L0.z, L1.z, L2.z, L3.z);
  #endif

  #if NUM_QUADS > 2
    #define QI 2
    calculateLightVector(g_LightPosition[4*QI+0], g_LightColor[4*QI+0], V, L0);
    calculateLightVector(g_LightPosition[4*QI+1], g_LightColor[4*QI+1], V, L1);
    calculateLightVector(g_LightPosition[4*QI+2], g_LightColor[4*QI+2], V, L2);
    calculateLightVector(g_LightPosition[4*QI+3], g_LightColor[4*QI+3], V, L3);

    L0 = vec3(dot(L0, T), dot(L0, B), dot(L0, N));
    L1 = vec3(dot(L1, T), dot(L1, B), dot(L1, N));
    L2 = vec3(dot(L2, T), dot(L2, B), dot(L2, N));
    L3 = vec3(dot(L3, T), dot(L3, B), dot(L3, N));

    tsLightVectorQuadX[QI] = vec4(L0.x, L1.x, L2.x, L3.x);
    tsLightVectorQuadY[QI] = vec4(L0.y, L1.y, L2.y, L3.y);
    tsLightVectorQuadZ[QI] = vec4(L0.z, L1.z, L2.z, L3.z);
  #endif

  #if NUM_QUADS > 3
    #define QI 3
    calculateLightVector(g_LightPosition[4*QI+0], g_LightColor[4*QI+0], V, L0);
    calculateLightVector(g_LightPosition[4*QI+1], g_LightColor[4*QI+1], V, L1);
    calculateLightVector(g_LightPosition[4*QI+2], g_LightColor[4*QI+2], V, L2);
    calculateLightVector(g_LightPosition[4*QI+3], g_LightColor[4*QI+3], V, L3);

    L0 = vec3(dot(L0, T), dot(L0, B), dot(L0, N));
    L1 = vec3(dot(L1, T), dot(L1, B), dot(L1, N));
    L2 = vec3(dot(L2, T), dot(L2, B), dot(L2, N));
    L3 = vec3(dot(L3, T), dot(L3, B), dot(L3, N));

    tsLightVectorQuadX[QI] = vec4(L0.x, L1.x, L2.x, L3.x);
    tsLightVectorQuadY[QI] = vec4(L0.y, L1.y, L2.y, L3.y);
    tsLightVectorQuadZ[QI] = vec4(L0.z, L1.z, L2.z, L3.z);
  #endif
}
