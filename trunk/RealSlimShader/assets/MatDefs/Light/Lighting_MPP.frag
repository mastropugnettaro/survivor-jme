#extension GL_ATI_shader_texture_lod : enable
#extension GL_EXT_gpu_shader4 : enable

#ifndef QUADS_PER_PASS
  #define QUADS_PER_PASS 1
#endif

#ifndef MAX_HEIGHT_LOD
  #define MAX_HEIGHT_LOD 8
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

#ifdef HAS_SPOTLIGHTS
  uniform vec4 g_SpotQuadX[QUADS_PER_PASS];
  uniform vec4 g_SpotQuadY[QUADS_PER_PASS];
  uniform vec4 g_SpotQuadZ[QUADS_PER_PASS];
  uniform vec4 g_SpotQuadW[QUADS_PER_PASS];
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
  #define ALQ_FP_LD , const in vec4 LDX, const in vec4 LDY, const in vec4 LDZ, const in vec4 LDW
  #define ALQ_AP_LD , g_SpotQuadX[QI], g_SpotQuadY[QI], g_SpotQuadZ[QI], g_SpotQuadW[QI]
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

  #ifdef STEEP_PARALLAX

    float getHeightSample(const in vec2 texCoord, const in float lod)
    {
      #if defined(PARALLAXMAP)
        return texture2DLod(m_ParallaxMap, texCoord, lod).r;
      #elif defined(NORMALMAP_PARALLAX)
        return texture2DLod(m_NormalMap, texCoord, lod).a;
      #endif
    }

    bool debug = false;

    void calculateQdmTexCoord_nX_nY(const in vec3 E, inout vec2 parallaxTexCoord)
    {
      float lod = float(MAX_HEIGHT_LOD);
      float count = 1.0;
      float depth = 0.0;    
      float prevDepth = 0.0;
      vec3 ray = vec3(parallaxTexCoord, 0.0);
      vec3 prevRay = ray;

      while (lod >= 0.0)
      {
        prevDepth = depth;
        depth = (-1.0 + getHeightSample(ray.xy, lod)) * m_ParallaxHeight;

        if (prevDepth < depth) debug = true;

        if (ray.z > depth)
        {
          //float fraction = 1.0 / count; // 0.0 / count for negative direction ... later
          vec3 currentBound = vec3(floor(ray.xy * count) / count, depth);
          vec3 rayDistanceFactor;

          //currentBound.x = currentBound.x;
          //currentBound.y = currentBound.y;

          if (ray.x == currentBound.x) debug = true;
          if (ray.y == currentBound.y) debug = true;

          rayDistanceFactor = (currentBound - ray) / E;

          prevRay = ray;
          if (rayDistanceFactor.y < rayDistanceFactor.x)
          {
            if (rayDistanceFactor.z < rayDistanceFactor.y)
            {
              ray = ray + E * rayDistanceFactor.z;
            }
            else
            {
              ray = ray + E * rayDistanceFactor.y;
            }
          }
          else
          {
            if (rayDistanceFactor.z < rayDistanceFactor.x)
            {
              ray = ray + E * rayDistanceFactor.z;
            }
            else
            {
              ray = ray + E * rayDistanceFactor.x;
            }
          }
        }

        lod -= 1.0;
        count *= 2.0;
      }

      //parallaxTexCoord = (prevRay.xy + ray.xy) / vec2(2.0);
      parallaxTexCoord = ray.xy;
    }

    void calculateQdmTexCoord_pX_nY(const in vec3 E, inout vec2 parallaxTexCoord)
    {
      float lod = float(MAX_HEIGHT_LOD);
      float count = 1.0;
      float depth = 0.0;    
      float prevDepth = 0.0;
      vec3 ray = vec3(parallaxTexCoord, 0.0);
      vec3 prevRay = ray;

      while (lod >= 0.0)
      {
        prevDepth = depth;
        depth = (-1.0 + getHeightSample(ray.xy, lod)) * m_ParallaxHeight;

        if (prevDepth < depth) debug = true;

        if (ray.z > depth)
        {
          float fraction = 1.0 / count; // 0.0 / count for negative direction ... later
          vec3 currentBound = vec3(floor(ray.xy * count) / count, depth);
          vec3 rayDistanceFactor;

          currentBound.x = currentBound.x + fraction;
          //currentBound.y = currentBound.y;

          if (ray.x == currentBound.x) debug = true;
          if (ray.y == currentBound.y) debug = true;

          rayDistanceFactor = (currentBound - ray) / E;

          prevRay = ray;
          if (rayDistanceFactor.y < rayDistanceFactor.x)
          {
            if (rayDistanceFactor.z < rayDistanceFactor.y)
            {
              ray = ray + E * rayDistanceFactor.z;
            }
            else
            {
              ray = ray + E * rayDistanceFactor.y;
            }
          }
          else
          {
            if (rayDistanceFactor.z < rayDistanceFactor.x)
            {
              ray = ray + E * rayDistanceFactor.z;
            }
            else
            {
              ray = ray + E * rayDistanceFactor.x;
            }
          }
        }

        lod -= 1.0;
        count *= 2.0;
      }

      //parallaxTexCoord = (prevRay.xy + ray.xy) / vec2(2.0);
      parallaxTexCoord = ray.xy;
    }

    void calculateQdmTexCoord_nX_pY(const in vec3 E, inout vec2 parallaxTexCoord)
    {
      float lod = float(MAX_HEIGHT_LOD);
      float count = 1.0;
      float depth = 0.0;    
      float prevDepth = 0.0;
      vec3 ray = vec3(parallaxTexCoord, 0.0);
      vec3 prevRay = ray;

      while (lod >= 0.0)
      {
        prevDepth = depth;
        depth = (-1.0 + getHeightSample(ray.xy, lod)) * m_ParallaxHeight;

        if (prevDepth < depth) debug = true;

        if (ray.z > depth)
        {
          float fraction = 1.0 / count; // 0.0 / count for negative direction ... later
          vec3 currentBound = vec3(floor(ray.xy * count) / count, depth);
          vec3 rayDistanceFactor;

          //currentBound.x = currentBound.x;
          currentBound.y = currentBound.y + fraction;

          if (ray.x == currentBound.x) debug = true;
          if (ray.y == currentBound.y) debug = true;

          rayDistanceFactor = (currentBound - ray) / E;

          prevRay = ray;
          if (rayDistanceFactor.y < rayDistanceFactor.x)
          {
            if (rayDistanceFactor.z < rayDistanceFactor.y)
            {
              ray = ray + E * rayDistanceFactor.z;
            }
            else
            {
              ray = ray + E * rayDistanceFactor.y;
            }
          }
          else
          {
            if (rayDistanceFactor.z < rayDistanceFactor.x)
            {
              ray = ray + E * rayDistanceFactor.z;
            }
            else
            {
              ray = ray + E * rayDistanceFactor.x;
            }
          }
        }

        lod -= 1.0;
        count *= 2.0;
      }

      //parallaxTexCoord = (prevRay.xy + ray.xy) / vec2(2.0);
      parallaxTexCoord = ray.xy;
    }

    void calculateQdmTexCoord_pX_pY(const in vec3 E, inout vec2 parallaxTexCoord)
    {
      float lod = float(MAX_HEIGHT_LOD);
      float count = 1.0;
      float depth = 0.0;
      float prevDepth = 0.0;
      vec3 ray = vec3(parallaxTexCoord, 0.0);
      vec3 prevRay = ray;

      while (lod >= 0.0)
      {
        prevDepth = depth;
        depth = (-1.0 + getHeightSample(ray.xy, lod)) * m_ParallaxHeight;

        //if (prevDepth < depth) debug = true;

        if (ray.z > depth)
        {
          float fraction = 1.0 / count; // 0.0 / count for negative direction ... later
          vec3 currentBound = vec3(floor(ray.xy * count) / count, depth);
          vec3 rayDistanceFactor;

          currentBound.x = currentBound.x + fraction;
          currentBound.y = currentBound.y + fraction;

          if (ray.x == currentBound.x) debug = true;
          if (ray.y == currentBound.y) debug = true;

          rayDistanceFactor = (currentBound - ray) / E;

          prevRay = ray;
          if (rayDistanceFactor.y < rayDistanceFactor.x)
          {
            if (rayDistanceFactor.z < rayDistanceFactor.y)
            {
              ray = ray + E * rayDistanceFactor.z;
            }
            else
            {
              ray = ray + E * rayDistanceFactor.y;
            }
          }
          else
          {
            if (rayDistanceFactor.z < rayDistanceFactor.x)
            {
              ray = ray + E * rayDistanceFactor.z;
            }
            else
            {
              ray = ray + E * rayDistanceFactor.x;
            }
          }
        }

        lod -= 1.0;
        count *= 2.0;
      }

      //parallaxTexCoord = (prevRay.xy + ray.xy) / vec2(2.0);
      parallaxTexCoord = ray.xy;
    }

    void calculateQdmTexCoord(const in vec3 V, inout vec2 parallaxTexCoord)
    {
      vec3 E = -V;
      //vec3 E = vec3(v_tsParallaxOffset, -length(v_tsParallaxOffset));

      //if (E.x == 0.0) return;
      //if (E.y == 0.0) return;

      if (E.x < 0.0)
      {
        if (E.y < 0.0)
        {
          calculateQdmTexCoord_nX_nY(E, parallaxTexCoord);
        }
        else
        {
          calculateQdmTexCoord_nX_pY(E, parallaxTexCoord);
        }
      }
      else
      {
        if (E.y < 0.0)
        {
          calculateQdmTexCoord_pX_nY(E, parallaxTexCoord);
        }
        else
        {
          calculateQdmTexCoord_pX_pY(E, parallaxTexCoord);
        }
      }
    }

  #else

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
      vec4 curAngleCos = (wsLX * LDX + wsLY * LDY + wsLZ * LDZ) / wsLengths;
      vec4 innerAngleCos = floor(LDW) * vec4(0.001);
      vec4 outerAngleCos = fract(LDW);
      vec4 innerMinusOuter = innerAngleCos - outerAngleCos;
      vec4 spotFallOff = clamp((curAngleCos - outerAngleCos) / innerMinusOuter, 0.0, 1.0);
      intensity *= spotFallOff;
    #endif

    intensity = clamp(intensity, vec4(0.0), vec4(1.0));
    vec4 scale = intensity / lightLengths;
  #endif

  #if defined(NEED_DIFFUSE) || defined(DIFFUSEMAP)
    // compute NdotL in parallel
    vec4 NdotL = tsLX * N.x + tsLY * N.y + tsLZ * N.z;

    // normalize NdotL and scale by intensity
    diffuseQuad = max(vec4(0.0), NdotL * scale) * intensity;
  #endif

  #if defined(NEED_SPECULAR) || defined(SPECULARMAP)
    // dot(reflect(-L, N), V) == dot(reflect(-V, N), L)
    // compute RdotL in parallel
    vec3 R = reflect(-V, N);
    vec4 RdotL = tsLX * R.x + tsLY * R.y + tsLZ * R.z;

    // normalize RdotL and scale by intensity
    RdotL = max(vec4(0.0), RdotL * scale);

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

void main (void)
{
  vec3 V; // view vector
  vec3 N; // normal vector

  V = normalize(v_View);

  #ifdef NORMALMAP
    vec2 texCoord = v_TexCoord;
    #if defined(PARALLAXMAP) || defined(NORMALMAP_PARALLAX)
      #ifdef STEEP_PARALLAX
        vec2 texCoord2 = texCoord;
        calculateQdmTexCoord(V, texCoord);
      #else
        calculateParallaxTexCoord(V, texCoord);
      #endif
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

  //if (debug == true) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  //if (getHeightSample(vec2(0.1), 0.0) != getHeightSample(vec2(1.1), 0.0)) discard;
  //gl_FragColor = vec4((texCoord - texCoord2) * vec2(10.0), 0.0, 1.0);
  //gl_FragColor = vec4((texCoord2 - texCoord) * vec2(10.0), 0.0, 1.0);
  //gl_FragColor = vec4(abs(texCoord - texCoord2) * vec2(10.0), 0.0, 1.0);
  //gl_FragColor = vec4(getHeightSample(v_TexCoord, 0.0));
}
