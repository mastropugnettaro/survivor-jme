#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

#define NUM_QUADS (1+(NUM_LIGHTS-1)/4)
#define NUM_LIGHTZ (NUM_QUADS*4)

attribute vec3 inPosition;
attribute vec3 inNormal;

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  attribute vec2 inTexCoord;
  varying vec2 v_TexCoord;
#endif

uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldMatrix;
uniform mat4 g_ViewMatrixInverse;

#ifdef VERTEX_LIGHTING

  uniform vec4 g_LightPosition[NUM_LIGHTZ];
  uniform vec4 g_LightColor[NUM_LIGHTZ];
  uniform vec4 g_AmbientLightColor;

  #ifdef MATERIAL_COLORS
    uniform vec4 m_Ambient;
    uniform vec4 m_Diffuse;
    uniform vec4 m_Specular;
  #endif
  uniform float m_Shininess;

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
    vec3 P; // vertex position
    vec3 V; // view vector
    vec3 N; // normal vector
    vec3 E; // eye vector
    vec3 L; // light vector

    P = vec3(g_WorldMatrix * position); // object space -> world space
    V = normalize(P - vec3(g_ViewMatrixInverse * vec4(0, 0, 0, 1)));
    E = -V;
    N = normalize(vec3(g_WorldMatrix * vec4(inNormal, 0.0))); // object space -> world space
    gl_FrontColor = m_Ambient * g_AmbientLightColor;

    for (int i = 0; i < NUM_LIGHTS; i++)
    {
      vec4 lightPosition = g_LightPosition[i];
      vec4 lightColor = g_LightColor[i];

      // positional or directional light?
      float isPosLight = step(0.5, lightColor.w);
      L = vec4(lightPosition.xyz * sign(isPosLight - 0.5) - P * isPosLight,
        clamp(lightColor.w, 0.0, 1.0));
      
      calculateVertexColor(N, L, E, lightColor, gl_FrontColor);
    }
  }

#else // per fragment lighting

  varying vec3 v_Position;
  varying vec3 v_View;
  varying vec3 v_Normal;

  #if defined(NORMALMAP)
    attribute vec4 inTangent;
    varying mat4 v_NormalMapMatrix;
  #endif

#endif

void main(void)
{
  vec4 position = vec4(inPosition, 1.0);

  #ifdef VERTEX_LIGHTING
    doPerVertexLighting(position);
  #else
      v_Position = vec3(g_WorldMatrix * position);
      //vec4 wPosition4 = g_WorldMatrix * position; // object space -> world space
      //v_Position = wPosition4.xyz / wPosition4.w;

      v_View = normalize(v_Position - vec3(g_ViewMatrixInverse * vec4(0, 0, 0, 1)));

      v_Normal = normalize(vec3(g_WorldMatrix * vec4(inNormal, 0.0))); // object space -> world space
    #if defined(NORMALMAP)      
      vec3 tangent = normalize(vec3(g_WorldMatrix * vec4(inTangent.xyz, 0.0))); // object space -> world space
      vec3 bitangent = cross(v_Normal, tangent) * -inTangent.w;
      
      // tangent space -> world space matrix
      v_NormalMapMatrix[0] = vec4(tangent.x, bitangent.x, v_Normal.x, 0);
      v_NormalMapMatrix[1] = vec4(tangent.y, bitangent.y, v_Normal.y, 0);
      v_NormalMapMatrix[2] = vec4(tangent.z, bitangent.z, v_Normal.z, 0);
      v_NormalMapMatrix[3] = vec4(        0,           0,          0, 1);

      // normal [0, 1] -> [-1, 1] expansion
      mat4 expansionMatrix = mat4(2, 0, 0, -1,
                                  0, 2, 0, -1,
                                  0, 0, 2, -1,
                                  0, 0, 0,  1);

      // normal map transformation matrix
      v_NormalMapMatrix = expansionMatrix * v_NormalMapMatrix;
    #endif
  #endif

  #if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
    v_TexCoord = inTexCoord;
  #endif

  gl_Position = g_WorldViewProjectionMatrix * position; // object space -> projection space
}
