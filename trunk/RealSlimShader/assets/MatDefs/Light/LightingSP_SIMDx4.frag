#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

#define NUM_QUADS (1+(NUM_LIGHTS-1)/4)
#define NUM_LIGHTZ (NUM_QUADS*4)

uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldViewMatrix;
uniform mat4 g_ViewMatrix;
uniform mat3 g_NormalMatrix;

uniform vec4 g_LightPosition[NUM_LIGHTZ];
uniform vec4 g_LightColor[NUM_LIGHTZ];
uniform vec4 g_AmbientLightColor;

uniform vec4 m_Ambient;
uniform vec4 m_Diffuse;
uniform vec4 m_Specular;
uniform float m_Shininess;

uniform sampler2D m_DiffuseMap;
uniform sampler2D m_NormalMap;

varying vec2 texCoord;
varying vec3 tsViewVector;
varying vec4 tsLightVectorQuadX[NUM_QUADS];
varying vec4 tsLightVectorQuadY[NUM_QUADS];
varying vec4 tsLightVectorQuadZ[NUM_QUADS];

const vec2 specular_ab = vec2(6.645, -5.645);

vec4 computeSpecularPower(const vec4 v)
{
    // originally: pow(v, N)
    // x^N is roughly equal to (max(Ax+B, 0))^2
    // A,B depend on N
    vec4 t = clamp(specular_ab.x * v + specular_ab.y, 0.0, 1.0);
    return t * t;
}

void computeLighting4(
  const in vec4 lvqX, const in vec4 lvqY, const in vec4 lvqZ, 
  const in vec3 normal, out vec4 diffuse, out vec4 specular)
{
  // compute squared lengths in parallel
  //vec4 squaredLengths = vec4(0.0);
  //squaredLengths += pow(tsLightVectorQuadX[quadIndex], vec4(2.0));
  //squaredLengths += pow(tsLightVectorQuadY[quadIndex], vec4(2.0));
  //squaredLengths += pow(tsLightVectorQuadZ[quadIndex], vec4(2.0));

 // compute NdotL in parallel
 vec4 NdotL = vec4(0.0);
 NdotL += lvqX * normal.x;
 NdotL += lvqY * normal.y;
 NdotL += lvqZ * normal.z;

 // compute RdotL in parallel
 //vec3 reflected = reflect(tsViewVector, normal);
 //vec4 RdotL = vec4(0.0);
 //RdotL += tsLightVectorQuadX[quadIndex] * reflected.x;
 //RdotL += tsLightVectorQuadY[quadIndex] * reflected.y;
 //RdotL += tsLightVectorQuadZ[quadIndex] * reflected.z;

 // correct NdotL and RdotL
 //vec4 correction = vec4(1.0) / sqrt(squaredLengths);
 //NdotL = clamp(NdotL * correction, 0.0, 1.0);
 //RdotL = clamp(RdotL * correction, 0.0, 1.0);

 // attenuation
 // 1 - d^2 / r^2 for diffuse
 // vec4 lightRadiusInv = vec4(1.0 / 0.25); // prov.
 // vec4 atten = squaredLengths * lightRadiusInv;

 // modulate diffuse by attenuation
 // NdotL = clamp(NdotL - NdotL * atten, 0.0, 1.0);

 // specular
 //vec4 spec = computeSpecularPower(RdotL);

 diffuse = NdotL;
 //specular = spec;
 specular = vec4(0.0);
}

void main (void)
{
  //vec4 albedo = texture2D(m_DiffuseMap, texCoord);
  vec3 normal = normalize(texture2D(m_NormalMap, texCoord).xyz * vec3(2.0) - vec3(1.0));
  //vec3 normal = vec3(0.0, 0.0, 1.0);
  //vec4 specularColor = texture2D(m_SpecularMap, texCoord);
  
  vec4 diffuseQuad;
  vec4 specularQuad;
  vec4 diffuseSum = vec4(0.0);
  vec4 specularSum = vec4(0.0);

  #if NUM_QUADS > 0
    #define QI 0
    computeLighting4(
      tsLightVectorQuadX[QI], tsLightVectorQuadY[QI], tsLightVectorQuadZ[QI], 
      normal, diffuseQuad, specularQuad);
    diffuseSum += diffuseQuad[0] * g_LightColor[4*QI+0];
    diffuseSum += diffuseQuad[1] * g_LightColor[4*QI+1];
    diffuseSum += diffuseQuad[2] * g_LightColor[4*QI+2];
    diffuseSum += diffuseQuad[3] * g_LightColor[4*QI+3];
  #endif

  #if NUM_QUADS > 1
    #define QI 1
    computeLighting4(
      tsLightVectorQuadX[QI], tsLightVectorQuadY[QI], tsLightVectorQuadZ[QI], 
      normal, diffuseQuad, specularQuad);
    diffuseSum += diffuseQuad[0] * g_LightColor[4*QI+0];
    diffuseSum += diffuseQuad[1] * g_LightColor[4*QI+1];
    diffuseSum += diffuseQuad[2] * g_LightColor[4*QI+2];
    diffuseSum += diffuseQuad[3] * g_LightColor[4*QI+3];
  #endif

  #if NUM_QUADS > 2
    #define QI 2
    computeLighting4(
      tsLightVectorQuadX[QI], tsLightVectorQuadY[QI], tsLightVectorQuadZ[QI], 
      normal, diffuseQuad, specularQuad);
    diffuseSum += diffuseQuad[0] * g_LightColor[4*QI+0];
    diffuseSum += diffuseQuad[1] * g_LightColor[4*QI+1];
    diffuseSum += diffuseQuad[2] * g_LightColor[4*QI+2];
    diffuseSum += diffuseQuad[3] * g_LightColor[4*QI+3];
  #endif

  #if NUM_QUADS > 3
    #define QI 3
    computeLighting4(
      tsLightVectorQuadX[QI], tsLightVectorQuadY[QI], tsLightVectorQuadZ[QI], 
      normal, diffuseQuad, specularQuad);
    diffuseSum += diffuseQuad[0] * g_LightColor[4*QI+0];
    diffuseSum += diffuseQuad[1] * g_LightColor[4*QI+1];
    diffuseSum += diffuseQuad[2] * g_LightColor[4*QI+2];
    diffuseSum += diffuseQuad[3] * g_LightColor[4*QI+3];
  #endif

  //specularSum += specularQuad[0] * g_LightColor[0];
  //specularSum += specularQuad[1] * g_LightColor[1];
  //specularSum += specularQuad[2] * g_LightColor[2];
  //specularSum += specularQuad[3] * g_LightColor[3];

  vec3 diffuse = vec3(diffuseSum * m_Diffuse);
  //vec4 specular = specularSum * m_Specular;

  // final diffuse color
  //vec3 diffuse = clamp(dot(diffuseQuadSum, vec4(1.0)) * m_Diffuse.xyz, 0.0, 1.0);

  // final specular color
  //vec3 specular = clamp(dot(specularQuadSum, vec4(1.0)) * m_Specular.xyz, 0.0, 1.0);

  // final color
  //gl_FragColor = vec4(albedo.rgb * diffuse + specular, albedo.a);
  gl_FragColor = vec4(diffuse, 1.0);
  //gl_FragColor = vec4(tsLightVectorQuadX[0].w, tsLightVectorQuadY[0].w, tsLightVectorQuadZ[0].w, 1.0);
  //gl_FragColor = vec4(tsViewVector.x, tsViewVector.y, tsViewVector.z, 1.0);
}
