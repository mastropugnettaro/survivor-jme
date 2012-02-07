#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

attribute vec3 inPosition;
attribute vec3 inNormal;
attribute vec2 inTexCoord;
attribute vec4 inTangent;

uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldViewMatrix;
uniform mat4 g_WorldViewMatrixInverse;
uniform mat4 g_ViewMatrix;
uniform mat4 g_WorldMatrix;
uniform mat3 g_NormalMatrix;

uniform vec4 g_LightPosition[NUM_LIGHTS];
uniform vec4 g_LightColor[NUM_LIGHTS];
uniform vec4 g_AmbientLightColor;

varying vec3 wvNormal;
varying vec2 texCoord;
varying vec3 tsViewVector;

void calculateLightVector(const in vec4 lightPosition, const in vec4 lightColor, const in vec3 V, out vec3 L)
{
  // positional or directional light?
  float isPosLight = step(0.5, lightColor.w);
  //vec4 wvLightPos = (g_ViewMatrix * vec4(lightPosition.xyz, clamp(lightColor.w, 0.0, 1.0)));
  vec4 wvLightPos = lightPosition;
  L = wvLightPos.xyz * sign(isPosLight - 0.5) - V * isPosLight;
}

void main(void)
{
  vec4 position = vec4(inPosition, 1.0);
  gl_Position = g_WorldViewProjectionMatrix * position;
  texCoord = inTexCoord;
  wvNormal = normalize(g_NormalMatrix * inNormal);

  //vec3 V = normalize(vec3(g_WorldViewMatrix * position));
  //vec3 E = -V;
  vec3 E = (vec4(0.0, 0.0, 0.0, 1.0) * g_WorldViewMatrixInverse).xyz;
  vec3 V = normalize(inPosition - E);

  vec3 N = normalize(g_NormalMatrix * inNormal);
  vec3 T = normalize(g_NormalMatrix * inTangent.xyz);
  vec3 B = cross(N, T);

  tsViewVector.x = dot(V, T);
  tsViewVector.y = dot(V, B);
  tsViewVector.z = dot(V, N);

  for (int i = 0; i < NUM_QUADS; i++)
  {
    vec3 L0;
    vec3 L1;
    vec3 L2;
    vec3 L3;

    calculateLightVector(g_LightPosition[i * 4 + 0], g_LightColor[i * 4 + 0], V, L0);
    calculateLightVector(g_LightPosition[i * 4 + 1], g_LightColor[i * 4 + 1], V, L1);
    calculateLightVector(g_LightPosition[i * 4 + 2], g_LightColor[i * 4 + 2], V, L2);
    calculateLightVector(g_LightPosition[i * 4 + 3], g_LightColor[i * 4 + 3], V, L3);

    L0 = vec3(dot(L0.x, T), dot(L0.y, B), dot(L0.z, N));
    L1 = vec3(dot(L1.x, T), dot(L1.y, B), dot(L1.z, N));
    L2 = vec3(dot(L2.x, T), dot(L2.y, B), dot(L2.z, N));
    L3 = vec3(dot(L3.x, T), dot(L3.y, B), dot(L3.z, N));

    tsLightVectorQuadX[i] = vec4(L0.x, L1.x, L2.x, L3.x);
    tsLightVectorQuadY[i] = vec4(L0.y, L1.y, L2.y, L3.y);
    tsLightVectorQuadZ[i] = vec4(L0.z, L1.z, L2.z, L3.z);
  }
}
