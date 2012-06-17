#ifndef NUM_LIGHTS
  #define NUM_LIGHTS 1
#endif

attribute vec3 inPosition;
attribute vec3 inNormal;

#if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
  attribute vec2 inTexCoord;
  varying vec2 v_TexCoord;
#endif

uniform mat4 g_WorldViewProjectionMatrix;
uniform mat4 g_WorldViewMatrix;
uniform mat4 g_WorldMatrix;
uniform mat3 g_WorldMatrixInverseTranspose;
uniform mat4 g_ViewMatrix;
uniform mat4 g_ViewMatrixInverse;
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

    V = normalize(vec3(g_WorldViewMatrix * position)); // object space -> view space
    E = -V;
    N = g_NormalMatrix * inNormal; // object space -> view space
    gl_FrontColor = m_Ambient * g_AmbientLightColor;

    for (int i = 0; i < NUM_LIGHTS; i++)
    {
      vec4 lightPosition = g_LightPosition[i];
      vec4 lightColor = g_LightColor[i];
      vec4 lightVector;

      // positional or directional light?
      float isPosLight = step(0.5, lightColor.w);
      lightVector = vec4(lightPosition.xyz * sign(isPosLight - 0.5) - V * isPosLight,
        clamp(lightColor.w, 0.0, 1.0));
      
      lightVector = g_ViewMatrix * lightVector; // world space -> view space
      L = vec3(lightVector);

      calculateVertexColor(N, L, E, lightColor, gl_FrontColor);
    }
  }

#else // per fragment lighting

  varying vec3 v_wsPosition;
  varying vec3 v_wsView;
  varying vec3 v_wsNormal;

  #if defined(NORMALMAP)
    attribute vec4 inTangent;
    varying vec3 v_wsTangent;
    varying vec3 v_wsBitangent;
    varying vec3 v_tsView;

    #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
      uniform float m_ParallaxHeight;
      varying vec2 v_tsParallaxOffset;
      const float c_ParallaxScale = PARALLAX_HEIGHT * 0.3; // steep compatibility
    #endif
  #endif

#endif

void main(void)
{
  vec4 osPosition = vec4(inPosition, 1.0);

  #ifdef VERTEX_LIGHTING
    doPerVertexLighting(osPosition);
  #else
    vec3 wsEyePosition = vec3(g_ViewMatrixInverse * vec4(0.0, 0.0, 0.0, 1.0));
    v_wsPosition = vec3(g_WorldMatrix * osPosition); // object space -> world space
    v_wsView = v_wsPosition - wsEyePosition;
    v_wsNormal = normalize(g_WorldMatrixInverseTranspose * inNormal);  // object space -> world space

    #if defined(NORMALMAP)
      v_wsTangent = normalize(g_WorldMatrixInverseTranspose * inTangent.xyz); // object space -> world space
      v_wsBitangent = vec3(cross(v_wsNormal, v_wsTangent) * -inTangent.w);      
      v_tsView = v_wsView * mat3(v_wsTangent, v_wsBitangent, v_wsNormal); // world space -> tangent space

      #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
        // Compute the ray direction for intersecting the height field profile with 
        // current view ray. See the above paper for derivation of this computation.

        // Compute initial parallax displacement direction:
        vec2 vParallaxDirection = normalize(v_tsView.xy);

        // The length of this vector determines the furthest amount of displacement:
        float fLength = length(v_tsView);
        float fParallaxLength = sqrt(fLength * fLength - v_tsView.z * v_tsView.z) / v_tsView.z;

        // Compute the actual reverse parallax displacement vector:
        v_tsParallaxOffset = vParallaxDirection * fParallaxLength;

        // Need to scale the amount of displacement to account for different height ranges
        // in height maps. This is controlled by an artist-editable parameter:
        v_tsParallaxOffset *= c_ParallaxScale; // steep compatibility
      #endif
    #endif
  #endif

  #if defined(DIFFUSEMAP) || defined(NORMALMAP) || defined(SPECULARMAP) || defined(ALPHAMAP)
    v_TexCoord = inTexCoord;
  #endif

  gl_Position = g_WorldViewProjectionMatrix * osPosition; // object space -> projection space
}
