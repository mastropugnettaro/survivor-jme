#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

attribute vec3 inPosition;
attribute vec3 inNormal;

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  attribute vec2 inTexCoord;
  varying vec2 texCoord;
#endif

uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldViewMatrix;
uniform mat4 g_ViewMatrix;
uniform mat3 g_NormalMatrix;

#ifdef VERTEX_LIGHTING

  uniform vec4 g_LightPosition[NUM_LIGHTS];
  uniform vec4 g_LightColor[NUM_LIGHTS];
  uniform vec4 g_AmbientLightColor;

  #ifdef MATERIAL_COLORS
    uniform vec4 m_Ambient;
    uniform vec4 m_Diffuse;
    uniform vec4 m_Specular;
  #endif
  uniform float m_Shininess;

  void calculateLightVector(const in vec4 lightPosition, const in vec4 lightColor, const in vec3 V, out vec3 L)
  {
    // positional or directional light?
    float isPosLight = step(0.5, lightColor.w);
    L = lightPosition.xyz * sign(isPosLight - 0.5) - V * isPosLight;
    L = vec3(g_ViewMatrix * vec4(L, clamp(lightColor.w, 0.0, 1.0)));
  }

  void calculateVertexColor(const in vec3 N, const in vec3 L, const in vec3 E, const in vec4 lightColor, inout vec4 vertexColor)
  {
    // calculate Diffuse Term:
    vec4 Idiff = lightColor * max(dot(N, L), 0.0);
    #ifdef MATERIAL_COLORS
      Idiff *= m_Diffuse;
    #endif

    // calculate Specular Term:
    vec3 R = normalize(-reflect(L, N));
    vec4 Ispec = lightColor * pow(max(dot(R, E), 0.0), m_Shininess);
    #ifdef MATERIAL_COLORS
      Ispec *= m_Specular;
    #endif

    vertexColor += Idiff + Ispec;
  }

  void doPerVertexLighting(const in vec4 position)
  {
    vec3 V; // view vector
    vec3 N; // normal vector
    vec3 E; // eye vector
    vec3 L; // light vector

    V = normalize(vec3(g_WorldViewMatrix * position));
    E = -V;
    N = normalize(g_NormalMatrix * inNormal);
    gl_FrontColor = m_Ambient * g_AmbientLightColor;

    for (int i = 0; i < NUM_LIGHTS; i++)
    {
      vec4 lightPosition = g_LightPosition[i];
      vec4 lightColor = g_LightColor[i];

      calculateLightVector(lightPosition, lightColor, V, L);
      calculateVertexColor(N, L, E, lightColor, gl_FrontColor);
    }
  }

#else // per fragment lighting

  varying vec3 position;
    varying vec3 vsNormal;

  #if defined(NORMALMAP)
    attribute vec3 inTangent;
    varying vec3 vsTangent;
    varying vec3 vsBitangent;
  #endif

#endif

void main(void)
{
  vec4 pos = vec4(inPosition, 1.0);

  #ifdef VERTEX_LIGHTING
    doPerVertexLighting(position);
  #else
      position = vec3(g_WorldViewMatrix * pos);
      vsNormal = g_NormalMatrix * inNormal;
    #if defined(NORMALMAP)
      vsTangent = g_NormalMatrix * inTangent;
      vsBitangent = cross(vsNormal, vsTangent);

      // view space -> tangent space
      position = position * mat3(vsTangent, vsBitangent, vsNormal);
    #endif
  #endif

  #if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
    texCoord = inTexCoord;
  #endif

  gl_Position = g_WorldViewProjectionMatrix * pos;
}
